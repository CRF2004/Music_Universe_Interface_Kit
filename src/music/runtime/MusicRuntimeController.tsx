import { useEffect } from 'react';
import { useAudioPlayerStore } from '../player/useAudioPlayerStore';
import { compileNormalizedMusicTimeline } from '../musicTimeline';
import { defaultNormalizedMusicTimeline } from './defaultNormalizedMusicTimeline';
import { replayMusicTimeline } from './musicExperienceRuntime';
import { useMusicRuntimeStore } from './useMusicRuntimeStore';
import { useWorldStore } from '../../state/useWorldStore';
import type { CameraMode } from '../../camera/cameraTypes';

function isCameraMode(value: unknown): value is CameraMode {
  return (
    value === 'explore' ||
    value === 'interaction' ||
    value === 'cinematic' ||
    value === 'inspection' ||
    value === 'ui-safe'
  );
}

export default function MusicRuntimeController() {
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const setRuntime = useMusicRuntimeStore((state) => state.setRuntime);
  const setCameraMode = useWorldStore((state) => state.setCameraMode);

  useEffect(() => {
    const cues = compileNormalizedMusicTimeline(defaultNormalizedMusicTimeline, 300);
    const runtime = replayMusicTimeline(cues, currentTime);

    setRuntime(runtime);

    if (isCameraMode(runtime.cameraMode)) {
      setCameraMode(runtime.cameraMode);
    }
  }, [currentTime, setCameraMode, setRuntime]);

  return null;
}
