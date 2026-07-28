import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Object3D,
  PointsMaterial,
} from 'three';
import { useMusicRuntimeStore } from '../music/runtime/useMusicRuntimeStore';
import { useWorldStore } from '../state/useWorldStore';
import DeparturePortal from './DeparturePortal';
import EnvironmentScenery from './EnvironmentScenery';
import LightPath from './LightPath';
import MemoryTree from './MemoryTree';

function RainParticles({ intensity }: { intensity: number }) {
  const group = useRef<Group>(null);
  const mesh = useRef<InstancedMesh>(null);
  const dropCount = Math.max(1, Math.round(intensity * 80));
  const helper = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    if (!mesh.current) return;
    for (let index = 0; index < dropCount; index += 1) {
      helper.position.set((index % 16) - 8, 2 + (index % 10), -2 - (index % 12));
      helper.updateMatrix();
      mesh.current.setMatrixAt(index, helper.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [dropCount, helper]);

  useFrame(({ clock }) => {
    if (group.current) group.current.position.y = -((clock.getElapsedTime() * 4) % 10);
  });

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[undefined, undefined, dropCount]}>
        <boxGeometry args={[0.015, 0.45, 0.015]} />
        <meshBasicMaterial color="#8ac7ff" transparent opacity={0.45} depthWrite={false} />
      </instancedMesh>
    </group>
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
    const positions: number[] = [];
    for (let index = 0; index < Math.min(stars, 520); index += 1) {
      positions.push((index % 26) - 13, 3 + (index % 11) * 0.7, -5 - (index % 17));
    }
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
      {rainIntensity > 0 && <RainParticles intensity={rainIntensity} />}
      {memoryTreeVisible && (
        <group position={[-8, 0, -11]}>
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
