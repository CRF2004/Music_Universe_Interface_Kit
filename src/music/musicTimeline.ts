import type { SpatialNarrativeAction, SpatialNarrativeCue } from './narrative/narrativeTypes';

export interface NormalizedMusicTimelineCue {
  id: string;
  position: number;
  label?: string;
  sectionId?: string;
  actions: SpatialNarrativeAction[];
}

export interface MusicTimelineCue extends SpatialNarrativeCue {
  sectionId?: string;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function compileNormalizedMusicTimeline(
  cues: NormalizedMusicTimelineCue[],
  durationSeconds: number,
): MusicTimelineCue[] {
  const duration = Number.isFinite(durationSeconds) ? Math.max(0, durationSeconds) : 0;

  return cues
    .map((cue) => ({
      id: cue.id,
      atSeconds: clamp(cue.position, 0, 1) * duration,
      label: cue.label,
      sectionId: cue.sectionId,
      actions: cue.actions,
    }))
    .sort((a, b) => a.atSeconds - b.atSeconds);
}

export function sortMusicTimeline(cues: MusicTimelineCue[]): MusicTimelineCue[] {
  return [...cues].sort((a, b) => a.atSeconds - b.atSeconds);
}
