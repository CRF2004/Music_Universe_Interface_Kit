import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createWindGarden } from './windGarden';
import { createCoastalStudy } from './coastalStudy';
import { exportMusicWorldProject, importMusicWorldProject } from './musicWorldProjectIO';
import { validateMusicWorldProject } from './validateMusicWorldProject';
import { compileSpatialScene } from '../schema';
import { useInteractionStore } from '../state/useInteractionStore';
import { InteractionDispatcher } from '../interaction/InteractionDispatcher';
import { WIND, windStage, windResponseAt, windBloom } from '../interaction/windGardenRuntime';
import { compileNormalizedMusicTimeline } from '../music/musicTimeline';
import { replayMusicTimeline } from '../music/runtime/musicExperienceRuntime';

function prepare() {
  const project = createWindGarden();
  useInteractionStore.getState().replaceInteractions(compileSpatialScene(project.scene).interactions);
  useInteractionStore.getState().resetInteractionRuntime('restart');
  return project;
}
const flags = () => useInteractionStore.getState().interactionFlags;
describe('Childhood wind play slice', () => {
  it('preserves a valid separate project with data-driven roles, route and score', () => {
    const baseline = createCoastalStudy(), before = structuredClone(baseline);
    const project = createWindGarden();
    assert.notEqual(project.id, baseline.id);
    assert.deepEqual(baseline, before);
    assert.equal(baseline.scene.windGarden, undefined);
    assert.deepEqual(importMusicWorldProject(exportMusicWorldProject(project)), project);
    assert.equal(project.track.assetId, 'scott-buckley-childhood');
    assert.equal(project.scene.objects.length, 4);
    assert.ok(project.timeline.cues.every(cue => cue.actions.every(action => ['set-camera', 'set-environment'].includes(action.type))));
  });
  it('blocks out-of-order actions and requires distinct operations followed by walking', () => {
    prepare();
    const run = (id: string, time: number, trigger: 'proximity' | 'zone-enter' = 'proximity') => InteractionDispatcher.executeInteraction(id, trigger, time);
    assert.equal(run('wind-flowerbed', 1000), false);
    assert.equal(run('wind-destination', 1100, 'zone-enter'), false);
    assert.equal(windStage(flags()), 'find');
    assert.equal(run('wind-pickup', 2000), true);
    assert.equal(windStage(flags()), 'carry');
    assert.equal(run('wind-flowerbed', 3000), true);
    assert.equal(windStage(flags()), 'turn');
    assert.equal(flags()[WIND.turned], undefined);
    assert.equal(run('wind-flowerbed', 3200), false); // cooldown
    assert.equal(run('wind-flowerbed', 4000), true);
    assert.equal(windStage(flags()), 'align');
    assert.equal(run('wind-flowerbed', 5000), true);
    assert.equal(windStage(flags()), 'walk');
    assert.equal(flags()[WIND.completed], undefined);
    assert.equal(run('wind-destination', 5100, 'zone-enter'), false);
    assert.equal(run('wind-checkpoint', 5200, 'zone-enter'), true);
    assert.equal(run('wind-destination', 6000, 'zone-enter'), true);
    assert.equal(windStage(flags()), 'complete');
    assert.equal(run('wind-destination', 8000, 'zone-enter'), false);
    assert.equal(run('wind-flowerbed', 8000), false);
  });
  it('seeking music cannot fabricate progress or erase earned interactions', () => {
    const project = prepare();
    const cues = compileNormalizedMusicTimeline(project.timeline.cues, project.track.expectedDurationSeconds!);
    replayMusicTimeline(cues, 137);
    assert.equal(windStage(flags()), 'find');
    InteractionDispatcher.executeInteraction('wind-pickup', 'proximity', 2000);
    replayMusicTimeline(cues, 0);
    assert.equal(windStage(flags()), 'carry');
    useInteractionStore.getState().resetInteractionRuntime('restart');
    assert.equal(windStage(flags()), 'find');
    assert.equal(useInteractionStore.getState().triggerState.executedTriggers.size, 0);
  });
  it('clears wind progress on replay, replacement and world replacement', () => {
    prepare();
    for (const reason of ['replay', 'track-replaced', 'world-replaced'] as const) {
      useInteractionStore.getState().setFlag(WIND.completed, true);
      useInteractionStore.getState().resetInteractionRuntime(reason);
      assert.equal(windStage(flags()), 'find');
    }
  });
  it('caps musical response waiting and reconstructs bloom without timer replay', () => {
    assert.equal(windResponseAt(20.8, [22, 44]), 22);
    assert.equal(windResponseAt(17, [22, 44]), 17);
    assert.equal(windResponseAt(138, [22, 44]), 138);
    assert.equal(windBloom(21, 22, false), 0);
    assert.equal(windBloom(22.9, 22, false).toFixed(1), '0.5');
    assert.equal(windBloom(44, 22, false), 1);
    assert.equal(windBloom(0, 22, false), 1);
    assert.equal(windBloom(21, 22, true), 1);
    assert.equal(windBloom(21, null, false), 1);
  });
  it('rejects broken role bindings, bad versions, nonlocal paths and unordered markers', () => {
    const project = createWindGarden();
    assert.ok(project.scene.windGarden);
    project.scene.windGarden.pickupId = 'missing';
    assert.equal(validateMusicWorldProject(project).valid, false);
    const badPath = createWindGarden(); badPath.scene.windGarden!.path[0] = [90, 0, 0];
    assert.equal(validateMusicWorldProject(badPath).valid, false);
    const badMarkers = createWindGarden(); badMarkers.scene.windGarden!.responseMarkersSeconds = [22, 21];
    assert.equal(validateMusicWorldProject(badMarkers).valid, false);
    const badType = createWindGarden(); badType.scene.objects[0].type = 'crate';
    assert.equal(validateMusicWorldProject(badType).valid, false);
  });
});
