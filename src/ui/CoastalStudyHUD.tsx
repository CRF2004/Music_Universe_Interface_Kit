import { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../state/useProjectStore';
import { useAudioPlayerStore } from '../music/player/useAudioPlayerStore';
import { useInteractionStore } from '../state/useInteractionStore';
import { useWorldStore } from '../state/useWorldStore';
import { useRuntimeAsset } from '../assets/runtimeAssetManifest';
import { useExperienceSettingsStore } from '../state/useExperienceSettingsStore';
import ProjectEditorPanel from './ProjectEditorPanel';
import './coastalStudy.css';
import { studyChapters } from '../project/childhoodScore';
import { windInstructions, windStage } from '../interaction/windGardenRuntime';

const time = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;

export default function CoastalStudyHUD() {
  const project = useProjectStore(state => state.project);
  const wind = project.scene.windGarden;
  const chapters = studyChapters(project.timeline.cues);
  const musicCredit = <details className="coastal-rights"><summary>音乐署名</summary><p>{project.track.rights.attribution}</p></details>;
  const player = useAudioPlayerStore();
  const flags = useInteractionStore(state => state.interactionFlags);
  const panel = useInteractionStore(state => state.activePanelId);
  const muted = useExperienceSettingsStore(state => state.musicMuted);
  const toggleMute = useExperienceSettingsStore(state => state.toggleMusicMuted);
  const setHelp = useWorldStore(state => state.setHelpOpen);
  const reduced = useWorldStore(state => state.reducedEffects);
  const setReduced = useWorldStore(state => state.setReducedEffects);
  const demo = useRuntimeAsset(project.track.assetId ?? 'crywolf-athetosis-demo', 'audio');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const play = async () => {
    if (player.playing) { player.pause(); return; }
    setError(''); setLoading(true);
    const abort = new AbortController(); request.current = abort;
    const timer = window.setTimeout(() => abort.abort(), 15000);
    try {
      if (!useAudioPlayerStore.getState().track) {
        if (project.track.source === 'local-file') throw new Error('请打开音乐设置，重新选择这首歌曲，再进入花园。');
        if (demo.status !== 'ready') throw new Error('演示曲暂不可用，请打开音乐设置，选择自己的歌曲。');
        const response = await fetch(demo.asset.url, { signal: abort.signal });
        if (!response.ok) throw new Error('演示曲载入失败，请重试或选择自己的歌曲。');
        const blob = await response.blob();
        if (abort.signal.aborted || useProjectStore.getState().activeProjectId !== project.id) return;
        await useAudioPlayerStore.getState().load(new File([blob], `${project.track.title}.ogg`, { type: blob.type || 'audio/ogg' }), { assetTrack: project.track });
      }
      if (abort.signal.aborted || useProjectStore.getState().activeProjectId !== project.id) return;
      setHelp(false); localStorage.setItem('music-universe.onboarding-seen', 'true');
      await useAudioPlayerStore.getState().play();
      const current = useAudioPlayerStore.getState();
      if (current.error) throw new Error(current.error);
    } catch (error) {
      if (!abort.signal.aborted) setError(error instanceof Error ? error.message : '播放失败，请重试。');
      else setError('载入已取消或超时，请重试。');
    } finally { window.clearTimeout(timer); setLoading(false); request.current = null; }
  };
  const objective = wind ? windInstructions[windStage(flags)] : flags['journey.completed'] === true ? '记忆已送达。留一会儿，听完这首歌。' : flags['memory.received'] === true ? '03 / 沿着石径，走向离场门。' : flags['journey.started'] === true ? '02 / 去左侧的记忆工坊，取回那段回声。' : '01 / 向前走，与引导员交谈。';
  return <>
    <header className="coastal-brand"><span className="coastal-mark">✦</span><span>MUSIC UNIVERSE <small>ART DIRECTION STUDY / 01</small></span></header>
    <nav aria-label="Study controls" className="coastal-tools">
      {!wind && <ProjectEditorPanel />}
      {wind && player.started && <button aria-label="Restart wind garden" onClick={() => void player.restartJourney()}>再玩一次</button>}
      <button aria-label="Open journey guide" onClick={() => setHelp(true)}>操作</button>
      <button aria-label="Study reduced effects" aria-pressed={reduced} onClick={() => { setReduced(!reduced); localStorage.setItem('music-universe.reduced-effects', String(!reduced)); }}>轻量模式</button>
    </nav>
    {!player.started && !panel && <div className="coastal-veil" aria-hidden="true" />}
    {!player.started && !panel && <section className="coastal-intro" aria-label="Echo Garden introduction">
      <p className="coastal-eyebrow">A PLACE TO KEEP A SONG</p>
      <h1>{wind ? 'Catch the' : 'Echo'}<br /><em>{wind ? 'Wind.' : 'Garden.'}</em></h1>
      <p className="coastal-chinese">{wind ? '把 风 带 回 来' : '回 声 花 园'}</p>
      <p className="coastal-copy">{wind ? <>找到纸风车，唤醒一条花径。<br />一段可以亲手参与的童年。</> : <>走过晨光与树影，<br />把一段记忆带回家。</>}</p>
      <button aria-label="Enter Echo Garden" className="coastal-enter" disabled={loading} onClick={() => void play()}>{loading ? '正在载入音乐…' : '进入花园'} <span>↗</span></button>
      <p className="coastal-credit">MUSIC / {project.track.title}<br />{wind ? '风车玩法样片 · 寻找 / 转动 / 探索' : '原创场景试作 · 随音乐散步'}</p>
      {musicCredit}
    </section>}
    {player.started && !panel && <>
      <p className="coastal-objective" role="status" aria-label="Study journey objective">{objective}</p>
      <section className="coastal-player" aria-label="Study music player">
        <div><button aria-label="Study music play pause" onClick={() => void play()}>{player.playing ? 'Ⅱ' : '▶'}</button><span>{project.track.title} <small>{time(player.currentTime)} / {time(player.duration)}</small></span><button aria-label="Study music mute" aria-pressed={muted} onClick={toggleMute}>{muted ? '静音中' : '声音'}</button></div>
        <input aria-label="Study music progress" type="range" min={0} max={player.duration || 1} step=".1" value={player.currentTime} onChange={e => player.seek(Number(e.target.value))} />
        {!wind && <div className="coastal-chapters">{chapters.map(chapter => <button key={chapter.id} title={`${chapter.label} · ${time(chapter.position * player.duration)}`} onClick={() => player.seek(Math.min(player.duration, chapter.position * player.duration + .15))}>{chapter.label}</button>)}</div>}
        {musicCredit}
      </section>
    </>}
    {!panel && <p className="coastal-hint">WASD 移动 <span>·</span> 点击世界后转动视角 <span>·</span> E {wind ? '操作' : '交谈'} <span>·</span> Esc 松开鼠标</p>}
    {(error || player.error) && <p role="alert" className="coastal-error">{error || player.error}</p>}
  </>;
}
