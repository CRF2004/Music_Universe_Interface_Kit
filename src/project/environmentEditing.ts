import type { NarrativeEnvironmentState } from '../music/narrative/narrativeTypes';

export const editableEnvironmentKeys = ['skyColor', 'groundColor', 'rainIntensity', 'bloomIntensity'] as const;
export type EditableEnvironment = Partial<Pick<NarrativeEnvironmentState, typeof editableEnvironmentKeys[number]>>;

export function environmentPayloadIssues(payload: Record<string, unknown>): Array<{ field: string; message: string }> {
  const issues: Array<{ field: string; message: string }> = [];
  for (const [field, value] of Object.entries(payload)) {
    if (['skyColor', 'groundColor', 'fogColor'].includes(field)) {
      if (typeof value !== 'string' || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value)) {
        issues.push({ field, message: 'must be a hex color such as #334b85' });
      }
    } else {
      const max = field === 'rainIntensity' ? 1 : field === 'bloomIntensity' ? 2 : field === 'fogDensity' ? 1 : field === 'stars' ? 1000 : null;
      if (max === null) issues.push({ field, message: 'is not a supported environment field' });
      else if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max || (field === 'stars' && !Number.isInteger(value))) {
        issues.push({ field, message: `must be ${field === 'stars' ? 'an integer' : 'a finite number'} between 0 and ${max}` });
      }
    }
  }
  return issues;
}
