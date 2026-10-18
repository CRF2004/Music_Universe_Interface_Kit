import assert from 'node:assert/strict';
import test from 'node:test';
import {
  blocksWorldInteractionKey,
  horizontalInteractionDistance,
} from './interactionInput';

test('text editing controls block the world interaction key', () => {
  assert.equal(blocksWorldInteractionKey({ tagName: 'INPUT' }), true);
  assert.equal(blocksWorldInteractionKey({ tagName: 'TEXTAREA' }), true);
  assert.equal(blocksWorldInteractionKey({ tagName: 'SELECT' }), true);
  assert.equal(blocksWorldInteractionKey({ tagName: 'DIV', isContentEditable: true }), true);
});

test('focused buttons do not swallow the dedicated E interaction key', () => {
  assert.equal(blocksWorldInteractionKey({ tagName: 'BUTTON' }), false);
  assert.equal(blocksWorldInteractionKey({ tagName: 'DIV' }), false);
  assert.equal(blocksWorldInteractionKey(null), false);
});

test('interaction range uses ground-plane distance', () => {
  assert.equal(horizontalInteractionDistance([0, 2, 0], [0, 0, -3]), 3);
  assert.equal(horizontalInteractionDistance([2, 10, 2], [-1, -4, -2]), 5);
});
