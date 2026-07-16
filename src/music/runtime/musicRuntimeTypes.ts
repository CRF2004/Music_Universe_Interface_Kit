export type MusicRuntimeActionType =
  | 'set-environment'
  | 'set-camera'
  | 'open-zone'
  | 'spawn-entity'
  | 'emit-event';

export interface MusicRuntimeAction {
  type: MusicRuntimeActionType;
  payload?: Record<string, unknown>;
}

export interface MusicTimelineEvent {
  id: string;
  atSeconds: number;
  actions: MusicRuntimeAction[];
  executed?: boolean;
}

export interface MusicRuntimeContext {
  currentTime: number;
  duration: number;
}

export interface MusicRuntimeListener {
  (event: MusicTimelineEvent): void;
}
