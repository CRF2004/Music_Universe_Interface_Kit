import { useEffect } from 'react';
import { useAudioPlayerStore } from '../player/useAudioPlayerStore';
import { updateMusicTimeline } from './musicExperienceRuntime';
import { useWorldStore } from '../../state/useWorldStore';
import type { CameraMode } from '../../camera/cameraTypes';

export default function MusicWorldController() {
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const setCameraMode = useWorldStore((state) => state.setCameraMode);

  useEffect(() => {
    const timeline = updateMusicTimeline(currentTime, 300);
    setCameraMode(timeline.cameraMode as CameraMode);
  }, [currentTime, setCameraMode]);

  return null;
}
