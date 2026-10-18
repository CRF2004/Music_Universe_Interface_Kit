import { useEffect, useState } from 'react';
import type { MusicAnalysis, MusicSection } from '../music/analysis/musicAnalysis';
import { useAudioPlayerStore } from '../music/player/useAudioPlayerStore';
import { projectTrackKey, useProjectStore } from '../state/useProjectStore';

const timeLabel = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;

function SectionRow({ section, index, end, analysis, commit, cueId, ready }: {
  section: MusicSection; index: number; end: number; analysis: MusicAnalysis;
  commit: (analysis: MusicAnalysis) => void; cueId: string; ready: boolean;
}) {
  const [label, setLabel] = useState(section.label);
  const [seconds, setSeconds] = useState((section.start * analysis.durationSeconds).toFixed(2));
  const [error, setError] = useState('');
  useEffect(() => { setLabel(section.label); setSeconds((section.start * analysis.durationSeconds).toFixed(2)); setError(''); }, [section.label, section.start, analysis.durationSeconds]);
  const update = () => {
    const start = Number(seconds) / analysis.durationSeconds;
    const previous = analysis.sections[index - 1]?.start ?? -1;
    if (!label.trim() || label.trim().length > 100 || !seconds.trim() || !Number.isFinite(start) || (index === 0 ? start !== 0 : start <= previous) || start >= end) {
      setError('请输入段落名称，开始时间须位于前后段落之间。'); return;
    }
    commit({ ...analysis, sections: analysis.sections.map(s => s.id === section.id ? { ...s, label: label.trim(), start } : s) });
    setError('');
  };
  const values = analysis.rmsDb.slice(Math.floor(section.start * analysis.rmsDb.length), Math.max(Math.floor(section.start * analysis.rmsDb.length) + 1, Math.ceil(end * analysis.rmsDb.length)));
  const rms = 10 * Math.log10(values.reduce((sum, db) => sum + Math.pow(10, db / 10), 0) / values.length);
  return <li className="rounded-lg border-2 border-ink/20 bg-white p-3">
    <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
      <label className="text-sm font-bold">段落名称<input aria-label={`Section ${index + 1} name`} maxLength={100} className="mt-1 w-full border-2 border-ink px-2 py-1" value={label} onChange={e => setLabel(e.target.value)} /></label>
      <label className="text-sm font-bold">开始时间（秒）<input aria-label={`Section ${index + 1} start seconds`} type="number" step="0.01" disabled={index === 0} className="mt-1 w-full border-2 border-ink px-2 py-1 disabled:bg-ink/5" value={seconds} onChange={e => setSeconds(e.target.value)} /></label>
    </div>
    <p className="mt-2 text-xs text-ink/70">{timeLabel(section.start * analysis.durationSeconds)} – {timeLabel(end * analysis.durationSeconds)} · 相对响度 {rms.toFixed(1)} dBFS</p>
    <div className="mt-2 flex flex-wrap gap-2 text-xs">
      <button aria-label={`Apply section ${index + 1}`} className="comic-button" onClick={update}>保存修改</button>
      <button aria-label={`Preview section ${index + 1}`} disabled={!ready} className="comic-button disabled:opacity-40" onClick={() => useAudioPlayerStore.getState().seek(section.start * analysis.durationSeconds)}>定位试听</button>
      <button aria-label={`Split section ${index + 1}`} disabled={analysis.sections.length >= 32} className="comic-button disabled:opacity-40" onClick={() => {
        const sections = [...analysis.sections];
        sections.splice(index + 1, 0, { id: crypto.randomUUID(), label: `${section.label.slice(0, 90)} · 2`, start: (section.start + end) / 2 });
        commit({ ...analysis, sections });
      }}>从中间拆分</button>
      {index > 0 && <button aria-label={`Merge section ${index + 1}`} className="comic-button" onClick={() => commit({ ...analysis, sections: analysis.sections.filter(s => s.id !== section.id) })}>并入上一段</button>}
      <button aria-label={`Place cue at section ${index + 1}`} disabled={!cueId} className="comic-button bg-comic-blue text-white disabled:opacity-40" onClick={() => useProjectStore.getState().updateCuePosition(cueId, section.start)}>将所选节点移到这里</button>
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </li>;
}

