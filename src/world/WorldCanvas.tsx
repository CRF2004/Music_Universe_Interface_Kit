import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { Physics } from '@react-three/rapier';
import { Sky, Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Noise, Vignette, Bloom, DotScreen } from '@react-three/postprocessing';
import { Leva } from 'leva';
import Scene from './WorldScene';
import CameraRig from '../camera/CameraRig';
import { useWorldStore } from '../state/useWorldStore';

export default function WorldCanvas() {
  const isPaused = useWorldStore((state) => state.isPaused);
  const isDevMode = useWorldStore((state) => state.isDevMode);
  const activeWorld = useWorldStore((state) => state.activeWorld);

  return (
    <div className="fixed inset-0 w-full h-full bg-[#111827]">
      <Leva hidden={!isDevMode} />
      <Canvas shadows camera={{ position: [0, 5, 10], fov: 75 }}>
        <Suspense fallback={null}>
          <Sky distance={450000} sunPosition={[0, 1, 0]} />
          <Environment preset="city" />
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <Physics gravity={[0, -9.81, 0]} paused={isPaused}>
            <Scene />
          </Physics>
          <CameraRig />
          <ContactShadows opacity={0.4} scale={10} blur={2.4} far={4.5} />
          <EffectComposer>
            <Vignette eskil={false} offset={0.3} darkness={activeWorld?.style.vignetteIntensity ?? 0.5} />
            <Bloom intensity={0.5} luminanceThreshold={1} />
            {activeWorld?.style.grain && <Noise opacity={activeWorld.style.grainIntensity ?? 0.02} />}
            {activeWorld?.style.halftone && <DotScreen angle={Math.PI * 0.25} scale={1} />}
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
