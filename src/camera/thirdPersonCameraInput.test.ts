import assert from 'node:assert/strict';
import test from 'node:test';
import { applyOrbitMouseDelta } from './thirdPersonCameraInput';

test('mouse movement follows conventional third-person look directions', () => {
  assert.deepEqual(applyOrbitMouseDelta({ yaw: 0, pitch: 0 }, 100, -50), {
    yaw: 0.24,
    pitch: -0.12,
  });
  assert.equal(applyOrbitMouseDelta({ yaw: 0, pitch: 0.7 }, 0, 100).pitch, 0.72);
  assert.equal(applyOrbitMouseDelta({ yaw: 0, pitch: -0.45 }, 0, -100).pitch, -0.5);
});
