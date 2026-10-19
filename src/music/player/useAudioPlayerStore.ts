import { create } from 'zustand';
import { useInteractionStore } from '../../state/useInteractionStore';
import { LocalAudioPlayer } from './LocalAudioPlayer';
import type { AudioLoadStatus, LocalAudioTrack } from './audioUploadTypes';
import { projectTrackKey, useProjectStore } from '../../state/useProjectStore';
import type { MusicWorldProjectTrack } from '../../project/musicWorldProject';
import { assertMatchingAudio, identifyAudioFile, localTrackRecord } from './projectAudioIdentity';
import { useMusicRuntimeStore } from '../runtime/useMusicRuntimeStore';
import { compileNormalizedMusicTimeline } from '../musicTimeline';
import { replayMusicTimeline } from '../runtime/musicExperienceRuntime';

let player = new LocalAudioPlayer();
let requestVersion = 0;
let pendingLoad: AbortController | null = null;
let bindingTrack = false;
let playbackVolume = 1;
let loadedFile: File | null = null;
let pendingAnalysis: AbortController | null = null;
const AUDIO_LOAD_TIMEOUT_MS = 10_000;

interface AudioStore {
  track: LocalAudioTrack | null;
  currentTime: number;
  duration: number;
  playing: boolean;
  started: boolean;
  ended: boolean;
  status: AudioLoadStatus;
  error: string | null;
  analysisStatus: 'idle' | 'analyzing' | 'error';
  analysisError: string | null;
  analyze: () => Promise<void>;
  cancelAnalysis: () => void;
  load: (file: File, options?: { assetTrack?: MusicWorldProjectTrack; reattach?: boolean }) => Promise<void>;
  play: () => Promise<void>;
  restartJourney: () => Promise<void>;
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
  analysisStatus: 'idle' as const,
  analysisError: null,
};

