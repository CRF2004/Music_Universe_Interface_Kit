import type { SpatialConditionDefinition, SpatialActionDefinition } from '../schema/spatialSceneSchema';

export type WindGardenStage = 'find' | 'carry' | 'turn' | 'align' | 'walk' | 'complete';
export type WindGardenFlags = Readonly<Record<string, unknown>>;
export const WIND = {
  carried: 'wind.carried', planted: 'wind.planted', turned: 'wind.turned',
  awakened: 'wind.awakened', checkpoint: 'wind.checkpoint', completed: 'wind.completed',
} as const;
export function windStage(flags: WindGardenFlags): WindGardenStage {
  if (flags[WIND.completed] === true) return 'complete';
  if (flags[WIND.awakened] === true) return 'walk';
  if (flags[WIND.turned] === true) return 'align';
  if (flags[WIND.planted] === true) return 'turn';
  return flags[WIND.carried] === true ? 'carry' : 'find';
}
export const windInstructions: Record<WindGardenStage, string> = {
  find: '找到前方长椅旁的纸风车，靠近后按 E 拾起。',
  carry: '把风车带到前方的圆形花圃，按 E 插上。',
  turn: '风车还没迎着风。再按 E，转动底座。',
  align: '再转一次，让风车朝向远处的花亭。',
  walk: '花瓣铺出了小路。沿着花瓣，穿过花亭。',
  complete: '你把风带回了花园。可以回头看看，也可以再玩一次。',
};
export function windCondition(key: string, value = true): SpatialConditionDefinition {
  return { type: 'flag', key, operator: value ? 'equals' : 'not-equals', value: true };
}
// Reverse order is intentional: the dispatcher evaluates actions sequentially.
// One activation advances exactly one stage rather than cascading through all three.
export function windTurnActions(): SpatialActionDefinition[] {
  return [
    { id: 'catch-wind', type: 'set-flag', payload: { key: WIND.awakened, value: true }, conditions: [windCondition(WIND.turned)] },
    { id: 'turn-base', type: 'set-flag', payload: { key: WIND.turned, value: true }, conditions: [windCondition(WIND.planted), windCondition(WIND.turned, false)] },
    { id: 'plant-wheel', type: 'set-flag', payload: { key: WIND.planted, value: true }, conditions: [windCondition(WIND.planted, false)] },
  ];
}
export function windResponseAt(time: number, markers: readonly number[]): number {
  return markers.find(marker => marker >= time && marker - time <= 1.5) ?? time;
}
// Seeking before an earned response preserves its stable final result.
export function windBloom(time: number, responseAt: number | null, reduced: boolean): number {
  if (responseAt === null || time < responseAt - 1.5 || reduced) return 1;
  return Math.min(1, Math.max(0, (time - responseAt) / 1.8));
}
