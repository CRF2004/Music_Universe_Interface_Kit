import React from 'react';

export type PanelComponent = React.FC<{ 
  payload?: any; 
  onClose: () => void; 
}>;

const GuideDialog: PanelComponent = ({ onClose }) => (
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 bg-comic-blue rounded-full border-4 border-ink" />
      <div>
        <h2 className="text-3xl font-display font-black uppercase italic">World Guide</h2>
        <p className="text-ink/60 font-bold uppercase tracking-widest text-xs">Navigation Assistant</p>
      </div>
    </div>
    <div className="space-y-4 font-sans text-lg leading-relaxed border-l-4 border-comic-blue pl-6 py-2">
      <p>Welcome to the <strong>Product World</strong>, stranger. This is an experimental spatial interface where apps are places and features are objects.</p>
      <p>You can use <strong>WASD</strong> to move around and <strong>SPACE</strong> to jump. Approach any interesting object to interact with it.</p>
    </div>
    <div className="flex gap-4 pt-4">
      <button onClick={onClose} className="comic-button bg-comic-blue text-white w-full py-3 text-xl">Understood</button>
    </div>
  </div>
);

const SupportPanel: PanelComponent = ({ onClose }) => (
  <div className="space-y-6">
    <h2 className="text-4xl font-display font-black uppercase underline decoration-comic-red decoration-8 underline-offset-8">Terminal 7: Support</h2>
    <div className="bg-comic-red/10 p-6 border-2 border-comic-red border-dashed">
      <p className="font-mono text-comic-red font-bold animate-pulse">CONNECTING TO SUPPORT AGENT...</p>
    </div>
    <p className="font-sans text-lg">"Hello! I am your AI support interface. How can I help you explore this world today?"</p>
    <div className="flex flex-col gap-2">
      <button className="comic-button bg-white text-left hover:bg-paper">Tell me about the features</button>
      <button className="comic-button bg-white text-left hover:bg-paper">I want to report a glitch</button>
      <button className="comic-button bg-white text-left hover:bg-paper">Just looking around</button>
    </div>
  </div>
);

const ProductPanel: PanelComponent = ({ onClose }) => (
  <div className="space-y-6">
    <div className="h-48 bg-comic-purple/20 flex items-center justify-center border-4 border-ink overflow-hidden group">
       <div className="text-6xl group-hover:scale-125 transition-transform">🚀</div>
    </div>
    <h2 className="text-5xl font-display font-black uppercase">The Super Feature</h2>
    <p className="text-xl font-medium text-ink/80">This isn't just a building; it's a visualization of our core product value. Here we demonstrate power, scale, and high-tension character.</p>
    <div className="grid grid-cols-2 gap-4">
      <div className="comic-panel !p-4 bg-comic-yellow/20">
        <p className="font-display font-black text-2xl uppercase">99% uptime</p>
        <p className="text-sm opacity-60">Guaranteed by the spatial gods</p>
      </div>
      <div className="comic-panel !p-4 bg-paper/20">
        <p className="font-display font-black text-2xl uppercase">Zero Latency</p>
        <p className="text-sm opacity-60">Except for character walking</p>
      </div>
    </div>
    <button className="comic-button bg-comic-yellow w-full py-4 text-2xl">Start Free Trial</button>
  </div>
);

const DocsPanel: PanelComponent = ({ onClose }) => (
  <div className="space-y-6">
    <h2 className="text-3xl font-display font-black uppercase italic border-b-4 border-ink pb-4">Documentation Portal</h2>
    <div className="space-y-4">
      <div className="p-4 bg-paper border-2 border-ink">
         <p className="font-bold">Spatial UI 101: The Grid</p>
         <p className="text-sm">Learn how we map 2D coordinates to 3D metaphors using our proprietary AppAdapter pattern.</p>
      </div>
      <div className="p-4 bg-paper border-2 border-ink">
         <p className="font-bold">Character Ergonomics</p>
         <p className="text-sm">Why the camera FOV is 82 degrees and why it matters for immersive conversion.</p>
      </div>
    </div>
    <div className="pt-4">
      <button onClick={onClose} className="comic-button bg-white">Back to World</button>
    </div>
  </div>
);

export const panelRegistry: Record<string, PanelComponent> = {
  'guide-dialog': GuideDialog,
  'support-panel': SupportPanel,
  'product-panel': ProductPanel,
  'docs-panel': DocsPanel,
};

export const registerPanel = (id: string, component: PanelComponent) => {
  panelRegistry[id] = component;
};
