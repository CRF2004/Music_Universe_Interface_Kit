import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { defaultMusicWorldProject } from '../../content/defaultMusicWorldProject';
import { exportMusicWorldProject, importMusicWorldProject } from '../../project';
import { projectTrackKey, useProjectStore } from '../../state/useProjectStore';
import { analyzeSamples } from '../analysis/musicAnalysis';

const elements: FakeAudio[] = [];
class FakeAudio extends EventTarget {
  src = '';
  currentTime = 0;
  duration = NaN;
  paused = true;
  ended = false;
  volume = 1;
  preload = '';
  loop = false;
  constructor() { super(); elements.push(this); }
  load() {}
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  async play() { this.paused = false; this.dispatchEvent(new Event('play')); }
  removeAttribute(name: string) { if (name === 'src') this.src = ''; }
}
Object.defineProperty(globalThis, 'Audio', { value: FakeAudio, configurable: true });
const { useAudioPlayerStore } = await import('./useAudioPlayerStore');

async function candidateAfter(index: number) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = elements.slice(index).find((element) => element.src);
    if (candidate) return candidate;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  throw new Error('Candidate audio was not prepared');
}
async function loadReady(file: File) {
  const index = elements.length;
  const loading = useAudioPlayerStore.getState().load(file);
  const candidate = await candidateAfter(index);
  candidate.duration = 20;
  candidate.dispatchEvent(new Event('loadedmetadata'));
  await loading;
  return candidate;
}
describe('project audio loading transactions', () => {
  beforeEach(() => {
    useAudioPlayerStore.getState().clear();
    const project = importMusicWorldProject(exportMusicWorldProject(defaultMusicWorldProject));
    useProjectStore.setState({ project, activeProjectId: project.id, drafts: [{ project, deletedAt: null }], hydrated: true, status: 'ready', revision: 0, undoStack: [], redoStack: [] });
  });
  it('commits decoded audio and project metadata together and preserves them on decode failure', async () => {
    const first = await loadReady(new File(['first'], 'First.wav', { type: 'audio/wav' }));
    assert.equal(useAudioPlayerStore.getState().duration, 20);
    assert.equal(useProjectStore.getState().project.track.title, 'First.wav');
    const before = useProjectStore.getState().project;
    const index = elements.length;
    const failed = useAudioPlayerStore.getState().load(new File(['corrupt'], 'Bad.wav', { type: 'audio/wav' }));
    const candidate = await candidateAfter(index);
    candidate.dispatchEvent(new Event('error'));
    await failed;
    assert.equal(useProjectStore.getState().project, before);
    assert.equal(useAudioPlayerStore.getState().track?.name, 'First.wav');
    assert.equal(first.src.startsWith('blob:'), true);
    assert.equal(candidate.src, '');
    assert.match(useAudioPlayerStore.getState().error ?? '', /decode/);
  });
  it('cancels stale decoding when changing projects and ignores later media events', async () => {
    const index = elements.length;
    const loading = useAudioPlayerStore.getState().load(new File(['first'], 'First.wav', { type: 'audio/wav' }));
    const candidate = await candidateAfter(index);
    useProjectStore.getState().createProject();
    candidate.duration = 20;
    candidate.dispatchEvent(new Event('loadedmetadata'));
    await loading;
    assert.equal(useProjectStore.getState().project.track.source, 'asset');
    assert.equal(useAudioPlayerStore.getState().track, null);
    assert.equal(useAudioPlayerStore.getState().error, null);
    assert.equal(candidate.src, '');
  });
  it('reattaches identical content without changing saved metadata and rejects a same-name wrong file', async () => {
    const file = new File(['first'], 'First.wav', { type: 'audio/wav' });
    await loadReady(file);
    const saved = useProjectStore.getState().project;
    useAudioPlayerStore.getState().clear();
    const index = elements.length;
    const mismatch = useAudioPlayerStore.getState().load(new File(['other'], 'First.wav', { type: 'audio/wav' }), { reattach: true });
    const wrong = await candidateAfter(index);
    wrong.duration = 20;
    wrong.dispatchEvent(new Event('loadedmetadata'));
    await mismatch;
    assert.match(useAudioPlayerStore.getState().error ?? '', /does not match/);
    assert.equal(useAudioPlayerStore.getState().track, null);
    assert.equal(useProjectStore.getState().project, saved);
    const nextIndex = elements.length;
    const restore = useAudioPlayerStore.getState().load(file, { reattach: true });
    const original = await candidateAfter(nextIndex);
    original.duration = 20;
    original.dispatchEvent(new Event('loadedmetadata'));
    await restore;
    assert.equal(useAudioPlayerStore.getState().track?.name, 'First.wav');
    assert.equal(useProjectStore.getState().project, saved);
    useProjectStore.getState().createProject();
    assert.equal(useAudioPlayerStore.getState().track, null);
    assert.equal(original.src, '');
  });
  it('analysis edits and undo keep audio playing; replacement removes the old analysis', async () => {
    const player = await loadReady(new File(['first'], 'First.wav', { type: 'audio/wav' }));
    await useAudioPlayerStore.getState().play();
    useAudioPlayerStore.getState().seek(7);
    const state = useProjectStore.getState();
    state.updateMusicAnalysis(state.activeProjectId, projectTrackKey(state.project.track), analyzeSamples([new Float32Array(2000).fill(.5)], 100));
    assert.equal(useAudioPlayerStore.getState().playing, true);
    assert.equal(useAudioPlayerStore.getState().currentTime, 7);
    assert.ok(player.src);
    state.undo();
    assert.equal(useAudioPlayerStore.getState().playing, true);
    state.redo();
    assert.ok(useProjectStore.getState().project.track.analysis);
    await loadReady(new File(['second'], 'Second.wav', { type: 'audio/wav' }));
    assert.equal(useProjectStore.getState().project.track.analysis, undefined);
    assert.equal(useAudioPlayerStore.getState().playing, false);
  });
});
