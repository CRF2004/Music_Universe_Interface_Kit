import { useEffect } from 'react';
import { useAudioPlayerStore } from '../player/useAudioPlayerStore';
import { compileNormalizedMusicTimeline } from '../musicTimeline';
import { defaultNormalizedMusicTimeline } from './defaultNormalizedMusicTimeline';
import { replayMusicTimeline } from './musicExperienceRuntime';
import { useMusicRuntimeStore } from './useMusicRuntimeStore';

export default function MusicWorldController() {
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const setRuntime = useMusicRuntimeStore((state) => state.setRuntime);

  useEffect(() => {
    const cues = compileNormalizedMusicTimeline(defaultNormalizedMusicTimeline, 300);
    const runtime = replayMusicTimeline(cues, currentTime);
    setRuntime(runtime);
  }, [currentTime, setRuntime]);

  return null;
}
