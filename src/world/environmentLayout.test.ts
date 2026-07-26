import assert from 'node:assert/strict';
import test from 'node:test';
import { createRockLayout, lightPathPhase, lightPathPoint } from './environmentLayout';

test('rock layout is deterministic and stays outside the player clearing', () => {
  const first = createRockLayout(24);
  assert.deepEqual(first, createRockLayout(24));
  for (const rock of first) {
    const radius = Math.hypot(rock.position[0], rock.position[2]);
    assert.ok(radius >= 7 && radius <= 38);
  }
});

test('light path advances into the world with normalized phases', () => {
  const first = lightPathPoint(0, 12);
  const last = lightPathPoint(11, 12);
  assert.equal(first[2], -2.2);
  assert.equal(last[2], -18.2);
  assert.equal(lightPathPhase(0, 12), 0);
  assert.equal(lightPathPhase(11, 12), 1);
});