export default function MusicAnalysisEditor({ cueId }: { cueId: string }) {
  const project = useProjectStore(s => s.project);
  const track = useAudioPlayerStore(s => s.track);
  const duration = useAudioPlayerStore(s => s.duration);
  const status = useAudioPlayerStore(s => s.analysisStatus);
  const error = useAudioPlayerStore(s => s.analysisError);
  const analysis = project.track.analysis;
  const [message, setMessage] = useState('');
  const commit = (next: MusicAnalysis) => {
    const store = useProjectStore.getState();
    const ok = store.updateMusicAnalysis(project.id, projectTrackKey(project.track), next);
    setMessage(ok ? '段落已保存，可使用上方撤销。' : '保存失败，请检查时间或重新打开项目。');
  };
  const canAnalyze = Boolean(track && duration > 0 && duration <= 600 && track.sizeBytes <= 40 * 1024 * 1024);
  return <section aria-label="Local music analysis" className="mt-6 border-t-2 border-ink/15 pt-5">
    <h3 className="font-display text-lg font-bold">音乐分析与分段</h3>
    <p className="mt-1 text-sm text-ink/70">歌曲在本机分析。根据响度变化给出分段建议，你可以修改名称和时间。</p>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button aria-label="Analyze loaded music" disabled={!canAnalyze || status === 'analyzing'} className="comic-button bg-comic-purple text-white disabled:opacity-40" onClick={() => void useAudioPlayerStore.getState().analyze()}>{status === 'analyzing' ? '正在分析…' : analysis ? '重新分析歌曲' : '分析当前歌曲'}</button>
      {status === 'analyzing' && <button aria-label="Cancel music analysis" className="comic-button" onClick={() => useAudioPlayerStore.getState().cancelAnalysis()}>取消</button>}
    </div>
    {!track && <p className="mt-2 text-sm">请先载入项目歌曲。已保存的分段仍可编辑。</p>}
    {track && !canAnalyze && <p className="mt-2 text-sm">分析支持 10 分钟以内、40 MiB 以内的单声道或立体声歌曲。</p>}
    {analysis && <>
      <figure className="mt-4 rounded-lg border-2 border-ink/20 bg-white p-3">
        <figcaption className="mb-2 text-sm font-bold">波形与响度 · {timeLabel(analysis.durationSeconds)}</figcaption>
        <svg role="img" aria-label="Song waveform and relative loudness" viewBox="0 0 512 120" className="h-32 w-full">
          <title>上方显示声音峰值，下方显示相对响度，竖线标记段落边界。</title>
          <line x1="0" y1="35" x2="512" y2="35" stroke="#aaa" />
          {analysis.peaks.map((peak, i) => <line key={i} x1={i * 512 / analysis.peaks.length} x2={i * 512 / analysis.peaks.length} y1={35 - peak * 30} y2={35 + peak * 30} stroke="#6750a4" strokeWidth={Math.max(1, 512 / analysis.peaks.length)} />)}
          <polyline points={analysis.rmsDb.map((db, i) => `${(i + .5) * 512 / analysis.rmsDb.length},${116 - (db + 96) / 96 * 40}`).join(' ')} fill="none" stroke="#2563eb" strokeWidth="2" />
          {analysis.sections.map(section => <line key={section.id} x1={section.start * 512} x2={section.start * 512} y1="0" y2="120" stroke="#e17020" strokeDasharray="3 3" />)}
        </svg>
        <p className="text-xs text-ink/70">紫色：波形峰值 · 蓝色：相对响度（RMS / dBFS） · 橙色：段落边界</p>
      </figure>
      <p className="mt-2 text-xs text-ink/70">建议分段供你参考，可自行命名为前奏、主歌等。重新分析会替换当前分段，支持撤销。</p>
      <ol aria-label="Editable music sections" className="mt-3 grid gap-3">
        {analysis.sections.map((section, index) => <SectionRow key={`${project.id}:${section.id}`} section={section} index={index} end={analysis.sections[index + 1]?.start ?? 1} analysis={analysis} commit={commit} cueId={cueId} ready={Boolean(track)} />)}
      </ol>
    </>}
    <p role={error ? 'alert' : 'status'} className={`mt-2 text-sm ${error ? 'text-red-700' : ''}`}>{error ?? message}</p>
  </section>;
}
