import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { useMusicRuntimeStore } from '../music/runtime/useMusicRuntimeStore';

function RainParticles({ intensity }: { intensity: number }) {
  const group = useRef<Group>(null);
  const drops = useMemo(
    () =>
      Array.from({ length: Math.round(intensity * 80) }, (_, index) => (
        <mesh key={index} position={[(index % 16) - 8, 2 + (index % 10), -2 - (index % 12)]}>
          <boxGeometry args={[0.015, 0.45, 0.015]} />
          <meshBasicMaterial color="#8ac7ff" transparent opacity={0.45} />
        </mesh>
      )),
    [intensity],
  );

  useFrame(({ clock }) => {
    if (group.current) group.current.position.y = -((clock.getElapsedTime() * 4) % 10);
  });

  return <group ref={group}>{drops}</group>;
}

export default function MusicReactiveWorld() {
  const stars = useMusicRuntimeStore((state) => state.environment.stars ?? 0);
  const rainIntensity = useMusicRuntimeStore((state) => state.environment.rainIntensity ?? 0);
  const portalOpen = useMusicRuntimeStore((state) => state.portals.departure ?? false);
  const memoryTreeVisible = useMusicRuntimeStore((state) => state.landmarks['memory-tree'] ?? false);
  const lightPathVisible = useMusicRuntimeStore((state) => state.landmarks['light-path'] ?? false);

  const points = useMemo(() => {
    return Array.from({ length: Math.min(stars, 520) }, (_, index) => (
      <mesh key={index} position={[(index % 26) - 13, 3 + (index % 11) * 0.7, -5 - (index % 17)]}>
        <sphereGeometry args={[0.03]} />
        <meshBasicMaterial color="white" />
      </mesh>
    ));
  }, [stars]);

  return (
    <group>
      {points}
      {rainIntensity > 0 && <RainParticles intensity={rainIntensity} />}
      {memoryTreeVisible && (
        <group position={[-3, 0, -7]}>
          <mesh position={[0, 1.25, 0]}><cylinderGeometry args={[0.2, 0.35, 2.5]} /><meshStandardMaterial color="#6b3f2a" /></mesh>
          <mesh position={[0, 3, 0]}><sphereGeometry args={[1.35, 24, 24]} /><meshStandardMaterial color="#d39cff" emissive="#7138a8" emissiveIntensity={0.6} /></mesh>
          <Html position={[0, 4.7, 0]} center>
            <div className="whitespace-nowrap rounded-full bg-black/75 px-3 py-1 font-display text-sm font-bold text-white">
              Memory Tree
            </div>
          </Html>
        </group>
      )}
      {lightPathVisible && (
        <group>
          {Array.from({ length: 9 }, (_, index) => (
            <mesh key={index} position={[0, 0.04, -2 - index * 1.1]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.28, 24]} />
              <meshBasicMaterial color="#fff1a8" />
            </mesh>
          ))}
          <Html position={[0, 0.8, -7]} center>
            <div className="whitespace-nowrap rounded-full bg-black/75 px-3 py-1 font-display text-sm font-bold text-white">
              Light Path
            </div>
          </Html>
        </group>
      )}
      {portalOpen && (
        <group position={[0, 1.6, -10.5]}>
          <mesh>
            <torusGeometry args={[1.35, 0.16, 16, 64]} />
            <meshStandardMaterial color="#b69cff" emissive="#8b5cf6" emissiveIntensity={2.5} />
          </mesh>
          <Html position={[0, 2, 0]} center>
            <div className="whitespace-nowrap rounded-full bg-black/75 px-3 py-1 font-display text-sm font-bold text-white">
              Departure Portal
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
