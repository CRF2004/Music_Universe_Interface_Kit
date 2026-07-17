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

export interface MusicExperienceSnapshot {
  environment: Partial<NarrativeEnvironmentState>;
  cameraMode?: CameraMode;
  narration?: MusicNarrationState;
  portals: Record<string, boolean>;
  landmarks: Record<string, boolean>;
  energy: number;
}

const emptySnapshot: MusicExperienceSnapshot = {
  environment: {},
  portals: {},
  landmarks: {},
  energy: 0,
};

interface MusicExperienceStore {
  snapshot: MusicExperienceSnapshot;
  setSnapshot: (snapshot: MusicExperienceSnapshot) => void;
}

export const useMusicExperienceStore = create<MusicExperienceStore>((set) => ({
  snapshot: emptySnapshot,
  setSnapshot: (snapshot) => set({ snapshot }),
}));
