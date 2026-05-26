import { useInteractionStore } from '../state/useInteractionStore';
import { useWorldStore } from '../state/useWorldStore';
import { InteractionActionDefinition, TriggerKind } from './interactionTypes';

export class InteractionDispatcher {
  static executeInteraction(id: string, triggerType: TriggerKind) {
    const { interactions, triggerState, recordTriggerExecution } = useInteractionStore.getState();
    
    const definition = interactions.get(id);
    if (!definition) return;

    // Check triggers
    const trigger = definition.triggers.find(t => t.type === triggerType && (t.enabled !== false));
    if (!trigger) return;

    const triggerKey = `${id}:${triggerType}`;

    // Handle "once" logic
    if (trigger.once && triggerState.executedTriggers.has(triggerKey)) return;
    
    // Handle cooldown logic
    if (trigger.cooldownMs) {
      const lastExecuted = triggerState.lastExecutedAt[triggerKey] || 0;
      if (Date.now() - lastExecuted < trigger.cooldownMs) return;
    }

    // Execute all actions
    definition.actions.forEach(action => {
      this.executeAction(id, triggerType, action);
    });

    // Update execution state
    recordTriggerExecution(id, triggerType);
  }

  static executeAction(interactionId: string, triggerType: TriggerKind, action: InteractionActionDefinition) {
    const { openPanel, closePanel, activeAdapter } = useInteractionStore.getState();
    const { setCameraMode, activeWorld } = useWorldStore.getState();

    // Check conditions
    if (action.conditions && !this.checkConditions(action.conditions)) {
      return;
    }

    if (action.cameraMode) {
      setCameraMode(action.cameraMode);
    }

    this.emitEvent({ type: 'interaction.triggered', interactionId, trigger: triggerType });

    // Build context
    const context = {
      interactionId,
      triggerType,
      player: {} as any, // Future: reference player state
      app: activeAdapter as any,
      world: activeWorld as any,
      openPanel,
      closePanel,
      setCameraMode,
      runCommand: async (id: string, p: any) => {
        const cmd = activeAdapter?.commands[id];
        if (cmd) return cmd.run(p, context);
        return { ok: false, error: 'Command not found' };
      },
      emit: (e: any) => this.emitEvent(e),
      getState: () => ({}) // Future: component-specific state
    };

    switch (action.type) {
      case 'panel':
        openPanel(action.target || 'default', action.payload);
        break;
      case 'command':
        {
          if (activeAdapter && action.target && activeAdapter.commands[action.target]) {
            console.log(`Executing adapter command: ${action.target}`);
            activeAdapter.commands[action.target].run(action.payload, context);
          }
        }
        break;
    }
  }

  static checkConditions(conditions: any[]): boolean {
    const state = useInteractionStore.getState();
    // Simple implementation: check if key exists in some global flag set (not implemented yet) or metadata
    return conditions.every(condition => {
      // Future: add real condition logic
      return true;
    });
  }

  static emitEvent(event: { type: string; [key: string]: any }) {
    console.log(`[World Event]: ${event.type}`, event);
    // Future: push to a global event store or callback
  }
}
