import { useEffect, useState } from 'react';
import { appendTempoTap, estimateTapBpm, nearestBeatSeconds, tempoIssues, type MusicTempo } from '../music/analysis/musicTempo';
import { useAudioPlayerStore } from '../music/player/useAudioPlayerStore';
import { projectTrackKey, useProjectStore } from '../state/useProjectStore';

export default function MusicTempoEditor({ cueId }: { cueId: string }) {
  const project = useProjectStore(s => s.project);
  const track = useAudioPlayerStore(s => s.track);
  const playing = useAudioPlayerStore(s => s.playing);
  const tempo = project.track.tempo;
  const duration = project.track.expectedDurationSeconds;
  const [bpm, setBpm] = useState(tempo ? String(tempo.bpm) : '');
  const [offset, setOffset] = useState(String(tempo?.offsetSeconds ?? 0));
  const [source, setSource] = useState<MusicTempo['source']>(tempo?.source ?? 'manual');
  const [taps, setTaps] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    setBpm(tempo ? String(tempo.bpm) : ''); setOffset(String(tempo?.offsetSeconds ?? 0));
    setSource(tempo?.source ?? 'manual'); setTaps([]); setError(''); setMessage('');
  }, [tempo?.bpm, tempo?.offsetSeconds, tempo?.source]);
  const draft: MusicTempo = { bpm: Number(bpm), offsetSeconds: Number(offset), source };
  const issues = tempoIssues(draft, duration);
  const dirty = !tempo || draft.bpm !== tempo.bpm || draft.offsetSeconds !== tempo.offsetSeconds || draft.source !== tempo.source;
  const cue = project.timeline.cues.find(c => c.id === cueId);
  const beat = tempo && duration && cue ? nearestBeatSeconds(cue.position * duration, duration, tempo) : null;
  const save = (value: MusicTempo | undefined) => {
    if (value && (!bpm.trim() || !offset.trim() || issues.length)) {
      setError('请输入 30–300 的 BPM，第一拍时间须在歌曲开始与结束之间。'); return;
    }
    const ok = useProjectStore.getState().updateMusicTempo(project.id, projectTrackKey(project.track), value);
    setError(ok ? '' : '保存失败，请检查输入或重新打开项目。');
    setMessage(ok ? value ? '节奏已保存，可使用上方撤销。' : '节奏已清除，可使用上方撤销。' : '');
  };
  return <section aria-label="Music tempo editing" className="mt-5 rounded-lg border-2 border-ink/20 bg-white p-3">
    <h4 className="font-bold">节奏与拍点</h4>
    <p className="mt-1 text-sm text-ink/70">BPM 表示每分钟多少拍。输入数值，或跟着音乐点至少 4 下，再保存。这里使用全曲固定节奏，变速歌曲可继续按段落安排节点。</p>
    {!duration && <p className="mt-2 text-sm">请先载入歌曲，取得时长后即可保存节奏。</p>}
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <label className="text-sm font-bold">每分钟拍数（BPM）<input aria-label="Tempo BPM" type="number" min="30" max="300" step="0.01" className="mt-1 w-full border-2 border-ink px-2 py-1" value={bpm} onChange={e => { setBpm(e.target.value); setSource('manual'); setError(''); }} /></label>
      <label className="text-sm font-bold">第一拍在第几秒<input aria-label="Tempo first beat seconds" type="number" min="0" step="0.01" className="mt-1 w-full border-2 border-ink px-2 py-1" value={offset} onChange={e => { setOffset(e.target.value); setError(''); }} /></label>
    </div>
    <div className="mt-2 flex flex-wrap gap-2 text-xs">
      <button aria-label="Toggle tempo audition" disabled={!track} className="comic-button disabled:opacity-40" onClick={() => {
        const player = useAudioPlayerStore.getState();
        if (player.playing) player.pause(); else void player.play();
      }}>{playing ? '暂停歌曲' : '播放歌曲'}</button>
      <button aria-label="Tap tempo" className="comic-button" onClick={() => {
        const next = appendTempoTap(taps, performance.now()); setTaps(next);
        const suggested = estimateTapBpm(next);
        if (suggested !== null) { setBpm(String(suggested)); setSource('tap'); setError(''); }
        setMessage(suggested !== null ? `点拍建议 ${suggested} BPM，请确认后保存。` : `已点 ${next.length} 下。请均匀地点拍，停顿超过 2 秒会重新计数。`);
      }}>跟着音乐点拍</button>
      <button aria-label="Reset tempo taps" className="comic-button" onClick={() => { setTaps([]); setMessage('点拍计数已清零。'); }}>重新点拍</button>
      {[.5, 2].map(factor => <button key={factor} aria-label={factor === .5 ? 'Halve tempo' : 'Double tempo'} disabled={!bpm.trim() || !Number.isFinite(Number(bpm)) || Number(bpm) * factor < 30 || Number(bpm) * factor > 300} className="comic-button disabled:opacity-40" onClick={() => { setBpm(String(Math.round(Number(bpm) * factor * 100) / 100)); setSource('manual'); }}>{factor === .5 ? '拍数减半' : '拍数加倍'}</button>)}
      <button aria-label="Use playhead as first beat" disabled={!track} className="comic-button disabled:opacity-40" onClick={() => setOffset(useAudioPlayerStore.getState().currentTime.toFixed(2))}>用当前播放位置作第一拍</button>
      <button aria-label="Save music tempo" disabled={!duration} className="comic-button bg-comic-purple text-white disabled:opacity-40" onClick={() => save(draft)}>保存节奏</button>
      <button aria-label="Clear music tempo" disabled={!tempo} className="comic-button disabled:opacity-40" onClick={() => save(undefined)}>清除节奏</button>
    </div>
    {tempo && <p className="mt-2 text-sm">已保存：{tempo.bpm} BPM · 第一拍 {tempo.offsetSeconds} 秒 · {tempo.source === 'tap' ? '点拍后确认' : '手动设置'}</p>}
    <p className="mt-2 text-xs text-ink/70">在上方选择时间线节点，保存节奏后，可把它对齐到最近的拍点。</p>
    {tempo && dirty && <p className="mt-2 text-sm">请先保存节奏修改，再对齐节点。</p>}
    <button aria-label="Snap selected cue to beat" disabled={dirty || beat === null} className="comic-button mt-2 text-xs disabled:opacity-40" onClick={() => {
      if (beat === null || !duration) return;
      useProjectStore.getState().updateCuePosition(cueId, beat / duration);
      setMessage(`所选节点已对齐到 ${beat.toFixed(2)} 秒，可使用上方撤销。`);
    }}>将所选节点对齐到最近一拍{beat !== null && !dirty ? `（${beat.toFixed(2)} 秒）` : ''}</button>
    <p role={error ? 'alert' : 'status'} className={`mt-2 text-sm ${error ? 'text-red-700' : ''}`}>{error || message}</p>
  </section>;
}
