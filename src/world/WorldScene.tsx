import CurvedWorld from './CurvedWorld';
import MusicReactiveWorld from './MusicReactiveWorld';
import MusicEnvironmentController from './MusicEnvironmentController';
import PlayerController from '../player/PlayerController';
import InteractionSystem from '../interaction/InteractionSystem';
import InteractionPoint from '../interaction/InteractionPoint';
import { useInteractionStore } from '../state/useInteractionStore';
import { useWorldStore } from '../state/useWorldStore';
import { useEffect, useMemo } from 'react';
import { compileSpatialScene } from '../schema';
import { demoAdapter } from '../adapters/demoAdapter';
import AudioWorld from '../audio/AudioWorld';
import WorldPerformanceProbe from '../performance/WorldPerformanceProbe';
import JourneyWorldGuide from './JourneyWorldGuide';
import WorldInspectionProbe from '../runtime/WorldInspectionProbe';
import { useProjectStore } from '../state/useProjectStore';
import ArchiveDragControls from './ArchiveDragControls';
import WindGardenWorld from './WindGardenWorld';

export default function WorldScene() {
  const replaceInteractions = useInteractionStore((state) => state.replaceInteractions);
  const setAdapter = useInteractionStore((state) => state.setAdapter);
  const setActiveWorld = useWorldStore((state) => state.setActiveWorld);
  const interactionsMap = useInteractionStore((state) => state.interactions);
  const interactions = Array.from(interactionsMap.values());
  const project = useProjectStore((state) => state.project);
  const projectRevision = useProjectStore((state) => state.revision);
  const editorMode = useProjectStore((state) => state.editorMode);
  const world = useMemo(() => compileSpatialScene(project.scene), [project]);

  useEffect(() => {
    replaceInteractions(world.interactions);
    setAdapter(demoAdapter);
    setActiveWorld(world);
    useInteractionStore.getState().resetInteractionRuntime('world-replaced');
  }, [projectRevision, replaceInteractions, setAdapter, setActiveWorld, world]);

  return (
    <>
      <CurvedWorld />
      <MusicEnvironmentController />
      {project.scene.windGarden ? <WindGardenWorld /> : <MusicReactiveWorld />}
      <AudioWorld />
      <WorldPerformanceProbe />
      <WorldInspectionProbe />
      <PlayerController />
      <InteractionSystem />
      {!project.scene.windGarden && <JourneyWorldGuide />}
      {editorMode === 'drag' && <ArchiveDragControls />}
      {interactions.map((interaction) => (
        <InteractionPoint
          key={`${project.id}:${interaction.id}:${interaction.visual.assetId ?? ''}:${interaction.position.join(',')}:${interaction.rotation?.join(',') ?? ''}:${interaction.scale?.join(',') ?? ''}`}
          definition={interaction}
        />
      ))}
    </>
  );
}
