export interface LocalAudioTrack {
  id: string;
  name: string;
  url: string;
  duration: number;
}

export interface AudioPlayerState {
  track?: LocalAudioTrack;
  currentTime: number;
  duration: number;
  playing: boolean;
}
