import { Physics } from '@react-three/rapier';
import Scene from './WorldScene';

interface PhysicsWorldProps {
  paused: boolean;
}

export default function PhysicsWorld({ paused }: PhysicsWorldProps) {
  return (
    <Physics gravity={[0, -9.81, 0]} paused={paused}>
      <Scene />
    </Physics>
  );
}
