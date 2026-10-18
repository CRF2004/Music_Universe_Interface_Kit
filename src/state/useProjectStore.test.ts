import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { defaultMusicWorldProject } from '../content/defaultMusicWorldProject';
import { exportMusicWorldProject, importMusicWorldProject } from '../project';
import { useProjectStore } from './useProjectStore';
import { compileNormalizedMusicTimeline } from '../music/musicTimeline';
import { replayMusicTimeline } from '../music/runtime/musicExperienceRuntime';
import type { SpatialNarrativeAction } from '../music/narrative/narrativeTypes';
import { localTrackRecord } from '../music/player/projectAudioIdentity';

function environmentPayload(action: SpatialNarrativeAction) {
  if (action.type !== 'set-environment') throw new Error('Expected an environment action');
  return action.payload;
}

function freshDefault() {
  return importMusicWorldProject(exportMusicWorldProject(defaultMusicWorldProject));
}

describe('project draft state', () => {
  it('binds a validated song to one draft while preserving edits and rejecting stale or invalid updates', () => {
    const store = useProjectStore.getState();
    store.updateArchivePosition(-12, -15);
    const track = localTrackRecord({ name: 'My.wav', sizeBytes: 44, sha256: 'a'.repeat(64) }, 20);
    assert.equal(store.bindTrack(store.activeProjectId, track), true);
    assert.deepEqual(importMusicWorldProject(store.exportJson()).track, track);
    assert.deepEqual(useProjectStore.getState().drafts[0].project.track, track);
    assert.equal(useProjectStore.getState().undoStack.length, 1);
    store.undo();
    assert.deepEqual(useProjectStore.getState().project.track, track);
    const before = useProjectStore.getState().project;
    assert.equal(store.bindTrack('old-project', track), false);
    assert.ok(track.file);
    assert.equal(store.bindTrack(store.activeProjectId, { ...track, file: { ...track.file, sha256: 'invalid' } }), false);
    assert.equal(useProjectStore.getState().project, before);
    store.createProject();
    assert.equal(store.bindTrack(before.id, track), false);
    assert.equal(useProjectStore.getState().project.track.source, 'asset');
  });
  it('edits an environment action atomically and replays it after JSON round-trip', () => {
    const original = freshDefault().timeline.cues[2];
    useProjectStore.getState().updateCueEnvironment('weather-front', 0, { skyColor: '#123456', groundColor: '#654321', rainIntensity: 0.2, bloomIntensity: 1.2 });
    const state = useProjectStore.getState();
    const action = state.project.timeline.cues[2].actions[0];
    assert.equal(action.type, 'set-environment');
    if (action.type !== 'set-environment') throw new Error('Wrong action type');
    assert.equal(action.payload.fogDensity, 0.006);
    assert.equal(action.payload.stars, 120);
    assert.deepEqual(state.project.timeline.cues[2].actions[1], original.actions[1]);
    assert.equal(state.undoStack.length, 1);
    const restored = importMusicWorldProject(state.exportJson());
    const cues = compileNormalizedMusicTimeline(restored.timeline.cues, 200);
    assert.equal(replayMusicTimeline(cues, 67).environment.rainIntensity, 0);
    assert.equal(replayMusicTimeline(cues, 68).environment.rainIntensity, 0.2);
    assert.equal(replayMusicTimeline(cues, 95).environment.skyColor, '#123456');
    assert.equal(replayMusicTimeline(cues, 0).environment.skyColor, '#233a72');
    state.renameProject(state.activeProjectId, 'Keep my title');
    state.undo();
    assert.deepEqual(useProjectStore.getState().project.timeline.cues[2], original);
    assert.equal(useProjectStore.getState().project.metadata.title, 'Keep my title');
    state.redo();
    assert.equal(environmentPayload(useProjectStore.getState().project.timeline.cues[2].actions[0]).skyColor, '#123456');
  });

  it('removes optional overrides and restores their exact presence on undo', () => {
    useProjectStore.getState().updateCueEnvironment('weather-front', 0, {});
    const action = useProjectStore.getState().project.timeline.cues[2].actions[0];
    assert.equal('rainIntensity' in action.payload, false);
    const inherited = replayMusicTimeline(compileNormalizedMusicTimeline(useProjectStore.getState().project.timeline.cues, 200), 80).environment;
    assert.equal(inherited.skyColor, '#334b85');
    assert.equal(inherited.rainIntensity, 0);
    assert.equal(inherited.bloomIntensity, 0.45);
    useProjectStore.getState().undo();
    assert.equal(environmentPayload(useProjectStore.getState().project.timeline.cues[2].actions[0]).rainIntensity, 0.7);
    useProjectStore.getState().redo();
    assert.equal('skyColor' in useProjectStore.getState().project.timeline.cues[2].actions[0].payload, false);
  });

  it('preserves project, revision and redo on invalid, missing and unchanged environment edits', () => {
    const store = useProjectStore.getState();
    store.updateCueEnvironment('weather-front', 0, { rainIntensity: 0.4 });
    store.undo();
    const before = useProjectStore.getState();
    for (const values of [{ rainIntensity: 2 }, { bloomIntensity: NaN }, { skyColor: 'red' }]) {
      store.updateCueEnvironment('weather-front', 0, values);
      assert.equal(useProjectStore.getState().project, before.project);
      assert.equal(useProjectStore.getState().revision, before.revision);
      assert.equal(useProjectStore.getState().redoStack, before.redoStack);
      assert.ok(useProjectStore.getState().error);
    }
    store.updateCueEnvironment('weather-front', 1, {});
    store.updateCueEnvironment('missing-cue', 0, {});
    store.updateCueEnvironment('weather-front', 0, { skyColor: '#3a5486', groundColor: '#6e668e', rainIntensity: 0.7 });
    assert.equal(useProjectStore.getState().revision, before.revision);
    assert.equal(useProjectStore.getState().redoStack, before.redoStack);
  });

  it('targets the selected action and isolates edits from other projects and the template', () => {
    const store = useProjectStore.getState();
    store.updateCueEnvironment('memory-tree', 1, { bloomIntensity: 1.5 });
    assert.equal(environmentPayload(useProjectStore.getState().project.timeline.cues[3].actions[1]).bloomIntensity, 1.5);
    assert.equal(environmentPayload(defaultMusicWorldProject.timeline.cues[3].actions[1]).bloomIntensity, 0.65);
    store.createProject();
    assert.equal(useProjectStore.getState().undoStack.length, 0);
    assert.equal(environmentPayload(useProjectStore.getState().project.timeline.cues[3].actions[1]).bloomIntensity, 0.65);
  });
  beforeEach(() => {
    const project = freshDefault();
    useProjectStore.setState({
      project,
      drafts: [{ project, deletedAt: null }],
      activeProjectId: project.id,
      status: 'ready',
      hydrated: true,
      revision: 0,
      lastSavedAt: null,
      error: null,
      undoStack: [], redoStack: [], editorMode: null, archivePreview: null, draggingArchive: false,
    });
  });

  it('edits the Memory Archive without mutating the default project', () => {
    useProjectStore.getState().updateArchivePosition(-12, -18);
    const project = useProjectStore.getState().project;
    const archive = project.scene.objects.find(({ id }) => id === 'memory-archive');
    const defaultArchive = defaultMusicWorldProject.scene.objects.find(({ id }) => id === 'memory-archive');

    assert.deepEqual(archive?.transform.position, [-12, 0, -18]);
    assert.deepEqual(defaultArchive?.transform.position, [-8, 0, -11]);
    assert.equal(useProjectStore.getState().revision, 1);
  });

  it('imports a valid project and preserves the current draft after invalid input', () => {
    const imported = freshDefault();
    imported.metadata.title = 'Imported Journey';
    assert.deepEqual(useProjectStore.getState().importJson(exportMusicWorldProject(imported)), { ok: true });
    assert.equal(useProjectStore.getState().project.metadata.title, 'Imported Journey');

    const before = useProjectStore.getState().project;
    const result = useProjectStore.getState().importJson('{"schemaVersion":999}');
    assert.equal(result.ok, false);
    assert.equal(useProjectStore.getState().project, before);
    assert.equal(useProjectStore.getState().status, 'error');
  });

  it('exports the current validated project', () => {
    useProjectStore.getState().updateArchivePosition(-3, -14);
    const exported = importMusicWorldProject(useProjectStore.getState().exportJson());
    const archive = exported.scene.objects.find(({ id }) => id === 'memory-archive');
    assert.deepEqual(archive?.transform.position, [-3, 0, -14]);
  });

  it('creates, duplicates, renames, and opens independent projects', () => {
    useProjectStore.getState().createProject();
    const createdId = useProjectStore.getState().activeProjectId;
    useProjectStore.getState().renameProject(createdId, 'Quiet Orbit');
    useProjectStore.getState().duplicateProject(createdId);
    const duplicateId = useProjectStore.getState().activeProjectId;

    assert.notEqual(createdId, duplicateId);
    assert.equal(useProjectStore.getState().project.metadata.title, 'Quiet Orbit Copy');
    assert.equal(useProjectStore.getState().drafts.filter(({ deletedAt }) => deletedAt === null).length, 3);

    useProjectStore.getState().openProject(createdId);
    assert.equal(useProjectStore.getState().project.metadata.title, 'Quiet Orbit');
  });

  it('soft-deletes the active project, selects a fallback, and restores it', () => {
    const originalId = useProjectStore.getState().activeProjectId;
    useProjectStore.getState().createProject();
    const createdId = useProjectStore.getState().activeProjectId;
    useProjectStore.getState().deleteProject(createdId);

    assert.equal(useProjectStore.getState().activeProjectId, originalId);
    assert.equal(useProjectStore.getState().drafts.find(({ project }) => project.id === createdId)?.deletedAt !== null, true);

    useProjectStore.getState().restoreProject(createdId);
    assert.equal(useProjectStore.getState().drafts.find(({ project }) => project.id === createdId)?.deletedAt, null);
  });

  it('edits one normalized cue and rejects an out-of-range position', () => {
    useProjectStore.getState().updateCuePosition('weather-front', 0.41);
    assert.equal(
      useProjectStore.getState().project.timeline.cues.find(({ id }) => id === 'weather-front')?.position,
      0.41,
    );
    const before = useProjectStore.getState().project;
    useProjectStore.getState().updateCuePosition('weather-front', 1.5);
    assert.equal(useProjectStore.getState().project, before);
    assert.match(useProjectStore.getState().error ?? '', /between 0 and 1/);
  });

  it('undoes and redoes mixed edits while preserving a renamed project', () => {
    const state = useProjectStore.getState();
    const original = state.project.timeline.cues.find(({ id }) => id === 'weather-front')?.position;
    state.updateArchivePosition(-12, -18);
    state.updateCuePosition('weather-front', 0.41);
    state.renameProject(state.activeProjectId, 'Keep this name');
    state.undo();
    assert.equal(useProjectStore.getState().project.timeline.cues.find(({ id }) => id === 'weather-front')?.position, original);
    state.undo();
    assert.deepEqual(useProjectStore.getState().project.scene.objects.find(({ id }) => id === 'memory-archive')?.transform.position, [-8, 0, -11]);
    assert.equal(useProjectStore.getState().project.metadata.title, 'Keep this name');
    state.redo(); state.redo();
    assert.equal(useProjectStore.getState().project.timeline.cues.find(({ id }) => id === 'weather-front')?.position, 0.41);
    assert.equal(useProjectStore.getState().revision, 7);
  });

  it('keeps preview out of exports and saved drafts, and commits a drag once', () => {
    const state = useProjectStore.getState();
    state.setEditorMode('drag'); state.beginArchiveDrag();
    state.previewArchivePosition(-9, -12); state.previewArchivePosition(-10, -14);
    assert.equal(useProjectStore.getState().revision, 0);
    assert.deepEqual(JSON.parse(state.exportJson()).scene.objects.find((object: { id: string }) => object.id === 'memory-archive').transform.position, [-8, 0, -11]);
    assert.equal(useProjectStore.getState().drafts[0].project, useProjectStore.getState().project);
    state.undo();
    assert.equal(useProjectStore.getState().draggingArchive, true);
    state.commitArchiveDrag(); state.commitArchiveDrag();
    assert.equal(useProjectStore.getState().undoStack.length, 1);
    assert.equal(useProjectStore.getState().revision, 1);
    state.undo();
    assert.deepEqual(useProjectStore.getState().project.scene.objects.find(({ id }) => id === 'memory-archive')?.transform.position, [-8, 0, -11]);
  });

  it('cancels preview and ignores late pointer movement and release', () => {
    const state = useProjectStore.getState();
    state.setEditorMode('drag'); state.beginArchiveDrag(); state.previewArchivePosition(4, 5);
    state.cancelArchiveDrag(); state.previewArchivePosition(6, 7); state.commitArchiveDrag();
    assert.equal(useProjectStore.getState().revision, 0);
    assert.equal(useProjectStore.getState().archivePreview, null);
    state.beginArchiveDrag(); state.previewArchivePosition(8, 9); state.setEditorMode('panel'); state.commitArchiveDrag();
    assert.equal(useProjectStore.getState().revision, 0);
  });

  it('keeps history after no-op or invalid edits and clears redo on a new edit', () => {
    const state = useProjectStore.getState();
    state.updateArchivePosition(-10, -12); state.undo();
    const revision = useProjectStore.getState().revision;
    state.updateArchivePosition(-8, -11); state.updateArchivePosition(NaN, 0);
    state.updateCuePosition('weather-front', 2);
    assert.equal(useProjectStore.getState().revision, revision);
    assert.equal(useProjectStore.getState().redoStack.length, 1);
    state.updateCuePosition('weather-front', 0.42);
    assert.equal(useProjectStore.getState().redoStack.length, 0);
  });

  it('isolates history when switching, importing, resetting or deleting the active project', () => {
    const state = useProjectStore.getState();
    const originalId = state.activeProjectId;
    state.updateArchivePosition(-10, -12); state.createProject();
    assert.equal(useProjectStore.getState().undoStack.length, 0);
    state.updateArchivePosition(-3, -4); state.openProject(originalId);
    assert.equal(useProjectStore.getState().undoStack.length, 0);
    state.updateArchivePosition(-11, -13); state.importJson(state.exportJson());
    assert.equal(useProjectStore.getState().undoStack.length, 0);
    state.updateArchivePosition(-3, -4); state.resetToDefault();
    assert.equal(useProjectStore.getState().undoStack.length, 0);
    state.updateArchivePosition(-3, -4); state.deleteProject(useProjectStore.getState().activeProjectId);
    assert.equal(useProjectStore.getState().undoStack.length, 0);
  });

  it('preserves undo history and in-memory edits after persistence or import failure', () => {
    const state = useProjectStore.getState();
    state.updateArchivePosition(-10, -12);
    state.markSaveError('Storage full'); state.importJson('invalid JSON');
    assert.equal(useProjectStore.getState().undoStack.length, 1);
    state.undo();
    assert.equal(useProjectStore.getState().status, 'ready');
    assert.deepEqual(useProjectStore.getState().project.scene.objects.find(({ id }) => id === 'memory-archive')?.transform.position, [-8, 0, -11]);
  });

  it('cancels an in-flight drag when opening another draft', () => {
    const state = useProjectStore.getState();
    const originalId = state.activeProjectId;
    state.duplicateProject();
    state.setEditorMode('drag'); state.beginArchiveDrag(); state.previewArchivePosition(42, 43);
    state.openProject(originalId); state.commitArchiveDrag();
    assert.equal(useProjectStore.getState().archivePreview, null);
    assert.equal(useProjectStore.getState().undoStack.length, 0);
    assert.deepEqual(useProjectStore.getState().project.scene.objects.find(({ id }) => id === 'memory-archive')?.transform.position, [-8, 0, -11]);
  });

  it('bounds history to 100 edits and retains the surviving redo branch', () => {
    const state = useProjectStore.getState();
    for (let index = 0; index < 105; index += 1) state.updateArchivePosition(index, -11);
    assert.equal(useProjectStore.getState().undoStack.length, 100);
    for (let index = 0; index < 101; index += 1) state.undo();
    assert.equal(useProjectStore.getState().project.scene.objects.find(({ id }) => id === 'memory-archive')?.transform.position[0], 4);
    for (let index = 0; index < 101; index += 1) state.redo();
    assert.equal(useProjectStore.getState().project.scene.objects.find(({ id }) => id === 'memory-archive')?.transform.position[0], 104);
  });
});
