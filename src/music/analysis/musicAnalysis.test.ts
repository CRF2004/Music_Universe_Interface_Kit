import assert from 'node:assert/strict';
import { beforeEach, it } from 'node:test';
import { analyzeSamples, analysisIssues } from './musicAnalysis';
import { defaultMusicWorldProject } from '../../content/defaultMusicWorldProject';
import { importMusicWorldProject, exportMusicWorldProject } from '../../project';
import { projectTrackKey, useProjectStore } from '../../state/useProjectStore';

const fixture = () => analyzeSamples([Float32Array.from({ length: 6000 }, (_, i) => i < 3000 ? .1 : .8)], 100);
beforeEach(() => {
  const project = structuredClone(defaultMusicWorldProject);
  project.track.expectedDurationSeconds = 60;
  useProjectStore.setState({ project, activeProjectId: project.id, drafts: [{ project, deletedAt: null }], hydrated: true, undoStack: [], redoStack: [], revision: 0, status: 'ready', error: null });
});

it('measures known amplitude and finds a sustained energy boundary deterministically', () => {
  const result = fixture();
  assert.ok(Math.abs(result.rmsDb[0] + 20) < .001);
  assert.ok(Math.abs(result.rmsDb.at(-1)! - 20 * Math.log10(.8)) < .001);
  assert.ok(Math.abs(result.sections[1].start * 60 - 30) <= 1);
  assert.deepEqual(result, fixture());
});
it('keeps stereo energy even with opposite phase, and handles silence without invented cuts', () => {
  const a = new Float32Array(1000).fill(.5);
  const b = new Float32Array(1000).fill(-.5);
  const stereo = analyzeSamples([a, b], 100);
  assert.equal(stereo.peaks[0], .5);
  assert.ok(Math.abs(stereo.rmsDb[0] + 6.0206) < .001);
  const silence = analyzeSamples([new Float32Array(1000)], 100);
  assert.ok(silence.rmsDb.every(db => db === -96));
  assert.equal(silence.sections.length, 1);
});
it('rejects malformed samples and bounds long-track summaries', () => {
  assert.throws(() => analyzeSamples([new Float32Array([NaN])], 1));
  assert.throws(() => analyzeSamples([new Float32Array(601)], 1));
  const long = analyzeSamples([new Float32Array(60000)], 100);
  assert.equal(long.peaks.length, 512);
  assert.equal(analysisIssues(long, 600).length, 0);
});
it('rejects bad ordering, duplicate IDs, wrong duration and unbounded analysis on import', () => {
  for (const corrupt of [
    { ...fixture(), durationSeconds: 20 },
    { ...fixture(), peaks: [NaN] },
    { ...fixture(), sections: [{ id: 'same', label: 'A', start: 0 }, { id: 'same', label: 'B', start: .5 }] },
    { ...fixture(), sections: [{ id: 'a', label: 'A', start: .5 }] },
    { ...fixture(), rmsDb: Array(513).fill(0) },
  ]) {
    const project = structuredClone(useProjectStore.getState().project);
    project.track.analysis = corrupt;
    assert.throws(() => exportMusicWorldProject(project));
    const before = useProjectStore.getState().project;
    assert.equal(useProjectStore.getState().importJson(JSON.stringify(project)).ok, false);
    assert.equal(useProjectStore.getState().project, before);
  }
});
it('round-trips sections and undoes edits while preserving unrelated names and cues', () => {
  const state = useProjectStore.getState();
  const key = projectTrackKey(state.project.track);
  assert.equal(state.updateMusicAnalysis(state.activeProjectId, key, fixture()), true);
  const cues = structuredClone(state.project.timeline.cues);
  const analysis = structuredClone(useProjectStore.getState().project.track.analysis!);
  analysis.sections[1].label = 'Chorus';
  analysis.sections[1].start = .6;
  state.updateMusicAnalysis(state.activeProjectId, key, analysis);
  state.renameProject(state.activeProjectId, 'Preserve title');
  state.undo();
  assert.deepEqual(useProjectStore.getState().project.track.analysis, fixture());
  assert.equal(useProjectStore.getState().project.metadata.title, 'Preserve title');
  state.redo();
  const restored = importMusicWorldProject(state.exportJson());
  assert.deepEqual(restored.track.analysis, analysis);
  assert.deepEqual(restored.timeline.cues, cues);
});
it('rejects stale analysis and clears song-specific history on replacement while preserving spatial edits', () => {
  const state = useProjectStore.getState();
  const key = projectTrackKey(state.project.track);
  state.updateArchivePosition(-11, -12);
  state.updateMusicAnalysis(state.activeProjectId, key, fixture());
  const { analysis: _analysis, ...track } = useProjectStore.getState().project.track;
  state.bindTrack(state.activeProjectId, { ...track, title: 'Replacement' });
  assert.equal(state.updateMusicAnalysis(state.activeProjectId, key, fixture()), false);
  assert.equal(useProjectStore.getState().project.track.analysis, undefined);
  assert.equal(useProjectStore.getState().undoStack.length, 1);
  state.undo();
  assert.equal(useProjectStore.getState().project.track.title, 'Replacement');
});
