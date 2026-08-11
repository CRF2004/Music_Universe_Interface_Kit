import assert from 'node:assert/strict';
import test from 'node:test';
import { detectLaunchSupport } from './launchSupport';

test('blocks touch-only launch environments', () => {
  assert.deepEqual(
    detectLaunchSupport({ coarsePointer: true, hoverUnavailable: true }),
    { supported: false, reason: 'touch-only' },
  );
});

test('allows desktop and hybrid launch environments', () => {
  assert.deepEqual(
    detectLaunchSupport({ coarsePointer: false, hoverUnavailable: false }),
    { supported: true },
  );
  assert.deepEqual(
    detectLaunchSupport({ coarsePointer: true, hoverUnavailable: false }),
    { supported: true },
  );
});
