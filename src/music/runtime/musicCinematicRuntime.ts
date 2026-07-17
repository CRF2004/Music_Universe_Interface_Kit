import { useMusicExperienceStore } from '../../state/useMusicExperienceStore';
import { replayMusicTimeline } from './musicExperienceRuntime';
import { defaultMusicTimeline } from './defaultMusicTimeline';

export function updateMusicExperience(seconds: number, energy = 0) {
  const snapshot = replayMusicTimeline(defaultMusicTimeline, seconds);

  useMusicExperienceStore.getState().setSnapshot({
    ...snapshot,
    energy,
  });
}
