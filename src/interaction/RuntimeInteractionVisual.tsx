import { useGLTF } from '@react-three/drei';
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import {
  Box3,
  Color,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  Material,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { useRuntimeAsset } from '../assets/runtimeAssetManifest';

export interface RuntimeInteractionVisualProps {
  assetId: string;
  targetHeight: number;
  colorToken: string;
  outline: boolean;
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
  outline,
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
    const outlineMaterial = outline
      ? new LineBasicMaterial({
          color: '#11131b',
          transparent: true,
          opacity: 0.72,
          depthWrite: false,
        })
      : null;
    if (outlineMaterial) outlineMaterial.userData.runtimeInteractionOwned = true;
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
        material.userData.runtimeInteractionOwned = true;
        return material;
      });
      mesh.material = Array.isArray(mesh.material) ? materials : materials[0];

      if (outlineMaterial) {
        const outline = new LineSegments(
          new EdgesGeometry(mesh.geometry, 30),
          outlineMaterial,
        );
        outline.name = 'interaction-model-outline';
        outline.renderOrder = 3;
        outline.userData.cameraOccluder = false;
        mesh.add(outline);
      }
    });

    return { instance: clone, scale: normalizedScale };
  }, [colorToken, emissive, outline, scene, targetHeight]);

  useEffect(
    () => () => {
      const materials = new Set<Material>();
      instance.traverse((object) => {
        if (object instanceof LineSegments && object.name === 'interaction-model-outline') {
          object.geometry.dispose();
        }
        if (object instanceof Mesh || object instanceof LineSegments) {
          const objectMaterials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          objectMaterials.forEach((material) => {
            if (material.userData.runtimeInteractionOwned) materials.add(material);
          });
        }
      });
      materials.forEach((material) => material.dispose());
    },
    [instance],
  );

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
  outline,
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
            outline={outline}
            emissive={emissive}
          />
        </Suspense>
      </group>
    </InteractionAssetBoundary>
  );
}
