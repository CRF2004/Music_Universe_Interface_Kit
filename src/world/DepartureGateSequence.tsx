import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { AdditiveBlending, type Group, type PointLight } from 'three';
import DeparturePortal from './DeparturePortal';
import RevealTransition from './RevealTransition';

interface DepartureGateSequenceProps {
  charging: boolean;
  open: boolean;
  afterglow: boolean;
}

function GateCharge() {
  const root = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!root.current) return;
    const pulse = 0.96 + Math.sin(clock.elapsedTime * 4.2) * 0.07;
    root.current.scale.setScalar(pulse);
    root.current.rotation.z = clock.elapsedTime * 0.16;
  });

  return (
    <group ref={root} name="departure-gate-charge" position={[0, 2.05, 0.1]} userData={{ cameraOccluder: false }}>
      {[0, 1, 2].map((index) => (
        <mesh key={index} rotation={[0, 0, index * Math.PI / 3]}>
          <torusGeometry args={[1.42 + index * 0.33, 0.035 + index * 0.012, 8, 72, Math.PI * 1.55]} />
          <meshBasicMaterial
            color={index === 0 ? '#fff2a6' : '#9dffd9'}
            transparent
            opacity={0.5 - index * 0.1}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      ))}
      <pointLight color="#b8ffe2" intensity={1.25} distance={12} />
    </group>
  );
}

function GateAfterglow() {
  const root = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  useFrame(({ clock }) => {
    if (!root.current) return;
    root.current.rotation.z = -clock.elapsedTime * 0.09;
    if (light.current) light.current.intensity = 1.4 + Math.sin(clock.elapsedTime * 1.5) * 0.25;
  });

  return (
    <group ref={root} name="departure-gate-afterglow" position={[0, 2.05, 0.06]} userData={{ cameraOccluder: false }}>
      {[2.35, 2.8, 3.3].map((radius, index) => (
        <mesh key={radius} rotation={[0, 0, index * Math.PI / 4]}>
          <torusGeometry args={[radius, 0.018, 6, 96, Math.PI * 1.7]} />
          <meshBasicMaterial
            color={index === 0 ? '#fff1bd' : '#9d7cff'}
            transparent
            opacity={0.28 - index * 0.055}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      ))}
      <pointLight ref={light} color="#d8c1ff" intensity={1.4} distance={20} />
    </group>
  );
}

export default function DepartureGateSequence({
  charging,
  open,
  afterglow,
}: DepartureGateSequenceProps) {
  return (
    <group name="departure-gate-sequence">
      <RevealTransition visible={charging && !open} duration={0.8} name="departure-gate-charge-reveal">
        <GateCharge />
      </RevealTransition>
      <RevealTransition visible={open} duration={1.1} name="departure-gate-reveal">
        <DeparturePortal />
      </RevealTransition>
      <RevealTransition visible={afterglow} duration={1.4} name="departure-gate-afterglow-reveal">
        <GateAfterglow />
      </RevealTransition>
    </group>
  );
}
