import { Suspense, useMemo } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import { Mesh } from 'three';
import { useRuntimeAsset } from '../assets/runtimeAssetManifest';
import { InteractionAssetBoundary } from '../interaction/RuntimeInteractionVisual';
import EnvironmentScenery from './EnvironmentScenery';

function GardenModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const instance = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse(object => { if (object instanceof Mesh) { object.castShadow = true; object.receiveShadow = true; } });
    return clone;
  }, [scene]);
  return <RigidBody type="fixed" colliders="trimesh" name="coastal-scenery-collider"><primitive name="coastal-garden-scenery" object={instance} dispose={null} userData={{ cameraOccluder: false }} /></RigidBody>;
}

export default function CoastalScenery({ assetId }: { assetId: string }) {
  const asset = useRuntimeAsset(assetId, 'model');
  const fallback = <><EnvironmentScenery /><Html fullscreen style={{ pointerEvents: 'none' }}><p role="status" className="m-6 rounded bg-white/90 p-3 text-sm">花园景物正在加载，载入失败时可刷新重试。</p></Html></>;
  if (asset.status !== 'ready') return fallback;
  return <InteractionAssetBoundary key={assetId} assetId={assetId} fallback={fallback}><Suspense fallback={fallback}><GardenModel url={asset.asset.url} /></Suspense></InteractionAssetBoundary>;
}
