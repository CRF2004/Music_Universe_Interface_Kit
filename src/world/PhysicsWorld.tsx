import { Physics } from '@react-three/rapier';
import Scene from './WorldScene';
import { useProjectStore } from '../state/useProjectStore';

interface PhysicsWorldProps {
  paused: boolean;
}

export default function PhysicsWorld({ paused }: PhysicsWorldProps) {
  const spherical = useProjectStore((state) => state.project.scene.environment.terrain.type === 'sphere');
  const debug =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('physicsDebug');

  return (
    <Physics gravity={spherical ? [0, 0, 0] : [0, -9.81, 0]} paused={paused} debug={debug}>
      <Scene />
    </Physics>
  );
}
