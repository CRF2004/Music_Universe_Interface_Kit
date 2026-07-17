import type { CameraMode } from '../../camera/cameraTypes';

export type NarrativeTone = 'neutral' | 'wonder' | 'memory' | 'tension' | 'release';

export interface NarrativeEnvironmentState {
  skyColor: string;
  groundColor: string;
  fogColor: string;
  fogDensity: number;
  stars: number;
  bloomIntensity: number;
  rainIntensity: number;
}

export type SpatialNarrativeAction =
  | { type: 'set-environment'; payload: Partial<NarrativeEnvironmentState> }
  | { type: 'set-camera'; payload: { mode: CameraMode } }
  | { type: 'show-narration'; payload: { body: string; tone?: NarrativeTone } }
  | { type: 'set-portal'; payload: { id: string; open: boolean } }
  | { type: 'set-landmark'; payload: { id: string; visible: boolean } };

export interface SpatialNarrativeCue {
  id: string;
  atSeconds: number;
  label?: string;
  actions: SpatialNarrativeAction[];
}
