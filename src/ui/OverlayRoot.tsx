import { useInteractionStore } from '../state/useInteractionStore';
import { useWorldStore } from '../state/useWorldStore';
import { motion, AnimatePresence } from 'motion/react';
import Prompt from './Prompt';
import ActionDock from './ActionDock';
import PanelRenderer from './PanelRenderer';
import MusicPlayerHUD from '../music/player/MusicPlayerHUD';
import MusicNarrationHUD from '../music/runtime/MusicNarrationHUD';
import MusicRuntimeController from '../music/runtime/MusicRuntimeController';
import JourneyRuntimeHUD from './JourneyRuntimeHUD';
import { useEffect, useRef } from 'react';

export default function OverlayRoot() {
  const activePanelId = useInteractionStore((state) => state.activePanelId);
  const closePanel = useInteractionStore((state) => state.closePanel);
  const setCameraMode = useWorldStore((state) => state.setCameraMode);
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    closePanel();
    setCameraMode('explore');
  };

  useEffect(() => {
    if (!activePanelId) return;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus();
    });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [activePanelId]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <Prompt />
      <ActionDock />
      <MusicRuntimeController />
      <MusicPlayerHUD />
      <MusicNarrationHUD />
      <JourneyRuntimeHUD />
      <AnimatePresence>
        {activePanelId && (
          <motion.div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm pointer-events-auto flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div ref={dialogRef} aria-modal="true" role="dialog" className="comic-panel max-h-[90vh] max-w-2xl w-full overflow-y-auto">
              <button aria-label="Close dialog" className="comic-button mb-4 bg-white" onClick={handleClose}>Close</button>
              <PanelRenderer panelId={activePanelId} onClose={handleClose} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
