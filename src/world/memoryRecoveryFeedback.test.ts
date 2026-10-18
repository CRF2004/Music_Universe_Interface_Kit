import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MEMORY_FRAGMENT_COUNT, sampleMemoryFragment } from './memoryFragmentSampling';

test('memory feedback reconstructs after backward/forward seek without frame history', () => {
  const expected = Array.from({ length: MEMORY_FRAGMENT_COUNT }, (_, index) => sampleMemoryFragment(index, 42));
  for (const time of [0, 100, 3, 278]) for (let index = 0; index < MEMORY_FRAGMENT_COUNT; index++) sampleMemoryFragment(index, time);
  assert.deepEqual(Array.from({ length: MEMORY_FRAGMENT_COUNT }, (_, index) => sampleMemoryFragment(index, 42)), expected);
  assert.deepEqual(sampleMemoryFragment(0, 0), sampleMemoryFragment(0, 0));
});

test('memory fragments remain within a small readable doorway volume for long tracks', () => {
  for (const time of [0, 0.1, 278, 3600, 86400]) for (let index = 0; index < MEMORY_FRAGMENT_COUNT; index++) {
    const pose = sampleMemoryFragment(index, time);
    assert.ok(pose.position.every(Number.isFinite));
    assert.ok(Math.abs(pose.position[0]) <= 1.1 && pose.position[1] >= 0.3 && pose.position[1] <= 2.6);
    assert.ok(pose.scale >= 0.035 && pose.scale <= 0.07);
  }
});
