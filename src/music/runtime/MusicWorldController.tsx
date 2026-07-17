import { useEffect } from 'react';
import { useAudioPlayerStore } from '../player/useAudioPlayerStore';
import { compileNormalizedMusicTimeline } from '../musicTimeline';
import { defaultNormalizedMusicTimeline } from './defaultNormalizedMusicTimeline';
import { replayMusicTimeline } from './musicExperienceRuntime';
import { useMusicRuntimeStore } from './useMusicRuntimeStore';
import type { CameraMode } from '../../camera/cameraTypes';

const CAMERA_MODES = new Set<CameraMode>([
  'explore',
  'interaction',
  'cinematic',
  'inspection',
  'ui-safe',
]);

function isCameraMode(value: unknown): value is CameraMode {
  return typeof value === 'string' && CAMERA_MODES.has(value as CameraMode);
}

export default function MusicWorldController() {
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const setRuntime = useMusicRuntimeStore((state) => state.setRuntime);

  useEffect(() => {
    const cues = compileNormalizedMusicTimeline(defaultNormalizedMusicTimeline, 300);
    const runtime = replayMusicTimeline(cues, currentTime);

    if (isCameraMode(runtime.cameraMode)) {
      setRuntime({ ...runtime, cameraMode: runtime.cameraMode });
    } else {
      setRuntime(runtime);
    }
  }, [currentTime, setRuntime]);

  return null;
}
