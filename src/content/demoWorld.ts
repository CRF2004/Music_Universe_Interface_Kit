import { WorldDefinition } from '../world/worldTypes';
import { demoInteractions } from './interactions/demoInteractions';

export const demoWorld: WorldDefinition = {
  id: 'demo-world',
  name: 'Product World Alpha',
  description: 'An experimental spatial interface for products.',
  spawnPoint: [0, 0, 0],

  style: {
    theme: 'rough-comic',
    outline: true,
    halftone: true,
    grain: true,
    grainIntensity: 0.02,
    vignetteIntensity: 0.5,
    palette: 'comic-red-blue'
  },

  camera: {
    fov: 82,
    distance: 5.5,
    height: 2.3,
    barrelDistortion: 0.12
  },

  terrain: {
    type: 'curved-plane',
    size: [1000, 1000],
    curvature: 0.002
  },

  zones: [
    { id: 'spawn', label: 'Spawn Area', position: [0, 0, 0], radius: 10 }
  ],

  interactions: demoInteractions
};
