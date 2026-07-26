import { useAnimations, useGLTF } from '@react-three/drei';
import { Component, type ErrorInfo, type ReactNode, Suspense, useEffect, useMemo, useRef } from 'react';
import type { Group, Mesh } from 'three';
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

  useEffect(() => {
    if (state.status === 'error') {
      console.warn('[Asset Pipeline]: Using Departure Portal fallback.', state.error);
    }
  }, [state]);

  if (state.status !== 'ready') return <DeparturePortalFallback />;

  return (
    <PortalAssetBoundary>
      <Suspense fallback={<DeparturePortalFallback />}>
        <DeparturePortalModel url={state.asset.url} />
      </Suspense>
    </PortalAssetBoundary>
  );
}
