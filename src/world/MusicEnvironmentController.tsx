import { useFrame } from '@react-three/fiber';
import { useMusicExperienceStore } from '../state/useMusicExperienceStore';

export default function MusicEnvironmentController() {
  const environment = useMusicExperienceStore((state) => state.timeline.environment);
  const energy = useMusicExperienceStore((state) => state.energy);

  useFrame(() => {
    const root = document.querySelector('canvas');
    if (!root) return;

    root.style.background = environment.skyColor;
    root.style.filter = `brightness(${1 + energy.overall * 0.08})`;
  });

  return null;
}
