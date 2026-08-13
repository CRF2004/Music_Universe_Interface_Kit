import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry,
  Float32BufferAttribute,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  Points,
  PointsMaterial,
  Color,
} from 'three';
import { useMusicRuntimeStore } from '../music/runtime/useMusicRuntimeStore';
import { useWorldStore } from '../state/useWorldStore';
import DeparturePortal from './DeparturePortal';
import EnvironmentScenery from './EnvironmentScenery';
import LightPath from './LightPath';
import MemoryTree from './MemoryTree';
import {
  createSkyStarPositions,
  DEPARTURE_GATE_POSITION,
  MEMORY_TREE_POSITION,
} from './environmentLayout';
import RevealTransition from './RevealTransition';

const MAX_STAR_COUNT = 520;

function StarField({ count }: { count: number }) {
  const points = useRef<Points>(null);
  const currentCount = useRef(0);
  const starField = useMemo(() => {
    const geometry = new BufferGeometry();
    const positions = createSkyStarPositions(MAX_STAR_COUNT);
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const colors: number[] = [];
    for (let index = 0; index < MAX_STAR_COUNT; index += 1) {
      const color = new Color(index % 7 === 0 ? '#d8c8ff' : index % 5 === 0 ? '#b8dfff' : '#fff8e8');
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.setDrawRange(0, 0);
    const material = new PointsMaterial({
      size: 0.11,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    });
    return { geometry, material };
  }, []);

  useEffect(
    () => () => {
      starField.geometry.dispose();
      starField.material.dispose();
    },
    [starField],
  );

  useFrame(({ scene }, delta) => {
    if (!points.current) return;
    const target = Math.min(MAX_STAR_COUNT, Math.max(0, count));
    const blend = 1 - Math.exp(-1.35 * Math.min(delta, 0.1));
    currentCount.current += (target - currentCount.current) * blend;
    const renderedCount = Math.round(currentCount.current);
    points.current.geometry.setDrawRange(0, renderedCount);
    scene.userData.renderedEnvironment = {
      ...scene.userData.renderedEnvironment,
      stars: renderedCount,
    };
  });

  return (
    <points
      ref={points}
      geometry={starField.geometry}
      material={starField.material}
      userData={{ cameraOccluder: false }}
    />
  );
}

function RainParticles({ intensity }: { intensity: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const material = useRef<MeshBasicMaterial>(null);
  const currentIntensity = useRef(0);
  const dropCount = 80;
  const helper = useMemo(() => new Object3D(), []);
  const drops = useMemo(
    () =>
      Array.from({ length: dropCount }, (_, index) => ({
        x: ((index * 37) % 173) / 8 - 10.8,
        z: -2 - ((index * 61) % 181) / 7,
        phase: ((index * 47) % 101) / 101,
        speed: 5.2 + ((index * 29) % 37) / 10,
        length: 0.7 + ((index * 13) % 19) / 20,
      })),
    [dropCount],
  );

  useFrame(({ clock }, delta) => {
    if (!mesh.current) return;
    currentIntensity.current +=
      (intensity - currentIntensity.current) * (1 - Math.exp(-1.7 * Math.min(delta, 0.1)));
    const elapsed = clock.getElapsedTime();
    drops.forEach((drop, index) => {
      const cycleHeight = 13;
      const rawY = drop.phase * cycleHeight - elapsed * drop.speed;
      const y = 1 + ((rawY % cycleHeight) + cycleHeight) % cycleHeight;
      helper.position.set(drop.x, y, drop.z);
      helper.scale.set(1, drop.length * currentIntensity.current, 1);
      helper.updateMatrix();
      mesh.current.setMatrixAt(index, helper.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (material.current) material.current.opacity = 0.48 * currentIntensity.current;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, dropCount]}
      frustumCulled={false}
      userData={{ cameraOccluder: false }}
    >
      <boxGeometry args={[0.018, 0.42, 0.018]} />
      <meshBasicMaterial ref={material} color="#8ac7ff" transparent opacity={0} depthWrite={false} />
    </instancedMesh>
  );
}

export default function MusicReactiveWorld() {
  const reducedEffects = useWorldStore((state) => state.reducedEffects);
  const runtimeStars = useMusicRuntimeStore((state) => state.environment.stars ?? 0);
  const runtimeRainIntensity = useMusicRuntimeStore((state) => state.environment.rainIntensity ?? 0);
  const stars = reducedEffects ? Math.min(runtimeStars, 90) : runtimeStars;
  const rainIntensity = reducedEffects ? 0 : runtimeRainIntensity;
  const portalOpen = useMusicRuntimeStore((state) => state.portals.departure ?? false);
  const memoryTreeVisible = useMusicRuntimeStore((state) => state.landmarks['memory-tree'] ?? false);
  const lightPathVisible = useMusicRuntimeStore((state) => state.landmarks['light-path'] ?? false);

  return (
    <group>
      <EnvironmentScenery />
      <StarField count={stars} />
      {!reducedEffects && <RainParticles intensity={rainIntensity} />}
      <group name="memory-tree-landmark" position={MEMORY_TREE_POSITION}>
        <RevealTransition visible={memoryTreeVisible} duration={1.6} name="memory-tree-reveal">
          <MemoryTree />
          <Html position={[0, 4.7, 0]} center>
            <div className="whitespace-nowrap rounded-full bg-black/75 px-3 py-1 font-display text-sm font-bold text-white">
              Memory Tree
            </div>
          </Html>
        </RevealTransition>
      </group>
      {lightPathVisible && (
        <group>
          <LightPath />
          <Html position={[0, 0.8, -7]} center>
            <div className="whitespace-nowrap rounded-full bg-black/75 px-3 py-1 font-display text-sm font-bold text-white">
              Light Path
            </div>
          </Html>
        </group>
      )}
      <group name="departure-gate-landmark" position={DEPARTURE_GATE_POSITION}>
        <RevealTransition visible={portalOpen} duration={1.1} name="departure-gate-reveal">
          <DeparturePortal />
          <Html position={[0, 4.75, 0]} center>
            <div className="whitespace-nowrap rounded-full bg-black/75 px-3 py-1 font-display text-sm font-bold text-white">
              Departure Gate
            </div>
          </Html>
        </RevealTransition>
      </group>
    </group>
  );
}
