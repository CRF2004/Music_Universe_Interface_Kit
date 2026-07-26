import WorldCanvas from './world/WorldCanvas';
import OverlayRoot from './ui/OverlayRoot';
import { KeyboardControls } from '@react-three/drei';
import { useEffect, useMemo } from 'react';

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

/**
 * @license MIT
 * Copyright (c) 2026 Product World Interface Kit
 */

export default function App() {
  const map = useMemo(
    () => [
      { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
      { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
      { name: 'leftward', keys: ['ArrowLeft', 'KeyA'] },
      { name: 'rightward', keys: ['ArrowRight', 'KeyD'] },
      { name: 'jump', keys: ['Space'] },
      { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
    ],
    []
  );

  return (
    <KeyboardControls map={map}>
      <KeyboardFocusGuard />
      <div className="relative w-full h-screen overflow-hidden">
        <WorldCanvas />
        <OverlayRoot />
      </div>
    </KeyboardControls>
  );
}
