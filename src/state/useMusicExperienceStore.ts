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

export interface MusicExperienceSnapshot {
  environment: NarrativeEnvironmentState;
  cameraMode: CameraMode;
  narration: MusicNarrationState | null;
  portals: Record<string, boolean>;
  landmarks: Record<string, boolean>;
  energy: MusicEnergyState;
  progress: number;
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

export function createInitialMusicExperienceSnapshot(): MusicExperienceSnapshot {
  return {
    environment: { ...DEFAULT_MUSIC_ENVIRONMENT },
    cameraMode: 'explore',
    narration: null,
    portals: { departure: false },
    landmarks: {
      'memory-tree': false,
      'light-path': false,
    },
    energy: { ...EMPTY_MUSIC_ENERGY },
    progress: 0,
  };
}

interface MusicExperienceStore {
  snapshot: MusicExperienceSnapshot;
  setSnapshot: (snapshot: MusicExperienceSnapshot) => void;
  reset: () => void;
}

export const useMusicExperienceStore = create<MusicExperienceStore>((set) => ({
  snapshot: createInitialMusicExperienceSnapshot(),
  setSnapshot: (snapshot) => set({ snapshot }),
  reset: () => set({ snapshot: createInitialMusicExperienceSnapshot() }),
}));
