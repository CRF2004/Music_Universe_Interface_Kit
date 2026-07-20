import { useEffect, useMemo } from 'react';
import { useAudioPlayerStore } from '../player/useAudioPlayerStore';
import { compileNormalizedMusicTimeline } from '../musicTimeline';
import { defaultNormalizedMusicTimeline } from './defaultMusicTimeline';
import { replayMusicTimeline } from './musicExperienceRuntime';
import { useMusicRuntimeStore } from './useMusicRuntimeStore';
import { useWorldStore } from '../../state/useWorldStore';
import { isCameraMode } from './runtimeCamera';

export default function MusicRuntimeController() {
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const duration = useAudioPlayerStore((state) => state.duration);
  const setRuntime = useMusicRuntimeStore((state) => state.setRuntime);
  const setCameraMode = useWorldStore((state) => state.setCameraMode);

  const cues = useMemo(
    () =>
      duration > 0
        ? compileNormalizedMusicTimeline(defaultNormalizedMusicTimeline, duration)
        : [],
    [duration],
  );

  useEffect(() => {
    const runtime = replayMusicTimeline(cues, currentTime);

    setRuntime(runtime);

    if (isCameraMode(runtime.cameraMode)) {
      setCameraMode(runtime.cameraMode);
    }
  }, [cues, currentTime, setCameraMode, setRuntime]);

  return null;
}
