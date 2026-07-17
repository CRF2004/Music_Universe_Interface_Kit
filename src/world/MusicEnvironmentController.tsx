import { useFrame } from '@react-three/fiber';
import { useMusicRuntimeStore } from './music/runtime/useMusicRuntimeStore';

export default function MusicEnvironmentController() {
  const environment = useMusicRuntimeStore((state) => state.environment);

  useFrame(() => {
    const root = document.querySelector('canvas');
    if (!root) return;

    const bloom = environment.bloomIntensity ?? 0;
    const rain = environment.rainIntensity ?? 0;
    root.style.filter = `brightness(${1 + bloom * 0.05 + rain * 0.02})`;
  });

  return null;
}
