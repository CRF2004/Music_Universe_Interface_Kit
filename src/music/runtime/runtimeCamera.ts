import type { CameraMode } from '../../camera/cameraTypes';

export function isCameraMode(value: unknown): value is CameraMode {
  return (
    value === 'explore' ||
    value === 'interaction' ||
    value === 'cinematic' ||
    value === 'inspection' ||
    value === 'ui-safe'
  );
}
