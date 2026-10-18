import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  Color,
  Group,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  Vector3,
} from 'three';
import { useInteractionStore } from '../state/useInteractionStore';
import { useWorldStore } from '../state/useWorldStore';
import { journeyRoutePoint } from './environmentLayout';
import { useProjectStore } from '../state/useProjectStore';
import { planetRadius, surfaceCoordinates, surfacePosition, surfaceQuaternion, surfaceUp } from './planetSurface';
import SurfaceGroup from './SurfaceGroup';

const PATH_MARKER_COUNT = 12;

const JOURNEY_TARGETS = {
  guide: {
    label: 'Listener Guide',
    instruction: 'Speak with the Guide',
    position: new Vector3(0, 0, -5),
    color: '#42a5ff',
  },
  archive: {
    label: 'Memory Archive',
    instruction: 'Recover the memory',
    position: new Vector3(-8, 0, -11),
    color: '#b18cff',
  },
  gate: {
    label: 'Departure Gate',
    instruction: 'Carry the memory home',
    position: new Vector3(0, 0, -15),
    color: '#4adb7d',
  },
} as const;

export default function JourneyWorldGuide() {
  const flags = useInteractionStore((state) => state.interactionFlags);
  const reducedEffects = useWorldStore((state) => state.reducedEffects);
  const scene = useThree((state) => state.scene);
  const path = useRef<InstancedMesh>(null);
  const beacon = useRef<Group>(null);
  const helper = useMemo(() => new Object3D(), []);
  const playerPosition = useMemo(() => new Vector3(), []);
  const direction = useMemo(() => new Vector3(), []);
  const terrain = useProjectStore((state) => state.project.scene.environment.terrain);
  const radius = planetRadius(terrain);
  const authoredObjects = useProjectStore((state) => state.project.scene.objects);

  const target =
    flags['journey.started'] !== true
      ? JOURNEY_TARGETS.guide
      : flags['memory.received'] !== true
        ? JOURNEY_TARGETS.archive
        : JOURNEY_TARGETS.gate;
  const completed = flags['journey.completed'] === true;
  const targetId = target === JOURNEY_TARGETS.guide ? 'npc-guide' : target === JOURNEY_TARGETS.archive ? 'memory-archive' : 'departure-gate';
  const destination = authoredObjects.find(({ id }) => id === targetId)?.transform.position ?? target.position.toArray();
  const targetPosition = surfacePosition(destination, radius);
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(target.color),
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [target.color],
  );

  useFrame(({ clock }) => {
    if (completed) return;
    const player = scene.getObjectByName('player');
    if (!player || !path.current) return;
    player.getWorldPosition(playerPosition);
    direction.set(...targetPosition).sub(playerPosition);
    const distance = direction.length();
    direction.normalize();

    for (let index = 0; index < PATH_MARKER_COUNT; index += 1) {
      const progress = (index + 1) / (PATH_MARKER_COUNT + 1);
      const routeTarget = target === JOURNEY_TARGETS.archive ? 'archive' : target === JOURNEY_TARGETS.gate ? 'gate' : 'guide';
      const routePosition = journeyRoutePoint(
        surfaceCoordinates(playerPosition.toArray(), radius),
        routeTarget,
        progress,
      );
      if (targetId === 'memory-archive') {
        routePosition[0] += (destination[0] + 8) * progress;
        routePosition[2] += (destination[2] + 11) * progress;
      }
      if (radius !== null) {
        const destinationUp = surfaceUp(surfacePosition([routePosition[0], 0, routePosition[2]], radius), radius);
        helper.position.copy(destinationUp.multiplyScalar(radius + 0.09 + Math.sin(clock.elapsedTime * 3.4 - index * 0.7) * 0.035));
        helper.position.y -= radius;
      } else {
        helper.position.set(...routePosition);
        helper.position.y = 0.09 + Math.sin(clock.elapsedTime * 3.4 - index * 0.7) * 0.035;
      }
      helper.rotation.set(Math.PI / 2, Math.atan2(direction.x, direction.z), 0);
      helper.quaternion.premultiply(surfaceQuaternion(helper.position.toArray(), radius));
      const pulse = reducedEffects ? 0.8 : 0.78 + Math.sin(clock.elapsedTime * 4 - index * 0.8) * 0.18;
      helper.scale.setScalar(pulse * (0.13 + progress * 0.06));
      helper.updateMatrix();
      path.current.setMatrixAt(index, helper.matrix);
    }
    path.current.instanceMatrix.needsUpdate = true;

    if (beacon.current && !reducedEffects) {
      beacon.current.position.y = Math.sin(clock.elapsedTime * 2.2) * 0.22;
      beacon.current.rotation.y += 0.012;
    }
  });

  if (completed) return null;

  return (
    <group>
      <instancedMesh
        ref={path}
        args={[undefined, undefined, PATH_MARKER_COUNT]}
        frustumCulled={false}
        userData={{ cameraOccluder: false }}
      >
        <octahedronGeometry args={[1, 0]} />
        <primitive object={material} attach="material" />
      </instancedMesh>

      <SurfaceGroup position={destination}>
        <group ref={beacon}>
          <mesh position={[0, 3.1, 0]} rotation={[0, 0, Math.PI / 4]}>
            <octahedronGeometry args={[0.34, 0]} />
            <meshBasicMaterial color={target.color} />
          </mesh>
          <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.15, 1.35, 40]} />
            <meshBasicMaterial
              color={target.color}
              transparent
              opacity={0.72}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
          <mesh position={[0, 1.5, 0]}>
            <cylinderGeometry args={[0.04, 0.32, 3, 16, 1, true]} />
            <meshBasicMaterial
              color={target.color}
              transparent
              opacity={0.22}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
        </group>
        <Html position={[0, 3.8, 0]} center distanceFactor={11} occlude>
          <div className="pointer-events-none min-w-max rounded-xl border-2 border-white/80 bg-ink/90 px-3 py-2 text-center text-white shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">
              Current destination
            </p>
            <p className="font-display font-bold">{target.label}</p>
            <p className="text-xs text-white/80">{target.instruction}</p>
          </div>
        </Html>
      </SurfaceGroup>
    </group>
  );
}
