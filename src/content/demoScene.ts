import {
  SPATIAL_SCENE_SCHEMA_VERSION,
  SpatialSceneDefinition,
} from '../schema';

export const demoScene = {
  version: SPATIAL_SCENE_SCHEMA_VERSION,
  id: 'memory-journey',
  name: 'Memory Journey',
  description: 'Recover a forgotten song-memory and carry it to the departure gate.',
  spawn: [0, 0, 0],
  environment: {
    theme: 'rough-comic',
    effects: {
      outline: true,
      halftone: true,
      grain: true,
      grainIntensity: 0.02,
      vignetteIntensity: 0.5,
      palette: 'comic-red-blue',
    },
    camera: {
      fov: 82,
      distance: 5.5,
      height: 2.3,
      barrelDistortion: 0.12,
    },
    terrain: {
      type: 'curved-plane',
      size: [1000, 1000],
      curvature: 0.002,
    },
  },
  zones: [
    { id: 'spawn', label: 'Spawn Area', position: [0, 0, 0], radius: 10 },
  ],
  objects: [
    {
      id: 'npc-guide',
      type: 'npc',
      label: 'The Listener Guide',
      transform: { position: [0, 0, -5] },
      appearance: {
        colorToken: '#42a5ff',
        prompt: 'Accept the journey',
      },
      interaction: {
        kind: 'dialog',
        radius: 3,
        enabled: true,
        triggers: [
          { type: 'proximity', prompt: 'Press E to speak with the Guide' },
          { type: 'click', prompt: 'Speak with the Guide' },
        ],
        actions: [
          {
            id: 'open-guide-dialog',
            type: 'panel',
            target: 'guide-dialog',
            cameraMode: 'interaction',
          },
          {
            id: 'start-memory-journey',
            type: 'set-flag',
            payload: { key: 'journey.started', value: true },
          },
        ],
      },
    },
    {
      id: 'echo-terminal',
      type: 'phone-booth',
      label: 'Echo Terminal',
      transform: { position: [8, 0, -8] },
      appearance: {
        colorToken: '#ff3b2f',
        prompt: 'Review controls and objective',
      },
      interaction: {
        kind: 'panel',
        radius: 3,
        enabled: true,
        triggers: [{ type: 'proximity' }, { type: 'click' }],
        actions: [
          {
            id: 'open-support-panel',
            type: 'panel',
            target: 'echo-terminal',
            cameraMode: 'interaction',
          },
        ],
      },
    },
    {
      id: 'memory-archive',
      type: 'building',
      label: 'Memory Archive',
      transform: { position: [-8, 0, -11] },
      appearance: {
        colorToken: '#9f63ff',
        prompt: 'Recover the memory',
      },
      interaction: {
        kind: 'inspect',
        radius: 5,
        enabled: true,
        triggers: [
          {
            type: 'proximity',
            prompt: 'Press E to recover the memory',
            conditions: [
              { type: 'flag', key: 'journey.started', operator: 'equals', value: true },
            ],
          },
          {
            type: 'click',
            prompt: 'Recover the memory',
            conditions: [
              { type: 'flag', key: 'journey.started', operator: 'equals', value: true },
            ],
          },
        ],
        actions: [
          {
            id: 'open-memory-fragment',
            type: 'panel',
            target: 'memory-fragment',
            cameraMode: 'ui-safe',
          },
          {
            id: 'receive-memory',
            type: 'set-flag',
            payload: { key: 'memory.received', value: true },
          },
        ],
      },
    },
    {
      id: 'departure-gate',
      type: 'portal',
      label: 'Departure Gate',
      transform: { position: [0, 0, -15] },
      appearance: {
        colorToken: '#4adb7d',
        prompt: 'Carry the memory through',
      },
      interaction: {
        kind: 'route',
        radius: 4,
        enabled: true,
        triggers: [
          {
            type: 'proximity',
            prompt: 'Press E to enter the Departure Gate',
            conditions: [
              { type: 'flag', key: 'memory.received', operator: 'equals', value: true },
              { type: 'flag', key: 'world.departureGateOpen', operator: 'equals', value: true },
            ],
          },
          {
            type: 'click',
            prompt: 'Enter the Departure Gate',
            conditions: [
              { type: 'flag', key: 'memory.received', operator: 'equals', value: true },
              { type: 'flag', key: 'world.departureGateOpen', operator: 'equals', value: true },
            ],
          },
        ],
        actions: [
          {
            id: 'show-journey-ending',
            type: 'panel',
            target: 'journey-ending',
            cameraMode: 'ui-safe',
          },
          {
            id: 'complete-memory-journey',
            type: 'set-flag',
            payload: { key: 'journey.completed', value: true },
          },
        ],
      },
    },
  ],
  provenance: {
    source: 'human',
  },
} satisfies SpatialSceneDefinition;
