import type { LocalAudioTrack } from './audioUploadTypes';

export class LocalAudioPlayer {
  readonly element: HTMLAudioElement;
  private objectUrl: string | null = null;

  constructor() {
    this.element = new Audio();
    this.element.preload = 'metadata';
    this.element.loop = true;
  }

  load(file: File): LocalAudioTrack {
    this.clear();

    const url = URL.createObjectURL(file);
    this.objectUrl = url;
    this.element.src = url;
    this.element.load();

    return {
      id: crypto.randomUUID(),
      name: file.name,
      url,
      duration: 0,
      sizeBytes: file.size,
      mimeType: file.type || 'audio/mpeg',
    };
  }

  play(): Promise<void> {
    return this.element.play();
  }

  pause(): void {
    this.element.pause();
  }

  seek(seconds: number): void {
    const maximum = Number.isFinite(this.element.duration) ? this.element.duration : Number.POSITIVE_INFINITY;
    this.element.currentTime = Math.min(maximum, Math.max(0, seconds));
  }

  clear(): void {
    this.element.pause();
    this.element.currentTime = 0;
    this.element.removeAttribute('src');

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  destroy(): void {
    this.clear();
  }

  get currentTime(): number {
    return this.element.currentTime || 0;
  }

  get duration(): number {
    return Number.isFinite(this.element.duration) ? this.element.duration : 0;
  }

  get paused(): boolean {
    return this.element.paused;
  }

  get ended(): boolean {
    return this.element.ended;
  }
}
