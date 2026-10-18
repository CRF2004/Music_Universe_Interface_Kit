import { InteractionPointDefinition } from '../interaction/interactionTypes';
import { WorldDefinition } from '../world/worldTypes';
import { SpatialObjectDefinition, SpatialSceneDefinition } from './spatialSceneSchema';
import { assertSpatialScene } from './validateSpatialScene';
import { planetRadius, surfacePosition, surfaceRotation } from '../world/planetSurface';

function compileObject(
  object: SpatialObjectDefinition,
  defaultOutline?: boolean,
  radius: number | null = null,
): InteractionPointDefinition {
  const { transform, appearance = {}, interaction } = object;

  return {
    id: object.id,
    label: object.label,
    description: object.description,
    kind: interaction.kind,
    group: interaction.group,
    tags: interaction.tags,
    position: surfacePosition(transform.position, radius),
    rotation: surfaceRotation(surfacePosition(transform.position, radius), radius, transform.rotation),
    scale: transform.scale,
    radius: interaction.radius,
    priority: interaction.priority,
    enabled: interaction.enabled,
    visible: interaction.visible,
    visual: {
      type: object.type,
      ...appearance,
      outline: appearance.outline ?? defaultOutline,
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
  const radius = planetRadius(environment.terrain);

  return {
    id: scene.id,
    name: scene.name,
    description: scene.description,
    spawnPoint: surfacePosition(scene.spawn ?? [0, 0, 0], radius),
    style: {
      theme: environment.theme,
      ...environment.effects,
    },
    camera: environment.camera ?? {},
    terrain: environment.terrain,
    zones: (scene.zones ?? []).map((zone) => ({ ...zone, position: surfacePosition(zone.position, radius) })),
    interactions: scene.objects.map((object) =>
      compileObject(object, environment.effects?.outline, radius),
    ),
  };
}
