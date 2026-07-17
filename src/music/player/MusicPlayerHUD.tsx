import { useAudioPlayerStore } from './useAudioPlayerStore';

export default function MusicPlayerHUD() {
  const { track, currentTime, duration, playing, load, play, pause, seek } = useAudioPlayerStore();

  return (
    <div className="pointer-events-auto fixed bottom-6 left-6 z-50 rounded-xl bg-black/60 p-4 text-white backdrop-blur">
      <input
        type="file"
        accept="audio/*"
        onChange={(e) => e.target.files?.[0] && load(e.target.files[0])}
      />
      <div className="mt-2 flex gap-2">
        <button onClick={() => (playing ? pause() : play())}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <span>{Math.floor(currentTime)} / {Math.floor(duration)}s</span>
      </div>
      <input
        className="mt-2 w-64"
        type="range"
        min={0}
        max={duration || 0}
        value={currentTime}
        onChange={(e) => seek(Number(e.target.value))}
      />
      <div>{track?.name ?? 'No music loaded'}</div>
    </div>
  );
}
