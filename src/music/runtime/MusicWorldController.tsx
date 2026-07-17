import { useEffect, useRef } from 'react';
import { useAudioPlayerStore, getAuthoritativeAudioElement } from '../player/useAudioPlayerStore';
import { MusicExperienceLoop } from './MusicExperienceLoop';
import { useMusicExperienceStore } from '../../state/useMusicExperienceStore';

export default function MusicWorldController() {
  const loop = useRef<MusicExperienceLoop | null>(null);
  const playing = useAudioPlayerStore((state) => state.playing);
  const track = useAudioPlayerStore((state) => state.track);
  const resetMusic = useMusicExperienceStore((state) => state.reset);

  useEffect(() => {
    if (!loop.current) {
      loop.current = new MusicExperienceLoop();
      loop.current.connect(getAuthoritativeAudioElement());
    }

    return () => {
      loop.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!loop.current || !track) return;

    if (playing) {
      void loop.current.resume();
      loop.current.start(
        () => useAudioPlayerStore.getState().currentTime,
        () => useAudioPlayerStore.getState().duration,
      );
    } else {
      loop.current.stop();
      if (!track) resetMusic();
    }
  }, [playing, track, resetMusic]);

  return null;
}
