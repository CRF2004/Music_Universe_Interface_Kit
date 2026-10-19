import { useInteractionStore } from '../state/useInteractionStore';
import { motion, AnimatePresence } from 'motion/react';
import { useProjectStore } from '../state/useProjectStore';
import { WIND, windStage } from '../interaction/windGardenRuntime';

export default function Prompt() {
  const nearestId = useInteractionStore((state) => state.nearestInteractionId);
  const interactions = useInteractionStore((state) => state.interactions);
  const activePanelId = useInteractionStore((state) => state.activePanelId);
  const wind = useProjectStore(state => state.project.scene.windGarden);
  const flags = useInteractionStore(state => state.interactionFlags);
  
  const nearestInteraction = nearestId ? interactions.get(nearestId) : null;
  const windPrompt = nearestId === wind?.pickupId ? '按 E · 拾起纸风车'
    : nearestId === wind?.wheelId ? flags[WIND.carried] !== true ? '先把长椅旁的风车带来'
      : windStage(flags) === 'carry' ? '按 E · 把风车插上' : flags[WIND.awakened] === true ? '风来了 · 沿花瓣走向花亭' : '按 E · 转动底座' : null;
  const prompt = windPrompt ?? nearestInteraction?.triggers.find((trigger) => trigger.type === 'proximity')?.prompt;
  const show = nearestInteraction && !activePanelId && !(wind && nearestId === wind.pickupId && flags[WIND.carried] === true);

  return (
    <div data-world-prompt className="absolute bottom-12 left-1/2 -translate-x-1/2">
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
