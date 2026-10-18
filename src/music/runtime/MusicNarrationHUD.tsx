import { AnimatePresence, motion } from 'motion/react';
import { useMusicRuntimeStore } from './useMusicRuntimeStore';
import { useExperienceSettingsStore } from '../../state/useExperienceSettingsStore';
import { useInteractionStore } from '../../state/useInteractionStore';

export default function MusicNarrationHUD() {
  const narration = useMusicRuntimeStore((state) => state.narration);
  const subtitlesEnabled = useExperienceSettingsStore((state) => state.subtitlesEnabled);
  const activePanelId = useInteractionStore((state) => state.activePanelId);

  return (
    <AnimatePresence mode="wait">
      {narration && subtitlesEnabled && !activePanelId && (
        <motion.div
          key={narration}
          className="pointer-events-none fixed bottom-36 left-1/2 z-40 max-w-xl -translate-x-1/2 rounded-xl bg-black/70 px-6 py-3 text-center text-lg text-white backdrop-blur"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          role="status"
        >
          {narration}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
