import type { MusicTimelineEvent, MusicRuntimeListener } from './musicRuntimeTypes';

export class MusicTimelineExecutor {
  private events: MusicTimelineEvent[];
  private listener?: MusicRuntimeListener;

  constructor(events: MusicTimelineEvent[], listener?: MusicRuntimeListener) {
    this.events = events.map((event) => ({ ...event, executed: false }));
    this.listener = listener;
  }

  update(currentTime: number) {
    this.events.forEach((event) => {
      if (!event.executed && currentTime >= event.atSeconds) {
        event.executed = true;
        this.listener?.(event);
      }
    });
  }

  reset() {
    this.events.forEach((event) => {
      event.executed = false;
    });
  }
}
