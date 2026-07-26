import { useGLTF } from '@react-three/drei';
import {
  Component,
  Suspense,
  useMemo,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import {
  Box3,
  Color,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { useRuntimeAsset } from '../assets/runtimeAssetManifest';

export interface RuntimeInteractionVisualProps {
  assetId: string;
  targetHeight: number;
  colorToken: string;
  emissive?: boolean;
  onClick?: (event: unknown) => void;
  fallback: ReactNode;
}

class InteractionAssetBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; assetId: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(
      `[Asset Pipeline]: Interaction model "${this.props.assetId}" failed to load.`,
      error,
      info,
    );
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function RuntimeInteractionModel({
  url,
  targetHeight,
  colorToken,
  emissive,
}: Omit<RuntimeInteractionVisualProps, 'assetId' | 'fallback' | 'onClick'> & {
  url: string;
}) {
  const { scene } = useGLTF(url);
  const { instance, scale } = useMemo(() => {
    const clone = scene.clone(true);
    const bounds = new Box3().setFromObject(clone);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const normalizedScale = targetHeight / Math.max(size.y, 0.001);

    clone.position.set(-center.x, -bounds.min.y, -center.z);
    const accentColor = new Color(colorToken);
    clone.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const sourceMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const materials = sourceMaterials.map((source) => {
        const material =
          source instanceof MeshStandardMaterial
            ? source.clone()
            : new MeshStandardMaterial({ color: colorToken });
        material.roughness = 0.68;
        material.metalness = Math.min(material.metalness ?? 0, 0.16);
        material.color.lerp(accentColor, emissive ? 0.38 : 0.2);
        if (emissive) {
          material.emissive = new Color(colorToken);
          material.emissiveIntensity = 0.55;
        }
        return material;
      });
      mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
    });

    return { instance: clone, scale: normalizedScale };
  }, [colorToken, emissive, scene, targetHeight]);

  return (
    <group scale={scale}>
      <primitive object={instance} />
    </group>
  );
}

export default function RuntimeInteractionVisual({
  assetId,
  targetHeight,
  colorToken,
  emissive = false,
  onClick,
  fallback,
}: RuntimeInteractionVisualProps) {
  const asset = useRuntimeAsset(assetId, 'model');
  if (asset.status !== 'ready') return <>{fallback}</>;

  return (
    <InteractionAssetBoundary assetId={assetId} fallback={fallback}>
      <group onClick={onClick}>
        <Suspense fallback={fallback}>
          <RuntimeInteractionModel
            url={asset.asset.url}
            targetHeight={targetHeight}
            colorToken={colorToken}
            emissive={emissive}
          />
        </Suspense>
      </group>
    </InteractionAssetBoundary>
  );
}
