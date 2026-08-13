import { create } from 'zustand';
import { useInteractionStore } from '../../state/useInteractionStore';
import { LocalAudioPlayer } from './LocalAudioPlayer';
import type { AudioLoadStatus, LocalAudioTrack } from './audioUploadTypes';

const player = new LocalAudioPlayer();
const AUDIO_LOAD_TIMEOUT_MS = 10_000;
let loadTimeout: ReturnType<typeof setTimeout> | null = null;

function clearLoadTimeout() {
  if (loadTimeout !== null) {
    clearTimeout(loadTimeout);
    loadTimeout = null;
  }
}

interface AudioStore {
  track: LocalAudioTrack | null;
  currentTime: number;
  duration: number;
  playing: boolean;
  started: boolean;
  ended: boolean;
  status: AudioLoadStatus;
  error: string | null;
  load: (file: File) => void;
  play: () => Promise<void>;
  pause: () => void;
  seek: (seconds: number) => void;
  clear: () => void;
  sync: () => void;
}

const initialState = {
  track: null,
  currentTime: 0,
  duration: 0,
  playing: false,
  started: false,
  ended: false,
  status: 'idle' as AudioLoadStatus,
  error: null,
};

export const useAudioPlayerStore = create<AudioStore>((set, get) => ({
  ...initialState,

  load(file) {
    if (!file.type.startsWith('audio/') && !file.name.toLowerCase().endsWith('.mp3')) {
      set({ error: 'Please choose an audio file.', status: 'error' });
      return;
    }

    try {
      const replacingTrack = Boolean(get().track);
      const track = player.load(file);
      useInteractionStore
        .getState()
        .resetInteractionRuntime(
          replacingTrack ? 'track-replaced' : 'track-loaded',
        );
      set({
        track,
        currentTime: 0,
        duration: 0,
        playing: false,
        started: false,
        ended: false,
        status: 'loading',
        error: null,
      });
      clearLoadTimeout();
      loadTimeout = setTimeout(() => {
        const state = useAudioPlayerStore.getState();
        if (state.track?.id !== track.id || state.status !== 'loading') return;
        useAudioPlayerStore.setState({
          playing: false,
          status: 'error',
          error: 'The browser could not decode this audio file.',
        });
      }, AUDIO_LOAD_TIMEOUT_MS);
    } catch (error) {
      set({
        ...initialState,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unable to load this audio file.',
      });
    }
  },

  async play() {
    if (!get().track) return;

    try {
      if (get().ended) {
        useInteractionStore.getState().resetInteractionRuntime('replay');
        player.seek(0);
      }
      await player.play();
      set({ playing: true, started: true, ended: false, error: null });
    } catch (error) {
      set({
        playing: false,
        error: error instanceof Error ? error.message : 'Playback could not start.',
      });
    }
  },

  pause() {
    player.pause();
    set({ playing: false });
  },

  seek(seconds) {
    player.seek(seconds);
    set({ currentTime: player.currentTime, ended: false });
  },

  clear() {
    clearLoadTimeout();
    player.clear();
    useInteractionStore.getState().resetInteractionRuntime('track-replaced');
    set(initialState);
  },

  sync() {
    const duration = player.duration;
    set((state) => ({
      currentTime: player.currentTime,
      duration,
      playing: !player.paused,
      ended: player.ended,
      status: state.track && duration > 0 ? 'ready' : state.status,
      track: state.track ? { ...state.track, duration } : null,
    }));
  },
}));

export function getAuthoritativeAudioTime(): number {
  return player.currentTime;
}

export function setMusicPlaybackVolume(volume: number): void {
  player.setVolume(volume);
}

player.element.addEventListener('loadedmetadata', () => {
  clearLoadTimeout();
  useAudioPlayerStore.getState().sync();
});
player.element.addEventListener('durationchange', () => {
  if (player.duration > 0) clearLoadTimeout();
  useAudioPlayerStore.getState().sync();
});
player.element.addEventListener('timeupdate', () => useAudioPlayerStore.getState().sync());
player.element.addEventListener('play', () =>
  useAudioPlayerStore.setState({ playing: true, started: true, ended: false }),
);
player.element.addEventListener('pause', () => useAudioPlayerStore.setState({ playing: false }));
player.element.addEventListener('ended', () => {
  useAudioPlayerStore.getState().sync();
  useAudioPlayerStore.setState({ playing: false, ended: true });
});
player.element.addEventListener('error', () => {
  clearLoadTimeout();
  useAudioPlayerStore.setState({
    playing: false,
    status: 'error',
    error: 'The browser could not decode this audio file.',
  });
});
