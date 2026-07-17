import { create } from 'zustand';
import type { CameraMode } from '../camera/cameraTypes';
import type {
  NarrativeEnvironmentState,
  NarrativeTone,
} from '../music/narrative/narrativeTypes';

export interface MusicNarrationState {
  body: string;
  tone: NarrativeTone;
}

export interface MusicEnergyState {
  overall: number;
  bass: number;
  mid: number;
  treble: number;
}

export interface ActiveMusicCue {
  id: string;
  label?: string;
  atSeconds: number;
}

export interface MusicTimelineState {
  environment: NarrativeEnvironmentState;
  cameraMode: CameraMode;
  narration: MusicNarrationState | null;
  portals: Record<string, boolean>;
  landmarks: Record<string, boolean>;
  activeCue: ActiveMusicCue | null;
}

export const DEFAULT_MUSIC_ENVIRONMENT: NarrativeEnvironmentState = {
  skyColor: '#07111f',
  groundColor: '#211b3a',
  fogColor: '#0b1020',
  fogDensity: 0.012,
  stars: 24,
  bloomIntensity: 0.25,
  rainIntensity: 0,
};

export const EMPTY_MUSIC_ENERGY: MusicEnergyState = {
  overall: 0,
  bass: 0,
  mid: 0,
  treble: 0,
};

export function createInitialMusicTimelineState(): MusicTimelineState {
  return {
    environment: { ...DEFAULT_MUSIC_ENVIRONMENT },
    cameraMode: 'explore',
    narration: null,
    portals: { departure: false },
    landmarks: {
      'memory-tree': false,
      'light-path': false,
    },
    activeCue: null,
  };
}

interface MusicExperienceStore {
  active: boolean;
  progress: number;
  timeline: MusicTimelineState;
  energy: MusicEnergyState;
  applyTimeline: (timeline: MusicTimelineState, progress: number) => void;
  setEnergy: (energy: MusicEnergyState) => void;
  reset: () => void;
}

export const useMusicExperienceStore = create<MusicExperienceStore>((set) => ({
  active: false,
  progress: 0,
  timeline: createInitialMusicTimelineState(),
  energy: { ...EMPTY_MUSIC_ENERGY },

  applyTimeline: (timeline, progress) =>
    set({
      active: true,
      progress: Math.min(1, Math.max(0, progress)),
      timeline: {
        ...timeline,
        environment: { ...timeline.environment },
        portals: { ...timeline.portals },
        landmarks: { ...timeline.landmarks },
      },
    }),

  setEnergy: (energy) => set({ energy: { ...energy } }),

  reset: () =>
    set({
      active: false,
      progress: 0,
      timeline: createInitialMusicTimelineState(),
      energy: { ...EMPTY_MUSIC_ENERGY },
    }),
}));
