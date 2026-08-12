import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry,
  Float32BufferAttribute,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  PointsMaterial,
} from 'three';
import { useMusicRuntimeStore } from '../music/runtime/useMusicRuntimeStore';
import { useWorldStore } from '../state/useWorldStore';
import DeparturePortal from './DeparturePortal';
import EnvironmentScenery from './EnvironmentScenery';
import LightPath from './LightPath';
import MemoryTree from './MemoryTree';
import { createSkyStarPositions, MEMORY_TREE_POSITION } from './environmentLayout';

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

  const starField = useMemo(() => {
    const geometry = new BufferGeometry();
    const positions = createSkyStarPositions(Math.min(stars, 520));
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const material = new PointsMaterial({
      color: 'white',
      size: 0.075,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    return { geometry, material };
  }, [stars]);

  return (
    <group>
      <EnvironmentScenery />
      <points
        geometry={starField.geometry}
        material={starField.material}
        userData={{ cameraOccluder: false }}
      />
      {!reducedEffects && <RainParticles intensity={rainIntensity} />}
      {memoryTreeVisible && (
        <group position={MEMORY_TREE_POSITION}>
          <MemoryTree />
          <Html position={[0, 4.7, 0]} center>
            <div className="whitespace-nowrap rounded-full bg-black/75 px-3 py-1 font-display text-sm font-bold text-white">
              Memory Tree
            </div>
          </Html>
        </group>
      )}
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
      {portalOpen && (
        <group position={[0, 0, -15]}>
          <DeparturePortal />
          <Html position={[0, 4.75, 0]} center>
            <div className="whitespace-nowrap rounded-full bg-black/75 px-3 py-1 font-display text-sm font-bold text-white">
              Departure Gate
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
