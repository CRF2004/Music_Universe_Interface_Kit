import { create } from 'zustand';
import { InteractionPointDefinition } from '../interaction/interactionTypes';
import { AppAdapter } from '../adapters/appAdapterTypes';

interface TriggerRuntimeState {
  executedTriggers: Set<string>; // interactionId + triggerType
  lastExecutedAt: Record<string, number>;
}

interface InteractionState {
  interactions: Map<string, InteractionPointDefinition>;
  activeInteractionId: string | null;
  nearestInteractionId: string | null;
  activePanelId: string | null;
  activePanelPayload: any | null;
  activeAdapter: AppAdapter | null;
  
  // Runtime trigger state
  triggerState: TriggerRuntimeState;

  registerInteraction: (interaction: InteractionPointDefinition) => void;
  registerInteractions: (interactions: InteractionPointDefinition[]) => void;
  unregisterInteraction: (id: string) => void;
  setActiveInteraction: (id: string | null) => void;
  setNearestInteraction: (id: string | null) => void;
  setAdapter: (adapter: AppAdapter | null) => void;
  openPanel: (panelId: string, payload?: any) => void;
  closePanel: () => void;
  
  // Update trigger runtime state
  recordTriggerExecution: (interactionId: string, triggerType: string) => void;
}

export const useInteractionStore = create<InteractionState>((set) => ({
  interactions: new Map(),
  activeInteractionId: null,
  nearestInteractionId: null,
  activePanelId: null,
  activePanelPayload: null,
  activeAdapter: null,
  triggerState: {
    executedTriggers: new Set(),
    lastExecutedAt: {},
  },
  
  recordTriggerExecution: (interactionId, triggerType) => set((state) => {
    const key = `${interactionId}:${triggerType}`;
    const newExecuted = new Set(state.triggerState.executedTriggers);
    newExecuted.add(key);
    
    return {
      triggerState: {
        executedTriggers: newExecuted,
        lastExecutedAt: {
          ...state.triggerState.lastExecutedAt,
          [key]: Date.now()
        }
      }
    };
  }),

  registerInteraction: (interaction) => set((state) => {
    if (state.interactions.has(interaction.id)) return state;
    const newInteractions = new Map(state.interactions);
    newInteractions.set(interaction.id, interaction);
    return { interactions: newInteractions };
  }),

  registerInteractions: (newItems) => set((state) => {
    const nextMap = new Map(state.interactions);
    let changed = false;
    newItems.forEach(item => {
      if (!state.interactions.has(item.id)) {
        nextMap.set(item.id, item);
        changed = true;
      }
    });
    return changed ? { interactions: nextMap } : state;
  }),

  unregisterInteraction: (id) => set((state) => {
    const newInteractions = new Map(state.interactions);
    newInteractions.delete(id);
    return { interactions: newInteractions };
  }),

  setActiveInteraction: (id) => set({ activeInteractionId: id }),
  setNearestInteraction: (id) => set({ nearestInteractionId: id }),
  setAdapter: (adapter) => set({ activeAdapter: adapter }),
  
  openPanel: (panelId, payload = null) => set({ 
    activePanelId: panelId, 
    activePanelPayload: payload 
  }),
  
  closePanel: () => set({ 
    activePanelId: null, 
    activePanelPayload: null,
    activeInteractionId: null 
  }),
}));
