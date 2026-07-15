import { InteractionPointDefinition } from '../interaction/interactionTypes';
import { WorldDefinition } from '../world/worldTypes';
import { SpatialObjectDefinition, SpatialSceneDefinition } from './spatialSceneSchema';
import { assertSpatialScene } from './validateSpatialScene';

function compileObject(object: SpatialObjectDefinition): InteractionPointDefinition {
  const { transform, appearance = {}, interaction } = object;

  return {
    id: object.id,
    label: object.label,
    description: object.description,
    kind: interaction.kind,
    group: interaction.group,
    tags: interaction.tags,
    position: transform.position,
    rotation: transform.rotation,
    scale: transform.scale,
    radius: interaction.radius,
    priority: interaction.priority,
    enabled: interaction.enabled,
    visible: interaction.visible,
    visual: {
      type: object.type,
      ...appearance,
    },
    triggers: interaction.triggers,
    actions: interaction.actions,
    metadata: object.metadata,
  };
}

export function compileSpatialScene(input: unknown): WorldDefinition {
  assertSpatialScene(input);

  const scene: SpatialSceneDefinition = input;
  const { environment } = scene;

  return {
    id: scene.id,
    name: scene.name,
    description: scene.description,
    spawnPoint: scene.spawn ?? [0, 0, 0],
    style: {
      theme: environment.theme,
      ...environment.effects,
    },
    camera: environment.camera ?? {},
    terrain: environment.terrain,
    zones: scene.zones ?? [],
    interactions: scene.objects.map(compileObject),
  };
}
