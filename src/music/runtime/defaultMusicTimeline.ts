import type { MusicTimelineCue } from '../musicTimeline';

export const defaultMusicTimeline: MusicTimelineCue[] = [
  { id: 'sky', atSeconds: 0, actions: [{ type: 'set-environment', payload: { skyColor: '#111827', groundColor: '#312e81', fogColor: '#111827', fogDensity: 0.01, stars: 0, bloomIntensity: 0.2, rainIntensity: 0 } }] },
  { id: 'stars', atSeconds: 20, actions: [{ type: 'set-environment', payload: { stars: 80, bloomIntensity: 0.5 } }] },
  { id: 'rain', atSeconds: 40, actions: [{ type: 'set-environment', payload: { rainIntensity: 0.7, fogDensity: 0.03 } }] },
  { id: 'portal', atSeconds: 60, actions: [{ type: 'set-portal', payload: { id: 'departure', open: true } }] },
];
