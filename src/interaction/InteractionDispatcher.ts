import { useInteractionStore } from '../state/useInteractionStore';
import { useWorldStore } from '../state/useWorldStore';
import {
  createInteractionEventMetadata,
  evaluateInteractionConditions,
  interactionEventBus,
  isInteractionRuntimeValue,
  type InteractionBlockedReason,
  type InteractionRuntimeEvent,
} from './interactionRuntime';
import type {
  InteractionActionDefinition,
  InteractionCondition,
  TriggerKind,
} from './interactionTypes';

function publishEvent(event: InteractionRuntimeEvent) {
  const adapter = useInteractionStore.getState().activeAdapter;
  interactionEventBus.publish(event);
  adapter?.onWorldEvent?.(event);
}

function publishBlocked(
  interactionId: string,
  trigger: TriggerKind,
  reason: InteractionBlockedReason,
) {
  publishEvent({
    ...createInteractionEventMetadata(),
    type: 'interaction.blocked',
    interactionId,
    trigger,
    reason,
  });
}

export class InteractionDispatcher {
  static executeInteraction(
    id: string,
    triggerType: TriggerKind,
    now = Date.now(),
  ): boolean {
    const state = useInteractionStore.getState();
    const definition = state.interactions.get(id);
    if (!definition) {
      publishBlocked(id, triggerType, 'missing-definition');
      return false;
    }

    const trigger = definition.triggers.find(
      (candidate) =>
        candidate.type === triggerType && candidate.enabled !== false,
    );
    if (!trigger) {
      publishBlocked(id, triggerType, 'disabled');
      return false;
    }

    if (!this.checkConditions(trigger.conditions)) {
      publishBlocked(id, triggerType, 'conditions');
      return false;
    }

    const triggerKey = `${id}:${triggerType}`;
    if (trigger.once && state.triggerState.executedTriggers.has(triggerKey)) {
      publishBlocked(id, triggerType, 'already-executed');
      return false;
    }

    if (trigger.cooldownMs) {
      const lastExecuted = state.triggerState.lastExecutedAt[triggerKey] ?? 0;
      if (now - lastExecuted < trigger.cooldownMs) {
        publishBlocked(id, triggerType, 'cooldown');
        return false;
      }
    }

    publishEvent({
      ...createInteractionEventMetadata(now),
      type: 'interaction.triggered',
      interactionId: id,
      trigger: triggerType,
    });

    const actionExecuted = definition.actions.reduce(
      (executed, action) =>
        this.executeAction(id, triggerType, action) || executed,
      false,
    );

    if (actionExecuted) {
      useInteractionStore
        .getState()
        .recordTriggerExecution(id, triggerType, now);
    }
    return actionExecuted;
  }

  static executeAction(
    interactionId: string,
    triggerType: TriggerKind,
    action: InteractionActionDefinition,
  ): boolean {
    if (!this.checkConditions(action.conditions)) {
      publishBlocked(interactionId, triggerType, 'conditions');
      return false;
    }

    const interactionState = useInteractionStore.getState();
    const worldState = useWorldStore.getState();

    if (action.cameraMode) {
      worldState.setCameraMode(action.cameraMode);
    }

    switch (action.type) {
      case 'panel':
        interactionState.openPanel(action.target ?? 'default', action.payload);
        this.publishActionCompleted(interactionId, action.id);
        return true;
      case 'set-flag': {
        const key = action.payload?.key;
        const value = action.payload?.value;
        if (typeof key !== 'string' || !isInteractionRuntimeValue(value)) {
          return false;
        }
        if (Object.is(interactionState.interactionFlags[key], value)) {
          return true;
        }
        interactionState.setFlag(key, value);
        this.publishActionCompleted(interactionId, action.id);
        return true;
      }
      case 'clear-flag': {
        const key = action.payload?.key;
        if (typeof key !== 'string') return false;
        interactionState.clearFlag(key);
        this.publishActionCompleted(interactionId, action.id);
        return true;
      }
      case 'command': {
        const command =
          action.target === undefined
            ? undefined
            : interactionState.activeAdapter?.commands[action.target];
        if (!command) return false;

        const context = {
          interactionId,
          triggerType,
          app: interactionState.activeAdapter,
          world: worldState.activeWorld,
          openPanel: interactionState.openPanel,
          closePanel: interactionState.closePanel,
          setCameraMode: worldState.setCameraMode,
          setFlag: interactionState.setFlag,
          clearFlag: interactionState.clearFlag,
          getState: () => ({
            flags: useInteractionStore.getState().interactionFlags,
          }),
        };
        void command.run(action.payload, context).then((result) => {
          if (result.ok) this.publishActionCompleted(interactionId, action.id);
        });
        return true;
      }
      default:
        return false;
    }
  }

  static checkConditions(
    conditions: readonly InteractionCondition[] | undefined,
  ): boolean {
    return evaluateInteractionConditions(conditions, {
      flags: useInteractionStore.getState().interactionFlags,
    });
  }

  private static publishActionCompleted(
    interactionId: string,
    actionId: string,
  ) {
    publishEvent({
      ...createInteractionEventMetadata(),
      type: 'interaction.action-completed',
      interactionId,
      actionId,
    });
  }
}
