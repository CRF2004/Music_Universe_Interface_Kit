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
}

type E2EWindow = Window & {
  __MUSIC_UNIVERSE_E2E__?: PlayerE2ETelemetry;
};

export default function PlayerController() {
  const bodyRef = useRef<RapierRigidBody>(null);
  const modelRef = useRef<THREE.Group>(null);
  const groundedFrames = useRef(0);
  const lastFootstepAt = useRef(0);
  const getControls = useKeyboardControls<keyof MovementControls>()[1];
  const camera = useThree((state) => state.camera);
  const cameraForward = useRef(new THREE.Vector3());
  const targetQuaternion = useRef(new THREE.Quaternion());
  const targetEuler = useRef(new THREE.Euler());
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

    camera.getWorldDirection(cameraForward.current);
    const movement = resolvePlayerMovement(controls, cameraForward.current, camera.up);

    if (movement.moving) {
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

    if (movement.moving && groundedFrames.current > 3) {
      const now = performance.now();
      const interval = controls.run ? 290 : 420;
      if (now - lastFootstepAt.current >= interval) {
        window.dispatchEvent(new Event(FOOTSTEP_EVENT));
        lastFootstepAt.current = now;
      }
    }

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
        <mesh castShadow>
          <capsuleGeometry args={[0.3, 0.7, 4, 8]} />
          <meshStandardMaterial color="#ff3b2f" />
        </mesh>
        <group position={[0, 0.25, 0.29]}>
          <mesh position={[-0.12, 0, 0]}>
            <boxGeometry args={[0.18, 0.1, 0.08]} />
            <meshStandardMaterial color="white" />
          </mesh>
          <mesh position={[0.12, 0, 0]}>
            <boxGeometry args={[0.18, 0.1, 0.08]} />
            <meshStandardMaterial color="white" />
          </mesh>
          <mesh>
            <boxGeometry args={[0.08, 0.035, 0.08]} />
            <meshStandardMaterial color="white" />
          </mesh>
        </group>
      </group>
    </RigidBody>
  );
}