export const useAudioPlayerStore = create<AudioStore>((set, get) => ({
  ...initialState,

  async load(file, options = {}) {
    const request = ++requestVersion;
    pendingLoad?.abort();
    const abort = new AbortController();
    pendingLoad = abort;
    const projectId = useProjectStore.getState().activeProjectId;
    const expected = structuredClone(useProjectStore.getState().project.track);
    if (!file.type.startsWith('audio/') && !file.name.toLowerCase().endsWith('.mp3')) {
      pendingLoad = null;
      set({ error: 'Please choose an audio file.', status: 'error' });
      return;
    }
    const candidate = new LocalAudioPlayer();
    try {
      set({ status: 'loading', error: null });
      const identity = options.assetTrack ? null : await identifyAudioFile(file);
      if (abort.signal.aborted) return;
      const track = await new Promise<LocalAudioTrack>((resolve, reject) => {
        let candidateTrack: LocalAudioTrack;
        const cleanup = () => {
          clearTimeout(timeout);
          candidate.element.removeEventListener('loadedmetadata', ready);
          candidate.element.removeEventListener('error', failed);
          abort.signal.removeEventListener('abort', canceled);
        };
        const ready = () => {
          if (candidate.duration <= 0) return;
          cleanup();
          resolve({ ...candidateTrack, duration: candidate.duration });
        };
        const failed = () => { cleanup(); reject(new Error('The browser could not decode this audio file.')); };
        const canceled = () => { cleanup(); reject(new Error('Song loading was canceled.')); };
        const timeout = setTimeout(failed, AUDIO_LOAD_TIMEOUT_MS);
        candidate.element.addEventListener('loadedmetadata', ready);
        candidate.element.addEventListener('error', failed);
        abort.signal.addEventListener('abort', canceled);
        try { candidateTrack = candidate.load(file); } catch (error) { cleanup(); reject(error); }
      });
      if (request !== requestVersion || abort.signal.aborted || useProjectStore.getState().activeProjectId !== projectId) return;
      if (options.reattach && identity) assertMatchingAudio(expected, identity, track.duration);
      const projectTrack = options.assetTrack
        ? { ...options.assetTrack, expectedDurationSeconds: track.duration }
        : identity ? localTrackRecord(identity, track.duration) : null;
      if (!projectTrack) throw new Error('The song identity could not be read.');
      if (!options.reattach) {
        bindingTrack = true;
        let bound: boolean;
        try { bound = useProjectStore.getState().bindTrack(projectId, projectTrack); } finally { bindingTrack = false; }
        if (!bound) throw new Error('The song could not be linked to the current project.');
      }
      const replacingTrack = Boolean(get().track);
      get().cancelAnalysis();
      loadedFile = file;
      player.destroy();
      player = candidate;
      player.setVolume(playbackVolume);
      attachPlayerEvents(player);
      useInteractionStore
        .getState()
        .resetInteractionRuntime(
          replacingTrack ? 'track-replaced' : 'track-loaded',
        );
      set({
        track,
        currentTime: 0,
        duration: track.duration,
        playing: false,
        started: false,
        ended: false,
        status: 'ready',
        error: null,
      });
    } catch (error) {
      if (request === requestVersion && !abort.signal.aborted) set({ status: 'error', error: error instanceof Error ? error.message : 'Unable to load this audio file.' });
    } finally {
      if (candidate !== player) candidate.destroy();
      if (pendingLoad === abort) pendingLoad = null;
    }
  },

  async play() {
    if (!get().track) return;
    const observed = player;
    const request = requestVersion;

    try {
      if (get().ended) {
        useInteractionStore.getState().resetInteractionRuntime('replay');
        player.seek(0);
        // Reconstruct the world at the replay origin immediately. Waiting for
        // the browser's next timeupdate leaves a short race where interaction
        // flags are reset but timeline visuals still represent the track end.
        set({ currentTime: 0, ended: false });
      }
      await player.play();
      if (player !== observed || request !== requestVersion) return;
      set({ playing: true, started: true, ended: false, error: null });
    } catch (error) {
      if (player !== observed || request !== requestVersion) return;
      set({
        playing: false,
        error: error instanceof Error ? error.message : 'Playback could not start.',
      });
    }
  },

  async restartJourney() {
    if (!get().track || get().status !== 'ready') {
      set({ error: '请先在音乐设置中载入歌曲，再重新开始。' });
      return;
    }
    get().pause();
    get().seek(0);
    const cues = compileNormalizedMusicTimeline(useProjectStore.getState().project.timeline.cues, get().duration);
    useMusicRuntimeStore.getState().setRuntime(replayMusicTimeline(cues, 0));
    useInteractionStore.getState().resetInteractionRuntime('restart');
    await get().play();
  },

  async analyze() {
    if (!loadedFile || get().analysisStatus === 'analyzing') return;
    const file = loadedFile;
    const projectId = useProjectStore.getState().activeProjectId;
    const key = projectTrackKey(useProjectStore.getState().project.track);
    const abort = new AbortController();
    pendingAnalysis = abort;
    set({ analysisStatus: 'analyzing', analysisError: null });
    try {
      const { analyzeAudioFile } = await import('../analysis/analyzeAudioFile');
      const analysis = await analyzeAudioFile(file, get().duration, abort.signal);
      if (abort.signal.aborted || loadedFile !== file) return;
      if (!useProjectStore.getState().updateMusicAnalysis(projectId, key, analysis)) throw new Error('The song or project changed. Analyze the current song again.');
      set({ analysisStatus: 'idle', analysisError: null });
    } catch (error) {
      if (!abort.signal.aborted) set({ analysisStatus: 'error', analysisError: error instanceof Error ? error.message : 'Analysis failed.' });
    } finally { if (pendingAnalysis === abort) pendingAnalysis = null; }
  },

  cancelAnalysis() {
    pendingAnalysis?.abort();
    pendingAnalysis = null;
    set({ analysisStatus: 'idle', analysisError: null });
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
    get().cancelAnalysis();
    loadedFile = null;
    requestVersion += 1;
    pendingLoad?.abort();
    pendingLoad = null;
    const previousPlayer = player;
    player = new LocalAudioPlayer();
    player.setVolume(playbackVolume);
    attachPlayerEvents(player);
    previousPlayer.destroy();
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
      status: state.status === 'loading' ? 'loading' : state.track && duration > 0 ? 'ready' : state.status,
      track: state.track ? { ...state.track, duration } : null,
    }));
  },
}));

export function getAuthoritativeAudioTime(): number {
  return player.currentTime;
}

export function setMusicPlaybackVolume(volume: number): void {
  playbackVolume = volume;
  player.setVolume(volume);
}

function attachPlayerEvents(observed: LocalAudioPlayer) {
const listen = (name: string, action: () => void) => observed.element.addEventListener(name, () => { if (player === observed) action(); });
listen('loadedmetadata', () => {
  useAudioPlayerStore.getState().sync();
});
listen('durationchange', () => {
  useAudioPlayerStore.getState().sync();
});
listen('timeupdate', () => useAudioPlayerStore.getState().sync());
listen('play', () =>
  useAudioPlayerStore.setState({ playing: true, started: true, ended: false }),
);
listen('pause', () => useAudioPlayerStore.setState({ playing: false }));
listen('ended', () => {
  useAudioPlayerStore.getState().sync();
  useAudioPlayerStore.setState({ playing: false, ended: true });
});
listen('error', () => {
  useAudioPlayerStore.setState({
    playing: false,
    status: 'error',
    error: 'The browser could not decode this audio file.',
  });
});
}
attachPlayerEvents(player);
useProjectStore.subscribe((state, previous) => {
  if (state.activeProjectId !== previous.activeProjectId || (!bindingTrack && projectTrackKey(state.project.track) !== projectTrackKey(previous.project.track))) {
    useAudioPlayerStore.getState().clear();
  }
});
