import { useFrame } from '@react-three/fiber';
import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useMusicRuntimeStore } from '../music/runtime/useMusicRuntimeStore';
import { useWorldStore } from '../state/useWorldStore';

export default function MusicEnvironmentController() {
  const environment = useMusicRuntimeStore((state) => state.environment);
  const scene = useThree((state) => state.scene);
  const reducedEffects = useWorldStore((state) => state.reducedEffects);
  const targetSky = useRef(new THREE.Color('#26375d'));
  const targetFog = useRef(new THREE.Color('#26375d'));
  const currentBloom = useRef(0);
  const currentRain = useRef(0);

  useEffect(() => {
    targetSky.current.set(environment.skyColor ?? '#26375d');
    targetFog.current.set(environment.fogColor ?? environment.skyColor ?? '#26375d');
    if (!(scene.background instanceof THREE.Color)) scene.background = targetSky.current.clone();
    if (!(scene.fog instanceof THREE.FogExp2)) scene.fog = new THREE.FogExp2(targetFog.current, 0);

    return () => {
      scene.fog = null;
    };
  }, [environment.fogColor, environment.skyColor, scene]);

  useFrame((_, delta) => {
    const blend = reducedEffects ? 1 : 1 - Math.exp(-1.35 * Math.min(delta, 0.1));
    const targetBloom = reducedEffects ? 0 : (environment.bloomIntensity ?? 0);
    const targetRain = reducedEffects ? 0 : (environment.rainIntensity ?? 0);
    currentBloom.current = THREE.MathUtils.lerp(currentBloom.current, targetBloom, blend);
    currentRain.current = THREE.MathUtils.lerp(currentRain.current, targetRain, blend);
    if (scene.background instanceof THREE.Color) scene.background.lerp(targetSky.current, blend);
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.lerp(targetFog.current, blend);
      scene.fog.density = THREE.MathUtils.lerp(
        scene.fog.density,
        environment.fogDensity ?? 0,
        blend,
      );
    }
    const bloom = currentBloom.current;
    const rain = currentRain.current;
    scene.userData.renderedEnvironment = {
      ...scene.userData.renderedEnvironment,
      skyColor: scene.background instanceof THREE.Color ? `#${scene.background.getHexString()}` : null,
      fogDensity: scene.fog instanceof THREE.FogExp2 ? scene.fog.density : 0,
      bloomIntensity: bloom,
      rainIntensity: rain,
    };
    scene.traverse((object) => {
      if (object instanceof THREE.AmbientLight) object.intensity = 0.55 + bloom * 0.25;
      if (object instanceof THREE.DirectionalLight) {
        object.intensity = 0.8 + bloom * 0.3 - rain * 0.15;
      }
    });
  });

  return null;
}
