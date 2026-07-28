import { create } from 'zustand';
import type { AppAdapter } from '../adapters/appAdapterTypes';
import {
  clearInteractionFlag,
  createInteractionEventMetadata,
  interactionEventBus,
  setInteractionFlag,
  type InteractionRuntimeEvent,
  type InteractionRuntimeResetEvent,
  type InteractionRuntimeValue,
} from '../interaction/interactionRuntime';
import type { InteractionPointDefinition } from '../interaction/interactionTypes';

export interface TriggerRuntimeState {
  executedTriggers: Set<string>;
  lastExecutedAt: Record<string, number>;
}

export interface InteractionState {
  interactions: Map<string, InteractionPointDefinition>;
  activeInteractionId: string | null;
  nearestInteractionId: string | null;
  activePanelId: string | null;
  activePanelPayload: unknown;
  activeAdapter: AppAdapter | null;
  interactionFlags: Readonly<Record<string, InteractionRuntimeValue>>;
  triggerState: TriggerRuntimeState;

  registerInteraction: (interaction: InteractionPointDefinition) => void;
  registerInteractions: (interactions: InteractionPointDefinition[]) => void;
  unregisterInteraction: (id: string) => void;
  setActiveInteraction: (id: string | null) => void;
  setNearestInteraction: (id: string | null) => void;
  setAdapter: (adapter: AppAdapter | null) => void;
  openPanel: (panelId: string, payload?: unknown) => void;
  closePanel: () => void;
  setFlag: (key: string, value: InteractionRuntimeValue) => void;
  clearFlag: (key: string) => void;
  recordTriggerExecution: (
    interactionId: string,
    triggerType: string,
    executedAt?: number,
  ) => void;
  resetInteractionRuntime: (
    reason: InteractionRuntimeResetEvent['reason'],
    initialFlags?: Readonly<Record<string, InteractionRuntimeValue>>,
  ) => void;
}

function publishEvent(
  event: InteractionRuntimeEvent,
  adapter: AppAdapter | null,
) {
  interactionEventBus.publish(event);
  adapter?.onWorldEvent?.(event);
}

export const useInteractionStore = create<InteractionState>((set, get) => ({
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

  recordTriggerExecution: (
    interactionId,
    triggerType,
    executedAt = Date.now(),
  ) =>
    set((state) => {
      const key = `${interactionId}:${triggerType}`;
      const executedTriggers = new Set(state.triggerState.executedTriggers);
      executedTriggers.add(key);

      return {
        triggerState: {
          executedTriggers,
          lastExecutedAt: {
            ...state.triggerState.lastExecutedAt,
            [key]: executedAt,
          },
        },
      };
    }),

  registerInteraction: (interaction) =>
    set((state) => {
      if (state.interactions.has(interaction.id)) return state;
      const interactions = new Map(state.interactions);
      interactions.set(interaction.id, interaction);
      return { interactions };
    }),

  registerInteractions: (newItems) =>
    set((state) => {
      const interactions = new Map(state.interactions);
      let changed = false;
      newItems.forEach((item) => {
        if (!state.interactions.has(item.id)) {
          interactions.set(item.id, item);
          changed = true;
        }
      });
      return changed ? { interactions } : state;
    }),

  unregisterInteraction: (id) =>
    set((state) => {
      const interactions = new Map(state.interactions);
      interactions.delete(id);
      return { interactions };
    }),

  setActiveInteraction: (id) => set({ activeInteractionId: id }),
  setNearestInteraction: (id) => set({ nearestInteractionId: id }),
  setAdapter: (adapter) => set({ activeAdapter: adapter }),

  openPanel: (panelId, payload = null) =>
    set({
      activePanelId: panelId,
      activePanelPayload: payload,
    }),

  closePanel: () =>
    set({
      activePanelId: null,
      activePanelPayload: null,
      activeInteractionId: null,
    }),

  setFlag: (key, value) => {
    let event: InteractionRuntimeEvent | undefined;
    set((state) => {
      const next = setInteractionFlag(
        { flags: state.interactionFlags },
        key,
        value,
      );
      if (next.flags === state.interactionFlags) return state;
      event = {
        ...createInteractionEventMetadata(),
        type: 'interaction.flag-changed',
        key,
        previousValue: state.interactionFlags[key],
        value,
      };
      return { interactionFlags: next.flags };
    });
    if (event) publishEvent(event, get().activeAdapter);
  },

  clearFlag: (key) => {
    let event: InteractionRuntimeEvent | undefined;
    set((state) => {
      const next = clearInteractionFlag(
        { flags: state.interactionFlags },
        key,
      );
      if (next.flags === state.interactionFlags) return state;
      event = {
        ...createInteractionEventMetadata(),
        type: 'interaction.flag-changed',
        key,
        previousValue: state.interactionFlags[key],
      };
      return { interactionFlags: next.flags };
    });
    if (event) publishEvent(event, get().activeAdapter);
  },

  resetInteractionRuntime: (reason, initialFlags = {}) => {
    set({
      activeInteractionId: null,
      nearestInteractionId: null,
      activePanelId: null,
      activePanelPayload: null,
      interactionFlags: { ...initialFlags },
      triggerState: {
        executedTriggers: new Set(),
        lastExecutedAt: {},
      },
    });
    publishEvent(
      {
        ...createInteractionEventMetadata(),
        type: 'interaction.runtime-reset',
        reason,
      },
      get().activeAdapter,
    );
  },
}));
