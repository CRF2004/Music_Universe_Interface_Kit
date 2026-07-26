import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { Physics } from '@react-three/rapier';
import { ContactShadows } from '@react-three/drei';
import { Leva } from 'leva';
import Scene from './WorldScene';
import CameraRig from '../camera/CameraRig';
import { useWorldStore } from '../state/useWorldStore';

function LoadingWorld() {
  return (
    <>
      <color attach="background" args={['#26375d']} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[6, 10, 4]} intensity={1.4} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#f7ead7" />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <capsuleGeometry args={[0.3, 0.7, 4, 8]} />
        <meshStandardMaterial color="#ff3b2f" />
      </mesh>
    </>
  );
}

export default function WorldCanvas() {
  const isPaused = useWorldStore((state) => state.isPaused);
  const isDevMode = useWorldStore((state) => state.isDevMode);

  return (
    <div className="fixed inset-0 h-full w-full bg-[#26375d]">
      <Leva hidden={!isDevMode} />
      <Canvas shadows camera={{ position: [0, 5, 10], fov: 75 }}>
        <Suspense fallback={<LoadingWorld />}>
          <Physics gravity={[0, -9.81, 0]} paused={isPaused}>
            <Scene />
          </Physics>
        </Suspense>
        <ambientLight intensity={0.85} />
        <directionalLight position={[10, 10, 5]} intensity={1.15} castShadow />
        <CameraRig />
        <ContactShadows opacity={0.4} scale={10} blur={2.4} far={4.5} />
      </Canvas>
    </div>
  );
}
