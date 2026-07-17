import { useFrame } from '@react-three/fiber';
import { useMusicExperienceStore } from '../state/useMusicExperienceStore';

export default function MusicEnvironmentController() {
  const energy = useMusicExperienceStore((state) => state.energy);

  useFrame(() => {
    const root = document.querySelector('canvas');
    if (!root) return;

    const overall = energy?.overall ?? 0;
    root.style.filter = `brightness(${1 + overall * 0.08})`;
  });

  return null;
}
