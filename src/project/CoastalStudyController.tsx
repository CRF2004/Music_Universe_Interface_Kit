import { useEffect, useRef } from 'react';
import { useProjectStore } from '../state/useProjectStore';
import { useWorldStore } from '../state/useWorldStore';
import { createCoastalStudy, createChildhoodAudition, refineCoastalCast } from './coastalStudy';
import { CHILDHOOD_ASSET_ID } from './childhoodScore';
import { createWindGarden } from './windGarden';
import { exportMusicWorldProject } from './musicWorldProjectIO';

// Explicit study URL creates an independent draft through the ordinary importer.
// Refresh preserves that draft; no active user's project is overwritten.
export default function CoastalStudyController() {
  const hydrated = useProjectStore(state => state.hydrated);
  const initialized = useRef(false);
  useEffect(() => {
    if (!hydrated || initialized.current || new URLSearchParams(location.search).get('study') !== 'coastal') return;
    initialized.current = true;
    const store = useProjectStore.getState();
    if (new URLSearchParams(location.search).get('play') === 'wind-v1') {
      if (!store.project.scene.windGarden) store.importJson(exportMusicWorldProject(createWindGarden()));
      useWorldStore.getState().setHelpOpen(false);
      return;
    }
    if (store.project.scene.windGarden) store.importJson(exportMusicWorldProject(createCoastalStudy()));
    else if (store.project.scene.environment.look !== 'coastal-garden-v1') store.importJson(exportMusicWorldProject(createCoastalStudy()));
    else {
      let refined = refineCoastalCast(store.project);
      if (new URLSearchParams(location.search).get('score') === 'childhood-v1' && store.project.track.assetId !== CHILDHOOD_ASSET_ID) refined = createChildhoodAudition(refined ?? store.project);
      if (refined) store.importJson(exportMusicWorldProject(refined));
    }
    useWorldStore.getState().setHelpOpen(false);
  }, [hydrated]);
  return null;
}
