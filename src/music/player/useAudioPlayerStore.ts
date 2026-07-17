import { create } from 'zustand';
import { LocalAudioPlayer } from './LocalAudioPlayer';
import type { AudioLoadStatus, LocalAudioTrack } from './audioUploadTypes';

const player = new LocalAudioPlayer();

interface AudioStore {
  track: LocalAudioTrack | null;
  currentTime: number;
  duration: number;
  playing: boolean;
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
  ended: false,
  status: 'idle' as AudioLoadStatus,
  error: null,
};

export const useAudioPlayerStore = create<AudioStore>((set, get) => ({
  ...initialState,
  load(file) {
    const track = player.load(file);
    set({ track, currentTime: 0, duration: 0, playing: false, ended: false, status: 'loading', error: null });
  },
  async play() {
    if (!get().track) return;
    if (get().ended) player.seek(0);
    await player.play();
    set({ playing: true, ended: false });
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
    player.clear();
    set(initialState);
  },
  sync() {
    set({ currentTime: player.currentTime, duration: player.duration, playing: !player.paused, ended: player.ended });
  },
}));

export function getAuthoritativeAudioTime(): number {
  return player.currentTime;
}

export function getAuthoritativeAudioElement(): HTMLAudioElement {
  return player.element;
}

player.element.addEventListener('loadedmetadata', () => useAudioPlayerStore.getState().sync());
player.element.addEventListener('timeupdate', () => useAudioPlayerStore.getState().sync());
player.element.addEventListener('ended', () => useAudioPlayerStore.setState({ playing: false, ended: true }));
