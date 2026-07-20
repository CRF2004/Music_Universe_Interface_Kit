import { AnimatePresence, motion } from 'motion/react';
import { useMusicRuntimeStore } from './useMusicRuntimeStore';

export default function MusicNarrationHUD() {
  const narration = useMusicRuntimeStore((state) => state.narration);

  return (
    <AnimatePresence mode="wait">
      {narration && (
        <motion.div
          key={narration}
          className="pointer-events-none fixed bottom-28 left-1/2 z-40 max-w-xl -translate-x-1/2 rounded-xl bg-black/55 px-6 py-3 text-center text-lg text-white backdrop-blur"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
        >
          {narration}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
