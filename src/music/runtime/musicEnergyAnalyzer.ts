export class MusicEnergyAnalyzer {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private data: Uint8Array<ArrayBuffer> | null = null;

  connect(element: HTMLAudioElement) {
    if (this.context) return;

    this.context = new AudioContext();
    const source = this.context.createMediaElementSource(element);
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 256;
    this.data = new Uint8Array(this.analyser.frequencyBinCount);

    source.connect(this.analyser);
    this.analyser.connect(this.context.destination);
  }

  async resume() {
    await this.context?.resume();
  }

  getEnergy() {
    if (!this.analyser || !this.data) return 0;

    this.analyser.getByteFrequencyData(this.data);
    const total = this.data.reduce((sum, value) => sum + value, 0);
    return total / this.data.length / 255;
  }
}
