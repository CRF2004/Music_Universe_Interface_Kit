import assert from 'node:assert/strict';
import test from 'node:test';
import { Vector3 } from 'three';
import { surfacePosition, surfaceCoordinates, surfaceUp, surfaceQuaternion, surfaceDistance } from './planetSurface';
import { resolvePlayerMovement } from '../player/playerMovement';

test('surface coordinates retain radial height on every hemisphere and round-trip', () => {
  for (const coordinates of [[0, 0, 0], [90, 0, 0], [140, 0.65, 15], [-100, 3, -90]] as [number, number, number][]) {
    const point = surfacePosition(coordinates, 60);
    assert.ok(Math.abs(Math.hypot(point[0], point[1] + 60, point[2]) - 60 - coordinates[1]) < 1e-9);
    const restored = surfaceCoordinates(point, 60);
    restored.forEach((value, index) => assert.ok(Math.abs(value - coordinates[index]) < 1e-9));
    assert.ok(new Vector3(0, 1, 0).applyQuaternion(surfaceQuaternion(point, 60)).distanceTo(surfaceUp(point, 60)) < 1e-9);
  }
});

test('camera-relative input remains tangent at the equator and underside', () => {
  for (const up of [new Vector3(1, 0, 0), new Vector3(0, -1, 0), new Vector3(0.7, -0.5, 0.5).normalize()]) {
    const input = resolvePlayerMovement({ forward: true, backward: false, leftward: false, rightward: true }, new Vector3(0, 0, -1), up, up);
    assert.ok(Math.abs(input.direction.dot(up)) < 1e-9);
    assert.ok(Math.abs(input.direction.length() - 1) < 1e-9);
  }
});

test('surface proximity includes the underside and ignores player height', () => {
  const ground = surfacePosition([130, 0, 0], 60);
  const player = surfacePosition([132, 0.65, 0], 60);
  assert.ok(Math.abs(surfaceDistance(ground, player, 60) - 2) < 1e-8);
  assert.ok(surfaceDistance(ground, surfacePosition([0, 0, 0], 60), 60) > 100);
});
