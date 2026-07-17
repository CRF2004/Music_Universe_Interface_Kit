import CurvedWorld from './CurvedWorld';
import MusicReactiveWorld from './MusicReactiveWorld';
import PlayerController from '../player/PlayerController';
import InteractionSystem from '../interaction/InteractionSystem';
import InteractionPoint from '../interaction/InteractionPoint';
import MusicWorldController from '../music/runtime/MusicWorldController';
import { useInteractionStore } from '../state/useInteractionStore';
import { useWorldStore } from '../state/useWorldStore';
import { useEffect } from 'react';
import { demoWorld } from '../content/demoWorld';
import { demoAdapter } from '../adapters/demoAdapter';

export default function WorldScene() {
  const registerInteractions = useInteractionStore((state) => state.registerInteractions);
  const setAdapter = useInteractionStore((state) => state.setAdapter);
  const setActiveWorld = useWorldStore((state) => state.setActiveWorld);
  const interactionsMap = useInteractionStore((state) => state.interactions);
  const interactions = Array.from(interactionsMap.values());

  useEffect(() => {
    registerInteractions(demoWorld.interactions);
    setAdapter(demoAdapter);
    setActiveWorld(demoWorld);
  }, [registerInteractions, setAdapter, setActiveWorld]);

  return (
    <>
      <MusicWorldController />
      <CurvedWorld />
      <MusicReactiveWorld />
      <PlayerController />
      <InteractionSystem />
      {interactions.map((interaction) => (
        <InteractionPoint key={interaction.id} definition={interaction} />
      ))}
    </>
  );
}
