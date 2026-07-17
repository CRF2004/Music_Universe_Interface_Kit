export interface LocalAudioTrack {
  id: string;
  name: string;
  url: string;
  duration: number;
  sizeBytes: number;
  mimeType: string;
}

export type AudioLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface AudioPlayerState {
  track: LocalAudioTrack | null;
  currentTime: number;
  duration: number;
  playing: boolean;
  ended: boolean;
  status: AudioLoadStatus;
  error: string | null;
}
