import type React from 'react';
import { useInteractionStore } from '../state/useInteractionStore';

export type PanelComponent = React.FC<{
  payload?: unknown;
  onClose: () => void;
}>;

const GuideDialog: PanelComponent = ({ onClose }) => (
  <div className="space-y-6">
    <header className="flex items-center gap-4">
      <div aria-hidden="true" className="h-16 w-16 rounded-full border-4 border-ink bg-comic-blue" />
      <div>
        <h2 className="font-display text-3xl font-black uppercase italic">The Listener Guide</h2>
        <p className="text-xs font-bold uppercase tracking-widest text-ink/60">Keeper of the first note</p>
      </div>
    </header>
    <div className="space-y-4 border-l-4 border-comic-blue py-2 pl-6 text-lg leading-relaxed">
      <p>This planet has forgotten why it was singing. The Archive still holds one memory.</p>
      <p>Move with <strong>WASD</strong> or the arrow keys. Find the Memory Archive, recover what it remembers, then follow the light to the gate.</p>
    </div>
    <button autoFocus onClick={onClose} className="comic-button w-full bg-comic-blue py-3 text-xl text-white">
      I’ll carry the memory
    </button>
  </div>
);

const EchoTerminal: PanelComponent = ({ onClose }) => {
  const flags = useInteractionStore((state) => state.interactionFlags);
  const objective = !flags['journey.started']
    ? 'Speak with the Listener Guide.'
    : !flags['memory.received']
      ? 'Find the Memory Archive.'
      : !flags['journey.completed']
        ? 'Follow the Light Path to the Departure Gate.'
        : 'The journey is complete. Stay, or replay the music.';

  return (
    <div className="space-y-6">
      <h2 className="font-display text-4xl font-black uppercase">Echo Terminal</h2>
      <div className="border-2 border-dashed border-comic-blue bg-comic-blue/10 p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-ink/60">Current objective</p>
        <p className="mt-2 text-xl font-bold">{objective}</p>
      </div>
      <dl className="grid gap-3 text-base sm:grid-cols-2">
        <div><dt className="font-bold">Move</dt><dd>WASD / arrow keys</dd></div>
        <div><dt className="font-bold">Interact</dt><dd>E or click an object</dd></div>
        <div><dt className="font-bold">Jump</dt><dd>Space</dd></div>
        <div><dt className="font-bold">Run</dt><dd>Hold Shift</dd></div>
      </dl>
      <button autoFocus onClick={onClose} className="comic-button w-full bg-white">Return to the world</button>
    </div>
  );
};

const MemoryFragment: PanelComponent = ({ onClose }) => (
  <div className="space-y-6">
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-comic-purple">Recovered memory 01</p>
    <h2 className="font-display text-4xl font-black">“We sang so the dark would know where to find us.”</h2>
    <p className="border-l-4 border-comic-purple pl-5 text-lg leading-relaxed">
      The Archive releases a warm pulse into your hands. Beyond the storm, a path begins to answer.
    </p>
    <button autoFocus onClick={onClose} className="comic-button w-full bg-comic-purple py-3 text-white">
      Carry the memory
    </button>
  </div>
);

const JourneyEnding: PanelComponent = ({ onClose }) => (
  <div className="space-y-6 text-center">
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-comic-green">Memory delivered</p>
    <h2 className="font-display text-5xl font-black">The planet remembers.</h2>
    <p className="mx-auto max-w-lg text-lg leading-relaxed">
      The gate holds steady. You can remain in the afterglow, or use Replay in the music player to begin with a clean memory.
    </p>
    <button autoFocus onClick={onClose} className="comic-button w-full bg-comic-green py-3 text-xl">
      Stay in the afterglow
    </button>
  </div>
);

export const panelRegistry: Record<string, PanelComponent> = {
  'guide-dialog': GuideDialog,
  'echo-terminal': EchoTerminal,
  'memory-fragment': MemoryFragment,
  'journey-ending': JourneyEnding,
};

export const registerPanel = (id: string, component: PanelComponent) => {
  panelRegistry[id] = component;
};
