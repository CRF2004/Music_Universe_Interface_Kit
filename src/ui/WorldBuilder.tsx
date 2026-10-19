import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { worldAssetCatalog, worldAssetSlots } from '../assets/worldAssetCatalog';
import { loadRuntimeAssetManifest } from '../assets/runtimeAssetManifest';
import { buildWorldProject, preflightWorldAssets } from '../project/worldBuilder';
import { useProjectStore } from '../state/useProjectStore';

const WorldAssetPreview = lazy(() => import('./WorldAssetPreview'));

export default function WorldBuilder({ onPreview }: { onPreview: () => void }) {
  const activeId = useProjectStore(s => s.activeProjectId);
  const [title, setTitle] = useState('我的记忆星球');
  const [gate, setGate] = useState('docs-portal-gate');
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const buildButton = useRef<HTMLButtonElement | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const create = async () => {
    request.current?.abort();
    const abort = new AbortController(); request.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 15000);
    let onAbort = () => {};
    const cancelled = new Promise<never>((_, reject) => {
      onAbort = () => reject(new DOMException('World build canceled', 'AbortError'));
      abort.signal.addEventListener('abort', onAbort, { once: true });
    });
    setBusy(true); setError('');
    try {
      const options = { templateId: 'memory-journey' as const, title, gateAssetId: gate };
      const project = buildWorldProject(options);
      const manifest = await Promise.race([loadRuntimeAssetManifest(), cancelled]);
      if (abort.signal.aborted) return;
      await preflightWorldAssets(project, manifest, import.meta.env.BASE_URL, abort.signal);
      if (abort.signal.aborted || useProjectStore.getState().activeProjectId !== activeId) return;
      if (!useProjectStore.getState().createWorld(options)) throw new Error(useProjectStore.getState().error ?? '世界创建失败，请重试。');
      onPreview();
    } catch (error) {
      if (request.current === abort) setError(abort.signal.aborted ? '检查已取消或超过 15 秒，请重试。' : error instanceof Error ? error.message : '资源检查失败，请重试。');
    } finally {
      window.clearTimeout(timeout);
      abort.signal.removeEventListener('abort', onAbort);
      if (request.current === abort) {
        setBusy(false); request.current = null;
        window.requestAnimationFrame(() => buildButton.current?.focus());
      }
    }
  };
  return <section aria-label="World builder" className="mt-5 rounded-xl border-2 border-comic-purple bg-purple-50 p-4">
    <h3 className="font-display text-xl font-bold">搭建一个音乐世界</h3>
    <p className="mt-1 text-sm text-ink/70">选模板和资产，创建后直接进入世界。新世界会单独保存。</p>
    <a className="mt-3 inline-block rounded-full border border-ink/20 bg-white px-3 py-2 text-sm" href="?study=coastal">查看美术试作：回声花园 ↗</a>
    <fieldset disabled={busy} className="mt-4 min-w-0 space-y-3">
      <legend className="font-bold">1 · 选择模板</legend>
      <label className="flex items-start gap-2 rounded-lg border-2 border-comic-purple bg-white p-3">
        <input aria-label="Memory Journey template" type="radio" name="world-template" value="memory-journey" checked readOnly className="mt-1" />
        <span><strong>记忆旅程</strong><span className="mt-1 block text-sm">跟随引导员，取回记忆，穿过离场门。已配好场景、音乐变化和结尾。</span></span>
      </label>
      <label className="block text-sm font-bold">世界名称<input aria-label="New world name" maxLength={100} className="mt-1 w-full border-2 border-ink px-2 py-2" value={title} onChange={e => { setTitle(e.target.value); setError(''); }} /></label>
      <h4 className="pt-2 font-bold">2 · 选择资产</h4>
      <ul className="space-y-2 text-sm">
        {worldAssetSlots.filter(slot => slot.type !== 'portal').map(slot => {
          const asset = worldAssetCatalog.find(asset => asset.id === slot.assetId);
          return <li key={slot.id} className="rounded-lg border border-ink/20 bg-white p-2"><strong>{slot.label}</strong> · {asset?.label}<span className="block text-xs text-ink/60">模板必需 · {asset?.author} · {asset?.licenseRef} · 当前可用 1 款</span></li>;
        })}
      </ul>
      <label className="block text-sm font-bold">离场门<select aria-label="World gate asset" className="mt-1 w-full border-2 border-ink bg-white p-2" value={gate} onChange={e => { setGate(e.target.value); setPreview(false); setError(''); }}>
        {worldAssetCatalog.filter(asset => asset.type === 'portal').map(asset => <option key={asset.id} value={asset.id}>{asset.label} · {asset.author} · {asset.licenseRef}</option>)}
      </select></label>
      <button aria-label="Preview selected world asset" className="comic-button text-sm" onClick={() => setPreview(value => !value)}>{preview ? '收起模型预览' : '查看离场门模型'}</button>
      {preview && <Suspense fallback={<p role="status">正在打开模型预览…</p>}><WorldAssetPreview key={gate} assetId={gate} /></Suspense>}
      <h4 className="pt-2 font-bold">3 · 创建并预览</h4>
      <p className="text-sm text-ink/70">将检查模型文件与授权记录。世界自带演示曲；也可载入你自己的歌曲。</p>
      <button ref={buildButton} aria-label="Build world from template" className="comic-button w-full bg-comic-purple text-white" onClick={() => void create()}>创建世界并进入</button>
    </fieldset>
    {busy && <div className="mt-3"><p role="status">正在检查资源，完成后进入世界…</p><button aria-label="Cancel world build" className="comic-button mt-2 text-sm" onClick={() => request.current?.abort()}>取消</button></div>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </section>;
}
