import { useKeyboardControls } from '@react-three/drei';
import { CapsuleCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

interface MovementControls {
  forward: boolean;
  backward: boolean;
  leftward: boolean;
  rightward: boolean;
  jump: boolean;
  run: boolean;
}

export default function PlayerController() {
  const bodyRef = useRef<RapierRigidBody>(null);
  const modelRef = useRef<THREE.Group>(null);
  const groundedFrames = useRef(0);
  const getControls = useKeyboardControls<keyof MovementControls>()[1];
  const camera = useThree((state) => state.camera);
  const cameraForward = useRef(new THREE.Vector3());
  const cameraRight = useRef(new THREE.Vector3());
  const moveDirection = useRef(new THREE.Vector3());
  const targetQuaternion = useRef(new THREE.Quaternion());
  const targetEuler = useRef(new THREE.Euler());

  useFrame((_, delta) => {
    const body = bodyRef.current;
    const model = modelRef.current;
    if (!body || !model) return;

    const controls = getControls();
    const velocity = body.linvel();

    camera.getWorldDirection(cameraForward.current);
    cameraForward.current.y = 0;
    if (cameraForward.current.lengthSq() < 0.001) cameraForward.current.set(0, 0, -1);
    cameraForward.current.normalize();
    cameraRight.current.crossVectors(cameraForward.current, camera.up).normalize();

    const forwardInput = Number(controls.forward) - Number(controls.backward);
    const rightInput = Number(controls.rightward) - Number(controls.leftward);
    moveDirection.current
      .copy(cameraForward.current)
      .multiplyScalar(forwardInput)
      .addScaledVector(cameraRight.current, rightInput);

    if (moveDirection.current.lengthSq() > 0) {
      moveDirection.current.normalize();
      const speed = controls.run ? 7.5 : 5;
      body.setLinvel(
        {
          x: moveDirection.current.x * speed,
          y: velocity.y,
          z: moveDirection.current.z * speed,
        },
        true,
      );

      targetEuler.current.set(
        0,
        Math.atan2(moveDirection.current.x, moveDirection.current.z),
        0,
      );
      targetQuaternion.current.setFromEuler(targetEuler.current);
      model.quaternion.slerp(
        targetQuaternion.current,
        1 - Math.exp(-14 * Math.min(delta, 0.1)),
      );
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
