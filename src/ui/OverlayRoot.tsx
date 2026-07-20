import { useInteractionStore } from '../state/useInteractionStore';
import { useWorldStore } from '../state/useWorldStore';
import { motion, AnimatePresence } from 'motion/react';
import Prompt from './Prompt';
import ActionDock from './ActionDock';
import PanelRenderer from './PanelRenderer';
import MusicPlayerHUD from '../music/player/MusicPlayerHUD';
import MusicNarrationHUD from '../music/runtime/MusicNarrationHUD';
import MusicRuntimeController from '../music/runtime/MusicRuntimeController';

export default function OverlayRoot() {
  const activePanelId = useInteractionStore((state) => state.activePanelId);
  const closePanel = useInteractionStore((state) => state.closePanel);
  const setCameraMode = useWorldStore((state) => state.setCameraMode);

  const handleClose = () => {
    closePanel();
    setCameraMode('explore');
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <Prompt />
      <ActionDock />
      <MusicRuntimeController />
      <MusicPlayerHUD />
      <MusicNarrationHUD />
      <AnimatePresence>
        {activePanelId && (
          <motion.div className="absolute inset-0 bg-ink/40 backdrop-blur-sm pointer-events-auto flex items-center justify-center p-4">
            <div className="comic-panel max-w-2xl w-full">
              <button onClick={handleClose}>X</button>
              <PanelRenderer panelId={activePanelId} onClose={handleClose} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
