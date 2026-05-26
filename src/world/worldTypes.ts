import { InteractionPointDefinition } from '../interaction/interactionTypes';
import { CameraPreset } from '../camera/cameraTypes';

export interface WorldStyleDefinition {
  theme: 'rough-comic' | 'low-poly' | 'minimal';
  outline?: boolean;
  halftone?: boolean;
  grain?: boolean;
  grainIntensity?: number;
  vignetteIntensity?: number;
  palette?: string;
}

export interface TerrainDefinition {
  type: 'curved-plane' | 'flat-plane' | 'sphere';
  size: [number, number];
  curvature: number;
}

export interface ZoneDefinition {
  id: string;
  label: string;
  position: [number, number, number];
  radius: number;
}

export interface WorldDefinition {
  id: string;
  name: string;
  description?: string;
  spawnPoint: [number, number, number];

  style: WorldStyleDefinition;
  camera: Partial<CameraPreset>;
  terrain: TerrainDefinition;
  zones: ZoneDefinition[];
  interactions: InteractionPointDefinition[];
}
