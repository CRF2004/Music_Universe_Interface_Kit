import { validateSpatialScene } from '../schema';
import {
  MUSIC_EXPERIENCE_SCHEMA_VERSION,
  type MusicWorldExperienceDefinition,
} from './musicExperienceTypes';

export interface MusicExperienceValidationIssue {
  path: string;
  message: string;
}

export interface MusicExperienceValidationResult {
  valid: boolean;
  issues: MusicExperienceValidationIssue[];
}

export class MusicExperienceValidationError extends Error {
  readonly issues: MusicExperienceValidationIssue[];

  constructor(issues: MusicExperienceValidationIssue[]) {
    super(
      `Invalid music experience: ${issues
        .map((issue) => `${issue.path} ${issue.message}`)
        .join('; ')}`,
    );
    this.name = 'MusicExperienceValidationError';
    this.issues = issues;
  }
}

const TEMPLATES = new Set([
  'journey',
  'memory',
  'encounter',
  'transformation',
  'open-planet',
]);

const SECTION_KINDS = new Set([
  'intro',
  'verse',
  'pre-chorus',
  'chorus',
  'bridge',
  'breakdown',
  'interlude',
  'outro',
  'custom',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function requireNonEmptyString(
  value: unknown,
  path: string,
  issues: MusicExperienceValidationIssue[],
) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push({ path, message: 'must be a non-empty string' });
  }
}

export function validateMusicExperience(input: unknown): MusicExperienceValidationResult {
  const issues: MusicExperienceValidationIssue[] = [];

  if (!isRecord(input)) {
    return { valid: false, issues: [{ path: '$', message: 'must be an object' }] };
  }

  if (input.version !== MUSIC_EXPERIENCE_SCHEMA_VERSION) {
    issues.push({
      path: '$.version',
      message: `must equal ${MUSIC_EXPERIENCE_SCHEMA_VERSION}`,
    });
  }

  requireNonEmptyString(input.id, '$.id', issues);
  requireNonEmptyString(input.name, '$.name', issues);

  if (!TEMPLATES.has(String(input.template))) {
    issues.push({ path: '$.template', message: 'is not a supported template' });
  }

  if (!isRecord(input.audio)) {
    issues.push({ path: '$.audio', message: 'must be an object' });
  } else {
    if (input.audio.source !== 'local' && input.audio.source !== 'remote') {
      issues.push({ path: '$.audio.source', message: 'must be local or remote' });
    }
    if (
      input.audio.durationSeconds !== undefined &&
      (!isFiniteNumber(input.audio.durationSeconds) || input.audio.durationSeconds < 0)
    ) {
      issues.push({
        path: '$.audio.durationSeconds',
        message: 'must be a non-negative finite number',
      });
    }
  }

  let durationSeconds = 0;

  if (!isRecord(input.analysis)) {
    issues.push({ path: '$.analysis', message: 'must be an object' });
  } else {
    if (!isFiniteNumber(input.analysis.durationSeconds) || input.analysis.durationSeconds <= 0) {
      issues.push({
        path: '$.analysis.durationSeconds',
        message: 'must be a positive finite number',
      });
    } else {
      durationSeconds = input.analysis.durationSeconds;
    }

    if (!Array.isArray(input.analysis.sections)) {
      issues.push({ path: '$.analysis.sections', message: 'must be an array' });
    } else {
      const sectionIds = new Set<string>();

      input.analysis.sections.forEach((section, index) => {
        const path = `$.analysis.sections[${index}]`;
        if (!isRecord(section)) {
          issues.push({ path, message: 'must be an object' });
          return;
        }

        requireNonEmptyString(section.id, `${path}.id`, issues);
        if (typeof section.id === 'string') {
          if (sectionIds.has(section.id)) {
            issues.push({ path: `${path}.id`, message: `duplicates section id "${section.id}"` });
          }
          sectionIds.add(section.id);
        }

        if (!SECTION_KINDS.has(String(section.kind))) {
          issues.push({ path: `${path}.kind`, message: 'is not supported' });
        }

        if (!isFiniteNumber(section.startSeconds) || section.startSeconds < 0) {
          issues.push({ path: `${path}.startSeconds`, message: 'must be non-negative' });
        }
        if (!isFiniteNumber(section.endSeconds) || section.endSeconds < 0) {
          issues.push({ path: `${path}.endSeconds`, message: 'must be non-negative' });
        }
        if (
          isFiniteNumber(section.startSeconds) &&
          isFiniteNumber(section.endSeconds) &&
          section.endSeconds <= section.startSeconds
        ) {
          issues.push({ path: `${path}.endSeconds`, message: 'must be greater than startSeconds' });
        }
        if (
          durationSeconds > 0 &&
          isFiniteNumber(section.endSeconds) &&
          section.endSeconds > durationSeconds
        ) {
          issues.push({ path: `${path}.endSeconds`, message: 'must not exceed track duration' });
        }
        if (
          section.energy !== undefined &&
          (!isFiniteNumber(section.energy) || section.energy < 0 || section.energy > 1)
        ) {
          issues.push({ path: `${path}.energy`, message: 'must be between 0 and 1' });
        }
      });
    }
  }

  if (!isRecord(input.worldBible)) {
    issues.push({ path: '$.worldBible', message: 'must be an object' });
  } else {
    requireNonEmptyString(input.worldBible.title, '$.worldBible.title', issues);
    requireNonEmptyString(input.worldBible.premise, '$.worldBible.premise', issues);
    requireNonEmptyString(input.worldBible.listenerRole, '$.worldBible.listenerRole', issues);
  }

  if (!Array.isArray(input.timeline)) {
    issues.push({ path: '$.timeline', message: 'must be an array' });
  } else {
    const cueIds = new Set<string>();

    input.timeline.forEach((cue, index) => {
      const path = `$.timeline[${index}]`;
      if (!isRecord(cue)) {
        issues.push({ path, message: 'must be an object' });
        return;
      }

      requireNonEmptyString(cue.id, `${path}.id`, issues);
      if (typeof cue.id === 'string') {
        if (cueIds.has(cue.id)) {
          issues.push({ path: `${path}.id`, message: `duplicates cue id "${cue.id}"` });
        }
        cueIds.add(cue.id);
      }

      if (!isFiniteNumber(cue.atSeconds) || cue.atSeconds < 0) {
        issues.push({ path: `${path}.atSeconds`, message: 'must be non-negative' });
      } else if (durationSeconds > 0 && cue.atSeconds > durationSeconds) {
        issues.push({ path: `${path}.atSeconds`, message: 'must not exceed track duration' });
      }

      if (!Array.isArray(cue.actions) || cue.actions.length === 0) {
        issues.push({ path: `${path}.actions`, message: 'must contain at least one action' });
      }
    });
  }

  const sceneResult = validateSpatialScene(input.scene);
  sceneResult.issues.forEach((issue) => {
    issues.push({
      path: issue.path === '$' ? '$.scene' : `$.scene${issue.path.slice(1)}`,
      message: issue.message,
    });
  });

  return { valid: issues.length === 0, issues };
}

export function assertMusicExperience(
  input: unknown,
): asserts input is MusicWorldExperienceDefinition {
  const result = validateMusicExperience(input);
  if (!result.valid) {
    throw new MusicExperienceValidationError(result.issues);
  }
}
