import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAudioPlayerStore } from '../player/useAudioPlayerStore';
import { replayMusicTimeline } from './musicExperienceRuntime';
import { defaultMusicTimeline } from './defaultMusicTimeline';

export default function MusicWorldController() {
  const currentTime = useAudioPlayerStore((s) => s.currentTime);
  useEffect(() => {
    replayMusicTimeline(defaultMusicTimeline, currentTime);
  }, [currentTime]);
  useFrame(() => {
    replayMusicTimeline(defaultMusicTimeline, useAudio