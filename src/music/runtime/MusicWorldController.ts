import { MusicClock } from './MusicClock';
import { MusicTimelineExecutor } from './MusicTimelineExecutor';
import type { MusicTimelineEvent } from './musicRuntimeTypes';

export class MusicWorldController {
  readonly clock = new MusicClock();
  readonly timeline: MusicTimelineExecutor;

  constructor(events: MusicTimelineEvent[], onEvent?: (event: MusicTimelineEvent) => void) {
    this.timeline = new MusicTimelineExecutor(events, onEvent);
  }

  update(deltaSeconds: number) {
    this.clock.tick(deltaSeconds);
    this.timeline.update(this.clock.getContext().currentTime);
  }

  seek(seconds: number) {
    this.clock.seek(seconds);
    this.timeline.reset();
    this.timeline.update(seconds);
  }
}
