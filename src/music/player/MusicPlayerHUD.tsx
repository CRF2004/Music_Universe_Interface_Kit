import { useAudioPlayerStore } from './useAudioPlayerStore';

export default function MusicPlayerHUD() {
  const { track, currentTime, duration, playing, status, error, load, play, pause, seek } =
    useAudioPlayerStore();
  const ready = Boolean(track) && duration > 0;

  return (
    <section
      aria-label="Music player"
      className="pointer-events-auto fixed bottom-5 left-5 z-[60] w-[min(22rem,calc(100vw-2.5rem))] rounded-xl border-4 border-ink bg-paper p-4 text-ink shadow-[6px_6px_0_0_#111]"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-ink/60">
            Music Universe
          </p>
          <p className="max-w-52 truncate font-display font-bold">
            {track?.name ?? 'Choose a song to begin'}
          </p>
        </div>
        <span className="rounded-full bg-ink px-2 py-1 font-mono text-[10px] uppercase text-white">
          {playing ? 'looping' : status}
        </span>
      </div>

      <label className="comic-button block cursor-pointer bg-white text-center text-sm">
        {track ? 'Replace music' : 'Choose music'}
        <input
          className="sr-only"
          type="file"
          accept="audio/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) load(file);
            event.target.value = '';
          }}
        />
      </label>

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

      {!track && (
        <p className="mt-2 text-xs text-ink/65">The world changes only after you press Play.</p>
      )}
      {error && <p role="alert" className="mt-2 text-sm font-bold text-comic-red">{error}</p>}
    </section>
  );
}
