export const SPATIAL_SCENE_SCHEMA_VERSION = '0.1' as const;

export type SpatialSceneSchemaVersion = typeof SPATIAL_SCENE_SCHEMA_VERSION;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type Vector2Tuple = [number, number];
export type Vector3Tuple = [number, number, number];

export type SpatialSceneTheme = 'rough-comic' | 'low-poly' | 'minimal';
export type SpatialTerrainType = 'curved-plane' | 'flat-plane' | 'sphere';

export type SpatialInteractionKind =
  | 'dialog'
  | 'panel'
  | 'command'
  | 'route'
  | 'agent'
  | 'inspect'
  | 'custom';

export type SpatialActionKind =
  | SpatialInteractionKind
  | 'set-flag'
  | 'clear-flag';

export type SpatialTriggerKind =
  | 'proximity'
  | 'click'
  | 'hotkey'
  | 'collision'
  | 'zone-enter'
  | 'zone-exit'
  | 'scripted';

export type SpatialConditionType =
  | 'flag'
  | 'app-state'
  | 'inventory'
  | 'permission'
  | 'custom';

export type SpatialConditionOperator =
  | 'equals'
  | 'not-equals'
  | 'exists'
  | 'includes'
  | 'gt'
  | 'lt';

export type SpatialCameraMode =
  | 'explore'
  | 'interaction'
  | 'cinematic'
  | 'inspection'
  | 'ui-safe';

export type SpatialVisualType =
  | 'npc'
  | 'phone-booth'
  | 'vehicle'
  | 'building'
  | 'portal'
  | 'crate'
  | (string & {});

export interface SpatialSceneEffects {
  outline?: boolean;
  halftone?: boolean;
  grain?: boolean;
  grainIntensity?: number;
  vignetteIntensity?: number;
  palette?: string;
}

export interface SpatialCameraConfig {
  fov?: number;
  distance?: number;
  height?: number;
  lookAtHeight?: number;
  followSharpness?: number;
  rotationSharpness?: number;
  shoulderOffset?: number;
  barrelDistortion?: number;
  cameraShake?: number;
  followRotation?: boolean;
  fixedHeading?: number;
}

export interface SpatialTerrainDefinition {
  type: SpatialTerrainType;
  size: Vector2Tuple;
  curvature: number;
}

export interface SpatialSceneEnvironment {
  theme: SpatialSceneTheme;
  terrain: SpatialTerrainDefinition;
  effects?: SpatialSceneEffects;
  camera?: SpatialCameraConfig;
}

export interface SpatialTransformDefinition {
  position: Vector3Tuple;
  rotation?: Vector3Tuple;
  scale?: Vector3Tuple;
}

export interface SpatialAppearanceDefinition {
  modelUrl?: string;
  icon?: string;
  colorToken?: string;
  outline?: boolean;
  hoverAnimation?: 'bounce' | 'pulse' | 'shake' | 'none';
  prompt?: string;
  labelVisible?: 'always' | 'nearby' | 'hover' | 'never';
}

export interface SpatialConditionDefinition {
  type: SpatialConditionType;
  key: string;
  operator?: SpatialConditionOperator;
  value?: JsonValue;
}

export interface SpatialTriggerDefinition {
  type: SpatialTriggerKind;
  enabled?: boolean;
  prompt?: string;
  hotkey?: string;
  radius?: number;
  once?: boolean;
  cooldownMs?: number;
  conditions?: SpatialConditionDefinition[];
  metadata?: JsonObject;
}

export interface SpatialActionDefinition {
  id: string;
  type: SpatialActionKind;
  target?: string;
  payload?: JsonObject;
  closeOnComplete?: boolean;
  cameraMode?: SpatialCameraMode;
  conditions?: SpatialConditionDefinition[];
}

export interface SpatialInteractionDefinition {
  kind: SpatialInteractionKind;
  group?: string;
  tags?: string[];
  radius?: number;
  priority?: number;
  enabled?: boolean;
  visible?: boolean;
  triggers: SpatialTriggerDefinition[];
  actions: SpatialActionDefinition[];
}

export interface SpatialObjectDefinition {
  id: string;
  type: SpatialVisualType;
  label: string;
  description?: string;
  transform: SpatialTransformDefinition;
  appearance?: SpatialAppearanceDefinition;
  interaction: SpatialInteractionDefinition;
  metadata?: JsonObject;
}

export interface SpatialZoneDefinition {
  id: string;
  label: string;
  position: Vector3Tuple;
  radius: number;
}

export interface SpatialSceneProvenance {
  source: 'human' | 'ai' | 'mixed';
  generator?: string;
  prompt?: string;
  generatedAt?: string;
}

export interface SpatialSceneDefinition {
  version: SpatialSceneSchemaVersion;
  id: string;
  name: string;
  description?: string;
  spawn?: Vector3Tuple;
  environment: SpatialSceneEnvironment;
  zones?: SpatialZoneDefinition[];
  objects: SpatialObjectDefinition[];
  provenance?: SpatialSceneProvenance;
  metadata?: JsonObject;
}
