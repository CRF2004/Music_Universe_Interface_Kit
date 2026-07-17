import { useEffect } from 'react';
import { useAudioPlayerStore } from '../player/useAudioPlayerStore';
import { replayMusicTimeline } from './musicExperienceRuntime';
import { useWorldStore } from '../../state/useWorldStore';
import type { CameraMode } from '../../camera/cameraTypes';

const CAMERA_MODES: CameraMode[] = [
  'explore',
  'interaction',
  'cinematic',
  'inspection',
  'ui-safe',
];

export default function MusicWorldController() {
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const setCameraMode = useWorldStore((state) => state.setCameraMode);

  useEffect(() => {
    const timeline = replayMusicTimeline([], currentTime);
    if (timeline.cameraMode && CAMERA_MODES.includes(timeline.cameraMode as CameraMode)) {
      setCameraMode(timeline.cameraMode as CameraMode);
    }
  }, [currentTime, setCameraMode]);

  return null;
}
