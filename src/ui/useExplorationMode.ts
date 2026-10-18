import { useEffect, useState } from 'react';
import { useProjectStore } from '../state/useProjectStore';
import { useWorldStore } from '../state/useWorldStore';
import { useInteractionStore } from '../state/useInteractionStore';

export function useExplorationMode() {
  const [locked, setLocked] = useState(false);
  const editing = useProjectStore((state) => state.editorMode !== null);
  const help = useWorldStore((state) => state.helpOpen);
  const panel = useInteractionStore((state) => state.activePanelId);
  useEffect(() => {
    const update = () => setLocked(document.pointerLockElement?.tagName === 'CANVAS');
    update();
    document.addEventListener('pointerlockchange', update);
    return () => document.removeEventListener('pointerlockchange', update);
  }, []);
  return locked && !editing && !help && panel === null;
}
