export type AssetLod = 'near' | 'far';

export interface AssetLodThresholds {
  enterNear: number;
  exitNear: number;
}

export function selectAssetLod(
  distance: number,
  current: AssetLod,
  { enterNear, exitNear }: AssetLodThresholds,
): AssetLod {
  if (enterNear >= exitNear) {
    throw new Error('LOD exit distance must be greater than its enter distance.');
  }
  if (current === 'far' && distance <= enterNear) return 'near';
  if (current === 'near' && distance >= exitNear) return 'far';
  return current;
}
