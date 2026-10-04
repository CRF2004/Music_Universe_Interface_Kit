import { useEffect } from 'react';
import { getProjectLibrarySnapshot, useProjectStore } from '../state/useProjectStore';
import { saveProjectLibrary } from './projectDraftStorage';

export default function ProjectDraftController() {
  const hydrate = useProjectStore((state) => state.hydrate);
  const hydrated = useProjectStore((state) => state.hydrated);
  const revision = useProjectStore((state) => state.revision);
  const markSaving = useProjectStore((state) => state.markSaving);
  const markSaved = useProjectStore((state) => state.markSaved);
  const markSaveError = useProjectStore((state) => state.markSaveError);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated || revision === 0) return undefined;
    const timeout = window.setTimeout(() => {
      markSaving();
      void saveProjectLibrary(getProjectLibrarySnapshot())
        .then(() => markSaved(new Date().toISOString()))
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'Local draft save failed.';
          markSaveError(message);
        });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [hydrated, markSaveError, markSaved, markSaving, revision]);

  return null;
}
