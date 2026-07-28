import type {
  InteractionCondition,
  TriggerKind,
} from './interactionTypes';

export type InteractionRuntimeValue =
  | string
  | number
  | boolean
  | null
  | readonly InteractionRuntimeValue[]
  | { readonly [key: string]: InteractionRuntimeValue };

export interface InteractionConditionContext {
  flags?: Readonly<Record<string, unknown>>;
  appState?: Readonly<Record<string, unknown>>;
  inventory?: Readonly<Record<string, unknown>>;
  permissions?: Readonly<Record<string, unknown>>;
  resolveCustom?: (
    condition: InteractionCondition,
    context: InteractionConditionContext,
  ) => boolean;
}

export interface InteractionFlagState {
  readonly flags: Readonly<Record<string, InteractionRuntimeValue>>;
}

export type InteractionBlockedReason =
  | 'conditions'
  | 'cooldown'
  | 'already-executed'
  | 'disabled'
  | 'missing-definition';

interface InteractionEventBase {
  readonly eventId: string;
  readonly atMs: number;
}

export interface InteractionTriggeredEvent extends InteractionEventBase {
  readonly type: 'interaction.triggered';
  readonly interactionId: string;
  readonly trigger: TriggerKind;
}

export interface InteractionBlockedEvent extends InteractionEventBase {
  readonly type: 'interaction.blocked';
  readonly interactionId: string;
  readonly trigger: TriggerKind;
  readonly reason: InteractionBlockedReason;
}

export interface InteractionActionCompletedEvent extends InteractionEventBase {
  readonly type: 'interaction.action-completed';
  readonly interactionId: string;
  readonly actionId: string;
}

export interface InteractionFlagChangedEvent extends InteractionEventBase {
  readonly type: 'interaction.flag-changed';
  readonly key: string;
  readonly previousValue?: InteractionRuntimeValue;
  readonly value?: InteractionRuntimeValue;
}

export interface InteractionRuntimeResetEvent extends InteractionEventBase {
  readonly type: 'interaction.runtime-reset';
  readonly reason:
    | 'replay'
    | 'restart'
    | 'track-loaded'
    | 'track-replaced'
    | 'world-replaced';
}

export type InteractionRuntimeEvent =
  | InteractionTriggeredEvent
  | InteractionBlockedEvent
  | InteractionActionCompletedEvent
  | InteractionFlagChangedEvent
  | InteractionRuntimeResetEvent;

export type InteractionEventListener = (event: InteractionRuntimeEvent) => void;

export interface InteractionEventBus {
  publish: (event: InteractionRuntimeEvent) => void;
  subscribe: (listener: InteractionEventListener) => () => void;
  listenerCount: () => number;
}

let eventSequence = 0;

export function createInteractionEventMetadata(atMs = Date.now()) {
  eventSequence += 1;
  return {
    eventId: `interaction-event-${eventSequence}`,
    atMs,
  } as const;
}

function hasOwn(source: Readonly<Record<string, unknown>>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(source, key);
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;

  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => valuesEqual(value, right[index]))
    );
  }

  if (
    typeof left === 'object' &&
    left !== null &&
    !Array.isArray(left) &&
    typeof right === 'object' &&
    right !== null &&
    !Array.isArray(right)
  ) {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const leftKeys = Object.keys(leftRecord);
    const rightKeys = Object.keys(rightRecord);
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) =>
          hasOwn(rightRecord, key) &&
          valuesEqual(leftRecord[key], rightRecord[key]),
      )
    );
  }

  return false;
}

export function isInteractionRuntimeValue(
  value: unknown,
): value is InteractionRuntimeValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return true;
  }
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isInteractionRuntimeValue);
  if (typeof value === 'object') {
    return Object.values(value).every(isInteractionRuntimeValue);
  }
  return false;
}

function resolveConditionSource(
  condition: InteractionCondition,
  context: InteractionConditionContext,
): Readonly<Record<string, unknown>> | undefined {
  switch (condition.type) {
    case 'flag':
      return context.flags;
    case 'app-state':
      return context.appState;
    case 'inventory':
      return context.inventory;
    case 'permission':
      return context.permissions;
    case 'custom':
      return undefined;
  }
}

export function evaluateInteractionCondition(
  condition: InteractionCondition,
  context: InteractionConditionContext,
): boolean {
  if (condition.type === 'custom') {
    return context.resolveCustom?.(condition, context) ?? false;
  }

  const source = resolveConditionSource(condition, context);
  if (!source) return false;

  const exists = hasOwn(source, condition.key);
  const actualValue = source[condition.key];
  const operator =
    condition.operator ?? (condition.value === undefined ? 'exists' : 'equals');

  switch (operator) {
    case 'exists':
      return exists;
    case 'equals':
      return exists && valuesEqual(actualValue, condition.value);
    case 'not-equals':
      return !exists || !valuesEqual(actualValue, condition.value);
    case 'includes':
      if (!exists) return false;
      if (typeof actualValue === 'string' && typeof condition.value === 'string') {
        return actualValue.includes(condition.value);
      }
      if (Array.isArray(actualValue)) {
        return actualValue.some((value) => valuesEqual(value, condition.value));
      }
      return false;
    case 'gt':
      return (
        exists &&
        typeof actualValue === 'number' &&
        typeof condition.value === 'number' &&
        actualValue > condition.value
      );
    case 'lt':
      return (
        exists &&
        typeof actualValue === 'number' &&
        typeof condition.value === 'number' &&
        actualValue < condition.value
      );
  }
}

export function evaluateInteractionConditions(
  conditions: readonly InteractionCondition[] | undefined,
  context: InteractionConditionContext,
): boolean {
  return conditions?.every((condition) =>
    evaluateInteractionCondition(condition, context)) ?? true;
}

export function createInteractionFlagState(
  flags: Readonly<Record<string, InteractionRuntimeValue>> = {},
): InteractionFlagState {
  return { flags: { ...flags } };
}

export function setInteractionFlag(
  state: InteractionFlagState,
  key: string,
  value: InteractionRuntimeValue,
): InteractionFlagState {
  if (valuesEqual(state.flags[key], value) && hasOwn(state.flags, key)) {
    return state;
  }

  return {
    flags: {
      ...state.flags,
      [key]: value,
    },
  };
}

export function clearInteractionFlag(
  state: InteractionFlagState,
  key: string,
): InteractionFlagState {
  if (!hasOwn(state.flags, key)) return state;

  const nextFlags = { ...state.flags };
  delete nextFlags[key];
  return { flags: nextFlags };
}

export function resetInteractionFlags(
  initialFlags: Readonly<Record<string, InteractionRuntimeValue>> = {},
): InteractionFlagState {
  return createInteractionFlagState(initialFlags);
}

export function createInteractionEventBus(): InteractionEventBus {
  const listeners = new Set<InteractionEventListener>();

  return {
    publish(event) {
      [...listeners].forEach((listener) => listener(event));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    listenerCount() {
      return listeners.size;
    },
  };
}

export const interactionEventBus = createInteractionEventBus();
