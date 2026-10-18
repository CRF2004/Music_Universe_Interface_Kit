import { Copy, Download, FilePenLine, FolderOpen, Plus, RotateCcw, Trash2, Upload, X, Undo2, Redo2, Move } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../state/useProjectStore';
import CueEnvironmentEditor from './CueEnvironmentEditor';
import MusicAnalysisEditor from './MusicAnalysisEditor';

function downloadProject(json: string, projectId: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectId}.musicworld.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ProjectEditorPanel() {
  const editorMode = useProjectStore((state) => state.editorMode);
  const setEditorMode = useProjectStore((state) => state.setEditorMode);
  const open = editorMode === 'panel';
  const setOpen = (value: boolean) => setEditorMode(value ? 'panel' : null);
  const undo = useProjectStore((state) => state.undo);
  const redo = useProjectStore((state) => state.redo);
  const undoCount = useProjectStore((state) => state.undoStack.length);
  const redoCount = useProjectStore((state) => state.redoStack.length);
  const dragging = useProjectStore((state) => state.draggingArchive);
  const preview = useProjectStore((state) => state.archivePreview);
  const project = useProjectStore((state) => state.project);
  const drafts = useProjectStore((state) => state.drafts);
  const activeProjectId = useProjectStore((state) => state.activeProjectId);
  const status = useProjectStore((state) => state.status);
  const error = useProjectStore((state) => state.error);
  const lastSavedAt = useProjectStore((state) => state.lastSavedAt);
  const updateArchivePosition = useProjectStore((state) => state.updateArchivePosition);
  const updateCuePosition = useProjectStore((state) => state.updateCuePosition);
  const createProject = useProjectStore((state) => state.createProject);
  const duplicateProject = useProjectStore((state) => state.duplicateProject);
  const renameProject = useProjectStore((state) => state.renameProject);
  const openProject = useProjectStore((state) => state.openProject);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const restoreProject = useProjectStore((state) => state.restoreProject);
  const importJson = useProjectStore((state) => state.importJson);
  const exportJson = useProjectStore((state) => state.exportJson);
  const clearError = useProjectStore((state) => state.clearError);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const archive = project.scene.objects.find(({ id }) => id === 'memory-archive');
  const [x, setX] = useState(String(archive?.transform.position[0] ?? 0));
  const [z, setZ] = useState(String(archive?.transform.position[2] ?? 0));
  const [projectName, setProjectName] = useState(project.metadata.title);
  const [cueId, setCueId] = useState(project.timeline.cues[0]?.id ?? '');
  const selectedCue = project.timeline.cues.find((cue) => cue.id === cueId) ?? project.timeline.cues[0];
  const [cuePosition, setCuePosition] = useState(String(selectedCue?.position ?? 0));
  const activeDrafts = drafts.filter(({ deletedAt }) => deletedAt === null);
  const deletedDrafts = drafts.filter(({ deletedAt }) => deletedAt !== null);

  useEffect(() => {
    if (!editorMode) return;
    if (document.pointerLockElement) document.exitPointerLock();
    const focusTimeout = editorMode === 'drag' ? window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>('[aria-label="Finish Archive dragging"]')?.focus();
    }) : null;
    const cancel = () => useProjectStore.getState().cancelArchiveDrag();
    const visibility = () => { if (document.hidden) cancel(); };
    const keyboard = (event: KeyboardEvent) => {
      const state = useProjectStore.getState();
      if (event.key === 'Escape' && state.editorMode === 'drag') {
        event.preventDefault();
        if (state.draggingArchive) state.cancelArchiveDrag();
        else state.setEditorMode('panel');
        return;
      }
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'z' || key === 'y') {
        event.preventDefault();
        if (key === 'y' || event.shiftKey) state.redo();
        else state.undo();
      }
    };
    window.addEventListener('keydown', keyboard);
    window.addEventListener('blur', cancel);
    window.addEventListener('pointercancel', cancel);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      if (focusTimeout !== null) window.clearTimeout(focusTimeout);
      window.removeEventListener('keydown', keyboard);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('pointercancel', cancel);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [editorMode]);

  useEffect(() => {
    setX(String(archive?.transform.position[0] ?? 0));
    setZ(String(archive?.transform.position[2] ?? 0));
  }, [archive?.transform.position]);

  useEffect(() => {
    setProjectName(project.metadata.title);
    if (!project.timeline.cues.some((cue) => cue.id === cueId)) {
      setCueId(project.timeline.cues[0]?.id ?? '');
    }
  }, [activeProjectId, cueId, project]);

  useEffect(() => {
    setCuePosition(String(selectedCue?.position ?? 0));
  }, [selectedCue?.id, selectedCue?.position]);

  useEffect(() => {
    if (!open) return undefined;
    if (document.pointerLockElement) document.exitPointerLock();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, [href], [tabindex]:not([tabindex="-1"])',
      ));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    const focusTimeout = window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>('button, input')?.focus());
    return () => {
      window.clearTimeout(focusTimeout);
      window.removeEventListener('keydown', onKeyDown);
      triggerRef.current?.focus();
    };
  }, [open]);

  const savePosition = () => {
    if (!x.trim() || !z.trim()) {
      useProjectStore.getState().markSaveError('Enter both Archive coordinates.');
      return;
    }
    const nextX = Number(x);
    const nextZ = Number(z);
    if (!Number.isFinite(nextX) || !Number.isFinite(nextZ)) return;
    updateArchivePosition(nextX, nextZ);
  };

  return (
    <>
      <button
        ref={triggerRef}
        aria-label="Open project editor"
        className="comic-button bg-paper p-2"
        onClick={() => {
          clearError();
          setOpen(true);
        }}
      >
        <FilePenLine size={20} />
      </button>

      {editorMode === 'drag' && (
        <section aria-label="Archive drag editor" className="comic-panel fixed right-4 bottom-4 z-[100] max-h-[calc(100vh-10rem)] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto bg-paper pointer-events-auto">
          <h2 className="font-display font-bold">Move Memory Archive</h2>
          <p className="mt-2 text-sm">Drag the red or blue arrow. Release to save. Escape cancels the current drag.</p>
          <p aria-live="polite" className="mt-2 font-mono text-sm">X {(preview?.[0] ?? Number(x)).toFixed(2)} · Z {(preview?.[1] ?? Number(z)).toFixed(2)}</p>
          <div className="mt-3 flex gap-2">
            <button aria-label="Undo project edit" disabled={!undoCount || dragging} className="comic-button disabled:opacity-40" onClick={undo}><Undo2 size={16} /> Undo</button>
            <button aria-label="Redo project edit" disabled={!redoCount || dragging} className="comic-button disabled:opacity-40" onClick={redo}><Redo2 size={16} /> Redo</button>
          </div>
          <button aria-label="Finish Archive dragging" className="comic-button mt-3 w-full bg-comic-purple text-white" onClick={() => setEditorMode('panel')}>Done / Enter coordinates</button>
          {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        </section>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/70 p-4 pointer-events-auto">
          <div
            ref={dialogRef}
            aria-labelledby="project-editor-title"
            aria-modal="true"
            className="comic-panel max-h-[90vh] w-full max-w-xl overflow-y-auto"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-comic-purple">Phase 2 draft</p>
                <h2 id="project-editor-title" className="mt-1 font-display text-2xl font-black">Edit Memory Journey</h2>
                <p className="mt-1 text-sm text-ink/65">{project.metadata.title} · schema v{project.schemaVersion}</p>
              </div>
              <button aria-label="Close project editor" className="comic-button bg-white p-2" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 flex gap-3">
              <button aria-label="Undo project edit" disabled={!undoCount} className="comic-button flex items-center gap-2 disabled:opacity-40" onClick={undo}><Undo2 size={17} /> Undo</button>
              <button aria-label="Redo project edit" disabled={!redoCount} className="comic-button flex items-center gap-2 disabled:opacity-40" onClick={redo}><Redo2 size={17} /> Redo</button>
              <span className="self-center text-xs text-ink/65">Ctrl/Cmd + Z · Shift + Z</span>
            </div>

            <section className="mt-6 border-t-2 border-ink/15 pt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold">Local project library</h3>
                  <p className="mt-1 text-sm text-ink/65">Open projects or recover drafts from the trash.</p>
                </div>
                <button aria-label="Create project" className="comic-button flex items-center gap-2 bg-comic-green" onClick={createProject}>
                  <Plus size={17} /> New
                </button>
              </div>
              <ul aria-label="Active project drafts" className="mt-4 grid gap-2">
                {activeDrafts.map((draft) => {
                  const active = draft.project.id === activeProjectId;
                  return (
                    <li key={draft.project.id} className={`flex items-center gap-2 border-2 p-2 ${active ? 'border-comic-purple bg-purple-50' : 'border-ink/20'}`}>
                      <button
                        aria-label={`Open project ${draft.project.metadata.title}`}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left font-bold"
                        disabled={active}
                        onClick={() => openProject(draft.project.id)}
                      >
                        <FolderOpen size={17} />
                        <span className="truncate">{draft.project.metadata.title}</span>
                        {active && <span className="text-[10px] uppercase text-comic-purple">Active</span>}
                      </button>
                      <button aria-label={`Duplicate project ${draft.project.metadata.title}`} className="comic-button p-1.5" onClick={() => duplicateProject(draft.project.id)}><Copy size={15} /></button>
                      <button aria-label={`Delete project ${draft.project.metadata.title}`} className="comic-button p-1.5" onClick={() => deleteProject(draft.project.id)}><Trash2 size={15} /></button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex gap-2">
                <input
                  aria-label="Active project name"
                  className="min-w-0 flex-1 border-2 border-ink px-3 py-2"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                />
                <button className="comic-button bg-white" onClick={() => renameProject(activeProjectId, projectName)}>Rename</button>
              </div>
              {deletedDrafts.length > 0 && (
                <details className="mt-4 rounded-lg bg-ink/5 p-3">
                  <summary className="cursor-pointer font-bold">Trash ({deletedDrafts.length})</summary>
                  <ul className="mt-2 grid gap-2">
                    {deletedDrafts.map((draft) => (
                      <li key={draft.project.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{draft.project.metadata.title}</span>
                        <button aria-label={`Restore project ${draft.project.metadata.title}`} className="comic-button flex items-center gap-1 bg-white px-2 py-1" onClick={() => restoreProject(draft.project.id)}>
                          <RotateCcw size={14} /> Restore
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>

            <section className="mt-6 border-t-2 border-ink/15 pt-5">
              <h3 className="font-display text-lg font-bold">Memory Archive position</h3>
              <p className="mt-1 text-sm text-ink/65">X/Z measure distance along the planet surface. The Archive stays grounded as you move it.</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <label className="text-sm font-bold">
                  X coordinate
                  <input
                    aria-label="Memory Archive X coordinate"
                    className="mt-1 w-full border-2 border-ink bg-white px-3 py-2 font-mono"
                    inputMode="decimal"
                    type="number"
                    value={x}
                    onChange={(event) => setX(event.target.value)}
                  />
                </label>
                <label className="text-sm font-bold">
                  Z coordinate
                  <input
                    aria-label="Memory Archive Z coordinate"
                    className="mt-1 w-full border-2 border-ink bg-white px-3 py-2 font-mono"
                    inputMode="decimal"
                    type="number"
                    value={z}
                    onChange={(event) => setZ(event.target.value)}
                  />
                </label>
              </div>
              <button className="comic-button mt-4 w-full bg-comic-purple text-white" onClick={savePosition}>
                Apply position
              </button>
              <button aria-label="Drag Memory Archive in world" disabled={!archive} className="comic-button mt-3 flex w-full items-center justify-center gap-2 bg-white" onClick={() => setEditorMode('drag')}>
                <Move size={17} /> Drag in world
              </button>
            </section>

            <section className="mt-6 border-t-2 border-ink/15 pt-5">
              <h3 className="font-display text-lg font-bold">Timeline cue position</h3>
              <p className="mt-1 text-sm text-ink/65">Move one existing cue along normalized music time (0=start, 1=end).</p>
              <label className="mt-4 block text-sm font-bold">
                Cue
                <select
                  aria-label="Timeline cue"
                  className="mt-1 w-full border-2 border-ink bg-white px-3 py-2"
                  value={selectedCue?.id ?? ''}
                  onChange={(event) => setCueId(event.target.value)}
                >
                  {project.timeline.cues.map((cue) => <option key={cue.id} value={cue.id}>{cue.label ?? cue.id}</option>)}
                </select>
              </label>
              <div className="mt-3 grid grid-cols-[1fr_6rem] gap-3">
                <input
                  aria-label="Timeline cue normalized position slider"
                  max="1"
                  min="0"
                  step="0.01"
                  type="range"
                  value={cuePosition}
                  onChange={(event) => setCuePosition(event.target.value)}
                />
                <input
                  aria-label="Timeline cue normalized position"
                  className="border-2 border-ink px-3 py-2 font-mono"
                  max="1"
                  min="0"
                  step="0.01"
                  type="number"
                  value={cuePosition}
                  onChange={(event) => setCuePosition(event.target.value)}
                />
              </div>
              <button
                className="comic-button mt-3 w-full bg-comic-blue text-white"
                onClick={() => {
                  if (!cuePosition.trim()) useProjectStore.getState().markSaveError('Enter a cue position between 0 and 1.');
                  else if (selectedCue) updateCuePosition(selectedCue.id, Number(cuePosition));
                }}
              >
                Apply cue position
              </button>
              {selectedCue && <CueEnvironmentEditor key={`${activeProjectId}:${selectedCue.id}`} cue={selectedCue} />}
            </section>

            <MusicAnalysisEditor key={activeProjectId} cueId={selectedCue?.id ?? ''} />

            <section className="mt-6 border-t-2 border-ink/15 pt-5">
              <h3 className="font-display text-lg font-bold">Project file</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button className="comic-button flex items-center justify-center gap-2 bg-comic-green" onClick={() => downloadProject(exportJson(), project.id)}>
                  <Download size={18} /> Export project
                </button>
                <label className="comic-button flex cursor-pointer items-center justify-center gap-2 bg-comic-yellow">
                  <Upload size={18} /> Import project
                  <input
                    accept=".json,.musicworld.json,application/json"
                    aria-label="Import MusicWorldProject"
                    className="sr-only"
                    type="file"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      void file.text().then((json) => importJson(json));
                      event.target.value = '';
                    }}
                  />
                </label>
              </div>
            </section>

            <div aria-atomic="true" aria-label="Project draft status" aria-live="polite" className="mt-5 rounded-lg bg-ink/5 p-3 text-sm">
              {status === 'loading' && 'Opening local draft…'}
              {status === 'saving' && 'Saving local draft…'}
              {status === 'ready' && (lastSavedAt ? `Draft saved locally at ${new Date(lastSavedAt).toLocaleTimeString()}.` : 'Draft ready. Changes save automatically.')}
              {status === 'error' && <span className="font-bold text-red-700">{error}</span>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
