import type { MusicTimelineCue } from '../musicTimeline';
import type { NarrativeEnvironmentState, SpatialNarrativeAction } from '../narrative/narrativeTypes';

export interface MusicRuntimeState {
  environment: Partial<NarrativeEnvironmentState>;
  cameraMode?: string;
  narration?: string;
  portals: Record<string, boolean>;
}

const initialState: MusicRuntimeState = {
  environment: {},
  portals: {},
};

function applyAction(state: MusicRuntimeState, action: SpatialNarrativeAction) {
  if (action.type === 'set-environment') {
    state.environment = { ...state.environment, ...action.payload };
  }
  if (action.type === 'set-camera') {
    state.cameraMode = action.payload.mode;
  }
  if (action.type === 'show-narration') {
    state.narration = action.payload.body;
  }
  if (action.type === 'set-portal') {
    state.portals[action.payload.id] = action.payload.open;
  }
}

export function replayMusicTimeline(cues: MusicTimelineCue[], seconds: number): MusicRuntimeState {
  const state: MusicRuntimeState = structuredClone(initialState);
  for (const cue of cues) {
    if (cue.atSeconds <= seconds) {
      cue.actions.forEach((action) => applyAction(state, action));
    }
  }
  return state;
}
