import type { JsonObject, SpatialSceneDefinition } from '../schema';

export const MUSIC_EXPERIENCE_SCHEMA_VERSION = '0.1' as const;
export type MusicExperienceSchemaVersion = typeof MUSIC_EXPERIENCE_SCHEMA_VERSION;

export type MusicExperienceTemplate =
  | 'journey'
  | 'memory'
  | 'encounter'
  | 'transformation'
  | 'open-planet';

export type MusicSectionKind =
  | 'intro