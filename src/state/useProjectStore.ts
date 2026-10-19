import { create } from 'zustand';
import type { MusicAnalysis } from '../music/analysis/musicAnalysis';
import type { MusicTempo } from '../music/analysis/musicTempo';
import { buildWorldProject, type WorldBuildOptions } from '../project/worldBuilder';
import { defaultMusicWorldProject } from '../content/defaultMusicWorldProject';
import { editableEnvironmentKeys, environmentPayloadIssues, type EditableEnvironment } from '../project/environmentEditing';
import {
  exportMusicWorldProject,
  importMusicWorldProject,
  type MusicWorldProject,
} from '../project';
import {
  loadProjectLibrary,
  saveProjectLibrary,
  type StoredProjectDraft,
} from '../project/projectDraftStorage';

export type ProjectDraftStatus = 'loading' | 'ready' | 'saving' | 'error';
export type ProjectDraftEntry = StoredProjectDraft;

type ProjectEdit =
  | { kind: 'tempo'; trackKey: string; before: MusicTempo | undefined; after: MusicTempo | undefined }
  | { kind: 'analysis'; trackKey: string; before: MusicAnalysis | undefined; after: MusicAnalysis }
  | { kind: 'archive'; before: [number, number]; after: [number, number] }
  | { kind: 'environment'; cueId: string; actionIndex: number; before: EditableEnvironment; after: EditableEnvironment }
  | { kind: 'cue'; cueId: string; before: number; after: number };

const emptyEditingState = (): Pick<ProjectState, 'undoStack' | 'redoStack' | 'archivePreview' | 'draggingArchive'> => ({
  undoStack: [],
  redoStack: [],
  archivePreview: null,
  draggingArchive: false,
});

interface ProjectState {
  project: MusicWorldProject;
  drafts: ProjectDraftEntry[];
  activeProjectId: string;
  status: ProjectDraftStatus;
  hydrated: boolean;
  revision: number;
  lastSavedAt: string | null;
  error: string | null;
  undoStack: ProjectEdit[];
  redoStack: ProjectEdit[];
  editorMode: 'panel' | 'drag' | null;
  archivePreview: [number, number] | null;
  draggingArchive: boolean;
  setEditorMode: (mode: 'panel' | 'drag' | null) => void;
  beginArchiveDrag: () => void;
  previewArchivePosition: (x: number, z: number) => void;
  commitArchiveDrag: () => void;
  cancelArchiveDrag: () => void;
  undo: () => void;
  redo: () => void;
  hydrate: () => Promise<void>;
  createProject: () => void;
  createWorld: (options: WorldBuildOptions) => boolean;
  duplicateProject: (projectId?: string) => void;
  renameProject: (projectId: string, title: string) => void;
  openProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  restoreProject: (projectId: string) => void;
  updateArchivePosition: (x: number, z: number) => void;
  updateCuePosition: (cueId: string, position: number) => void;
  updateCueEnvironment: (cueId: string, actionIndex: number, values: EditableEnvironment) => void;
  bindTrack: (projectId: string, track: MusicWorldProject['track']) => boolean;
  updateMusicAnalysis: (projectId: string, trackKey: string, analysis: MusicAnalysis) => boolean;
  updateMusicTempo: (projectId: string, trackKey: string, tempo: MusicTempo | undefined) => boolean;
  importJson: (json: string) => { ok: true } | { ok: false; error: string };
  exportJson: () => string;
  resetToDefault: () => void;
  markSaving: () => void;
  markSaved: (savedAt: string) => void;
  markSaveError: (message: string) => void;
  clearError: () => void;
}

function cloneProject(project: MusicWorldProject): MusicWorldProject {
  return importMusicWorldProject(exportMusicWorldProject(project));
}

export function projectTrackKey(track: MusicWorldProject['track']): string {
  const { analysis: _analysis, tempo: _tempo, ...identity } = track;
  return JSON.stringify(identity);
}

function cloneDefaultProject(): MusicWorldProject {
  return cloneProject(defaultMusicWorldProject);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The project operation failed.';
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'music-world';
}

