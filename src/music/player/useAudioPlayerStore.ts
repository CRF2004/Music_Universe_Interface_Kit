import { create } from 'zustand';
import { LocalAudioPlayer } from './LocalAudioPlayer';
import type { LocalAudioTrack } from './audioUploadTypes';

const player = new LocalAudioPlayer();

interface AudioStore {
  track: LocalAudioTrack | null;
  currentTime: number;
  duration: number;
  playing: boolean;
  load: (file: File) => void;
  play: () => Promise<void>;
  pause: () => void;
  seek: (seconds: number) => void;
  sync: () => void;
}

export const useAudioPlayerStore = create<AudioStore>((set) => ({
  track: null,
  currentTime: 0,
  duration: 0,
  playing: false,

  load(file) {
    const track = player.load(file);
    set({ track, currentTime: 0, duration: 0 });
  },

  async play() {
    await player.play();
    set({ playing: true });
  },

  pause() {
    player.pause();
    set({ playing: false });
  },

  seek(seconds) {
    player.seek(seconds);
    set({ currentTime: player.currentTime });
  },

  sync() {
    set({
      currentTime: player.currentTime,
      duration: player.duration,
      playing: !player.paused,
    });
  },
}));

player.element.addEventListener('timeupdate', () => useAudioPlayerStore.getState().sync());
player.element.addEventListener('loadedmetadata', () => useAudioPlayerStore.getState().sync());
player.element.addEventListener('ended', () => useAudioPlayerStore.setState({ playing: false }));
