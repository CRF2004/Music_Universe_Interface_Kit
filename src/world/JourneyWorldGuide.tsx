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

  const target =
    flags['journey.started'] !== true
      ? JOURNEY_TARGETS.guide
      : flags['memory.received'] !== true
        ? JOURNEY_TARGETS.archive
        : JOURNEY_TARGETS.gate;
  const completed = flags['journey.completed'] === true;
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
    direction.copy(target.position).sub(playerPosition);
    const distance = direction.length();
    direction.normalize();

    for (let index = 0; index < PATH_MARKER_COUNT; index += 1) {
      const progress = (index + 1) / (PATH_MARKER_COUNT + 1);
      const routeTarget = target === JOURNEY_TARGETS.archive ? 'archive' : target === JOURNEY_TARGETS.gate ? 'gate' : 'guide';
      const routePosition = journeyRoutePoint(
        [playerPosition.x, playerPosition.y, playerPosition.z],
        routeTarget,
        progress,
      );
      helper.position.set(...routePosition);
      helper.position.y = 0.09 + Math.sin(clock.elapsedTime * 3.4 - index * 0.7) * 0.035;
      helper.rotation.set(Math.PI / 2, Math.atan2(direction.x, direction.z), 0);
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

      <group position={target.position}>
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
        <Html position={[0, 3.8, 0]} center distanceFactor={11}>
          <div className="pointer-events-none min-w-max rounded-xl border-2 border-white/80 bg-ink/90 px-3 py-2 text-center text-white shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">
              Current destination
            </p>
            <p className="font-display font-bold">{target.label}</p>
            <p className="text-xs text-white/80">{target.instruction}</p>
          </div>
        </Html>
      </group>
    </group>
  );
}
