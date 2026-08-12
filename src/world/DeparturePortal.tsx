import { useAnimations, useGLTF } from '@react-three/drei';
import { Component, type ErrorInfo, type ReactNode, Suspense, useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, type Group, type Mesh } from 'three';
import { useFrame } from '@react-three/fiber';
import { useWorldStore } from '../state/useWorldStore';
import { useRuntimeAsset } from '../assets/runtimeAssetManifest';

function DeparturePortalFallback() {
  return (
    <group>
      <mesh castShadow position={[0, 2.05, 0]}>
        <torusGeometry args={[1.65, 0.22, 16, 64]} />
        <meshStandardMaterial color="#b69cff" emissive="#8b5cf6" emissiveIntensity={2.5} />
      </mesh>
      <mesh position={[0, 2.05, 0.02]}>
        <circleGeometry args={[1.45, 64]} />
        <meshBasicMaterial color="#8064df" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

function DeparturePortalModel({ url }: { url: string }) {
  const root = useRef<Group>(null);
  const { scene, animations } = useGLTF(url);
  const instance = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);
  const { actions } = useAnimations(animations, root);

  useEffect(() => {
    const action = actions.PortalIdle;
    action?.reset().fadeIn(0.25).play();
    return () => {
      action?.fadeOut(0.15);
    };
  }, [actions]);

  return (
    <group ref={root}>
      <primitive object={instance} />
    </group>
  );
}

interface PortalAssetBoundaryProps {
  children: ReactNode;
}

interface PortalAssetBoundaryState {
  failed: boolean;
}

class PortalAssetBoundary extends Component<
  PortalAssetBoundaryProps,
  PortalAssetBoundaryState
> {
  state: PortalAssetBoundaryState = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[Asset Pipeline]: Departure Portal GLB failed to load.', error, info);
  }

  render() {
    return this.state.failed ? <DeparturePortalFallback /> : this.props.children;
  }
}

export default function DeparturePortal() {
  const state = useRuntimeAsset('departure-portal', 'model');
  const effects = useRef<Group>(null);
  const reducedEffects = useWorldStore((world) => world.reducedEffects);

  useFrame(({ clock }, delta) => {
    if (!effects.current || reducedEffects) return;
    effects.current.rotation.z += delta * 0.34;
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.4) * 0.055;
    effects.current.scale.setScalar(pulse);
  });

  useEffect(() => {
    if (state.status === 'error') {
      console.warn('[Asset Pipeline]: Using Departure Portal fallback.', state.error);
    }
  }, [state]);

  return (
    <group>
      {state.status !== 'ready' ? (
        <DeparturePortalFallback />
      ) : (
        <PortalAssetBoundary>
          <Suspense fallback={<DeparturePortalFallback />}>
            <DeparturePortalModel url={state.asset.url} />
          </Suspense>
        </PortalAssetBoundary>
      )}
      <group ref={effects} position={[0, 2.05, 0.08]} userData={{ cameraOccluder: false }}>
        {[0, Math.PI / 3, -Math.PI / 3].map((rotation, index) => (
          <mesh key={rotation} rotation={[0, 0, rotation]}>
            <torusGeometry args={[1.86 + index * 0.2, 0.025, 8, 72, Math.PI * 1.35]} />
            <meshBasicMaterial
              color={index === 0 ? '#efffe9' : '#8dffd0'}
              transparent
              opacity={0.34 - index * 0.07}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
        ))}
        <mesh position={[0, 0, -0.03]}>
          <circleGeometry args={[1.48, 64]} />
          <meshBasicMaterial
            color="#79e8c1"
            transparent
            opacity={0.22}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      </group>
      <mesh position={[0, 0.025, 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.4, 64]} />
        <meshBasicMaterial
          color="#6fffc3"
          transparent
          opacity={0.11}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <pointLight color="#72ffca" intensity={2.1} distance={18} position={[0, 2.3, 1]} />
    </group>
  );
}
