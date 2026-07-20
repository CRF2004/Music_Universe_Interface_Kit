import { useFrame } from '@react-three/fiber';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { useMusicRuntimeStore } from '../music/runtime/useMusicRuntimeStore';

export default function MusicEnvironmentController() {
  const environment = useMusicRuntimeStore((state) => state.environment);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    scene.background = new THREE.Color(environment.skyColor ?? '#111827');
    scene.fog = environment.fogColor
      ? new THREE.FogExp2(environment.fogColor, environment.fogDensity ?? 0)
      : null;

    return () => {
      scene.fog = null;
    };
  }, [environment.fogColor, environment.fogDensity, environment.skyColor, scene]);

  useFrame(() => {
    const bloom = environment.bloomIntensity ?? 0;
    const rain = environment.rainIntensity ?? 0;
    scene.traverse((object) => {
      if (object instanceof THREE.AmbientLight) object.intensity = 0.55 + bloom * 0.25;
      if (object instanceof THREE.DirectionalLight) {
        object.intensity = 0.8 + bloom * 0.3 - rain * 0.15;
      }
    });
  });

  return null;
}
