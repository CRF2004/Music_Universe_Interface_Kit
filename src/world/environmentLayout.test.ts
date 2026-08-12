import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createRockLayout,
  createMemoryGroveLayout,
  createSkyStarPositions,
  journeyRoutePoint,
  lightPathPhase,
  lightPathPoint,
  MEMORY_TREE_POSITION,
} from './environmentLayout';

test('rock layout is deterministic and stays outside the player clearing', () => {
  const first = createRockLayout(24);
  assert.deepEqual(first, createRockLayout(24));
  for (const rock of first) {
    const radius = Math.hypot(rock.position[0], rock.position[2]);
    assert.ok(radius >= 7 && radius <= 38);
  }
});

test('memory grove forms sparse side clusters and leaves the navigation lane clear', () => {
  const layout = createMemoryGroveLayout(20);
  assert.deepEqual(layout, createMemoryGroveLayout(20));
  for (const shard of layout) {
    assert.ok(Math.abs(shard.position[0]) >= 5.8);
    assert.ok(shard.position[2] <= -5.2);
  }
});

test('Memory Tree stays outside the solid Archive footprint', () => {
  const archivePosition = [-8, 0, -11] as const;
  assert.ok(Math.abs(MEMORY_TREE_POSITION[0] - archivePosition[0]) > 6.2);
  assert.ok(Math.abs(MEMORY_TREE_POSITION[2] - archivePosition[2]) > 0.5);
});

test('Archive route bends around the front of the solid hangar', () => {
  const midpoint = journeyRoutePoint([0, 0, -5], 'archive', 0.5);
  const end = journeyRoutePoint([0, 0, -5], 'archive', 1);
  assert.ok(midpoint[0] > -0.2, `expected a right-side bend, received ${midpoint[0]}`);
  assert.deepEqual(end, [-2, 0.09, -11]);
});

test('light path advances into the world with normalized phases', () => {
  const first = lightPathPoint(0, 12);
  const last = lightPathPoint(11, 12);
  assert.equal(first[2], -2.2);
  assert.equal(last[2], -18.2);
  assert.equal(lightPathPhase(0, 12), 0);
  assert.equal(lightPathPhase(11, 12), 1);
});

test('sky stars stay out of the low-altitude playable space', () => {
  const positions = createSkyStarPositions(520);
  assert.deepEqual(positions, createSkyStarPositions(520));
  for (let index = 0; index < positions.length; index += 3) {
    assert.ok(positions[index + 1] >= 12);
  }
  const firstTenXGaps = Array.from({ length: 9 }, (_, index) =>
    Math.abs(positions[(index + 1) * 3] - positions[index * 3]),
  );
  assert.ok(new Set(firstTenXGaps.map((gap) => gap.toFixed(2))).size >= 8);
});
