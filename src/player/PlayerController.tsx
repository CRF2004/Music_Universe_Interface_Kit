import { useKeyboardControls } from '@react-three/drei';
import { CapsuleCollider, RigidBody, useBeforePhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { resolvePlayerMovement } from './playerMovement';
import { FOOTSTEP_EVENT } from '../audio/audioEvents';
import { useProjectStore } from '../state/useProjectStore';
import { planetRadius, surfaceUp, surfacePosition } from '../world/planetSurface';
import { useWorldStore } from '../state/useWorldStore';
import { useInteractionStore } from '../state/useInteractionStore';
import { getWorldLook } from '../world/worldLooks';
import { interactionEventBus } from '../interaction/interactionRuntime';
import { PaperWheel } from '../world/WindGardenVisuals';
import { WIND } from '../interaction/windGardenRuntime';

interface MovementControls {
  forward: boolean;
  backward: boolean;
  leftward: boolean;
  rightward: boolean;
  jump: boolean;
  run: boolean;
}

interface PlayerE2ETelemetry {
  owner: symbol;
  playerPosition: [number, number, number];
  playerQuaternion: [number, number, number, number];
  cameraPosition: [number, number, number];
  cameraQuaternion: [number, number, number, number];
  velocity: [number, number, number];
  groundUp: [number, number, number];
  grounded: boolean;
  animationState: 'idle' | 'walk' | 'run';
  cameraOccludedMaterials?: number;
  getPlayerPosition: () => [number, number, number];
  setPlayerTransform: (position: [number, number, number], yaw: number) => void;
  drivePlayer: (velocity: [number, number, number], durationMs: number) => void;
}

type E2EWindow = Window & {
  __MUSIC_UNIVERSE_E2E__?: PlayerE2ETelemetry;
};

export default function PlayerController() {
  const carryingWind = useInteractionStore(state => state.interactionFlags[WIND.carried] === true && state.interactionFlags[WIND.planted] !== true);
  const bodyRef = useRef<RapierRigidBody>(null);
  const terrain = useProjectStore((state) => state.project.scene.environment.terrain);
  const spawn = useProjectStore((state) => state.project.scene.spawn ?? [0, 0, 0]);
  const radius = planetRadius(terrain);
  const lookId = useProjectStore(state => state.project.scene.environment.look);
  const coastal = Boolean(getWorldLook(lookId));
  const { world, rapier } = useRapier();
  const groundUp = useRef(new THREE.Vector3(0, 1, 0));
  const tangentVelocity = useRef(new THREE.Vector3());
  const localDirection = useRef(new THREE.Vector3());
  const bodySurfaceFrame = useRef(new THREE.Quaternion());
  const previousGroundUp = useRef(new THREE.Vector3(0, 1, 0));

  useBeforePhysicsStep(() => {
    const body = bodyRef.current;
    if (!body || radius === null) return;
    const position = body.translation();
    const up = surfaceUp([position.x, position.y, position.z], radius);
    const gravity = -9.81 * body.mass() * world.timestep;
    body.applyImpulse({ x: up.x * gravity, y: up.y * gravity, z: up.z * gravity }, true);
  });
  const modelRef = useRef<THREE.Group>(null);
  const bodyVisualRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
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
  const e2eOwner = useRef(Symbol('player-e2e-owner'));

  useEffect(() => interactionEventBus.subscribe(event => {
    if (event.type !== 'interaction.runtime-reset' || event.reason !== 'restart') return;
    const body = bodyRef.current;
    if (!body) return;
    const position = surfacePosition([spawn[0],spawn[1] + .7,spawn[2]],radius);
    body.setTranslation({x:position[0],y:position[1],z:position[2]},true);
    body.setLinvel({x:0,y:0,z:0},true);
    body.setAngvel({x:0,y:0,z:0},true);
    const up = surfaceUp(position,radius);
    previousGroundUp.current.copy(up);
    bodySurfaceFrame.current.setFromUnitVectors(new THREE.Vector3(0,1,0),up);
    modelRef.current?.quaternion.copy(bodySurfaceFrame.current);
    groundedFrames.current = 0;
    e2eDrive.current = null;
  }),[spawn,radius]);

  useEffect(() => {
    if (!e2eEnabled.current) return undefined;
    return () => {
      const e2eWindow = window as E2EWindow;
      if (e2eWindow.__MUSIC_UNIVERSE_E2E__?.owner === e2eOwner.current) {
        delete e2eWindow.__MUSIC_UNIVERSE_E2E__;
      }
    };
  }, []);

  useFrame((_, delta) => {
    const body = bodyRef.current;
    const model = modelRef.current;
    if (!body || !model) return;

    const worldState = useWorldStore.getState();
    const editing = useProjectStore.getState().editorMode !== null || worldState.helpOpen || worldState.isPaused || useInteractionStore.getState().activePanelId !== null;
    const controls = editing
      ? { forward: false, backward: false, leftward: false, rightward: false, jump: false, run: false }
      : getControls();
    const velocity = body.linvel();
    const position = body.translation();
    const positionTuple: [number, number, number] = [position.x, position.y, position.z];
    groundUp.current.copy(surfaceUp(positionTuple, radius));
    bodySurfaceFrame.current.premultiply(new THREE.Quaternion().setFromUnitVectors(previousGroundUp.current, groundUp.current)).normalize();
    previousGroundUp.current.copy(groundUp.current);
    const upRotation = bodySurfaceFrame.current;
    body.setRotation(upRotation, true);
    const radialVelocity = new THREE.Vector3(velocity.x, velocity.y, velocity.z).dot(groundUp.current);
    const groundRay = new rapier.Ray(position, { x: -groundUp.current.x, y: -groundUp.current.y, z: -groundUp.current.z });
    const groundHit = world.castRay(groundRay, 0.8, true, undefined, undefined, undefined, body, (collider) => !collider.isSensor());
    const grounded = groundHit !== null && groundHit.timeOfImpact <= 0.73 && radialVelocity < 0.8;
    const drive = e2eDrive.current;
    const driveActive =
      !editing && e2eEnabled.current && drive !== null && performance.now() < drive.until;
    if (drive && !driveActive) e2eDrive.current = null;

    camera.getWorldDirection(cameraForward.current);
    const movement = resolvePlayerMovement(controls, cameraForward.current, camera.up, groundUp.current);

    if (driveActive && drive) {
      tangentVelocity.current.set(...drive.velocity).projectOnPlane(groundUp.current).addScaledVector(groundUp.current, radialVelocity);
      body.setLinvel(
        tangentVelocity.current,
        true,
      );
    } else if (movement.moving) {
      const speed = controls.run ? 7.5 : 5;
      tangentVelocity.current.copy(movement.direction).multiplyScalar(speed).addScaledVector(groundUp.current, radialVelocity);
      body.setLinvel(
        tangentVelocity.current,
        true,
      );

      if (movement.updateFacing) {
        localDirection.current.copy(movement.direction).applyQuaternion(upRotation.clone().invert());
        targetEuler.current.set(
          0,
          Math.atan2(localDirection.current.x, localDirection.current.z),
          0,
        );
        targetQuaternion.current.setFromEuler(targetEuler.current);
        model.quaternion.slerp(
          targetQuaternion.current,
          1 - Math.exp(-14 * Math.min(delta, 0.1)),
        );
      }
    } else {
      body.setLinvel(tangentVelocity.current.copy(groundUp.current).multiplyScalar(radialVelocity), true);
    }

    if (grounded) {
      groundedFrames.current += 1;
    } else {
      groundedFrames.current = 0;
    }

    if (controls.jump && groundedFrames.current > 3) {
      const currentVelocity = body.linvel();
      tangentVelocity.current.set(currentVelocity.x, currentVelocity.y, currentVelocity.z).projectOnPlane(groundUp.current).addScaledVector(groundUp.current, 4.8);
      body.setLinvel(tangentVelocity.current, true);
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

    // Rapier's velocity snapshot above predates this frame's movement command.
    // Read it again so gait and the E2E probe reflect the velocity we applied
    // instead of lagging one render frame behind.
    const animationVelocity = body.linvel();
    const movingSpeed = tangentVelocity.current.set(animationVelocity.x, animationVelocity.y, animationVelocity.z).projectOnPlane(groundUp.current).length();
    const moving = movingSpeed > 0.15;
    const running = moving && (controls.run || movingSpeed > 6.2);
    const animationState = moving ? (running ? 'run' : 'walk') : 'idle';
    const gait = Math.min(1, movingSpeed / (running ? 7.5 : 5));
    const gaitSpeed = running ? 13.5 : 8.5;
    const stride = Math.sin(performance.now() * 0.001 * gaitSpeed) *
      (running ? 0.78 : 0.52) * gait;
    const idleBreath = Math.sin(performance.now() * 0.0018);
    if (bodyVisualRef.current) {
      bodyVisualRef.current.position.y = moving
        ? Math.abs(stride) * (running ? 0.045 : 0.028)
        : idleBreath * 0.012;
      bodyVisualRef.current.rotation.x = running ? -0.11 : moving ? -0.035 : 0;
      bodyVisualRef.current.rotation.z = moving ? -stride * 0.025 : idleBreath * 0.008;
    }
    if (headRef.current) {
      headRef.current.rotation.y = moving ? -stride * 0.055 : Math.sin(performance.now() * 0.00075) * 0.055;
      headRef.current.rotation.z = idleBreath * 0.012;
    }
    if (leftArmRef.current) leftArmRef.current.rotation.x = stride * (running ? 1 : 0.82);
    if (rightArmRef.current) rightArmRef.current.rotation.x = -stride * (running ? 1 : 0.82);
    if (leftLegRef.current) leftLegRef.current.rotation.x = -stride;
    if (rightLegRef.current) rightLegRef.current.rotation.x = stride;

    if (e2eEnabled.current) {
      const position = body.translation();
      (window as E2EWindow).__MUSIC_UNIVERSE_E2E__ = {
        owner: e2eOwner.current,
        playerPosition: [position.x, position.y, position.z],
        playerQuaternion: model.quaternion.toArray(),
        cameraPosition: camera.position.toArray(),
        cameraQuaternion: camera.quaternion.toArray(),
        velocity: [animationVelocity.x, animationVelocity.y, animationVelocity.z],
        groundUp: groundUp.current.toArray(),
        grounded,
        animationState,
        cameraOccludedMaterials: (window as E2EWindow).__MUSIC_UNIVERSE_E2E__
          ?.cameraOccludedMaterials,
        getPlayerPosition() {
          const current = body.translation();
          return [current.x, current.y, current.z];
        },
        setPlayerTransform(position, yaw) {
          e2eDrive.current = null;
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
      position={surfacePosition([spawn[0], spawn[1] + 2, spawn[2]], radius)}
      colliders={false}
      enabledRotations={[false, false, false]}
      linearDamping={0}
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
        {carryingWind && <group name="carried-paper-wheel" position={[.35, .55, .25]} scale={.6}><PaperWheel /></group>}
        <mesh castShadow position={[0, 0.68, 0]}>
          <capsuleGeometry args={[0.24, 0.52, 8, 16]} />
          <meshStandardMaterial color={coastal ? '#c9826c' : '#d83c50'} roughness={coastal ? .9 : .48} metalness={coastal ? 0 : .08} />
        </mesh>
        <group ref={headRef} position={[0, 1.2, 0]}>
          {coastal && <group position={[0,.12,0]}><mesh castShadow><cylinderGeometry args={[.32,.33,.045,16]} /><meshStandardMaterial color="#d9c99d" roughness={1} /></mesh><mesh castShadow position={[0,.08,0]}><cylinderGeometry args={[.19,.26,.18,12]} /><meshStandardMaterial color="#e6d7b5" roughness={1} /></mesh><mesh position={[0,.025,0]}><cylinderGeometry args={[.26,.26,.035,12]} /><meshStandardMaterial color="#697859" roughness={1} /></mesh></group>}
          <mesh castShadow>
            <sphereGeometry args={[0.235, 18, 14]} />
            <meshStandardMaterial color="#f0d2bd" roughness={0.72} />
          </mesh>
          <mesh castShadow position={[0, 0.035, 0.15]} rotation={[0.12, 0, 0]}>
            <sphereGeometry args={[0.205, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
            <meshStandardMaterial color="#24243a" roughness={0.38} />
          </mesh>
          <group position={[0, 0, 0.225]}>
            {[-0.085, 0.085].map((x) => (
              <mesh key={x} position={[x, 0, 0]}>
                <sphereGeometry args={[0.032, 10, 8]} />
                <meshStandardMaterial color={coastal ? '#304a42' : '#b7e8ff'} emissive="#4aaeff" emissiveIntensity={coastal ? 0 : .7} roughness={coastal ? .9 : .25} />
              </mesh>
            ))}
          </group>
        </group>
        <mesh castShadow position={[0, 0.69, -0.245]}>
          <boxGeometry args={[0.4, 0.5, 0.15]} />
          <meshStandardMaterial color={coastal ? '#9e835c' : '#37466f'} roughness={coastal ? .9 : .58} metalness={coastal ? 0 : .18} />
        </mesh>
        {[-1, 1].map((side) => (
          <group
            key={`arm-${side}`}
            ref={side < 0 ? leftArmRef : rightArmRef}
            position={[side * 0.3, 0.88, 0]}
          >
            <mesh castShadow position={[0, -0.23, 0]}>
              <capsuleGeometry args={[0.07, 0.34, 6, 10]} />
              <meshStandardMaterial color={coastal ? '#c9826c' : '#d83c50'} roughness={coastal ? .9 : .5} />
            </mesh>
          </group>
        ))}
        {[-1, 1].map((side) => (
          <group
            key={`leg-${side}`}
            ref={side < 0 ? leftLegRef : rightLegRef}
            position={[side * 0.13, 0.39, 0]}
          >
            <mesh castShadow position={[0, -0.2, 0]}>
              <capsuleGeometry args={[0.085, 0.34, 6, 10]} />
              <meshStandardMaterial color="#283454" roughness={0.6} />
            </mesh>
            <mesh castShadow position={[0, -0.4, 0.055]} scale={[0.15, 0.08, 0.24]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#17223d" roughness={0.55} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.72, 0.245]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.13, 0.13, 0.035]} />
          <meshStandardMaterial color="#ffd4dd" emissive="#ff5c70" emissiveIntensity={0.8} roughness={0.32} />
        </mesh>
        <pointLight color="#ff5c70" intensity={0.45} distance={2.8} position={[0, 0.72, 0.18]} />
        </group>
      </group>
    </RigidBody>
  );
}
