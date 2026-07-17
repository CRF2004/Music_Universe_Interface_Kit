import type { MusicTimelineCue } from '../musicTimeline';
import type { NarrativeEnvironmentState, SpatialNarrativeAction } from '../narrative/narrativeTypes';

export interface MusicRuntimeState {
  environment: Partial<NarrativeEnvironmentState>;
  cameraMode?: string;
  narration?: { body: string; tone?: string };
  portals: Record<string, boolean>;
  landmarks: Record<string, boolean>;
}

const initialState: MusicRuntimeState = {
  environment: {},
  portals: {},
  landmarks: {},
};

function applyAction(state: MusicRuntimeState, action: SpatialNarrativeAction) {
  switch (action.type) {
    case 'set-environment':
      state.environment = { ...state.environment, ...action.payload };
      break;
    case 'set-camera':
      state.cameraMode = action.payload.mode;
      break;
    case 'show-narration':
      state.narration = action.payload;
      break;
    case 'set-portal':
      state.portals[action.payload.id] = action.payload.open;
      break;
    case 'set-landmark':
      state.landmarks[action.payload.id] = action.payload.visible;
      break;
  }
}

export function replayMusicTimeline(cues: MusicTimelineCue[], seconds: number): MusicRuntimeState {
  const state = structuredClone(initialState);

  for (const cue of cues) {
    if (cue.atSeconds <= seconds) {
      cue.actions.forEach((action) => applyAction(state, action));
    }
  }

  return state;
}
