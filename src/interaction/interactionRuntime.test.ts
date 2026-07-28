import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { InteractionCondition } from './interactionTypes';
import {
  clearInteractionFlag,
  createInteractionEventBus,
  createInteractionFlagState,
  evaluateInteractionCondition,
  evaluateInteractionConditions,
  resetInteractionFlags,
  setInteractionFlag,
  type InteractionRuntimeEvent,
} from './interactionRuntime';

describe('interaction condition runtime', () => {
  it('evaluates flag equality and fails closed when a source is missing', () => {
    const condition: InteractionCondition = {
      type: 'flag',
      key: 'memory.received',
      operator: 'equals',
      value: true,
    };

    assert.equal(
      evaluateInteractionCondition(condition, {
        flags: { 'memory.received': true },
      }),
      true,
    );
    assert.equal(evaluateInteractionCondition(condition, {}), false);
  });

  it('supports exists, not-equals, includes, gt, and lt without coercion', () => {
    const context = {
      flags: {
        started: false,
        fragments: ['first-light', 'home'],
        title: 'memory of home',
        progress: 2,
      },
    };

    assert.equal(
      evaluateInteractionCondition(
        { type: 'flag', key: 'started', operator: 'exists' },
        context,
      ),
      true,
    );
    assert.equal(
      evaluateInteractionCondition(
        { type: 'flag', key: 'started', operator: 'not-equals', value: true },
        context,
      ),
      true,
    );
    assert.equal(
      evaluateInteractionCondition(
        {
          type: 'flag',
          key: 'fragments',
          operator: 'includes',
          value: 'home',
        },
        context,
      ),
      true,
    );
    assert.equal(
      evaluateInteractionCondition(
        { type: 'flag', key: 'title', operator: 'includes', value: 'home' },
        context,
      ),
      true,
    );
    assert.equal(
      evaluateInteractionCondition(
        { type: 'flag', key: 'progress', operator: 'gt', value: 1 },
        context,
      ),
      true,
    );
    assert.equal(
      evaluateInteractionCondition(
        { type: 'flag', key: 'progress', operator: 'lt', value: 3 },
        context,
      ),
      true,
    );
    assert.equal(
      evaluateInteractionCondition(
        { type: 'flag', key: 'progress', operator: 'equals', value: '2' },
        context,
      ),
      false,
    );
  });

  it('uses structural equality for JSON-compatible values', () => {
    assert.equal(
      evaluateInteractionCondition(
        {
          type: 'app-state',
          key: 'selection',
          operator: 'equals',
          value: { id: 'memory-tree', tags: ['memory', 'wonder'] },
        },
        {
          appState: {
            selection: { id: 'memory-tree', tags: ['memory', 'wonder'] },
          },
        },
      ),
      true,
    );
  });

  it('requires an explicit resolver for custom conditions', () => {
    const condition: InteractionCondition = {
      type: 'custom',
      key: 'listener-is-facing-tree',
    };

    assert.equal(evaluateInteractionCondition(condition, {}), false);
    assert.equal(
      evaluateInteractionCondition(condition, {
        resolveCustom: (candidate) =>
          candidate.key === 'listener-is-facing-tree',
      }),
      true,
    );
  });

  it('requires every condition and treats an empty list as allowed', () => {
    assert.equal(evaluateInteractionConditions(undefined, {}), true);
    assert.equal(evaluateInteractionConditions([], {}), true);
    assert.equal(
      evaluateInteractionConditions(
        [
          { type: 'flag', key: 'journey.started', value: true },
          { type: 'flag', key: 'memory.received', value: true },
        ],
        {
          flags: {
            'journey.started': true,
            'memory.received': false,
          },
        },
      ),
      false,
    );
  });
});

describe('interaction flag state', () => {
  it('updates flags immutably and preserves referential identity for no-ops', () => {
    const initial = createInteractionFlagState({ 'journey.started': false });
    const updated = setInteractionFlag(initial, 'journey.started', true);

    assert.notEqual(updated, initial);
    assert.equal(initial.flags['journey.started'], false);
    assert.equal(updated.flags['journey.started'], true);
    assert.equal(
      setInteractionFlag(updated, 'journey.started', true),
      updated,
    );
  });

  it('clears and resets flags without mutating previous snapshots', () => {
    const initial = createInteractionFlagState({
      'journey.started': true,
      'memory.received': true,
    });
    const cleared = clearInteractionFlag(initial, 'memory.received');
    const reset = resetInteractionFlags({ 'journey.started': false });

    assert.equal(initial.flags['memory.received'], true);
    assert.equal('memory.received' in cleared.flags, false);
    assert.deepEqual(reset.flags, { 'journey.started': false });
    assert.equal(clearInteractionFlag(cleared, 'memory.received'), cleared);
  });
});

describe('interaction event bus', () => {
  it('publishes typed events and stops delivery after unsubscribe', () => {
    const bus = createInteractionEventBus();
    const received: InteractionRuntimeEvent[] = [];
    const unsubscribe = bus.subscribe((event) => received.push(event));

    const event: InteractionRuntimeEvent = {
      eventId: 'event-1',
      atMs: 1200,
      type: 'interaction.triggered',
      interactionId: 'memory-tree',
      trigger: 'proximity',
    };

    assert.equal(bus.listenerCount(), 1);
    bus.publish(event);
    unsubscribe();
    bus.publish({
      eventId: 'event-2',
      atMs: 1400,
      type: 'interaction.runtime-reset',
      reason: 'replay',
    });

    assert.deepEqual(received, [event]);
    assert.equal(bus.listenerCount(), 0);
  });

  it('uses a stable subscriber snapshot while publishing', () => {
    const bus = createInteractionEventBus();
    const received: string[] = [];
    let unsubscribeSecond = () => {};

    bus.subscribe(() => {
      received.push('first');
      unsubscribeSecond();
    });
    unsubscribeSecond = bus.subscribe(() => received.push('second'));

    bus.publish({
      eventId: 'event-1',
      atMs: 0,
      type: 'interaction.runtime-reset',
      reason: 'restart',
    });
    bus.publish({
      eventId: 'event-2',
      atMs: 1,
      type: 'interaction.runtime-reset',
      reason: 'restart',
    });

    assert.deepEqual(received, ['first', 'second', 'first']);
  });
});
