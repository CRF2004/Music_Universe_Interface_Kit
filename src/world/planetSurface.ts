import { Euler, Quaternion, Vector3 } from 'three';
import type { TerrainDefinition } from './worldTypes';

export type SurfacePosition = [number, number, number];
const UP = new Vector3(0, 1, 0);

export function planetRadius(terrain: TerrainDefinition): number | null {
  return terrain.type === 'sphere' ? terrain.size[0] / 2 : null;
}

// X/Z are surface distances from the arrival point; Y is height above the surface.
export function surfacePosition(position: SurfacePosition, radius: number | null): SurfacePosition {
  if (radius === null) return [...position];
  const [x, height, z] = position;
  const distance = Math.hypot(x, z);
  const angle = distance / radius;
  const scale = distance > 1e-8 ? Math.sin(angle) * (radius + height) / distance : 1;
  return [x * scale, Math.cos(angle) * (radius + height) - radius, z * scale];
}

export function surfaceCoordinates(position: SurfacePosition, radius: number | null): SurfacePosition {
  if (radius === null) return [...position];
  const [x, y, z] = position;
  const horizontal = Math.hypot(x, z);
  const distance = Math.atan2(horizontal, y + radius) * radius;
  const scale = horizontal > 1e-8 ? distance / horizontal : 0;
  return [x * scale, Math.hypot(x, y + radius, z) - radius, z * scale];
}

export function surfaceUp(position: SurfacePosition, radius: number | null): Vector3 {
  return radius === null ? UP.clone() : new Vector3(position[0], position[1] + radius, position[2]).normalize();
}

export function surfaceQuaternion(position: SurfacePosition, radius: number | null): Quaternion {
  return new Quaternion().setFromUnitVectors(UP, surfaceUp(position, radius));
}

export function surfaceRotation(position: SurfacePosition, radius: number | null, rotation: SurfacePosition = [0, 0, 0]): SurfacePosition {
  const quaternion = surfaceQuaternion(position, radius).multiply(new Quaternion().setFromEuler(new Euler(...rotation)));
  const euler = new Euler().setFromQuaternion(quaternion);
  return [euler.x, euler.y, euler.z];
}

export function surfaceDistance(a: SurfacePosition, b: SurfacePosition, radius: number | null): number {
  if (radius === null) return Math.hypot(a[0] - b[0], a[2] - b[2]);
  return Math.acos(Math.min(1, Math.max(-1, surfaceUp(a, radius).dot(surfaceUp(b, radius))))) * radius;
}
