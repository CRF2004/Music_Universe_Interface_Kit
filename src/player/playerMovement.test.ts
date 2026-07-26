import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as THREE from 'three';
import { resolvePlayerMovement } from './playerMovement';

const cameraForward = new THREE.Vector3(0, 0, -1);
const cameraUp = new THREE.Vector3(0, 1, 0);

function assertVector(actual: THREE.Vector3, expected: THREE.Vector3) {
  assert.ok(actual.distanceTo(expected) < 1e-9, `${actual.toArray()} !== ${expected.toArray()}`);
}

function movement(overrides: Partial<Parameters<typeof resolvePlayerMovement>[0]>) {
  return resolvePlayerMovement(
    {
      forward: false,
      backward: false,
      leftward: false,
      rightward: false,
      ...overrides,
    },
    cameraForward,
    cameraUp,
  );
}

describe('player movement', () => {
  it('moves forward and updates facing', () => {
    const result = movement({ forward: true });
    assertVector(result.direction, new THREE.Vector3(0, 0, -1));
    assert.equal(result.updateFacing, true);
  });

  it('backpedals without changing facing', () => {
    const result = movement({ backward: true });
    assertVector(result.direction, new THREE.Vector3(0, 0, 1));
    assert.equal(result.updateFacing, false);
  });

  it('backpedals diagonally without changing facing', () => {
    const left = movement({ backward: true, leftward: true });
    const right = movement({ backward: true, rightward: true });

    assert.ok(left.direction.z > 0);
    assert.ok(left.direction.x < 0);
    assert.equal(left.updateFacing, false);
    assert.ok(right.direction.z > 0);
    assert.ok(right.direction.x > 0);
    assert.equal(right.updateFacing, false);
  });

  it('keeps lateral movement behavior when S is not held', () => {
    assert.equal(movement({ leftward: true }).updateFacing, true);
    assert.equal(movement({ rightward: true }).updateFacing, true);
  });

  it('does not mutate camera vectors', () => {
    const forward = new THREE.Vector3(0.25, 0.5, -1);
    const up = new THREE.Vector3(0, 1, 0);
    const forwardBefore = forward.clone();
    const upBefore = up.clone();

    resolvePlayerMovement(
      { forward: false, backward: true, leftward: true, rightward: false },
      forward,
      up,
    );

    assert.ok(forward.equals(forwardBefore));
    assert.ok(up.equals(upBefore));
  });
});
