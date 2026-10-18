import { useWorldStore } from '../state/useWorldStore';
import { Accessibility, CircleHelp, Monitor } from 'lucide-react';

export default function ActionDock() {
  const toggleDevMode = useWorldStore((state) => state.toggleDevMode);
  const isDevMode = useWorldStore((state) => state.isDevMode);
  const reducedEffects = useWorldStore((state) => state.reducedEffects);
  const setReducedEffects = useWorldStore((state) => state.setReducedEffects);
  const setHelpOpen = useWorldStore((state) => state.setHelpOpen);
  const debugAvailable =
    import.meta.env.DEV ||
    new URLSearchParams(window.location.search).has('debug');

  return (
    <div className="absolute top-6 left-6 flex flex-col gap-3 pointer-events-auto">
      {debugAvailable && (
        <button
          onClick={toggleDevMode}
          className={`comic-button flex items-center gap-2 ${isDevMode ? 'bg-comic-yellow' : 'bg-paper'}`}
        >
          <Monitor size={18} />
          <span className="hidden sm:inline">Debug</span>
        </button>
      )}
      
      <div className="flex gap-3">
        <button
          aria-pressed={reducedEffects}
          aria-label="Toggle reduced visual effects"
          className={`comic-button p-2 ${reducedEffects ? 'bg-comic-yellow' : 'bg-paper'}`}
          onClick={() => {
            const next = !reducedEffects;
            window.localStorage.setItem('music-universe.reduced-effects', String(next));
            setReducedEffects(next);
          }}
        >
          <Accessibility size={20} />
        </button>
        <button aria-label="Open journey guide" className="comic-button bg-paper p-2" onClick={() => setHelpOpen(true)}>
          <CircleHelp size={20} />
        </button>
      </div>

      <div className="mt-2 comic-panel py-2 px-4 inline-block bg-white/80 backdrop-blur-sm">
        <p className="text-[10px] font-mono text-ink/40 uppercase font-bold">Memory Journey</p>
        <p className="text-xs font-mono font-bold">Music Universe</p>
      </div>
    </div>
  );
}
