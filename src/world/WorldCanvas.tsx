import { Canvas } from '@react-three/fiber';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import CameraRig from '../camera/CameraRig';
import { useWorldStore } from '../state/useWorldStore';
import { useInteractionStore } from '../state/useInteractionStore';
import WorldStartupFallback from '../ui/WorldStartupFallback';
import { useProjectStore } from '../state/useProjectStore';
import { getWorldLook } from './worldLooks';

const PhysicsWorld = lazy(() => import('./PhysicsWorld'));

const DebugControls = lazy(async () => {
  const { Leva } = await import('leva');
  return { default: Leva };
});

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
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const isPaused = useWorldStore((state) => state.isPaused);
  const editorMode = useProjectStore((state) => state.editorMode);
  const isDevMode = useWorldStore((state) => state.isDevMode);
  const reducedEffects = useWorldStore((state) => state.reducedEffects);
  const activePanelId = useInteractionStore((state) => state.activePanelId);
  const spherical = useProjectStore((state) => state.project.scene.environment.terrain.type === 'sphere');
  const lookId = useProjectStore(state => state.project.scene.environment.look);
  const look = getWorldLook(lookId);
  const rememberCanvas = useCallback(
    ({ gl }: { gl: { domElement: HTMLCanvasElement } }) => setCanvasElement(gl.domElement),
    [],
  );

  useEffect(() => {
    if (!canvasElement) return undefined;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setContextLost(true);
    };
    canvasElement.addEventListener('webglcontextlost', handleContextLost);
    return () => canvasElement.removeEventListener('webglcontextlost', handleContextLost);
  }, [canvasElement]);

  useEffect(() => {
    if ((activePanelId || isPaused) && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [activePanelId, isPaused]);

  if (contextLost) {
    return (
      <WorldStartupFallback
        kind="context-lost"
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="fixed inset-0 h-full w-full bg-[#26375d]">
      {isDevMode && (
        <Suspense fallback={null}>
          <DebugControls />
        </Suspense>
      )}
      <Canvas
        onCreated={rememberCanvas}
        onPointerDown={() => {
          if (!isPaused && !useWorldStore.getState().helpOpen && useProjectStore.getState().editorMode === null) {
            const activeCanvas = document.querySelector('canvas');
            if (
              activeCanvas instanceof HTMLCanvasElement &&
              activeCanvas.isConnected &&
              activeCanvas.ownerDocument === document
            ) {
              if (document.pointerLockElement !== activeCanvas) {
                activeCanvas.dataset.pointerLockAcquisitionClick = 'true';
                void activeCanvas.requestPointerLock();
              } else {
                delete activeCanvas.dataset.pointerLockAcquisitionClick;
              }
            }
          }
        }}
        shadows={!reducedEffects}
        dpr={reducedEffects ? 1 : [1, 1.5]}
        camera={{ position: [0, 5, 10], fov: 75 }}
      >
        <Suspense fallback={<LoadingWorld />}>
          <PhysicsWorld paused={isPaused || editorMode === 'drag'} />
        </Suspense>
        <ambientLight intensity={0.85} />
        {spherical && <hemisphereLight args={[look?.skyLight ?? '#dce5ff', look?.bounceLight ?? '#a998c3', look ? 1.4 : .7]} />}
        <directionalLight position={look ? [-12, 20, 10] : [10,10,5]} color={look?.keyColor ?? '#ffffff'} intensity={look?.key ?? 1.15} castShadow shadow-mapSize={look ? [2048,2048] : [512,512]} shadow-camera-left={look ? -35 : -5} shadow-camera-right={look ? 35 : 5} shadow-camera-top={look ? 30 : 5} shadow-camera-bottom={look ? -35 : -5} shadow-normalBias={look ? .05 : 0} shadow-bias={look ? -.0001 : 0} />
        <CameraRig />
      </Canvas>
    </div>
  );
}
