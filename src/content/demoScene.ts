import {
  SPATIAL_SCENE_SCHEMA_VERSION,
  SpatialSceneDefinition,
} from '../schema';

export const demoScene = {
  version: SPATIAL_SCENE_SCHEMA_VERSION,
  id: 'demo-world',
  name: 'Product World Alpha',
  description: 'An experimental spatial interface for products.',
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
      label: 'Guide NPC',
      transform: { position: [0, 0, -5] },
      appearance: {
        colorToken: '#42a5ff',
        prompt: 'Talk to Guide',
      },
      interaction: {
        kind: 'dialog',
        radius: 3,
        enabled: true,
        triggers: [{ type: 'proximity' }, { type: 'click' }],
        actions: [
          {
            id: 'open-guide-dialog',
            type: 'panel',
            target: 'guide-dialog',
            cameraMode: 'interaction',
          },
        ],
      },
    },
    {
      id: 'support-phone',
      type: 'phone-booth',
      label: 'Support Phone',
      transform: { position: [8, 0, -8] },
      appearance: {
        colorToken: '#ff3b2f',
        prompt: 'Call Support',
      },
      interaction: {
        kind: 'agent',
        radius: 3,
        enabled: true,
        triggers: [{ type: 'proximity' }, { type: 'click' }],
        actions: [
          {
            id: 'open-support-panel',
            type: 'panel',
            target: 'support-panel',
            cameraMode: 'interaction',
          },
        ],
      },
    },
    {
      id: 'product-tower',
      type: 'building',
      label: 'Product Tower',
      transform: { position: [-10, 0, -12] },
      appearance: {
        colorToken: '#9f63ff',
        prompt: 'Inspect Product',
      },
      interaction: {
        kind: 'inspect',
        radius: 5,
        enabled: true,
        triggers: [{ type: 'proximity' }, { type: 'click' }],
        actions: [
          {
            id: 'open-product-panel',
            type: 'panel',
            target: 'product-panel',
            cameraMode: 'ui-safe',
          },
        ],
      },
    },
    {
      id: 'docs-portal',
      type: 'portal',
      label: 'Docs Portal',
      transform: { position: [12, 0, 5] },
      appearance: {
        colorToken: '#4adb7d',
        prompt: 'Enter Docs',
      },
      interaction: {
        kind: 'route',
        radius: 4,
        enabled: true,
        triggers: [{ type: 'proximity' }, { type: 'click' }],
        actions: [
          {
            id: 'open-docs',
            type: 'panel',
            target: 'docs-panel',
            cameraMode: 'ui-safe',
          },
        ],
      },
    },
  ],
  provenance: {
    source: 'human',
  },
} satisfies SpatialSceneDefinition;
