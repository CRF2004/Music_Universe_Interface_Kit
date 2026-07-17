import type { MusicEnergyState } from '../../state/useMusicExperienceStore';

const SILENT_ENERGY: MusicEnergyState = {
  overall: 0,
  bass: 0,
  mid: 0,
  treble: 0,
};

function averageBand(data: Uint8Array, start: number, end: number): number {
  const safeStart = Math.max(0, Math.min(data.length, start));
  const safeEnd = Math.max(safeStart + 1, Math.min(data.length, end));
  let sum = 0;

  for (let index = safeStart; index < safeEnd; index += 1) {
    sum += data[index];
  }

  return sum / (safeEnd - safeStart) / 255;
}

export class MusicEnergyAnalyzer {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private data: Uint8Array | null = null;
  private connectedElement: HTMLAudioElement | null = null;

  connect(element: HTMLAudioElement): boolean {
    if (this.connectedElement === element && this.analyser) return true;
    if (this.connectedElement && this.connectedElement !== element) return false;
    if (typeof AudioContext === 'undefined') return false;

    this.context = new AudioContext();
    this.source = this.context.createMediaElementSource(element);
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.78;
    this.data = new Uint8Array(this.analyser.frequencyBinCount);
    this.connectedElement = element;

    this.source.connect(this.analyser);
    this.analyser.connect(this.context.destination);
    return true;
  }

  async resume(): Promise<void> {
    if (this.context?.state === 'suspended') {
      await this.context.resume();
    }
  }

  getFrame(): MusicEnergyState {
    if (!this.analyser || !this.data) return { ...SILENT_ENERGY };

    this.analyser.getByteFrequencyData(this.data);
    const length = this.data.length;
    const bass = averageBand(this.data, 0, Math.floor(length * 0.12));
    const mid = averageBand(this.data, Math.floor(length * 0.12), Math.floor(length * 0.48));
    const treble = averageBand(this.data, Math.floor(length * 0.48), length);
    const overall = Math.min(1, bass * 0.45 + mid * 0.4 + treble * 0.15);

    return { overall, bass, mid, treble };
  }
}
