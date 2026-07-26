import { create } from 'zustand';
import type { MusicRuntimeState } from './musicExperienceRuntime';

interface MusicRuntimeStore extends MusicRuntimeState {
  setRuntime: (runtime: MusicRuntimeState) => void;
}

const initialState: MusicRuntimeState = {
  environment: {},
  portals: {},
  landmarks: {},
};

export const useMusicRuntimeStore = create<MusicRuntimeStore>((set) => ({
  ...initialState,
  setRuntime: (runtime) =>
    set(() => ({
      environment: runtime.environment,
      cameraMode: runtime.cameraMode,
      narration: runtime.narration,
      portals: runtime.portals,
      landmarks: runtime.landmarks,
    })),
}));
