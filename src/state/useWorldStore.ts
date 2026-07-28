import { create } from 'zustand';
import { CameraMode } from '../camera/cameraTypes';
import { WorldDefinition } from '../world/worldTypes';

interface WorldState {
  currentCameraMode: CameraMode;
  isDevMode: boolean;
  isPaused: boolean;
  reducedEffects: boolean;
  helpOpen: boolean;
  activeWorld: WorldDefinition | null;
  
  setCameraMode: (mode: CameraMode) => void;
  toggleDevMode: () => void;
  setPaused: (paused: boolean) => void;
  setReducedEffects: (reduced: boolean) => void;
  setHelpOpen: (open: boolean) => void;
  setActiveWorld: (world: WorldDefinition) => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  currentCameraMode: 'explore',
  isDevMode: false,
  isPaused: false,
  reducedEffects: false,
  helpOpen: false,
  activeWorld: null,

  setCameraMode: (mode) => set({ currentCameraMode: mode }),
  toggleDevMode: () => set((state) => ({ isDevMode: !state.isDevMode })),
  setPaused: (paused) => set({ isPaused: paused }),
  setReducedEffects: (reducedEffects) => set({ reducedEffects }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  setActiveWorld: (world) => set({ activeWorld: world }),
}));
