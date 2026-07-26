import * as THREE from 'three';

export interface PlayerMovementInput {
  forward: boolean;
  backward: boolean;
  leftward: boolean;
  rightward: boolean;
}

export interface PlayerMovementResult {
  direction: THREE.Vector3;
  moving: boolean;
  updateFacing: boolean;
}

/**
 * Resolves WASD input in camera space.
 *
 * Backward-only input intentionally does not update facing. This gives S and
 * S+A/D conventional third-person backpedal behavior: the player and follow
 * camera retain their heading while the rigid body moves backward.
 */
export function resolvePlayerMovement(
  input: PlayerMovementInput,
  cameraForward: THREE.Vector3,
  cameraUp: THREE.Vector3,
): PlayerMovementResult {
  const flatForward = cameraForward.clone();
  flatForward.y = 0;
  if (flatForward.lengthSq() < 0.001) flatForward.set(0, 0, -1);
  flatForward.normalize();

  const cameraRight = new THREE.Vector3().crossVectors(flatForward, cameraUp).normalize();
  const forwardInput = Number(input.forward) - Number(input.backward);
  const rightInput = Number(input.rightward) - Number(input.leftward);
  const direction = flatForward
    .multiplyScalar(forwardInput)
    .addScaledVector(cameraRight, rightInput);
  const moving = direction.lengthSq() > 0;

  if (moving) direction.normalize();

  return {
    direction,
    moving,
    updateFacing: moving && !(input.backward && !input.forward),
  };
}