function uniqueProjectId(base: string, drafts: ProjectDraftEntry[]): string {
  const ids = new Set(drafts.map(({ project }) => project.id));
  if (!ids.has(base)) return base;
  let suffix = 2;
  while (ids.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function changedProject(project: MusicWorldProject): MusicWorldProject {
  const next = cloneProject(project);
  next.metadata.updatedAt = new Date().toISOString();
  return next;
}

function replaceDraftProject(
  drafts: ProjectDraftEntry[],
  project: MusicWorldProject,
): ProjectDraftEntry[] {
  return drafts.map((draft) => draft.project.id === project.id ? { ...draft, project } : draft);
}

function librarySnapshot(state: Pick<ProjectState, 'activeProjectId' | 'drafts'>) {
  return { storageVersion: 2 as const, activeProjectId: state.activeProjectId, drafts: state.drafts };
}

export const useProjectStore = create<ProjectState>((set, get) => {
  const initial = cloneDefaultProject();
  const applyEdit = (edit: ProjectEdit, direction: 'before' | 'after', history: boolean) => {
    const state = get();
    const project = cloneProject(state.project);
    if (edit.kind === 'tempo') {
      if (projectTrackKey(project.track) !== edit.trackKey) return;
      const tempo = edit[direction];
      if (tempo) project.track.tempo = structuredClone(tempo);
      else delete project.track.tempo;
    } else if (edit.kind === 'analysis') {
      if (projectTrackKey(project.track) !== edit.trackKey) return;
      if (edit[direction]) project.track.analysis = structuredClone(edit[direction]);
      else delete project.track.analysis;
    } else if (edit.kind === 'archive') {
      const archive = project.scene.objects.find(({ id }) => id === 'memory-archive');
      if (!archive) return;
      const [x, z] = edit[direction];
      archive.transform.position = [x, archive.transform.position[1], z];
    } else if (edit.kind === 'environment') {
      const action = project.timeline.cues.find(({ id }) => id === edit.cueId)?.actions[edit.actionIndex];
      if (action?.type !== 'set-environment') return;
      for (const key of editableEnvironmentKeys) delete action.payload[key];
      action.payload = { ...action.payload, ...edit[direction] };
    } else {
      const cue = project.timeline.cues.find(({ id }) => id === edit.cueId);
      if (!cue) return;
      cue.position = edit[direction];
    }
    try {
      project.metadata.updatedAt = new Date().toISOString();
      const validated = cloneProject(project);
      set({
        project: validated,
        drafts: replaceDraftProject(state.drafts, validated),
        revision: state.revision + 1,
        status: 'ready', error: null, archivePreview: null, draggingArchive: false,
        undoStack: history ? [...state.undoStack, edit].slice(-100)
          : direction === 'before' ? state.undoStack.slice(0, -1) : [...state.undoStack, edit],
        redoStack: history ? []
          : direction === 'before' ? [...state.redoStack, edit] : state.redoStack.slice(0, -1),
      });
    } catch (error) {
      set({ status: 'error', error: errorMessage(error), archivePreview: null, draggingArchive: false });
    }
  };
  return {
    project: initial,
    drafts: [{ project: initial, deletedAt: null }],
    activeProjectId: initial.id,
    status: 'loading',
    hydrated: false,
    revision: 0,
    lastSavedAt: null,
    error: null,
    ...emptyEditingState(),
    editorMode: null,

    setEditorMode: (editorMode) => set({ editorMode, archivePreview: null, draggingArchive: false }),
    beginArchiveDrag: () => {
      const state = get();
      const archive = state.project.scene.objects.find(({ id }) => id === 'memory-archive');
      if (state.editorMode !== 'drag' || !archive) return;
      set({ draggingArchive: true, archivePreview: [archive.transform.position[0], archive.transform.position[2]] });
    },
    previewArchivePosition: (x, z) => {
      if (!get().draggingArchive || !Number.isFinite(x) || !Number.isFinite(z)) return;
      set({ archivePreview: [x, z] });
    },
    commitArchiveDrag: () => {
      const { archivePreview, draggingArchive } = get();
      if (!draggingArchive || !archivePreview) return;
      set({ archivePreview: null, draggingArchive: false });
      get().updateArchivePosition(...archivePreview);
    },
    cancelArchiveDrag: () => set({ archivePreview: null, draggingArchive: false }),
    undo: () => {
      const state = get();
      if (state.draggingArchive) return;
      const edit = state.undoStack.at(-1);
      if (edit) applyEdit(edit, 'before', false);
    },
    redo: () => {
      const state = get();
      if (state.draggingArchive) return;
      const edit = state.redoStack.at(-1);
      if (edit) applyEdit(edit, 'after', false);
    },

    hydrate: async () => {
      if (get().hydrated) return;
      set({ status: 'loading', error: null });
      try {
        const restored = await loadProjectLibrary();
        if (get().hydrated) return;
        let drafts: ProjectDraftEntry[];
        let activeProjectId: string;
        let createdAt: string | null = null;
        if (restored) {
          drafts = restored.drafts;
          activeProjectId = restored.activeProjectId;
        } else {
          const project = cloneDefaultProject();
          drafts = [{ project, deletedAt: null }];
          activeProjectId = project.id;
          createdAt = new Date().toISOString();
          await saveProjectLibrary({ storageVersion: 2, activeProjectId, drafts });
        }
        const project = drafts.find((draft) => draft.project.id === activeProjectId)?.project;
        if (!project) throw new Error('The saved project library has no active project.');
        if (get().hydrated) return;
        set({ project, drafts, activeProjectId, status: 'ready', hydrated: true, revision: 0, lastSavedAt: createdAt, error: null, ...emptyEditingState() });
      } catch (error) {
        if (get().hydrated) return;
        set({
          status: 'error',
          hydrated: true,
          revision: 0,
          error: `Saved drafts could not be restored. The default project is still available. ${errorMessage(error)}`,
        });
      }
    },

    createWorld: (options) => {
      try {
        const state = get();
        const project = buildWorldProject(options);
        project.id = uniqueProjectId('memory-world', state.drafts);
        project.metadata.createdAt = project.metadata.updatedAt = new Date().toISOString();
        set({ project, activeProjectId: project.id, ...emptyEditingState(), drafts: [...state.drafts, { project, deletedAt: null }], revision: state.revision + 1, status: 'ready', error: null });
        return true;
      } catch (error) {
        set({ error: errorMessage(error), status: 'error' });
        return false;
      }
    },

    createProject: () => set((state) => {
      const project = cloneDefaultProject();
      project.id = uniqueProjectId('untitled-memory-journey', state.drafts);
      project.metadata.title = 'Untitled Memory Journey';
      const now = new Date().toISOString();
      project.metadata.createdAt = now;
      project.metadata.updatedAt = now;
      return {
        project,
        activeProjectId: project.id,
        ...emptyEditingState(),
        drafts: [...state.drafts, { project, deletedAt: null }],
        revision: state.revision + 1,
        status: 'ready',
        error: null,
      };
    }),

    duplicateProject: (projectId) => set((state) => {
      const sourceId = projectId ?? state.activeProjectId;
      const source = state.drafts.find((draft) => draft.project.id === sourceId && draft.deletedAt === null);
      if (!source) return { status: 'error', error: 'The project to duplicate is not available.' };
      const project = cloneProject(source.project);
      project.id = uniqueProjectId(`${source.project.id}-copy`, state.drafts);
      project.metadata.title = `${source.project.metadata.title} Copy`;
      const now = new Date().toISOString();
      project.metadata.createdAt = now;
      project.metadata.updatedAt = now;
      return {
        project,
        activeProjectId: project.id,
        ...emptyEditingState(),
        drafts: [...state.drafts, { project, deletedAt: null }],
        revision: state.revision + 1,
        status: 'ready',
        error: null,
      };
    }),

    renameProject: (projectId, title) => {
      const trimmed = title.trim();
      if (!trimmed) {
        set({ status: 'error', error: 'Project name cannot be empty.' });
        return;
      }
      set((state) => {
        const draft = state.drafts.find((item) => item.project.id === projectId && item.deletedAt === null);
        if (!draft) return { status: 'error', error: 'The project to rename is not available.' };
        const project = changedProject(draft.project);
        project.metadata.title = trimmed;
        return {
          project: state.activeProjectId === projectId ? project : state.project,
          drafts: replaceDraftProject(state.drafts, project),
          revision: state.revision + 1,
          status: 'ready',
          error: null,
        };
      });
    },

    openProject: (projectId) => set((state) => {
      const draft = state.drafts.find((item) => item.project.id === projectId && item.deletedAt === null);
      if (!draft) return { status: 'error', error: 'The project to open is not available.' };
      return {
        project: draft.project,
        activeProjectId: projectId,
        ...emptyEditingState(),
        revision: state.revision + 1,
        status: 'ready',
        error: null,
      };
    }),

    deleteProject: (projectId) => set((state) => {
      const target = state.drafts.find((item) => item.project.id === projectId && item.deletedAt === null);
      if (!target) return { status: 'error', error: 'The project to delete is not available.' };
      let drafts = state.drafts.map((draft) => draft.project.id === projectId
        ? { ...draft, deletedAt: new Date().toISOString() }
        : draft);
      let project = state.project;
      let activeProjectId = state.activeProjectId;
      if (projectId === state.activeProjectId) {
        const fallback = drafts.find((draft) => draft.deletedAt === null);
        if (fallback) {
          project = fallback.project;
          activeProjectId = fallback.project.id;
        } else {
          project = cloneDefaultProject();
          project.id = uniqueProjectId('untitled-memory-journey', drafts);
          project.metadata.title = 'Untitled Memory Journey';
          drafts = [...drafts, { project, deletedAt: null }];
          activeProjectId = project.id;
        }
      }
      return { project, activeProjectId, drafts, revision: state.revision + 1, status: 'ready', error: null,
        ...(projectId === state.activeProjectId ? emptyEditingState() : {}) };
    }),

    restoreProject: (projectId) => set((state) => {
      const target = state.drafts.find((item) => item.project.id === projectId && item.deletedAt !== null);
      if (!target) return { status: 'error', error: 'The deleted project is not available to restore.' };
      return {
        drafts: state.drafts.map((draft) => draft.project.id === projectId ? { ...draft, deletedAt: null } : draft),
        revision: state.revision + 1,
        status: 'ready',
        error: null,
      };
    }),

    updateArchivePosition: (x, z) => {
      if (!Number.isFinite(x) || !Number.isFinite(z)) {
        set({ status: 'error', error: 'Archive coordinates must be finite numbers.' });
        return;
      }
      const archive = get().project.scene.objects.find(({ id }) => id === 'memory-archive');
      if (!archive) {
        set({ status: 'error', error: 'The active project has no Memory Archive to edit.' });
        return;
      }
      if (x === archive.transform.position[0] && z === archive.transform.position[2]) return;
      applyEdit({ kind: 'archive', before: [archive.transform.position[0], archive.transform.position[2]], after: [x, z] }, 'after', true);
    },

    updateCuePosition: (cueId, position) => {
      if (!Number.isFinite(position) || position < 0 || position > 1) {
        set({ status: 'error', error: 'Cue position must be between 0 and 1.' });
        return;
      }
      const cue = get().project.timeline.cues.find(({ id }) => id === cueId);
      if (!cue) {
        set({ status: 'error', error: 'The selected timeline cue is not available.' });
        return;
      }
      if (cue.position === position) return;
      applyEdit({ kind: 'cue', cueId, before: cue.position, after: position }, 'after', true);
    },

    updateCueEnvironment: (cueId, actionIndex, values) => {
      const action = get().project.timeline.cues.find(({ id }) => id === cueId)?.actions[actionIndex];
      if (!Number.isInteger(actionIndex) || action?.type !== 'set-environment') {
        set({ status: 'error', error: 'The selected environment action is not available.' });
        return;
      }
      if (Object.keys(values).some((key) => !editableEnvironmentKeys.some((allowed) => allowed === key))) {
        set({ status: 'error', error: 'Only sky, ground, rain and bloom can be edited here.' });
        return;
      }
      const issues = environmentPayloadIssues(values);
      if (issues.length) {
        set({ status: 'error', error: issues.map(({ field, message }) => `${field} ${message}`).join('; ') });
        return;
      }
      const before: EditableEnvironment = {};
      if (action.payload.skyColor !== undefined) before.skyColor = action.payload.skyColor;
      if (action.payload.groundColor !== undefined) before.groundColor = action.payload.groundColor;
      if (action.payload.rainIntensity !== undefined) before.rainIntensity = action.payload.rainIntensity;
      if (action.payload.bloomIntensity !== undefined) before.bloomIntensity = action.payload.bloomIntensity;
      if (editableEnvironmentKeys.every((key) => before[key] === values[key])) return;
      applyEdit({ kind: 'environment', cueId, actionIndex, before, after: { ...values } }, 'after', true);
    },

    bindTrack: (projectId, track) => {
      const state = get();
      if (state.activeProjectId !== projectId || !state.hydrated) return false;
      try {
        const project = changedProject(state.project);
        project.track = structuredClone(track);
        const validated = cloneProject(project);
        const keepHistory = (edit: ProjectEdit) => edit.kind !== 'analysis' && edit.kind !== 'tempo';
        set({ project: validated, drafts: replaceDraftProject(state.drafts, validated), revision: state.revision + 1, status: 'ready', error: null, undoStack: state.undoStack.filter(keepHistory), redoStack: state.redoStack.filter(keepHistory) });
        return true;
      } catch (error) {
        set({ status: 'error', error: errorMessage(error) });
        return false;
      }
    },

    updateMusicTempo: (projectId, trackKey, tempo) => {
      const state = get();
      if (state.activeProjectId !== projectId || projectTrackKey(state.project.track) !== trackKey) return false;
      if (JSON.stringify(state.project.track.tempo) === JSON.stringify(tempo)) return true;
      applyEdit({ kind: 'tempo', trackKey, before: state.project.track.tempo, after: tempo ? structuredClone(tempo) : undefined }, 'after', true);
      return get().project !== state.project;
    },

    updateMusicAnalysis: (projectId, trackKey, analysis) => {
      const state = get();
      if (state.activeProjectId !== projectId || projectTrackKey(state.project.track) !== trackKey) return false;
      if (JSON.stringify(state.project.track.analysis) === JSON.stringify(analysis)) return true;
      applyEdit({ kind: 'analysis', trackKey, before: state.project.track.analysis, after: structuredClone(analysis) }, 'after', true);
      return get().project !== state.project;
    },

    importJson: (json) => {
      try {
        const imported = importMusicWorldProject(json);
        set((state) => {
          const project = cloneProject(imported);
          project.id = uniqueProjectId(project.id, state.drafts);
          project.metadata.updatedAt = new Date().toISOString();
          return {
            project,
            activeProjectId: project.id,
            ...emptyEditingState(),
            drafts: [...state.drafts, { project, deletedAt: null }],
            revision: state.revision + 1,
            status: 'ready',
            error: null,
          };
        });
        return { ok: true };
      } catch (error) {
        const message = errorMessage(error);
        set({ status: 'error', error: message });
        return { ok: false, error: message };
      }
    },

    exportJson: () => exportMusicWorldProject(get().project),

    resetToDefault: () => set((state) => {
      const project = cloneDefaultProject();
      project.id = state.activeProjectId;
      return { project, drafts: replaceDraftProject(state.drafts, project), revision: state.revision + 1, status: 'ready', error: null, ...emptyEditingState() };
    }),

    markSaving: () => set({ status: 'saving', error: null }),
    markSaved: (lastSavedAt) => set({ status: 'ready', lastSavedAt, error: null }),
    markSaveError: (error) => set({ status: 'error', error }),
    clearError: () => set((state) => ({ status: state.hydrated ? 'ready' : state.status, error: null })),
  };
});

export function getProjectLibrarySnapshot() {
  return librarySnapshot(useProjectStore.getState());
}
