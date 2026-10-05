import type { MusicWorldProject } from './musicWorldProject';
import { exportMusicWorldProject, importMusicWorldProject } from './musicWorldProjectIO';

const DATABASE_NAME = 'music-universe-projects';
const DATABASE_VERSION = 1;
const STORE_NAME = 'drafts';
const LEGACY_ACTIVE_DRAFT_KEY = 'active';
const PROJECT_LIBRARY_KEY = 'project-library-v2';

export interface StoredProjectDraft {
  project: MusicWorldProject;
  deletedAt: string | null;
}

export interface StoredProjectLibrary {
  storageVersion: 2;
  activeProjectId: string;
  drafts: StoredProjectDraft[];
}

interface SerializedProjectDraft {
  projectJson: string;
  deletedAt: string | null;
}

interface SerializedProjectLibrary {
  storageVersion: 2;
  activeProjectId: string;
  drafts: SerializedProjectDraft[];
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open the local project database.'));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = run(transaction.objectStore(STORE_NAME));
      let result: T;
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error ?? new Error('Local project storage failed.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Local project storage was interrupted.'));
      transaction.oncomplete = () => resolve(result);
    });
  } finally {
    database.close();
  }
}

function serializeLibrary(library: StoredProjectLibrary): string {
  const serialized: SerializedProjectLibrary = {
    storageVersion: 2,
    activeProjectId: library.activeProjectId,
    drafts: library.drafts.map(({ project, deletedAt }) => ({
      projectJson: exportMusicWorldProject(project),
      deletedAt,
    })),
  };
  return JSON.stringify(serialized);
}

function parseLibrary(json: string): StoredProjectLibrary {
  const input: unknown = JSON.parse(json);
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('Saved project library must be an object.');
  }
  const record = input as Record<string, unknown>;
  if (record.storageVersion !== 2 || typeof record.activeProjectId !== 'string' || !Array.isArray(record.drafts)) {
    throw new Error('Saved project library has an unsupported storage version or shape.');
  }
  const activeProjectId = record.activeProjectId;
  const drafts = record.drafts.map((draft, index): StoredProjectDraft => {
    if (typeof draft !== 'object' || draft === null || Array.isArray(draft)) {
      throw new Error(`Saved project library draft ${index} must be an object.`);
    }
    const value = draft as Record<string, unknown>;
    if (typeof value.projectJson !== 'string' || (value.deletedAt !== null && typeof value.deletedAt !== 'string')) {
      throw new Error(`Saved project library draft ${index} is invalid.`);
    }
    const projectJson = value.projectJson;
    const deletedAt = value.deletedAt as string | null;
    return { project: importMusicWorldProject(projectJson), deletedAt };
  });
  const ids = new Set(drafts.map(({ project }) => project.id));
  const activeDraft = drafts.find(({ project }) => project.id === activeProjectId);
  if (drafts.length === 0 || ids.size !== drafts.length || !activeDraft || activeDraft.deletedAt !== null) {
    throw new Error('Saved project library must contain unique drafts and a non-deleted active project.');
  }
  return { storageVersion: 2, activeProjectId, drafts };
}

export async function loadProjectLibrary(): Promise<StoredProjectLibrary | null> {
  const json = await withStore<string | undefined>('readonly', (store) => store.get(PROJECT_LIBRARY_KEY));
  if (json !== undefined) return parseLibrary(json);

  const legacyJson = await withStore<string | undefined>('readonly', (store) => store.get(LEGACY_ACTIVE_DRAFT_KEY));
  if (legacyJson === undefined) return null;
  const project = importMusicWorldProject(legacyJson);
  const migrated: StoredProjectLibrary = {
    storageVersion: 2,
    activeProjectId: project.id,
    drafts: [{ project, deletedAt: null }],
  };
  await saveProjectLibrary(migrated);
  return migrated;
}

export async function saveProjectLibrary(library: StoredProjectLibrary): Promise<void> {
  await withStore<IDBValidKey>('readwrite', (store) =>
    store.put(serializeLibrary(library), PROJECT_LIBRARY_KEY));
}
