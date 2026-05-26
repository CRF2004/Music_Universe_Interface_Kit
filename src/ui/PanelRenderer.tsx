import React from 'react';
import { useInteractionStore } from '../state/useInteractionStore';
import { panelRegistry } from './panelRegistry';

interface Props {
  panelId: string;
  onClose: () => void;
}

export default function PanelRenderer({ panelId, onClose }: Props) {
  const payload = useInteractionStore((state) => state.activePanelPayload);
  const activeAdapter = useInteractionStore((state) => state.activeAdapter);
  
  // 1. Try to get component from adapter
  let Panel = activeAdapter?.panels[panelId]?.component;
  
  // 2. Fallback to public registry
  if (!Panel) {
    Panel = panelRegistry[panelId];
  }

  if (!Panel) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-2xl font-display font-bold text-ink">Unknown Panel: {panelId}</h2>
        <button onClick={onClose} className="comic-button">Close</button>
      </div>
    );
  }

  return <Panel payload={payload} onClose={onClose} />;
}
