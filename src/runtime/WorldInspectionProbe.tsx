import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { InteractionDispatcher } from '../interaction/InteractionDispatcher';
import { getInteractionVisualProfile } from '../interaction/visualProfiles';
import { useMusicRuntimeStore } from '../music/runtime/useMusicRuntimeStore';
import { useInteractionStore } from '../state/useInteractionStore';
import { useWorldStore } from '../state/useWorldStore';

interface WorldInspectionSnapshot {
  worldId: string | null;
  playerPosition: [number, number, number] | null;
  currentObjectiveId: string | null;
  nearestInteractionId: string | null;
  flags: Readonly<Record<string, unknown>>;
  environment: {
    rainIntensity: number;
    stars: number;
  };
  interactions: Array<{
    id: string;
    label: string;
    position: [number, number, number];
    radius: number;
    collider: ReturnType<typeof getInteractionVisualProfile>['collider'];
  }>;
}

interface WorldInspectionApi {
  snapshot: WorldInspectionSnapshot;
  triggerInteraction: (id: string) => boolean;
}

type InspectionWindow = Window & {
  __MUSIC_UNIVERSE_WORLD_E2E__?: WorldInspectionApi;
};

function currentObjectiveId(flags: Readonly<Record<string, unknown>>) {
  if (flags['journey.completed'] === true) return null;
  if (flags['journey.started'] !== true) return 'npc-guide';
  if (flags['memory.received'] !== true) return 'memory-archive';
  return 'departure-gate';
}

/**
 * Machine-readable world semantics for browser regression checks. This stays
 * inert unless `?e2e=1` is present and gives agents/tests a stable view of the
 * authored world without scraping pixels or traversing private Three objects.
 */
export default function WorldInspectionProbe() {
  const scene = useThree((state) => state.scene);
  const activeWorld = useWorldStore((state) => state.activeWorld);
  const flags = useInteractionStore((state) => state.interactionFlags);
  const nearestInteractionId = useInteractionStore(
    (state) => state.nearestInteractionId,
  );
  const environment = useMusicRuntimeStore((state) => state.environment);
  const enabled = useRef(
    typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('e2e'),
  );
  const lastUpdateAt = useRef(0);

  useFrame(() => {
    if (!enabled.current || performance.now() - lastUpdateAt.current < 100) return;
    lastUpdateAt.current = performance.now();
    const player = scene.getObjectByName('player');

    (window as InspectionWindow).__MUSIC_UNIVERSE_WORLD_E2E__ = {
      snapshot: {
        worldId: activeWorld?.id ?? null,
        playerPosition: player
          ? [player.position.x, player.position.y, player.position.z]
          : null,
        currentObjectiveId: currentObjectiveId(flags),
        nearestInteractionId,
        flags,
        environment: {
          rainIntensity: environment.rainIntensity ?? 0,
          stars: environment.stars ?? 0,
        },
        interactions:
          activeWorld?.interactions.map((interaction) => ({
            id: interaction.id,
            label: interaction.label,
            position: interaction.position,
            radius: interaction.radius ?? 3,
            collider: getInteractionVisualProfile(interaction.visual.type).collider,
          })) ?? [],
      },
      triggerInteraction: (id) =>
        InteractionDispatcher.executeInteraction(id, 'proximity'),
    };
  });

  useEffect(
    () => () => {
      if (enabled.current) {
        delete (window as InspectionWindow).__MUSIC_UNIVERSE_WORLD_E2E__;
      }
    },
    [],
  );

  return null;
}
