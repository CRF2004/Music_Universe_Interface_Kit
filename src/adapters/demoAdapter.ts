import { AppAdapter } from './appAdapterTypes';
import { panelRegistry } from '../ui/panelRegistry';

export const demoAdapter: AppAdapter = {
  id: 'memory-journey-adapter',
  name: 'Memory Journey',
  version: '0.1.0',

  panels: {
    'guide-dialog': {
      id: 'guide-dialog',
      title: 'The Listener Guide',
      component: panelRegistry['guide-dialog'],
      preferredCameraMode: 'ui-safe'
    },
    'echo-terminal': {
      id: 'echo-terminal',
      title: 'Echo Terminal',
      component: panelRegistry['echo-terminal'],
      preferredCameraMode: 'ui-safe'
    },
    'memory-fragment': {
      id: 'memory-fragment',
      title: 'Recovered Memory',
      component: panelRegistry['memory-fragment'],
      preferredCameraMode: 'inspection'
    },
    'journey-ending': {
      id: 'journey-ending',
      title: 'Journey Complete',
      component: panelRegistry['journey-ending'],
      preferredCameraMode: 'ui-safe'
    }
  },

  commands: {},
};
