import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import RuntimeInteractionVisual from '../interaction/RuntimeInteractionVisual';
import { getInteractionVisualProfile } from '../interaction/visualProfiles';

export default function WorldAssetPreview({ assetId }: { assetId: string }) {
  const profile = getInteractionVisualProfile('portal', assetId);
  return <figure className="mt-3">
    <div aria-label="Selected gate model preview" className="h-56 w-full rounded-lg bg-slate-100">
      <Canvas frameloop="demand" dpr={1} camera={{ position: [6, 4, 6], fov: 40 }} fallback={<p>当前设备无法显示模型预览，可在创建时检查资源。</p>}>
        <ambientLight intensity={2} />
        <directionalLight position={[4, 8, 4]} intensity={3} />
        <RuntimeInteractionVisual assetId={assetId} targetHeight={profile.targetHeight} colorToken="#4adb7d" outline={false} fallback={<Html center><p className="w-40 bg-white p-2 text-center text-sm">模型预览暂不可用，创建时会再次检查资源。</p></Html>} />
        <OrbitControls target={[0, profile.targetHeight / 2, 0]} enablePan={false} enableDamping={false} minDistance={4} maxDistance={16} />
      </Canvas>
    </div>
    <figcaption className="mt-1 text-xs text-ink/70">拖动查看外观。离场门可穿过，尺寸统一到 3.4 米高。</figcaption>
  </figure>;
}
