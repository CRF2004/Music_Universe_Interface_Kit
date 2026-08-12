export interface OrbitAngles {
  yaw: number;
  pitch: number;
}

export function applyOrbitMouseDelta(
  angles: OrbitAngles,
  movementX: number,
  movementY: number,
  sensitivity = 0.0024,
): OrbitAngles {
  return {
    yaw: angles.yaw + movementX * sensitivity,
    pitch: Math.min(0.72, Math.max(-0.5, angles.pitch + movementY * sensitivity)),
  };
}
