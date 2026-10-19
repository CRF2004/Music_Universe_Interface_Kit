import { createCoastalStudy } from './coastalStudy';
import { assertMusicWorldProject } from './validateMusicWorldProject';
import type { SpatialObjectDefinition, Vector3Tuple } from '../schema/spatialSceneSchema';
import { WIND, windCondition, windTurnActions } from '../interaction/windGardenRuntime';

export function createWindGarden() {
  const project = createCoastalStudy();
  project.id = 'childhood-wind-garden-m1';
  project.metadata.title = '把风带回来 · Childhood';
  project.metadata.description = 'Childhood 专属风车玩法样片：寻找、安放、转动、循花瓣走过花亭。';
  project.scene.id = project.id;
  project.scene.name = project.metadata.title;
  project.scene.spawn = [0, 0, 3];
  project.scene.windGarden = {
    version: 1, pickupId: 'wind-pickup', wheelId: 'wind-flowerbed',
    checkpointId: 'wind-checkpoint', destinationId: 'wind-destination',
    path: [[0, 0, -9], [3, 0, -13], [7, 0, -17], [9, 0, -22], [8, 0, -28]],
    responseMarkersSeconds: [22, 44, 64, 88.2, 96, 124.5],
  };
  const point = (id: string, type: string, label: string, position: Vector3Tuple): SpatialObjectDefinition => ({
    id, type, label, transform: { position }, appearance: { outline: false, labelVisible: 'never' },
    interaction: { kind: 'custom', enabled: true, visible: true, radius: 2.8,
      triggers: [{ type: 'proximity', prompt: '按 E · 靠近看看', cooldownMs: 650 }, { type: 'click', cooldownMs: 650 }], actions: [] },
  });
  const pickup = point('wind-pickup', 'paper-pinwheel', '纸风车', [-1, 0, -3]);
  pickup.interaction.triggers.forEach(trigger => { trigger.conditions = [windCondition(WIND.carried, false)]; });
  pickup.interaction.actions = [{ id: 'pick-up-wheel', type: 'set-flag', payload: { key: WIND.carried, value: true } }];
  const wheel = point('wind-flowerbed', 'wind-flowerbed', '迎风花圃', [0, 0, -10]);
  wheel.interaction.triggers.forEach(trigger => { trigger.conditions = [windCondition(WIND.carried), windCondition(WIND.awakened, false)]; });
  wheel.interaction.actions = windTurnActions();
  const checkpoint = point('wind-checkpoint', 'wind-marker', '花瓣小径', [7, 0, -17]);
  checkpoint.interaction.radius = 2.2;
  checkpoint.interaction.triggers = [{ type: 'zone-enter', once: true, conditions: [windCondition(WIND.awakened)] }];
  checkpoint.interaction.actions = [{ id: 'walk-petal-path', type: 'set-flag', payload: { key: WIND.checkpoint, value: true } }];
  const destination = point('wind-destination', 'wind-marker', '听风花亭', [8, 0, -28]);
  destination.interaction.triggers = [{ type: 'zone-enter', once: true, conditions: [windCondition(WIND.checkpoint)] }];
  destination.interaction.actions = [{ id: 'bring-wind-home', type: 'set-flag', payload: { key: WIND.completed, value: true } }];
  project.scene.objects = [pickup, wheel, checkpoint, destination];
  // Music remains the original full mix. Only the current slice's visual score is active.
  project.timeline.cues = project.timeline.cues.map(cue => ({ ...cue,
    actions: cue.actions.filter(action => action.type === 'set-environment' || action.type === 'set-camera'),
  }));
  project.worldBible.premise = '把纸风车带到花圃，找回风的方向，让花瓣引你走进花亭。';
  assertMusicWorldProject(project);
  return project;
}
