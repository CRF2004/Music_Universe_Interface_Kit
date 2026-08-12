import { useKeyboardControls } from '@react-three/drei';
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { resolvePlayerMovement } from './playerMovement';
import { FOOTSTEP_EVENT } from '../audio/audioEvents';

interface MovementControls {
  forward: boolean;
  backward: boolean;
  leftward: boolean;
  rightward: boolean;
  jump: boolean;
  run: boolean;
}

interface PlayerE2ETelemetry {
  playerPosition: [number, number, number];
  playerQuaternion: [number, number, number, number];
  cameraPosition: [number, number, number];
  cameraQuaternion: [number, number, number, number];
  velocity: [number, number, number];
  cameraOccludedMaterials?: number;
  setPlayerTransform: (position: [number, number, number], yaw: number) => void;
  drivePlayer: (velocity: [number, number, number], durationMs: number) => void;
}

type E2EWindow = Window & {
  __MUSIC_UNIVERSE_E2E__?: PlayerE2ETelemetry;
};

export default function PlayerController() {
  const bodyRef = useRef<RapierRigidBody>(null);
  const modelRef = useRef<THREE.Group>(null);
  const bodyVisualRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const groundedFrames = useRef(0);
  const lastFootstepAt = useRef(0);
  const getControls = useKeyboardControls<keyof MovementControls>()[1];
  const camera = useThree((state) => state.camera);
  const cameraForward = useRef(new THREE.Vector3());
  const targetQuaternion = useRef(new THREE.Quaternion());
  const targetEuler = useRef(new THREE.Euler());
  const e2eDrive = useRef<{
    velocity: [number, number, number];
    until: number;
  } | null>(null);
  const e2eEnabled = useRef(
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('e2e'),
  );

  useEffect(
    () => () => {
      if (e2eEnabled.current) delete (window as E2EWindow).__MUSIC_UNIVERSE_E2E__;
    },
    [],
  );

  useFrame((_, delta) => {
    const body = bodyRef.current;
    const model = modelRef.current;
    if (!body || !model) return;

    const controls = getControls();
    const velocity = body.linvel();
    const drive = e2eDrive.current;
    const driveActive =
      e2eEnabled.current && drive !== null && performance.now() < drive.until;
    if (drive && !driveActive) e2eDrive.current = null;

    camera.getWorldDirection(cameraForward.current);
    const movement = resolvePlayerMovement(controls, cameraForward.current, camera.up);

    if (driveActive && drive) {
      body.setLinvel(
        {
          x: drive.velocity[0],
          y: drive.velocity[1],
          z: drive.velocity[2],
        },
        true,
      );
    } else if (movement.moving) {
      const speed = controls.run ? 7.5 : 5;
      body.setLinvel(
        {
          x: movement.direction.x * speed,
          y: velocity.y,
          z: movement.direction.z * speed,
        },
        true,
      );

      if (movement.updateFacing) {
        targetEuler.current.set(
          0,
          Math.atan2(movement.direction.x, movement.direction.z),
          0,
        );
        targetQuaternion.current.setFromEuler(targetEuler.current);
        model.quaternion.slerp(
          targetQuaternion.current,
          1 - Math.exp(-14 * Math.min(delta, 0.1)),
        );
      }
    } else {
      body.setLinvel({ x: 0, y: velocity.y, z: 0 }, true);
    }

    if (Math.abs(velocity.y) < 0.08) {
      groundedFrames.current += 1;
    } else {
      groundedFrames.current = 0;
    }

    if (controls.jump && groundedFrames.current > 3) {
      body.setLinvel({ x: velocity.x, y: 4.8, z: velocity.z }, true);
      groundedFrames.current = 0;
    }

    if ((movement.moving || driveActive) && groundedFrames.current > 3) {
      const now = performance.now();
      const interval = controls.run ? 290 : 420;
      if (now - lastFootstepAt.current >= interval) {
        window.dispatchEvent(new Event(FOOTSTEP_EVENT));
        lastFootstepAt.current = now;
      }
    }

    const movingSpeed = Math.hypot(velocity.x, velocity.z);
    const gait = Math.min(1, movingSpeed / 5);
    const gaitSpeed = controls.run ? 13 : 9;
    const stride = Math.sin(performance.now() * 0.001 * gaitSpeed) * 0.58 * gait;
    if (bodyVisualRef.current) {
      bodyVisualRef.current.position.y = Math.sin(performance.now() * 0.0022) * 0.018 +
        Math.abs(stride) * 0.035;
      bodyVisualRef.current.rotation.z = -stride * 0.035;
    }
    if (leftArmRef.current) leftArmRef.current.rotation.x = stride;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -stride;
    if (leftLegRef.current) leftLegRef.current.rotation.x = -stride * 0.7;
    if (rightLegRef.current) rightLegRef.current.rotation.x = stride * 0.7;

    if (e2eEnabled.current) {
      const position = body.translation();
      (window as E2EWindow).__MUSIC_UNIVERSE_E2E__ = {
        playerPosition: [position.x, position.y, position.z],
        playerQuaternion: model.quaternion.toArray(),
        cameraPosition: camera.position.toArray(),
        cameraQuaternion: camera.quaternion.toArray(),
        velocity: [velocity.x, velocity.y, velocity.z],
        cameraOccludedMaterials: (window as E2EWindow).__MUSIC_UNIVERSE_E2E__
          ?.cameraOccludedMaterials,
        setPlayerTransform(position, yaw) {
          body.setTranslation({ x: position[0], y: position[1], z: position[2] }, true);
          body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          model.rotation.set(0, yaw, 0);
        },
        drivePlayer(velocity, durationMs) {
          e2eDrive.current = {
            velocity,
            until: performance.now() + Math.max(0, durationMs),
          };
        },
      };
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      name="player"
      position={[0, 2, 0]}
      colliders={false}
      enabledRotations={[false, false, false]}
      linearDamping={2}
      canSleep={false}
    >
      <CapsuleCollider args={[0.35, 0.3]} />
      <group
        ref={modelRef}
        name="player-model"
        position={[0, -0.65, 0]}
        rotation={[0, Math.PI, 0]}
        userData={{ cameraOccluder: false }}
      >
        <group ref={bodyVisualRef}>
        <mesh castShadow position={[0, 0.14, 0]}>
          <capsuleGeometry args={[0.3, 0.58, 8, 16]} />
          <meshStandardMaterial color="#d83c50" roughness={0.48} metalness={0.08} />
        </mesh>
        <mesh castShadow position={[0, 0.63, 0]}>
          <sphereGeometry args={[0.31, 16, 12]} />
          <meshStandardMaterial color="#f0d2bd" roughness={0.72} />
        </mesh>
        <mesh castShadow position={[0, 0.69, 0.18]} rotation={[0.12, 0, 0]}>
          <sphereGeometry args={[0.27, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
          <meshStandardMaterial color="#24243a" roughness={0.38} />
        </mesh>
        <mesh castShadow position={[0, 0.22, -0.25]}>
          <boxGeometry args={[0.42, 0.48, 0.16]} />
          <meshStandardMaterial color="#37466f" roughness={0.58} metalness={0.18} />
        </mesh>
        {[-1, 1].map((side) => (
          <group
            key={`arm-${side}`}
            ref={side < 0 ? leftArmRef : rightArmRef}
            position={[side * 0.37, 0.3, 0]}
          >
            <mesh castShadow position={[0, -0.21, 0]}>
              <capsuleGeometry args={[0.085, 0.28, 6, 10]} />
              <meshStandardMaterial color="#d83c50" roughness={0.5} />
            </mesh>
          </group>
        ))}
        {[-1, 1].map((side) => (
          <group
            key={`leg-${side}`}
            ref={side < 0 ? leftLegRef : rightLegRef}
            position={[side * 0.15, -0.18, 0]}
          >
            <mesh castShadow position={[0, -0.25, 0]}>
              <capsuleGeometry args={[0.1, 0.3, 6, 10]} />
              <meshStandardMaterial color="#283454" roughness={0.6} />
            </mesh>
          </group>
        ))}
        <group position={[0, 0.62, 0.285]}>
          {[-0.11, 0.11].map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <sphereGeometry args={[0.045, 10, 8]} />
              <meshStandardMaterial color="#17203d" roughness={0.25} />
            </mesh>
          ))}
        </group>
        <pointLight color="#ff5c70" intensity={0.45} distance={2.8} position={[0, 0.18, 0.18]} />
        </group>
      </group>
    </RigidBody>
  );
}
