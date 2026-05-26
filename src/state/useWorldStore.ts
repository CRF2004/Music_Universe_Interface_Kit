import { create } from 'zustand';
import { CameraMode } from '../camera/cameraTypes';
import { WorldDefinition } from '../world/worldTypes';

interface WorldState {
  currentCameraMode: CameraMode;
  isDevMode: boolean;
  isPaused: boolean;
  activeWorld: WorldDefinition | null;
  
  setCameraMode: (mode: CameraMode) => void;
  toggleDevMode: () => void;
  setPaused: (paused: boolean) => void;
  setActiveWorld: (world: WorldDefinition) => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  currentCameraMode: 'explore',
  isDevMode: false,
  isPaused: false,
  activeWorld: null,

  setCameraMode: (mode) => set({ currentCameraMode: mode }),
  toggleDevMode: () => set((state) => ({ isDevMode: !state.isDevMode })),
  setPaused: (paused) => set({ isPaused: paused }),
  setActiveWorld: (world) => set({ activeWorld: world }),
}));
