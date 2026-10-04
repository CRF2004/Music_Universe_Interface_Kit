import { validateSpatialScene } from '../schema';
import { environmentPayloadIssues } from './environmentEditing';
import {
  MUSIC_WORLD_PROJECT_SCHEMA_VERSION,
  type MusicWorldProject,
} from './musicWorldProject';

export interface MusicWorldProjectValidationIssue {
  path: string;
  message: string;
}

export interface MusicWorldProjectValidationResult {
  valid: boolean;
  issues: MusicWorldProjectValidationIssue[];
}

export class MusicWorldProjectValidationError extends Error {
  readonly issues: MusicWorldProjectValidationIssue[];

  constructor(issues: MusicWorldProjectValidationIssue[]) {
    super(`Invalid MusicWorldProject: ${issues.map(({ path, message }) => `${path} ${message}`).join('; ')}`);
    this.name = 'MusicWorldProjectValidationError';
    this.issues = issues;
  }
}

const ACTION_TYPES = new Set([
  'set-environment',
  'set-camera',
  'show-narration',
  'set-portal',
  'set-landmark',
]);
const ASSET_TYPES = new Set(['model', 'texture', 'audio']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function requireString(value: unknown, path: string, issues: MusicWorldProjectValidationIssue[]) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push({ path, message: 'must be a non-empty string' });
  }
}

function requireStringArray(value: unknown, path: string, issues: MusicWorldProjectValidationIssue[]) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.trim().length === 0)) {
    issues.push({ path, message: 'must be an array of non-empty strings' });
  }
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  issues: MusicWorldProjectValidationIssue[],
) {
  const allowedKeys = new Set(allowed);
  Object.keys(value).forEach((key) => {
    if (!allowedKeys.has(key)) issues.push({ path: `${path}.${key}`, message: 'is not supported' });
  });
}

