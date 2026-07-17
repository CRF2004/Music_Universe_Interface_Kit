import { useMemo } from 'react';
import { useAudioPlayerStore } from '../music/player/useAudioPlayerStore';

export default function MusicReactiveWorld() {
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const progress = Math.min(1, currentTime / 120);

  const stars = Math.floor(progress * 120);
  const portalOpen = progress > 0.5;

  const points = useMemo(() => {
    return Array.from({ length: stars }, (_, index) => (
      <mesh key={index} position={[(index % 12) - 6, 3 + (index % 5), -5]}>
        <sphereGeometry args={[0.03]} />
        <meshBasicMaterial color="white" />
      </mesh>
    ));
  }, [stars]);

  return (
    <group>
      {points}
      {portalOpen && (
        <mesh position={[0, 1, -4]}>
          <torusGeometry args={[1, 0.08, 16, 64]} />
          <meshBasicMaterial color="#8b5cf6" />
        </mesh>
      )}
    </group>
  );
}
