// Authored art kit for the existing Memory Journey, not a second narrative template.
export const worldLooks = {
  'coastal-garden-v1': {
    sceneryAssetId: 'coastal-garden',
    ambient: 1.05,
    key: 2.3,
    keyColor: '#fff0d1',
    skyLight: '#d0e6dd',
    bounceLight: '#96916a',
    gateStyle: 'arbor',
    dialogue: {
      'guide-dialog': { objectId: 'npc-guide', position: [1.8, 1.6, 4.5], target: [.95, 1.05, 0], fov: 36 },
      'journey-ending': { objectId: 'departure-gate', position: [3.6, 3.2, 7.6], target: [.7, 1.3, 0], fov: 43 },
    },
    camera: { fov: 48, distance: 9.5, height: 4.5, lookAtHeight: 1.4, shoulderOffset: 0, followSharpness: .12, rotationSharpness: .1 },
  },
} as const;
export type WorldLookId = keyof typeof worldLooks;
export function isWorldLookId(value: unknown): value is WorldLookId { return typeof value === 'string' && Object.hasOwn(worldLooks, value); }
export function getWorldLook(id: WorldLookId | undefined) { return id ? worldLooks[id] : undefined; }
