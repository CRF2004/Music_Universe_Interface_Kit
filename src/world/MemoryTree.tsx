import { useAnimations, useGLTF, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import {
  Component,
  Suspense,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { selectAssetLod, type AssetLod } from '../assets/assetLod';
import { useRuntimeAsset } from '../assets/runtimeAssetManifest';
import { MEMORY_TREE_POSITION } from './environmentLayout';

const TREE_POSITION = new Vector3(...MEMORY_TREE_POSITION);
const LOD_THRESHOLDS = { enterNear: 18, exitNear: 22 };

function MemoryTreeFallback() {
  return (
    <group>
      <mesh castShadow position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.26, 0.48, 2.8, 10]} />
        <meshStandardMaterial color="#60422f" roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 3.15, 0]}>
        <icosahedronGeometry args={[1.45, 2]} />
        <meshStandardMaterial
          color="#c7a4ff"
          emissive="#7545b5"
          emissiveIntensity={0.8}
          transparent
          opacity={0.78}
        />
      </mesh>
    </group>
  );
}

function MemoryTreeModel({
  modelUrl,
  textureUrl,
}: {
  modelUrl: string;
  textureUrl: string;
}) {
  const root = useRef<Group>(null);
  const glowMaterials = useRef<MeshStandardMaterial[]>([]);
  const { scene, animations } = useGLTF(modelUrl);
  const canopyTexture = useTexture(textureUrl);
  const instance = useMemo(() => {
    canopyTexture.colorSpace = SRGBColorSpace;
    canopyTexture.wrapS = canopyTexture.wrapT = RepeatWrapping;
    canopyTexture.repeat.set(1.4, 1.4);

    const clone = scene.clone(true);
    const glows: MeshStandardMaterial[] = [];
    clone.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const materials = sourceMaterials.map((source) => {
        const material = source.clone() as MeshStandardMaterial;
        if (/canopy/i.test(mesh.name) || /canopy/i.test(material.name)) {
          material.map = canopyTexture;
          material.transparent = true;
          material.opacity = 0.72;
          material.depthWrite = false;
          material.emissive = new Color('#6941a5');
          material.emissiveIntensity = 0.75;
          glows.push(material);
        } else if (/vein/i.test(mesh.name) || /vein/i.test(material.name)) {
          glows.push(material);
        }
        material.needsUpdate = true;
        return material;
      });
      mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
    });
    glowMaterials.current = glows;
    return clone;
  }, [canopyTexture, scene]);
  const { actions } = useAnimations(animations, root);

  useEffect(() => {
    const action = actions.MemoryTreeIdle;
    action?.reset().fadeIn(0.35).play();
    return () => {
      action?.fadeOut(0.2);
    };
  }, [actions]);

  useFrame(({ clock }) => {
    const pulse = 0.72 + Math.sin(clock.elapsedTime * 1.25) * 0.24;
    for (const material of glowMaterials.current) material.emissiveIntensity = pulse;
  });

  return (
    <group ref={root}>
      <primitive object={instance} />
    </group>
  );
}

class MemoryTreeAssetBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[Asset Pipeline]: Memory Tree asset failed to load.', error, info);
  }

  render() {
    return this.state.failed ? <MemoryTreeFallback /> : this.props.children;
  }
}

export default function MemoryTree() {
  const [lod, setLod] = useState<AssetLod>('far');
  const highModel = useRuntimeAsset('memory-tree', 'model');
  const lowModel = useRuntimeAsset('memory-tree-lod', 'model');
  const texture = useRuntimeAsset('memory-tree-canopy', 'texture');

  useFrame(({ camera }) => {
    const next = selectAssetLod(camera.position.distanceTo(TREE_POSITION), lod, LOD_THRESHOLDS);
    if (next !== lod) setLod(next);
  });

  const model = lod === 'near' ? highModel : lowModel;
  if (model.status !== 'ready' || texture.status !== 'ready') return <MemoryTreeFallback />;

  return (
    <MemoryTreeAssetBoundary>
      <Suspense fallback={<MemoryTreeFallback />}>
        <MemoryTreeModel
          key={lod}
          modelUrl={model.asset.url}
          textureUrl={texture.asset.url}
        />
      </Suspense>
    </MemoryTreeAssetBoundary>
  );
}
