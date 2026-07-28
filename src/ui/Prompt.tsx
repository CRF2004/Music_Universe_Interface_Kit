import { useInteractionStore } from '../state/useInteractionStore';
import { motion, AnimatePresence } from 'motion/react';

export default function Prompt() {
  const nearestId = useInteractionStore((state) => state.nearestInteractionId);
  const interactions = useInteractionStore((state) => state.interactions);
  const activePanelId = useInteractionStore((state) => state.activePanelId);
  
  const nearestInteraction = nearestId ? interactions.get(nearestId) : null;
  const prompt = nearestInteraction?.triggers.find((trigger) => trigger.type === 'proximity')?.prompt;
  const show = nearestInteraction && !activePanelId;

  return (
    <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="comic-panel py-3 px-6 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-sm bg-ink text-white flex items-center justify-center font-bold shadow-sm">
              E
            </div>
            <div>
              <p className="font-display font-bold text-sm uppercase tracking-wider text-ink/60">{prompt ?? 'Interaction nearby'}</p>
              <p className="font-display font-black text-xl">{nearestInteraction?.label}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
