import { KeyboardControls } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import { MotionConfig } from 'motion/react';
import { useWorldStore } from './state/useWorldStore';
import { useExperienceSettingsStore } from './state/useExperienceSettingsStore';
import OverlayRoot from './ui/OverlayRoot';
import WorldCanvas from './world/WorldCanvas';

const movementKeys = [
  ['ArrowUp', 'ArrowUp'],
  ['KeyW', 'w'],
  ['ArrowDown', 'ArrowDown'],
  ['KeyS', 's'],
  ['ArrowLeft', 'ArrowLeft'],
  ['KeyA', 'a'],
  ['ArrowRight', 'ArrowRight'],
  ['KeyD', 'd'],
  ['Space', ' '],
  ['ShiftLeft', 'Shift'],
  ['ShiftRight', 'Shift'],
] as const;

function KeyboardFocusGuard() {
  useEffect(() => {
    const releaseMovementKeys = () => {
      movementKeys.forEach(([code, key]) => {
        window.dispatchEvent(new KeyboardEvent('keyup', { code, key }));
      });
    };

    window.addEventListener('blur', releaseMovementKeys);
    document.addEventListener('visibilitychange', releaseMovementKeys);

    return () => {
      window.removeEventListener('blur', releaseMovementKeys);
      document.removeEventListener('visibilitychange', releaseMovementKeys);
    };
  }, []);

  return null;
}

export default function ExperienceRoot() {
  const setReducedEffects = useWorldStore((state) => state.setReducedEffects);
  const setHelpOpen = useWorldStore((state) => state.setHelpOpen);
  const reducedEffects = useWorldStore((state) => state.reducedEffects);
  const hydrateExperienceSettings = useExperienceSettingsStore((state) => state.hydrate);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const saved = window.localStorage.getItem('music-universe.reduced-effects');
    setReducedEffects(saved === null ? media.matches : saved === 'true');
    if (window.localStorage.getItem('music-universe.onboarding-seen') !== 'true') {
      setHelpOpen(true);
    }
  }, [setHelpOpen, setReducedEffects]);

  useEffect(() => {
    hydrateExperienceSettings();
  }, [hydrateExperienceSettings]);
  const map = useMemo(
    () => [
      { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
      { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
      { name: 'leftward', keys: ['ArrowLeft', 'KeyA'] },
      { name: 'rightward', keys: ['ArrowRight', 'KeyD'] },
      { name: 'jump', keys: ['Space'] },
      { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
    ],
    [],
  );

  return (
    <MotionConfig reducedMotion={reducedEffects ? 'always' : 'never'}>
      <KeyboardControls map={map}>
        <KeyboardFocusGuard />
        <div className="relative h-screen w-full overflow-hidden">
          <WorldCanvas />
          <OverlayRoot />
        </div>
      </KeyboardControls>
    </MotionConfig>
  );
}
