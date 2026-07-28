import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { useInteractionStore } from '../state/useInteractionStore';
import { InteractionDispatcher } from './InteractionDispatcher';
import {
  interactionEventBus,
  type InteractionRuntimeEvent,
} from './interactionRuntime';
import type { InteractionPointDefinition } from './interactionTypes';

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

function interaction(
  overrides: Partial<InteractionPointDefinition> = {},
): InteractionPointDefinition {
  return {
    id: 'memory-archive',
    label: 'Memory Archive',
    kind: 'inspect',
    position: [0, 0, 0],
    visual: { type: 'building' },
    triggers: [{ type: 'click' }],
    actions: [
      {
        id: 'open-memory',
        type: 'panel',
        target: 'memory-panel',
      },
    ],
    ...overrides,
  };
}

describe('interaction dispatcher runtime integration', () => {
  beforeEach(resetStore);

  it('fails closed when trigger conditions are not satisfied', () => {
    const events: InteractionRuntimeEvent[] = [];
    const unsubscribe = interactionEventBus.subscribe((event) =>
      events.push(event));
    const definition = interaction({
      triggers: [
        {
          type: 'click',
          conditions: [
            {
              type: 'flag',
              key: 'journey.started',
              operator: 'equals',
              value: true,
            },
          ],
        },
      ],
    });
    useInteractionStore.getState().registerInteraction(definition);

    assert.equal(
      InteractionDispatcher.executeInteraction(
        definition.id,
        'click',
        1000,
      ),
      false,
    );
    unsubscribe();

    assert.equal(useInteractionStore.getState().activePanelId, null);
    assert.equal(
      useInteractionStore.getState().triggerState.executedTriggers.size,
      0,
    );
    const blockedEvent = events.at(-1);
    assert.equal(blockedEvent?.type, 'interaction.blocked');
    if (blockedEvent?.type === 'interaction.blocked') {
      assert.equal(blockedEvent.reason, 'conditions');
    }
  });

  it('executes flag actions before dependent actions in definition order', () => {
    const definition = interaction({
      actions: [
        {
          id: 'receive-memory',
          type: 'set-flag',
          payload: { key: 'memory.received', value: true },
        },
        {
          id: 'open-memory',
          type: 'panel',
          target: 'memory-panel',
          conditions: [
            {
              type: 'flag',
              key: 'memory.received',
              operator: 'equals',
              value: true,
            },
          ],
        },
      ],
    });
    useInteractionStore.getState().registerInteraction(definition);

    assert.equal(
      InteractionDispatcher.executeInteraction(
        definition.id,
        'click',
        1500,
      ),
      true,
    );

    const state = useInteractionStore.getState();
    assert.equal(state.interactionFlags['memory.received'], true);
    assert.equal(state.activePanelId, 'memory-panel');
    assert.equal(
      state.triggerState.lastExecutedAt['memory-archive:click'],
      1500,
    );
  });

  it('does not duplicate completion events when a flag is already set', () => {
    const events: InteractionRuntimeEvent[] = [];
    const unsubscribe = interactionEventBus.subscribe((event) => events.push(event));
    const definition = interaction({
      actions: [
        {
          id: 'receive-memory',
          type: 'set-flag',
          payload: { key: 'memory.received', value: true },
        },
      ],
    });
    useInteractionStore.getState().registerInteraction(definition);

    InteractionDispatcher.executeInteraction(definition.id, 'click', 1000);
    InteractionDispatcher.executeInteraction(definition.id, 'click', 2000);
    unsubscribe();

    assert.equal(
      events.filter(
        (event) =>
          event.type === 'interaction.action-completed' &&
          event.actionId === 'receive-memory',
      ).length,
      1,
    );
  });

  it('enforces once and cooldown triggers and allows them after reset', () => {
    const onceDefinition = interaction({
      triggers: [{ type: 'click', once: true }],
    });
    useInteractionStore.getState().registerInteraction(onceDefinition);

    assert.equal(
      InteractionDispatcher.executeInteraction(
        onceDefinition.id,
        'click',
        2000,
      ),
      true,
    );
    assert.equal(
      InteractionDispatcher.executeInteraction(
        onceDefinition.id,
        'click',
        2100,
      ),
      false,
    );

    useInteractionStore.getState().resetInteractionRuntime('replay');
    assert.equal(
      InteractionDispatcher.executeInteraction(
        onceDefinition.id,
        'click',
        2200,
      ),
      true,
    );

    resetStore();
    const cooldownDefinition = interaction({
      triggers: [{ type: 'click', cooldownMs: 500 }],
    });
    useInteractionStore.getState().registerInteraction(cooldownDefinition);
    assert.equal(
      InteractionDispatcher.executeInteraction(
        cooldownDefinition.id,
        'click',
        3000,
      ),
      true,
    );
    assert.equal(
      InteractionDispatcher.executeInteraction(
        cooldownDefinition.id,
        'click',
        3200,
      ),
      false,
    );
    assert.equal(
      InteractionDispatcher.executeInteraction(
        cooldownDefinition.id,
        'click',
        3600,
      ),
      true,
    );
  });
});
