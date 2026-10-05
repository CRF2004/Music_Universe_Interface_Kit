import type { NormalizedMusicTimelineCue } from '../music';
import type { JsonObject, SpatialSceneDefinition } from '../schema';
import type { MusicAnalysis } from '../music/analysis/musicAnalysis';

export const MUSIC_WORLD_PROJECT_SCHEMA_VERSION = 2 as const;

export interface MusicWorldProjectMetadata {
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  authors: string[];
}

export interface MusicWorldProjectTrack {
  analysis?: MusicAnalysis;
  source: 'asset' | 'local-file';
  assetId?: string;
  title: string;
  artist?: string;
  expectedDurationSeconds?: number;
  file?: { name: string; sizeBytes: number; sha256: string };
  rights: {
    licenseRef: string;
    attribution: string;
  };
}

export interface MusicWorldProjectBible {
  premise: string;
  listenerRole: string;
  visualMotifs: string[];
  palette: string[];
  emotionalArc: string[];
}

export interface MusicWorldProjectPresentation {
  subtitlesAvailable: boolean;
  reducedEffectsAvailable: boolean;
  launchInput: 'desktop-keyboard-pointer';
}

export interface MusicWorldProjectAssetReference {
  id: string;
  type: 'model' | 'texture' | 'audio';
  licenseRef: string;
}

export interface MusicWorldProject {
  schemaVersion: typeof MUSIC_WORLD_PROJECT_SCHEMA_VERSION;
  id: string;
  metadata: MusicWorldProjectMetadata;
  track: MusicWorldProjectTrack;
  worldBible: MusicWorldProjectBible;
  timeline: {
    timeBase: 'normalized-track-position';
    cues: NormalizedMusicTimelineCue[];
  };
  scene: SpatialSceneDefinition;
  assets: MusicWorldProjectAssetReference[];
  presentation: MusicWorldProjectPresentation;
  extensions?: JsonObject;
}
