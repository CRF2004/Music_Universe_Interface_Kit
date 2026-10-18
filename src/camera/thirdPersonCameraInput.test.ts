import assert from 'node:assert/strict';
import test from 'node:test';
import { applyOrbitMouseDelta } from './thirdPersonCameraInput';

test('moving the mouse right rotates the orbit camera right', () => {
  assert.equal(applyOrbitMouseDelta({ yaw: 0, pitch: 0 }, 100, 0).yaw, -0.24);
  assert.equal(applyOrbitMouseDelta({ yaw: 0, pitch: 0 }, -100, 0).yaw, 0.24);
});

test('vertical mouse look keeps its conventional direction and clamps pitch', () => {
  assert.equal(applyOrbitMouseDelta({ yaw: 0, pitch: 0 }, 0, -50).pitch, -0.12);
  assert.equal(applyOrbitMouseDelta({ yaw: 0, pitch: 0.7 }, 0, 100).pitch, 0.72);
  assert.equal(applyOrbitMouseDelta({ yaw: 0, pitch: -0.45 }, 0, -100).pitch, -0.5);
});
