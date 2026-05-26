import WorldCanvas from './world/WorldCanvas';
import OverlayRoot from './ui/OverlayRoot';
import { KeyboardControls } from '@react-three/drei';
import { useMemo } from 'react';

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
      <div className="relative w-full h-screen overflow-hidden">
        <WorldCanvas />
        <OverlayRoot />
      </div>
    </KeyboardControls>
  );
}
