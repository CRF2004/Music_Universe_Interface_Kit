import { Physics } from '@react-three/rapier';
import Scene from './WorldScene';

interface PhysicsWorldProps {
  paused: boolean;
}

export default function PhysicsWorld({ paused }: PhysicsWorldProps) {
  const debug =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('physicsDebug');

  return (
    <Physics gravity={[0, -9.81, 0]} paused={paused} debug={debug}>
      <Scene />
    </Physics>
  );
}
