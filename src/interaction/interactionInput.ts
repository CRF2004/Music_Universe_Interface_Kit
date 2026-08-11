export interface InteractionInputTarget {
  readonly isContentEditable?: boolean;
  readonly tagName?: string;
}

export function blocksWorldInteractionKey(
  target: InteractionInputTarget | null | undefined,
): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName ?? '');
}

export function horizontalInteractionDistance(
  player: readonly [number, number, number],
  target: readonly [number, number, number],
): number {
  return Math.hypot(player[0] - target[0], player[2] - target[2]);
}
