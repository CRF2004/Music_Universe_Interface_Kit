import { defaultMusicWorldProject } from '../content/defaultMusicWorldProject';
import { findWorldAsset, worldAssetSlots } from '../assets/worldAssetCatalog';
import { findRuntimeAsset, resolveRuntimeAssetUrl, type RuntimeAssetManifest } from '../assets/runtimeAssetManifest';
import type { MusicWorldProject } from './musicWorldProject';
import { assertMusicWorldProject } from './validateMusicWorldProject';

export interface WorldBuildOptions {
  templateId: 'memory-journey';
  title: string;
  gateAssetId: string;
}

export function buildWorldProject(options: WorldBuildOptions): MusicWorldProject {
  if (options.templateId !== 'memory-journey') throw new Error('请选择可用的记忆旅程模板。');
  if (!options.title.trim() || options.title.trim().length > 100) throw new Error('世界名称须为 1–100 个字符。');
  const gateAsset = findWorldAsset(options.gateAssetId, 'portal');
  if (!gateAsset) throw new Error('请选择已审核的离场门模型。');
  const project: MusicWorldProject = structuredClone(defaultMusicWorldProject);
  project.metadata.title = options.title.trim();
  project.scene.name = project.metadata.title;
  for (const slot of worldAssetSlots) {
    const object = project.scene.objects.find(object => object.id === slot.id);
    if (!object || object.type !== slot.type) throw new Error(`模板缺少${slot.label}，请重新载入模板。`);
    object.appearance = { ...object.appearance, assetId: slot.id === 'departure-gate' ? options.gateAssetId : slot.assetId };
  }
  if (options.gateAssetId !== 'docs-portal-gate') project.assets = project.assets.filter(asset => asset.id !== 'docs-portal-gate');
  if (!project.assets.some(asset => asset.id === gateAsset.id)) project.assets.push({ id: gateAsset.id, type: 'model', licenseRef: gateAsset.licenseRef });
  assertMusicWorldProject(project);
  return project;
}

// Resolve rights for the complete template and verify the selected model bytes
// before creating a draft. A missing binary must not be mistaken for SPA HTML.
export async function preflightWorldAssets(project: MusicWorldProject, manifest: RuntimeAssetManifest, baseUrl: string, signal: AbortSignal): Promise<void> {
  assertMusicWorldProject(project);
  for (const ref of project.assets) {
    const asset = findRuntimeAsset(manifest, ref.id, ref.type);
    if (asset.license.spdx !== ref.licenseRef) throw new Error(`资产 ${ref.id} 的许可记录不一致，请重新构建资源。`);
  }
  await Promise.all(worldAssetSlots.map(async slot => {
    const object = project.scene.objects.find(object => object.id === slot.id);
    const id = object?.appearance?.assetId;
    if (!id || !findWorldAsset(id, slot.type)) throw new Error(`${slot.label}的模型配置无效。`);
    const asset = findRuntimeAsset(manifest, id, 'model');
    if (!Number.isSafeInteger(asset.outputBytes) || asset.outputBytes <= 0 || asset.outputBytes > 10 * 1024 * 1024) throw new Error(`${slot.label}超过模型体积上限。`);
    const response = await fetch(resolveRuntimeAssetUrl(asset.url, baseUrl), { signal, cache: 'no-cache' });
    if (!response.ok) throw new Error(`${slot.label}加载失败，请重试或检查资源。`);
    const bytes = await response.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    if (bytes.byteLength !== asset.outputBytes || hash !== asset.sha256) throw new Error(`${slot.label}文件不完整，请重新构建资源后重试。`);
  }));
}
