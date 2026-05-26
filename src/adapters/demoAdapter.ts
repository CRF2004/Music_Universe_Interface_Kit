import { AppAdapter } from './appAdapterTypes';
import { panelRegistry } from '../ui/panelRegistry';

export const demoAdapter: AppAdapter = {
  id: 'demo-adapter',
  name: 'Demo Product World',
  version: '0.1.0',

  panels: {
    'guide-dialog': {
      id: 'guide-dialog',
      title: 'World Guide',
      component: panelRegistry['guide-dialog'] as any,
      preferredCameraMode: 'ui-safe'
    },
    'support-panel': {
      id: 'support-panel',
      title: 'Support Terminal',
      component: panelRegistry['support-panel'] as any,
      preferredCameraMode: 'ui-safe'
    },
    'product-panel': {
      id: 'product-panel',
      title: 'Product Details',
      component: panelRegistry['product-panel'] as any,
      preferredCameraMode: 'inspection'
    },
    'docs-panel': {
      id: 'docs-panel',
      title: 'Documentation',
      component: panelRegistry['docs-panel'] as any,
      preferredCameraMode: 'ui-safe'
    }
  },

  commands: {
    'start-trial': {
      id: 'start-trial',
      label: 'Start Trial',
      run: async (payload, context) => {
        console.log('Command Context:', context);
        return { ok: true, message: 'Trial started!' };
      }
    }
  }
};
