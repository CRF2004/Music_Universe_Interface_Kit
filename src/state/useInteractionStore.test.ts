import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  interactionEventBus,
  type InteractionRuntimeEvent,
} from '../interaction/interactionRuntime';
import { useInteractionStore } from './useInteractionStore';

function resetStore() {
  useInteractionStore.setState({
    interactions: new Map(),
    activeInteractionId: null,
    nearestInteractionId: null,
    activePanelId: null,
    activePanelPayload: null,
    activeAdapter: null,
    interactionFlags: {},
    triggerState: {
      executedTriggers: new Set(),
      lastExecutedAt: {},
    },
  });
}

describe('interaction store runtime state', () => {
  beforeEach(resetStore);

  it('sets and clears flags while publishing typed change events', () => {
    const events: InteractionRuntimeEvent[] = [];
    const unsubscribe = interactionEventBus.subscribe((event) =>
      events.push(event));

    useInteractionStore.getState().setFlag('memory.received', true);
    useInteractionStore.getState().setFlag('memory.received', true);
    useInteractionStore.getState().clearFlag('memory.received');
    unsubscribe();

    assert.equal(
      'memory.received' in useInteractionStore.getState().interactionFlags,
      false,
    );
    assert.deepEqual(
      events.map((event) => event.type),
      ['interaction.flag-changed', 'interaction.flag-changed'],
    );
  });

  it('resets session flags, trigger history, panels, and selection', () => {
    const events: InteractionRuntimeEvent[] = [];
    const unsubscribe = interactionEventBus.subscribe((event) =>
      events.push(event));
    const state = useInteractionStore.getState();

    state.setFlag('memory.received', true);
    state.recordTriggerExecution('memory-archive', 'click', 1200);
    state.openPanel('memory-panel', { fragment: 'home' });
    state.setActiveInteraction('memory-archive');
    state.setNearestInteraction('memory-archive');
    state.resetInteractionRuntime('replay', { 'journey.started': false });
    unsubscribe();

    const reset = useInteractionStore.getState();
    assert.deepEqual(reset.interactionFlags, { 'journey.started': false });
    assert.equal(reset.triggerState.executedTriggers.size, 0);
    assert.deepEqual(reset.triggerState.lastExecutedAt, {});
    assert.equal(reset.activePanelId, null);
    assert.equal(reset.activeInteractionId, null);
    assert.equal(reset.nearestInteractionId, null);
    const resetEvent = events.at(-1);
    assert.equal(resetEvent?.type, 'interaction.runtime-reset');
    if (resetEvent?.type === 'interaction.runtime-reset') {
      assert.equal(resetEvent.reason, 'replay');
    }
  });
});
