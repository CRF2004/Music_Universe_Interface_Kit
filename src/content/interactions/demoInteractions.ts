import { InteractionPointDefinition } from '../../interaction/interactionTypes';

export const demoInteractions: InteractionPointDefinition[] = [
  {
    id: 'npc-guide',
    label: 'Guide NPC',
    kind: 'dialog',
    position: [0, 0, -5],
    radius: 3,
    enabled: true,
    visual: {
      type: 'npc',
      colorToken: '#42a5ff',
      prompt: 'Talk to Guide'
    },
    triggers: [{ type: 'proximity' }, { type: 'click' }],
    actions: [
      {
        id: 'open-guide-dialog',
        type: 'panel',
        target: 'guide-dialog',
        cameraMode: 'interaction'
      }
    ]
  },
  {
    id: 'support-phone',
    label: 'Support Phone',
    kind: 'agent',
    position: [8, 0, -8],
    radius: 3,
    enabled: true,
    visual: {
      type: 'phone-booth',
      colorToken: '#ff3b2f',
      prompt: 'Call Support'
    },
    triggers: [{ type: 'proximity' }, { type: 'click' }],
    actions: [
      {
        id: 'open-support-panel',
        type: 'panel',
        target: 'support-panel',
        cameraMode: 'interaction'
      }
    ]
  },
  {
    id: 'product-tower',
    label: 'Product Tower',
    kind: 'inspect',
    position: [-10, 0, -12],
    radius: 5,
    enabled: true,
    visual: {
      type: 'building',
      colorToken: '#9f63ff',
      prompt: 'Inspect Product'
    },
    triggers: [{ type: 'proximity' }, { type: 'click' }],
    actions: [
      {
        id: 'open-product-panel',
        type: 'panel',
        target: 'product-panel',
        cameraMode: 'ui-safe'
      }
    ]
  },
  {
    id: 'docs-portal',
    label: 'Docs Portal',
    kind: 'route',
    position: [12, 0, 5],
    radius: 4,
    enabled: true,
    visual: {
      type: 'portal',
      colorToken: '#4adb7d',
      prompt: 'Enter Docs'
    },
    triggers: [{ type: 'proximity' }, { type: 'click' }],
    actions: [
      {
        id: 'open-docs',
        type: 'panel',
        target: 'docs-panel',
        cameraMode: 'ui-safe'
      }
    ]
  }
];
