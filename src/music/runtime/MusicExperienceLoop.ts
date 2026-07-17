import { MusicEnergyAnalyzer } from './musicEnergyAnalyzer';
import { updateMusicExperience } from './musicExperienceRuntime';

export class MusicExperienceLoop {
  private readonly analyzer = new MusicEnergyAnalyzer();
  private running = false;
  private frame = 0;

  connect(audio: HTMLAudioElement): boolean {
    return this.analyzer.connect(audio);
  }

  async resume(): Promise<void> {
    await this