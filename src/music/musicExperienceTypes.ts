import type { JsonObject, SpatialSceneDefinition } from '../schema';
import type { MusicTimelineCue } from './musicTimeline';

export const MUSIC_EXPERIENCE_SCHEMA_VERSION = '0.1' as const;
export type MusicExperienceSchemaVersion = typeof MUSIC_EXPERIENCE_SCHEMA_VERSION;

export type MusicExperienceTemplate =
  | 'journey'
  | 'memory'
  | 'encounter'
  | 'transformation'
  | 'open-planet';

export type MusicSectionKind =
  | 'intro'
  | 'verse'
  | 'pre-chorus'
  | 'chorus'
  | 'bridge'
  | 'breakdown'
  | 'interlude'
  | 'outro'
  | 'custom';

export interface MusicExperienceAudio {
  source: 'local' | 'remote';
  fileName?: string;
  url?: string;
  mimeType?: string;
  durationSeconds?: number;
}

export interface MusicSectionAnalysis {
  id: string;
  kind: MusicSectionKind;
  startSeconds: number;
  endSeconds: number;
  label?: string;
  energy?: number;
  emotionTags?: string[];
  metadata?: JsonObject;
}

export interface MusicAnalysisDefinition {
  durationSeconds: number;
  bpm?: number;
  key?: string;
  sections: MusicSectionAnalysis[];
  metadata?: JsonObject;
}

export interface MusicWorldBible {
  title: string;
  premise: string;
  listenerRole: string;
  visualMotifs: string[];
  palette: string[];
  emotionalArc: string[];
  metadata?: JsonObject;
}

export interface MusicGenerationRecipe {
  provider?: string;
  prompt?: string;
  assetHints?: string[];
  metadata?: JsonObject;
}

export interface MusicExperiencePublication {
  status: 'draft' | 'published' | 'archived';
  parentExperienceId?: string;
  publishedAt?: string;
}

export interface MusicWorldExperienceDefinition {
  version: MusicExperienceSchemaVersion;
  id: string;
  name: string;
  description?: string;
  template: MusicExperienceTemplate;
  audio: MusicExperienceAudio;
  analysis: MusicAnalysisDefinition;
  worldBible: MusicWorldBible;
  timeline: MusicTimelineCue[];
  scene: SpatialSceneDefinition;
  generation?: MusicGenerationRecipe;
  publication?: MusicExperiencePublication;
  metadata?: JsonObject;
}
