import type { NormalizedMusicTimelineCue } from '../musicTimeline';

export const defaultNormalizedMusicTimeline: NormalizedMusicTimelineCue[] = [
  {
    id: 'arrival',
    position: 0,
    label: 'Arrival',
    actions: [
      {
        type: 'set-environment',
        payload: {
          skyColor: '#233a72',
          groundColor: '#7e6b9e',
          fogColor: '#40557f',
          fogDensity: 0.004,
          stars: 24,
          bloomIntensity: 0.25,
          rainIntensity: 0,
        },
      },
      { type: 'set-camera', payload: { mode: 'explore' } },
      {
        type: 'show-narration',
        payload: { body: 'The planet is listening.', tone: 'wonder' },
      },
    ],
  },
  {
    id: 'constellations',
    position: 0.16,
    label: 'Constellations',
    actions: [
      {
        type: 'set-environment',
        payload: { skyColor: '#334b85', stars: 180, bloomIntensity: 0.45 },
      },
      {
        type: 'show-narration',
        payload: { body: 'Distant notes gather into constellations.', tone: 'wonder' },
      },
    ],
  },
  {
    id: 'weather-front',
    position: 0.34,
    label: 'Weather Front',
    actions: [
      {
        type: 'set-environment',
        payload: {
          skyColor: '#3a5486',
          groundColor: '#6e668e',
          fogColor: '#5e7195',
          fogDensity: 0.006,
          rainIntensity: 0.7,
          stars: 120,
        },
      },
      {
        type: 'show-narration',
        payload: { body: 'The rhythm pulls a storm across the horizon.', tone: 'tension' },
      },
    ],
  },
  {
    id: 'memory-tree',
    position: 0.52,
    label: 'Memory Tree',
    actions: [
      { type: 'set-landmark', payload: { id: 'memory-tree', visible: true } },
      {
        type: 'set-environment',
        payload: { groundColor: '#77628f', bloomIntensity: 0.65 },
      },
      {
        type: 'show-narration',
        payload: { body: 'A memory takes root where the melody repeats.', tone: 'memory' },
      },
    ],
  },
  {
    id: 'light-path',
    position: 0.68,
    label: 'Light Path',
    actions: [
      { type: 'set-landmark', payload: { id: 'light-path', visible: true } },
      { type: 'set-camera', payload: { mode: 'cinematic' } },
      {
        type: 'set-environment',
        payload: { rainIntensity: 0.35, stars: 260, bloomIntensity: 0.9 },
      },
      {
        type: 'show-narration',
        payload: { body: 'A path answers the song and points beyond the ridge.', tone: 'wonder' },
      },
    ],
  },
  {
    id: 'departure-gate',
    position: 0.84,
    label: 'Departure Gate',
    actions: [
      { type: 'set-portal', payload: { id: 'departure', open: true } },
      { type: 'set-camera', payload: { mode: 'ui-safe' } },
      {
        type: 'set-environment',
        payload: {
          skyColor: '#5a347d',
          fogColor: '#593c73',
          fogDensity: 0.005,
          rainIntensity: 0,
          stars: 420,
          bloomIntensity: 1.15,
        },
      },
      {
        type: 'show-narration',
        payload: { body: 'The gate opens when the final refrain returns.', tone: 'release' },
      },
    ],
  },
  {
    id: 'afterglow',
    position: 0.96,
    label: 'Afterglow',
    actions: [
      { type: 'set-landmark', payload: { id: 'departure-afterglow', visible: true } },
      {
        type: 'set-environment',
        payload: { skyColor: '#693b82', groundColor: '#8a5d83', stars: 520, bloomIntensity: 1.35 },
      },
      {
        type: 'show-narration',
        payload: { body: 'Only the afterglow remains.', tone: 'release' },
      },
    ],
  },
];
