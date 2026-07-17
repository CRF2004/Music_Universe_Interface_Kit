import { MusicEnergyAnalyzer } from './musicEnergyAnalyzer';
import { updateMusicEnergy, updateMusicTimeline } from './musicCinematicRuntime';

export class MusicExperienceLoop {
  private readonly analyzer = new MusicEnergyAnalyzer();
  private running = false;
  private frame = 0;

  connect(audio: HTMLAudioElement): boolean {
    return this.analyzer.connect(audio);
  }

  async resume(): Promise<void> {
    await this.analyzer.resume();
  }

  start(getTime: () => number, getDuration: () => number): void {
    if (this.running) return;
    this.running = true;

    const tick = () => {
      if (!this.running) return;

      const seconds = getTime();
      const duration = getDuration();
      const energy = this.analyzer.getFrame();

      updateMusicTimeline(seconds, duration);
      updateMusicEnergy(energy);

      this.frame = requestAnimationFrame(tick);
    };

    this.frame = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  reset(): void {
    this.stop();
  }
}
