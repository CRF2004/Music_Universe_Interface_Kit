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
  overall: