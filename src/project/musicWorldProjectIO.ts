import type { MusicWorldProject } from './musicWorldProject';
import { assertMusicWorldProject, validateMusicWorldProject, MusicWorldProjectValidationError } from './validateMusicWorldProject';

export function importMusicWorldProject(json: string): MusicWorldProject {
  let input: unknown;
  try {
    input = JSON.parse(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown JSON parse error';
    throw new SyntaxError(`Invalid MusicWorldProject JSON: ${message}`);
  }
  if (typeof input === 'object' && input !== null && 'schemaVersion' in input && input.schemaVersion === 1) {
    const legacy = validateMusicWorldProject(input, 1);
    if (!legacy.valid) throw new MusicWorldProjectValidationError(legacy.issues);
    const migrated = { ...input, schemaVersion: 2 };
    assertMusicWorldProject(migrated);
    if (migrated.scene.environment.terrain.type === 'curved-plane') {
      migrated.scene.environment.terrain = { type: 'sphere', size: [120, 120], curvature: 1 / 120 };
    }
    assertMusicWorldProject(migrated);
    return migrated;
  }
  assertMusicWorldProject(input);
  return input;
}

export function exportMusicWorldProject(project: MusicWorldProject): string {
  assertMusicWorldProject(project);
  return `${JSON.stringify(project, null, 2)}\n`;
}
