import { useMusicExperienceStore } from '../../state/useMusicExperienceStore';
import { replayMusicTimeline } from './musicExperienceRuntime';
import { compileNormalizedMusicTimeline, defaultNormalizedMusicTimeline } from './defaultMusicTimeline';
import type { MusicEnergyState } from '../../state/useMusicExperienceStore';

export function updateMusicTimeline(seconds: number, durationSeconds: number) {
  const progress = durationSeconds > 0 ? seconds / durationSeconds : 0;
  const timeline = compileNormalizedMusicTimeline(
    defaultNormalizedMusicTimeline,
    durationSeconds,
  );

  useMusicExperienceStore.getState().applyTimeline(
    replayMusicTimeline(timeline, seconds),
    progress,
  );
}

export function updateMusicEnergy(energy: MusicEnergyState) {
  useMusicExperienceStore.getState().setEnergy(energy);
}
