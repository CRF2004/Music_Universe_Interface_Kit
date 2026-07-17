import { useMemo } from 'react';
import { useMusicExperienceStore } from '../state/useMusicExperienceStore';

export default function MusicReactiveWorld() {
  const timeline = useMusicExperienceStore((state) => state.timeline);
  const energy = useMusicExperienceStore((state) => state.energy);

  const stars = timeline.environment.stars ?? 0;
  const portalOpen = timeline.portals.departure ?? false;
  const treeVisible = timeline.landmarks['memory-tree'] ?? false;
  const lightPathVisible = timeline.landmarks['light-path'] ?? false;

  const points = useMemo(
    () =>
      Array.from({ length: stars }, (_, index) => (
        <mesh key={index} position={[(index % 24) - 12, 2 + (index % 9), -8]}>
          <sphereGeometry args={[0.025 + energy.treble * 0.02]} />
          <meshBasicMaterial color="white" />
        </mesh>
      )),
    [stars, energy.treble],
  );

  return (
    <group>
      {points}
      {treeVisible && (
        <mesh position={[-2, 1, -3]} scale={1 + energy.mid * 0.05}>
          <coneGeometry args={[0.6, 2, 16]} />
          <meshStandardMaterial color="#6ee7b7" />
        </mesh>
      )}
      {lightPathVisible && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -5]}>
          <planeGeometry args={[2, 10]} />
          <meshBasicMaterial color="#fde68a" />
        </mesh>
      )}
      {portalOpen && (
        <mesh position={[0, 1, -4]} scale={1 + energy.bass * 0.2}>
          <torusGeometry args={[1, 0.08, 16, 64]} />
          <meshBasicMaterial color="#8b5cf6" />
        </mesh>
      )}
    </group>
  );
}
