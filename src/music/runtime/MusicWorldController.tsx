import { useMemo } from 'react';
import { useAudioPlayerStore } from '../player/useAudioPlayerStore';
import { replayMusicTimeline } from './musicExperienceRuntime';
import { defaultMusicTimeline } from './defaultMusicTimeline';

export default function MusicWorldController() {
  const currentTime = useAudioPlayerStore((state) => state.currentTime);

  useMemo(() => {
    return replayMusicTimeline(defaultMusicTimeline, currentTime);
  }, [currentTime]);

  return null;
}
