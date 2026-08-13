import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
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
    skyColor: string | null;
    fogDensity: number;
    bloomIntensity: number;
    rainIntensity: number;
    stars: number;
    rendered: {
      skyColor: string | null;
      fogDensity: number;
      bloomIntensity: number;
      rainIntensity: number;
      stars: number;
    };
  };
  visuals: {
    listenerGuide: {
      mounted: boolean;
      facingYaw: number;
      responseIntensity: number;
    } | null;
    archiveAwakening: number;
    archiveFacadeAwakening: number;
    memoryTree: RevealVisualSnapshot | null;
    departureGateCharge: RevealVisualSnapshot | null;
    departureGate: RevealVisualSnapshot | null;
    departureGateAfterglow: RevealVisualSnapshot | null;
  };
  interactions: Array<{
    id: string;
    label: string;
    position: [number, number, number];
    radius: number;
    collider: ReturnType<typeof getInteractionVisualProfile>['collider'];
  }>;
}

interface RevealVisualSnapshot {
  mounted: boolean;
  scale: number;
  position: [number, number, number];
}

function revealSnapshot(
  scene: THREE.Scene,
  revealName: string,
  landmarkName: string,
): RevealVisualSnapshot | null {
  const reveal = scene.getObjectByName(revealName);
  const landmark = scene.getObjectByName(landmarkName);
  if (!reveal || !landmark) return null;
  const worldPosition = landmark.getWorldPosition(new THREE.Vector3());
  return reveal
    ? {
        mounted: true,
        scale: reveal.scale.x,
        position: [worldPosition.x, worldPosition.y, worldPosition.z],
      }
    : null;
}

interface WorldInspectionApi {
  snapshot: WorldInspectionSnapshot;
  getSnapshot: () => WorldInspectionSnapshot;
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

  const createSnapshot = (): WorldInspectionSnapshot => {
    const worldState = useWorldStore.getState();
    const interactionState = useInteractionStore.getState();
    const runtimeEnvironment = useMusicRuntimeStore.getState().environment;
    const player = scene.getObjectByName('player');
    const currentFlags = interactionState.interactionFlags;
    return {
      worldId: worldState.activeWorld?.id ?? null,
      playerPosition: player
        ? [player.position.x, player.position.y, player.position.z]
        : null,
      currentObjectiveId: currentObjectiveId(currentFlags),
      nearestInteractionId: interactionState.nearestInteractionId,
      flags: currentFlags,
      environment: {
        skyColor: runtimeEnvironment.skyColor ?? null,
        fogDensity: runtimeEnvironment.fogDensity ?? 0,
        bloomIntensity: runtimeEnvironment.bloomIntensity ?? 0,
        rainIntensity: runtimeEnvironment.rainIntensity ?? 0,
        stars: runtimeEnvironment.stars ?? 0,
        rendered: scene.userData.renderedEnvironment ?? {
          skyColor: null,
          fogDensity: 0,
          bloomIntensity: 0,
          rainIntensity: 0,
          stars: 0,
        },
      },
      visuals: {
        listenerGuide: (() => {
          const character = scene.getObjectByName('listener-guide-character');
          const identity = scene.getObjectByName('listener-guide-identity');
          return character && identity
            ? {
                mounted: true,
                facingYaw: character.rotation.y,
                responseIntensity: Number(identity.userData.responseIntensity ?? 0),
              }
            : null;
        })(),
        archiveAwakening:
          scene.getObjectByName('archive-building-body')?.userData.awakeningProgress ?? 0,
        archiveFacadeAwakening:
          scene.getObjectByName('archive-facade-detail')?.userData.awakeningProgress ?? 0,
        memoryTree: revealSnapshot(scene, 'memory-tree-reveal', 'memory-tree-landmark'),
        departureGateCharge: revealSnapshot(
          scene,
          'departure-gate-charge-reveal',
          'departure-gate-landmark',
        ),
        departureGate: revealSnapshot(scene, 'departure-gate-reveal', 'departure-gate-landmark'),
        departureGateAfterglow: revealSnapshot(
          scene,
          'departure-gate-afterglow-reveal',
          'departure-gate-landmark',
        ),
      },
      interactions:
        worldState.activeWorld?.interactions.map((interaction) => ({
          id: interaction.id,
          label: interaction.label,
          position: interaction.position,
          radius: interaction.radius ?? 3,
          collider: getInteractionVisualProfile(interaction.visual.type).collider,
        })) ?? [],
    };
  };

  useFrame(() => {
    if (!enabled.current || performance.now() - lastUpdateAt.current < 100) return;
    lastUpdateAt.current = performance.now();
    const snapshot = createSnapshot();
    (window as InspectionWindow).__MUSIC_UNIVERSE_WORLD_E2E__ = {
      snapshot,
      getSnapshot: createSnapshot,
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