export function validateMusicWorldProject(input: unknown): MusicWorldProjectValidationResult {
  const issues: MusicWorldProjectValidationIssue[] = [];
  if (!isRecord(input)) {
    return { valid: false, issues: [{ path: '$', message: 'must be an object' }] };
  }
  rejectUnknownKeys(input, ['schemaVersion', 'id', 'metadata', 'track', 'worldBible', 'timeline', 'scene', 'assets', 'presentation', 'extensions'], '$', issues);

  if (input.schemaVersion !== MUSIC_WORLD_PROJECT_SCHEMA_VERSION) {
    issues.push({ path: '$.schemaVersion', message: `must equal ${MUSIC_WORLD_PROJECT_SCHEMA_VERSION}` });
  }
  requireString(input.id, '$.id', issues);

  if (!isRecord(input.metadata)) {
    issues.push({ path: '$.metadata', message: 'must be an object' });
  } else {
    rejectUnknownKeys(input.metadata, ['title', 'description', 'createdAt', 'updatedAt', 'authors'], '$.metadata', issues);
    requireString(input.metadata.title, '$.metadata.title', issues);
    requireString(input.metadata.createdAt, '$.metadata.createdAt', issues);
    requireString(input.metadata.updatedAt, '$.metadata.updatedAt', issues);
    requireStringArray(input.metadata.authors, '$.metadata.authors', issues);
  }

  if (!isRecord(input.track)) {
    issues.push({ path: '$.track', message: 'must be an object' });
  } else {
    rejectUnknownKeys(input.track, ['source', 'assetId', 'title', 'artist', 'expectedDurationSeconds', 'file', 'rights'], '$.track', issues);
    if (input.track.source !== 'asset' && input.track.source !== 'local-file') {
      issues.push({ path: '$.track.source', message: 'must be asset or local-file' });
    }
    if (input.track.source === 'asset') requireString(input.track.assetId, '$.track.assetId', issues);
    requireString(input.track.title, '$.track.title', issues);
    if (input.track.file !== undefined) {
      const file = input.track.file;
      if (!isRecord(file)) issues.push({ path: '$.track.file', message: 'must be a file identity object' });
      else {
        rejectUnknownKeys(file, ['name', 'sizeBytes', 'sha256'], '$.track.file', issues);
        requireString(file.name, '$.track.file.name', issues);
        if (!Number.isSafeInteger(file.sizeBytes) || Number(file.sizeBytes) <= 0) issues.push({ path: '$.track.file.sizeBytes', message: 'must be a positive safe integer' });
        if (typeof file.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(file.sha256)) issues.push({ path: '$.track.file.sha256', message: 'must be a lowercase SHA-256 digest' });
      }
      if (input.track.source !== 'local-file') issues.push({ path: '$.track.file', message: 'is only allowed for local-file tracks' });
    }
    if (input.track.expectedDurationSeconds !== undefined &&
      (!isFiniteNumber(input.track.expectedDurationSeconds) || input.track.expectedDurationSeconds <= 0)) {
      issues.push({ path: '$.track.expectedDurationSeconds', message: 'must be a positive finite number' });
    }
    if (!isRecord(input.track.rights)) {
      issues.push({ path: '$.track.rights', message: 'must be an object' });
    } else {
      rejectUnknownKeys(input.track.rights, ['licenseRef', 'attribution'], '$.track.rights', issues);
      requireString(input.track.rights.licenseRef, '$.track.rights.licenseRef', issues);
      requireString(input.track.rights.attribution, '$.track.rights.attribution', issues);
    }
  }

  if (!isRecord(input.worldBible)) {
    issues.push({ path: '$.worldBible', message: 'must be an object' });
  } else {
    rejectUnknownKeys(input.worldBible, ['premise', 'listenerRole', 'visualMotifs', 'palette', 'emotionalArc'], '$.worldBible', issues);
    requireString(input.worldBible.premise, '$.worldBible.premise', issues);
    requireString(input.worldBible.listenerRole, '$.worldBible.listenerRole', issues);
    requireStringArray(input.worldBible.visualMotifs, '$.worldBible.visualMotifs', issues);
    requireStringArray(input.worldBible.palette, '$.worldBible.palette', issues);
    requireStringArray(input.worldBible.emotionalArc, '$.worldBible.emotionalArc', issues);
  }

  if (!isRecord(input.timeline)) {
    issues.push({ path: '$.timeline', message: 'must be an object' });
  } else {
    rejectUnknownKeys(input.timeline, ['timeBase', 'cues'], '$.timeline', issues);
    if (input.timeline.timeBase !== 'normalized-track-position') {
      issues.push({ path: '$.timeline.timeBase', message: 'must be normalized-track-position' });
    }
    if (!Array.isArray(input.timeline.cues) || input.timeline.cues.length === 0) {
      issues.push({ path: '$.timeline.cues', message: 'must contain at least one cue' });
    } else {
      const cueIds = new Set<string>();
      input.timeline.cues.forEach((cue, cueIndex) => {
        const cuePath = `$.timeline.cues[${cueIndex}]`;
        if (!isRecord(cue)) {
          issues.push({ path: cuePath, message: 'must be an object' });
          return;
        }
        rejectUnknownKeys(cue, ['id', 'position', 'label', 'sectionId', 'actions'], cuePath, issues);
        requireString(cue.id, `${cuePath}.id`, issues);
        if (typeof cue.id === 'string') {
          if (cueIds.has(cue.id)) issues.push({ path: `${cuePath}.id`, message: `duplicates cue id "${cue.id}"` });
          cueIds.add(cue.id);
        }
        if (!isFiniteNumber(cue.position) || cue.position < 0 || cue.position > 1) {
          issues.push({ path: `${cuePath}.position`, message: 'must be between 0 and 1' });
        }
        if (!Array.isArray(cue.actions) || cue.actions.length === 0) {
          issues.push({ path: `${cuePath}.actions`, message: 'must contain at least one action' });
        } else {
          cue.actions.forEach((action, actionIndex) => {
            if (!isRecord(action) || !ACTION_TYPES.has(String(action.type)) || !isRecord(action.payload)) {
              issues.push({ path: `${cuePath}.actions[${actionIndex}]`, message: 'must be a supported action with an object payload' });
            } else if (action.type === 'set-environment') {
              rejectUnknownKeys(action, ['type', 'payload'], `${cuePath}.actions[${actionIndex}]`, issues);
              environmentPayloadIssues(action.payload).forEach(({ field, message }) => issues.push({
                path: `${cuePath}.actions[${actionIndex}].payload.${field}`, message,
              }));
            }
          });
        }
      });
    }
  }

  const scene = validateSpatialScene(input.scene);
  scene.issues.forEach((issue) => issues.push({
    path: issue.path === '$' ? '$.scene' : `$.scene${issue.path.slice(1)}`,
    message: issue.message,
  }));

  if (!Array.isArray(input.assets)) {
    issues.push({ path: '$.assets', message: 'must be an array' });
  } else {
    const assetIds = new Set<string>();
    input.assets.forEach((asset, assetIndex) => {
      const assetPath = `$.assets[${assetIndex}]`;
      if (!isRecord(asset)) {
        issues.push({ path: assetPath, message: 'must be an object' });
        return;
      }
      rejectUnknownKeys(asset, ['id', 'type', 'licenseRef'], assetPath, issues);
      requireString(asset.id, `${assetPath}.id`, issues);
      requireString(asset.licenseRef, `${assetPath}.licenseRef`, issues);
      if (!ASSET_TYPES.has(String(asset.type))) issues.push({ path: `${assetPath}.type`, message: 'is not supported' });
      if (typeof asset.id === 'string') {
        if (assetIds.has(asset.id)) issues.push({ path: `${assetPath}.id`, message: `duplicates asset id "${asset.id}"` });
        assetIds.add(asset.id);
      }
    });
  }

  if (!isRecord(input.presentation)) {
    issues.push({ path: '$.presentation', message: 'must be an object' });
  } else {
    rejectUnknownKeys(input.presentation, ['subtitlesAvailable', 'reducedEffectsAvailable', 'launchInput'], '$.presentation', issues);
    if (typeof input.presentation.subtitlesAvailable !== 'boolean') issues.push({ path: '$.presentation.subtitlesAvailable', message: 'must be boolean' });
    if (typeof input.presentation.reducedEffectsAvailable !== 'boolean') issues.push({ path: '$.presentation.reducedEffectsAvailable', message: 'must be boolean' });
    if (input.presentation.launchInput !== 'desktop-keyboard-pointer') issues.push({ path: '$.presentation.launchInput', message: 'must be desktop-keyboard-pointer' });
  }

  return { valid: issues.length === 0, issues };
}

export function assertMusicWorldProject(input: unknown): asserts input is MusicWorldProject {
  const result = validateMusicWorldProject(input);
  if (!result.valid) throw new MusicWorldProjectValidationError(result.issues);
}
