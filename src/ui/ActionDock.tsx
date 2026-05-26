import { useWorldStore } from '../state/useWorldStore';
import { Monitor, Map as MapIcon, Settings, Info } from 'lucide-react';

export default function ActionDock() {
  const toggleDevMode = useWorldStore((state) => state.toggleDevMode);
  const isDevMode = useWorldStore((state) => state.isDevMode);

  return (
    <div className="absolute top-6 left-6 flex flex-col gap-3 pointer-events-auto">
      <button 
        onClick={toggleDevMode}
        className={`comic-button flex items-center gap-2 ${isDevMode ? 'bg-comic-yellow' : 'bg-paper'}`}
      >
        <Monitor size={18} />
        <span className="hidden sm:inline">Debug Mode</span>
      </button>
      
      <div className="flex gap-3">
        <button className="comic-button bg-paper p-2">
          <MapIcon size={20} />
        </button>
        <button className="comic-button bg-paper p-2">
          <Settings size={20} />
        </button>
        <button className="comic-button bg-paper p-2">
          <Info size={20} />
        </button>
      </div>

      <div className="mt-2 comic-panel py-2 px-4 inline-block bg-white/80 backdrop-blur-sm">
        <p className="text-[10px] font-mono text-ink/40 uppercase font-bold">Spatial Interface Kit</p>
        <p className="text-xs font-mono font-bold">V0.1.0-ALPHA</p>
      </div>
    </div>
  );
}
