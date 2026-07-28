import { useEffect, useMemo } from 'react';
import { useAudioPlayerStore } from '../player/useAudioPlayerStore';
import { compileNormalizedMusicTimeline } from '../musicTimeline';
import { defaultNormalizedMusicTimeline } from './defaultMusicTimeline';
import { replayMusicTimeline } from './musicExperienceRuntime';
import { useMusicRuntimeStore } from './useMusicRuntimeStore';
import { useWorldStore } from '../../state/useWorldStore';
import { isCameraMode } from './runtimeCamera';
import { useInteractionStore } from '../../state/useInteractionStore';

export default function MusicRuntimeController() {
  const track = useAudioPlayerStore((state) => state.track);
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const duration = useAudioPlayerStore((state) => state.duration);
  const started = useAudioPlayerStore((state) => state.started);
  const setRuntime = useMusicRuntimeStore((state) => state.setRuntime);
  const setCameraMode = useWorldStore((state) => state.setCameraMode);
  const experienceStarted = Boolean(track) && started;
  const departureGateOpen = useMusicRuntimeStore((state) => state.portals.departure ?? false);

  const cues = useMemo(
    () =>
      experienceStarted && duration > 0
        ? compileNormalizedMusicTimeline(defaultNormalizedMusicTimeline, duration)
        : [],
    [duration, experienceStarted],
  );

  useEffect(() => {
    const runtime = replayMusicTimeline(cues, currentTime);

    setRuntime(runtime);

    if (isCameraMode(runtime.cameraMode)) {
      setCameraMode(runtime.cameraMode);
    } else if (!experienceStarted) {
      setCameraMode('explore');
    }
  }, [cues, currentTime, experienceStarted, setCameraMode, setRuntime]);

  useEffect(() => {
    const interactionState = useInteractionStore.getState();
    if (departureGateOpen) {
      interactionState.setFlag('world.departureGateOpen', true);
    } else {
      interactionState.clearFlag('world.departureGateOpen');
    }
  }, [departureGateOpen]);

  return null;
}
