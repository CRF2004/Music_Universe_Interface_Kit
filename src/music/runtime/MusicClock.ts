import type { MusicRuntimeContext } from './musicRuntimeTypes';

export class MusicClock {
  private currentTime = 0;

  seek(seconds: number) {
    this.currentTime = Math.max(0, seconds);
  }

  tick(deltaSeconds: number) {
    this.currentTime += Math.max(0, deltaSeconds);
  }

  getContext(duration = 0): MusicRuntimeContext {
    return {
      currentTime: this.currentTime,
      duration,
    };
  }
}
