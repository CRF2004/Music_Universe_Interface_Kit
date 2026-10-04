import type { MusicWorldProject } from './musicWorldProject';
import { assertMusicWorldProject } from './validateMusicWorldProject';

export function importMusicWorldProject(json: string): MusicWorldProject {
  let input: unknown;
  try {
    input = JSON.parse(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown JSON parse error';
    throw new SyntaxError(`Invalid MusicWorldProject JSON: ${message}`);
  }
  assertMusicWorldProject(input);
  return input;
}

export function exportMusicWorldProject(project: MusicWorldProject): string {
  assertMusicWorldProject(project);
  return `${JSON.stringify(project, null, 2)}\n`;
}
