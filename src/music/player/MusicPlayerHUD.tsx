import { useEffect, useState } from 'react';
import { useRuntimeAsset } from '../../assets/runtimeAssetManifest';
import { useExperienceSettingsStore } from '../../state/useExperienceSettingsStore';
import { setMusicPlaybackVolume, useAudioPlayerStore } from './useAudioPlayerStore';
import { useProjectStore } from '../../state/useProjectStore';
import { defaultMusicWorldProject } from '../../content/defaultMusicWorldProject';

export default function MusicPlayerHUD() {
  const projectId = useProjectStore((state) => state.activeProjectId);
  const projectTrack = useProjectStore((state) => state.project.track);
  const hydrated = useProjectStore((state) => state.hydrated);
  const demoTrack = useRuntimeAsset(projectTrack.source === 'asset' ? projectTrack.assetId ?? '' : 'crywolf-athetosis-demo', 'audio');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const { track, currentTime, duration, playing, status, error, load, play, pause, seek } =
    useAudioPlayerStore();
  const ready = Boolean(track) && duration > 0;
  const needsOriginal = !track && projectTrack.source === 'local-file';
  const {
    musicVolume,
    effectsVolume,
    musicMuted,
    effectsMuted,
    subtitlesEnabled,
    setMusicVolume,
    setEffectsVolume,
    toggleMusicMuted,
    toggleEffectsMuted,
    toggleSubtitles,
  } = useExperienceSettingsStore();

  useEffect(() => {
    setMusicPlaybackVolume(musicMuted ? 0 : musicVolume);
  }, [musicMuted, musicVolume]);

  const loadDemoTrack = async () => {
    if (demoTrack.status !== 'ready') return;
    setDemoLoading(true);
    setDemoError(null);
    try {
      const response = await fetch(demoTrack.asset.url);
      if (!response.ok) throw new Error(`Demo request failed with ${response.status}.`);
      const blob = await response.blob();
      if (useProjectStore.getState().activeProjectId !== projectId) return;
      await load(
        new File([blob], projectTrack.source === 'asset' && projectTrack.assetId !== 'crywolf-athetosis-demo' ? `${projectTrack.title}.ogg` : 'ATHETOSIS — Crywolf.ogg', {
          type: blob.type || 'audio/ogg',
        }), { assetTrack: projectTrack.source === 'asset' ? projectTrack : defaultMusicWorldProject.track },
      );
    } catch {
      setDemoError('The demo track could not load. Retry or choose your own music.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <section
      aria-label="Music player"
      className="pointer-events-auto fixed bottom-5 left-5 z-[60] max-h-[calc(100dvh-2.5rem)] w-[min(22rem,calc(100vw-2.5rem))] overflow-y-auto rounded-xl border-4 border-ink bg-paper p-4 text-ink shadow-[6px_6px_0_0_#111]"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-ink/60">
            Music Universe
          </p>
          <p className="max-w-52 truncate font-display font-bold">
            {track?.name ?? (needsOriginal ? projectTrack.file?.name ?? projectTrack.title : 'Choose a song to begin')}
          </p>
        </div>
        <span className="rounded-full bg-ink px-2 py-1 font-mono text-[10px] uppercase text-white">
          {playing ? 'playing' : status}
        </span>
      </div>

      {!track && !needsOriginal && (
        <button
          className="comic-button mb-2 block w-full bg-comic-yellow text-center text-sm disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!hydrated || demoTrack.status !== 'ready' || demoLoading}
          onClick={() => void loadDemoTrack()}
          type="button"
        >
          {demoLoading ? 'Loading demo…' : projectTrack.assetId === 'crywolf-athetosis-demo' ? 'Start the Crywolf demo' : 'Restore project song'}
        </button>
      )}

      {needsOriginal && <div aria-label="Project song recovery" className="mb-3 text-sm">
        <p>This project needs <strong>{projectTrack.file?.name ?? projectTrack.title}</strong>{projectTrack.expectedDurationSeconds ? ` (${Math.round(projectTrack.expectedDurationSeconds)}s)` : ''}. Choose the original file to restore it.</p>
        <label className="comic-button mt-2 block cursor-pointer bg-comic-yellow text-center focus-within:ring-4 focus-within:ring-comic-blue">
          Restore original song
          <input aria-label="Restore original project song" className="sr-only" type="file" accept="audio/*" disabled={!hydrated || status === 'loading'} onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void load(file, { reattach: true });
            event.target.value = '';
          }} />
        </label>
      </div>}
      {needsOriginal && <button className="comic-button mb-2 w-full bg-paper text-sm" disabled={demoTrack.status !== 'ready' || demoLoading} onClick={() => void loadDemoTrack()}>Use the Crywolf demo instead</button>}
      <label className="comic-button block cursor-pointer bg-white text-center text-sm focus-within:ring-4 focus-within:ring-comic-blue">
        {track || needsOriginal ? 'Replace music' : 'Choose music'}
        <input
          id="music-file-input"
          className="sr-only"
          type="file"
          accept="audio/*"
          disabled={!hydrated}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void load(file);
            event.target.value = '';
          }}
        />
      </label>

      {track && (
        <>
          <div className="mt-4 flex items-center gap-3">
            <button
              className="comic-button min-w-24 bg-comic-yellow disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!ready}
              onClick={() => (playing ? pause() : void play())}
            >
              {playing ? 'Pause' : 'Play'}
            </button>
            <span className="font-mono text-sm font-bold">
              {Math.floor(currentTime)} / {Math.floor(duration)}s
            </span>
          </div>

          <input
            aria-label="Music progress"
            className="mt-4 w-full accent-comic-red disabled:opacity-40"
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            disabled={!ready}
            onChange={(e) => seek(Number(e.target.value))}
          />
        </>
      )}

      <details className="mt-3 border-t-2 border-ink/15 pt-3">
        <summary className="cursor-pointer font-display text-xs font-bold uppercase tracking-wide">
          Audio & captions
        </summary>
        <div className="mt-3 space-y-3">
        <div className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wide" htmlFor="music-volume">
            Music
          </label>
          <input
            id="music-volume"
            aria-label="Music volume"
            className="w-full accent-comic-blue"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={musicVolume}
            onChange={(event) => setMusicVolume(Number(event.target.value))}
          />
          <button
            aria-pressed={musicMuted}
            className="comic-button bg-white px-2 py-1 text-xs"
            onClick={toggleMusicMuted}
          >
            {musicMuted ? 'Unmute' : 'Mute'}
          </button>
        </div>

        <div className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wide" htmlFor="effects-volume">
            Effects
          </label>
          <input
            id="effects-volume"
            aria-label="Effects volume"
            className="w-full accent-comic-purple"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={effectsVolume}
            onChange={(event) => setEffectsVolume(Number(event.target.value))}
          />
          <button
            aria-pressed={effectsMuted}
            className="comic-button bg-white px-2 py-1 text-xs"
            onClick={toggleEffectsMuted}
          >
            {effectsMuted ? 'Unmute' : 'Mute'}
          </button>
        </div>

        <button
          aria-pressed={subtitlesEnabled}
          className="comic-button w-full bg-white py-1 text-sm"
          onClick={toggleSubtitles}
        >
          Subtitles: {subtitlesEnabled ? 'On' : 'Off'}
        </button>
        </div>
      </details>

      {!track && (
        <p className="mt-2 text-xs text-ink/65">
          {needsOriginal ? 'Song files stay on your computer. Restore the original, or replace it to change this project’s song.' : 'Start the demo or choose your own track, press Play, then follow the world marker.'}
        </p>
      )}
      {projectTrack.source === 'local-file' && <p className="mt-2 text-xs text-ink/65">{projectTrack.rights.licenseRef === 'LicenseRef-User-Provided-Unverified' ? 'Private local preview. Uploaded music rights are unverified.' : 'Local song. Rights recorded in this project.'}</p>}
      {(demoError || demoTrack.status === 'error') && (
        <p role="alert" className="mt-2 text-sm font-bold text-comic-red">
          {demoError ?? 'The built-in demo is unavailable. Choose your own music to continue.'}
        </p>
      )}
      {error && (
        <div className="mt-2 border-t-2 border-comic-red/30 pt-2">
          <p role="alert" className="text-sm font-bold text-comic-red">{error}</p>
          <label
            className="comic-button mt-2 block cursor-pointer bg-white text-center text-sm"
            htmlFor="music-file-input"
          >
            Choose another audio file
          </label>
        </div>
      )}
    </section>
  );
}
