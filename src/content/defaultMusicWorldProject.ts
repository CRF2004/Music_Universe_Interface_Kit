import type { MusicWorldProjectAssetReference } from '../project';
import { MUSIC_WORLD_PROJECT_SCHEMA_VERSION, type MusicWorldProject } from '../project';
import { demoScene } from './demoScene';
import { defaultNormalizedMusicTimeline } from '../music/runtime/defaultMusicTimeline';

const projectAssets: MusicWorldProjectAssetReference[] = [
  ['guide-astronaut', 'model', 'CC0-1.0'],
  ['support-terminal', 'model', 'CC0-1.0'],
  ['product-tower-hangar', 'model', 'CC0-1.0'],
  ['docs-portal-gate', 'model', 'CC0-1.0'],
  ['portal-hum', 'audio', 'CC0-1.0'],
  ['wind-ambience', 'audio', 'CC0-1.0'],
  ['ui-hover', 'audio', 'CC0-1.0'],
  ['ui-confirm', 'audio', 'CC0-1.0'],
  ['footstep-a', 'audio', 'CC0-1.0'],
  ['footstep-b', 'audio', 'CC0-1.0'],
  ['memory-tree', 'model', 'MIT'],
  ['memory-tree-lod', 'model', 'MIT'],
  ['memory-tree-canopy', 'texture', 'MIT'],
  ['departure-portal', 'model', 'MIT'],
  ['crywolf-athetosis-demo', 'audio', 'LicenseRef-Project-Owner-Demo-Authorization'],
].map(([id, type, licenseRef]) => ({
  id,
  type: type as MusicWorldProjectAssetReference['type'],
  licenseRef,
}));

export const defaultMusicWorldProject = {
  schemaVersion: MUSIC_WORLD_PROJECT_SCHEMA_VERSION,
  id: 'memory-journey-default',
  metadata: {
    title: 'Memory Journey',
    description: 'Recover a song-memory and carry it through the Departure Gate.',
    createdAt: '2026-08-19T00:00:00.000Z',
    updatedAt: '2026-08-19T00:00:00.000Z',
    authors: ['Music Universe project team'],
  },
  track: {
    source: 'asset',
    assetId: 'crywolf-athetosis-demo',
    title: "ATHETOSIS [here's the lullaby you made me promise never to write]",
    artist: 'Crywolf / Justin Taylor Phillips',
    expectedDurationSeconds: 278,
    rights: {
      licenseRef: 'LicenseRef-Project-Owner-Demo-Authorization',
      attribution: 'ATHETOSIS — Crywolf / Justin Taylor Phillips',
    },
  },
  worldBible: {
    premise: 'A listening planet reveals one memory, then opens a path home.',
    listenerRole: 'The listener follows the song, recovers its memory, and carries it onward.',
    visualMotifs: ['listener beacon', 'memory archive', 'rooted memory', 'departure gate'],
    palette: ['#233a72', '#9f63ff', '#4adb7d', '#693b82'],
    emotionalArc: ['arrival', 'gathering', 'tension', 'memory', 'release', 'afterglow'],
  },
  timeline: {
    timeBase: 'normalized-track-position',
    cues: defaultNormalizedMusicTimeline,
  },
  scene: demoScene,
  assets: projectAssets,
  presentation: {
    subtitlesAvailable: true,
    reducedEffectsAvailable: true,
    launchInput: 'desktop-keyboard-pointer',
  },
} satisfies MusicWorldProject;
