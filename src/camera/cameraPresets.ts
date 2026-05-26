import { CameraPreset, CameraMode } from './cameraTypes';

export const cameraPresets: Record<CameraMode, CameraPreset> = {
  explore: {
    id: 'explore',
    fov: 82,
    distance: 5.5,
    height: 2.3,
    lookAtHeight: 1.1,
    followSharpness: 0.25,
    rotationSharpness: 0.1,
    shoulderOffset: 0.4,
    barrelDistortion: 0.12,
    cameraShake: 0.0,
    followRotation: false,
    fixedHeading: -0.2
  },
  interaction: {
    id: 'interaction',
    fov: 68,
    distance: 3.6,
    height: 1.8,
    lookAtHeight: 1.2,
    followSharpness: 0.18,
    rotationSharpness: 0.18,
    shoulderOffset: 0.15,
    barrelDistortion: 0.04,
    cameraShake: 0.0,
    followRotation: true
  },
  inspection: {
    id: 'inspection',
    fov: 45,
    distance: 3.0,
    height: 1.5,
    lookAtHeight: 1.2,
    followSharpness: 0.1,
    rotationSharpness: 0.2,
    shoulderOffset: 0,
    barrelDistortion: 0,
    followRotation: true
  },
  cinematic: {
    id: 'cinematic',
    fov: 35,
    distance: 10,
    height: 4,
    lookAtHeight: 2,
    followSharpness: 0.05,
    rotationSharpness: 0.05,
    barrelDistortion: 0,
    followRotation: false
  },
  'ui-safe': {
    id: 'ui-safe',
    fov: 56,
    distance: 6.2,
    height: 2.6,
    lookAtHeight: 1.2,
    followSharpness: 0.08,
    rotationSharpness: 0.08,
    barrelDistortion: 0,
    followRotation: false,
    fixedHeading: 0
  }
};
