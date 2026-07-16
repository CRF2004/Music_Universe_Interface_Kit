import type { LocalAudioTrack } from './audioUploadTypes';

export class LocalAudioPlayer {
  private audio = new Audio();

  load(file: File): LocalAudioTrack {
    const url = URL.createObjectURL(file);
    this.audio.src = url;
    return {
      id: crypto.randomUUID(),
      name: file.name,
      url,
      duration: 0,
    };
  }

  play() {
    return this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  seek(seconds: number) {
    this.audio.currentTime = seconds;
  }

  get currentTime() {
    return this.audio.currentTime;
  }

  get duration() {
    return this.audio.duration || 0;
  }
}
