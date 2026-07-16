import type { SpatialNarrativeCue } from '../narrative/narrativeTypes';

export interface NarrativeRuntimeListener {
  (cue: SpatialNarrativeCue): void;
}

export class SpatialNarrativeRuntime {
  private cues: SpatialNarrativeCue[];
  private executed = new Set<string>();

  constructor(cues: SpatialNarrativeCue[], private listener?: NarrativeRuntimeListener) {
    this.cues = [...cues].sort((a, b) => a.atSeconds - b.atSeconds);
  }

  update(seconds: number) {
    for (const cue of this.cues) {
      if (!this.executed.has(cue.id) && seconds >= cue.atSeconds) {
        this.executed.add(cue.id);
        this.listener?.(cue);
      }
    }
  }

  reset() {
    this.executed.clear();
  }
}
