import assert from 'node:assert/strict';
import test from 'node:test';
import { selectAssetLod } from './assetLod';

const thresholds = { enterNear: 18, exitNear: 22 };

test('far assets switch to near assets at the enter threshold', () => {
  assert.equal(selectAssetLod(18, 'far', thresholds), 'near');
});

test('near assets switch to far assets at the exit threshold', () => {
  assert.equal(selectAssetLod(22, 'near', thresholds), 'far');
});

test('LOD hysteresis prevents repeated switching between thresholds', () => {
  assert.equal(selectAssetLod(20, 'far', thresholds), 'far');
  assert.equal(selectAssetLod(20, 'near', thresholds), 'near');
});

test('invalid LOD thresholds are rejected', () => {
  assert.throws(
    () => selectAssetLod(20, 'far', { enterNear: 22, exitNear: 18 }),
    /exit distance/,
  );
});
