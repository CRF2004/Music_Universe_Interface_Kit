import type { BuiltInVisualType } from './interactionTypes';

export type InteractionColliderProfile =
  | {
      type: 'cuboid';
      halfExtents: [number, number, number];
      position: [number, number, number];
    }
  | {
      type: 'capsule';
      halfHeight: number;
      radius: number;
      position: [number, number, number];
    }
  | { type: 'none' };

export interface InteractionVisualProfile {
  assetId?: string;
  targetHeight: number;
  collider: InteractionColliderProfile;
}

/**
 * One reviewed physical/rendering contract for every built-in world prop.
 * Keeping model normalization and collider dimensions together prevents asset
 * replacement from silently leaving an undersized collision volume behind.
 */
export const interactionVisualProfiles: Record<
  BuiltInVisualType,
  InteractionVisualProfile
> = {
  npc: {
    assetId: 'guide-astronaut',
    targetHeight: 1.7,
    collider: {
      type: 'capsule',
      halfHeight: 0.4,
      radius: 0.4,
      position: [0, 0.8, 0],
    },
  },
  'phone-booth': {
    assetId: 'support-terminal',
    targetHeight: 1.75,
    collider: {
      type: 'cuboid',
      halfExtents: [1.1, 0.9, 0.55],
      position: [0, 0.9, 0],
    },
  },
  building: {
    assetId: 'product-tower-hangar',
    targetHeight: 5.2,
    collider: {
      type: 'cuboid',
      // Reviewed against the normalized GLB bounds: ~10.4 × 5.2 × 14.2 m.
      halfExtents: [5.25, 2.6, 7.15],
      position: [0, 2.6, 0],
    },
  },
  vehicle: {
    targetHeight: 1.6,
    collider: {
      type: 'cuboid',
      halfExtents: [1, 0.8, 0.55],
      position: [0, 0.8, 0],
    },
  },
  crate: {
    targetHeight: 1,
    collider: {
      type: 'cuboid',
      halfExtents: [0.5, 0.5, 0.5],
      position: [0, 0.5, 0],
    },
  },
  portal: {
    assetId: 'docs-portal-gate',
    targetHeight: 3.4,
    collider: { type: 'none' },
  },
};

export function getInteractionVisualProfile(type: string) {
  return interactionVisualProfiles[type as BuiltInVisualType] ??
    interactionVisualProfiles.crate;
}
