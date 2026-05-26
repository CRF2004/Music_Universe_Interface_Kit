import { useInteractionStore } from '../state/useInteractionStore';
import { useWorldStore } from '../state/useWorldStore';
import { motion, AnimatePresence } from 'motion/react';
import Prompt from './Prompt';
import ActionDock from './ActionDock';
import PanelRenderer from './PanelRenderer';

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
      {/* HUD Layer */}
      <Prompt />
      <ActionDock />

      {/* Panel Layer */}
      <AnimatePresence>
        {activePanelId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm pointer-events-auto flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="comic-panel max-w-2xl w-full max-h-[80vh] overflow-y-auto relative"
            >
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-ink hover:scale-110 transition-transform"
              >
                <div className="w-8 h-8 rounded-full border-2 border-ink flex items-center justify-center font-bold">X</div>
              </button>
              
              <PanelRenderer panelId={activePanelId} onClose={handleClose} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
