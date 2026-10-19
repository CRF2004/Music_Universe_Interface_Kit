import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { easing } from 'maath';
import { useWorldStore } from '../state/useWorldStore';
import { cameraPresets } from './cameraPresets';
import { applyOrbitMouseDelta } from './thirdPersonCameraInput';
import { useProjectStore } from '../state/useProjectStore';
import { planetRadius, surfaceUp } from '../world/planetSurface';
import { getWorldLook } from '../world/worldLooks';
import { useInteractionStore } from '../state/useInteractionStore';
import { interactionEventBus } from '../interaction/interactionRuntime';

interface MaterialSnapshot {
  transparent: boolean;
  opacity: number;
  depthWrite: boolean;
}

function canOccludeCamera(object: THREE.Object3D): object is THREE.Mesh {
  if (!(object instanceof THREE.Mesh)) return false;
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current.userData.cameraOccluder === false) return false;
    if (current.name === 'player' || current.name === 'player-model' || current.name === 'world-ground') {
      return false;
    }
    current = current.parent;
  }
  return true;
}

export default function CameraRig() {
  const { camera, scene } = useThree();
  const currentMode = useWorldStore((state) => state.currentCameraMode);
  const reducedEffects = useWorldStore((state) => state.reducedEffects);
  const lookId = useProjectStore(state => state.project.scene.environment.look);
  const look = getWorldLook(lookId);
  const panel = useInteractionStore(state => state.activePanelId);
  const dialogue = look ? Object.entries(look.dialogue).find(([id]) => id === panel)?.[1] : undefined;
  const basePreset = cameraPresets[currentMode] || cameraPresets.explore;
  const preset = look && currentMode === 'explore' ? { ...basePreset, ...look.camera } : basePreset;

  const playerRef = useRef<THREE.Object3D | null>(null);
  const playerModelRef = useRef<THREE.Object3D | null>(null);
  const lookAtTarget = useRef(new THREE.Vector3());
  const smoothedPlayerQuat = useRef(new THREE.Quaternion());
  const playerWorldPosition = useRef(new THREE.Vector3());
  const playerWorldQuaternion = useRef(new THREE.Quaternion());
  const raycaster = useRef(new THREE.Raycaster());
  const rayDirection = useRef(new THREE.Vector3());
  const occludedMaterials = useRef(new Map<THREE.Material, MaterialSnapshot>());
  const orbitAngles = useRef({ yaw: Math.PI, pitch: 0.18 });
  const previousUp = useRef(new THREE.Vector3(0, 1, 0));
  const surfaceFrame = useRef(new THREE.Quaternion());

  useEffect(() => interactionEventBus.subscribe(event => {
    if (event.type !== 'interaction.runtime-reset' || event.reason !== 'restart') return;
    orbitAngles.current = { yaw:Math.PI,pitch:.18 };
    previousUp.current.set(0,1,0);
    surfaceFrame.current.identity();
  }),[]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement?.tagName !== 'CANVAS') return;
      orbitAngles.current = applyOrbitMouseDelta(
        orbitAngles.current,
        event.movementX,
        event.movementY,
      );
    };
    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const restoreOccludedMaterials = () => {
    occludedMaterials.current.forEach((snapshot, material) => {
      material.transparent = snapshot.transparent;
      material.opacity = snapshot.opacity;
      material.depthWrite = snapshot.depthWrite;
      material.needsUpdate = true;
    });
    occludedMaterials.current.clear();
  };

  useEffect(() => restoreOccludedMaterials, []);

  useFrame((_, delta) => {
    if (useProjectStore.getState().editorMode === 'drag') {
      restoreOccludedMaterials();
      return;
    }
    // Cap delta to prevent massive jumps after tab focus or initial load
    const dt = Math.min(delta, 0.1);

    if (!playerRef.current) {
      playerRef.current = scene.getObjectByName('player');
      playerModelRef.current = scene.getObjectByName('player-model');
      if (playerRef.current && playerModelRef.current) {
        // Immediate sync on first find to avoid starting from [0,0,0]
        playerRef.current.getWorldPosition(playerWorldPosition.current);
        playerModelRef.current.getWorldQuaternion(playerWorldQuaternion.current);
        lookAtTarget.current.copy(playerWorldPosition.current).add(new THREE.Vector3(0, preset.lookAtHeight, 0));
        smoothedPlayerQuat.current.copy(playerWorldQuaternion.current);
        const initialOffset = new THREE.Vector3(0, preset.height, -preset.distance)
          .applyQuaternion(smoothedPlayerQuat.current);
        camera.position.copy(playerWorldPosition.current).add(initialOffset);
      }
      return;
    }

    if (!playerModelRef.current) {
      playerModelRef.current = scene.getObjectByName('player-model');
      return;
    }

    // The visible model owns the facing direction while the rigid body stays rotation-locked.
    // Read the model's world quaternion so the camera stays behind the character.
    const playerPos = playerRef.current.getWorldPosition(playerWorldPosition.current);
    const playerQuat = playerModelRef.current.getWorldQuaternion(playerWorldQuaternion.current);
    const radius = planetRadius(useProjectStore.getState().project.scene.environment.terrain);
    const subject = dialogue ? scene.getObjectByName(`${dialogue.objectId}-visual`) : undefined;
    if (dialogue && subject) {
      restoreOccludedMaterials();
      const origin = subject.getWorldPosition(new THREE.Vector3());
      const orientation = subject.getWorldQuaternion(new THREE.Quaternion());
      const position = new THREE.Vector3(...dialogue.position).applyQuaternion(orientation).add(origin);
      const target = new THREE.Vector3(...dialogue.target).applyQuaternion(orientation).add(origin);
      camera.up.copy(surfaceUp(origin.toArray(), radius));
      if (reducedEffects) { camera.position.copy(position); lookAtTarget.current.copy(target); }
      else { easing.damp3(camera.position, position, .32, dt); easing.damp3(lookAtTarget.current, target, .32, dt); }
      camera.lookAt(lookAtTarget.current);
      if (camera instanceof THREE.PerspectiveCamera) {
        if (reducedEffects) camera.fov = dialogue.fov;
        else easing.damp(camera, 'fov', dialogue.fov, .32, dt);
        camera.updateProjectionMatrix();
      }
      return;
    }
    const up = surfaceUp([playerPos.x, playerPos.y, playerPos.z], radius);
    surfaceFrame.current.premultiply(new THREE.Quaternion().setFromUnitVectors(previousUp.current, up));
    previousUp.current.copy(up);
    camera.up.copy(up);
    
    if (isNaN(playerPos.x) || isNaN(playerPos.y) || isNaN(playerPos.z)) return;
    
    // Calculate relative offset based on preset rules
    const targetQuat = new THREE.Quaternion();
    
    if (currentMode === 'explore') {
      targetQuat.copy(surfaceFrame.current).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, orbitAngles.current.yaw, 0)));
    } else if (preset.followRotation) {
      targetQuat.copy(playerQuat);
    } else {
      // Use fixed world heading
      targetQuat.copy(surfaceFrame.current).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, preset.fixedHeading || 0, 0)));
    }
    
    // Smooth the rotation tracking (frame-rate independent)
    const rotationSpeed = 10;
    if (currentMode === 'explore') smoothedPlayerQuat.current.copy(targetQuat);
    else smoothedPlayerQuat.current.slerp(targetQuat, 1 - Math.exp(-rotationSpeed * dt));
    
    const orbitHeight = currentMode === 'explore'
      ? preset.height + Math.sin(orbitAngles.current.pitch) * preset.distance
      : preset.height;
    const orbitDistance = currentMode === 'explore'
      ? Math.cos(orbitAngles.current.pitch) * preset.distance
      : preset.distance;
    const offset = new THREE.Vector3(preset.shoulderOffset || 0, orbitHeight, -orbitDistance);
    offset.applyQuaternion(smoothedPlayerQuat.current);
    
    const targetPos = new THREE.Vector3().copy(playerPos).add(offset);
    const idealLookAt = new THREE.Vector3().copy(playerPos).addScaledVector(up, preset.lookAtHeight);

    // Smoothly damp position
    if (reducedEffects) camera.position.copy(targetPos);
    else easing.damp3(camera.position, targetPos, preset.followSharpness, dt);
    if (radius !== null) {
      const radial = camera.position.clone().add(new THREE.Vector3(0, radius, 0));
      if (radial.length() < radius + 0.6) camera.position.copy(radial.setLength(radius + 0.6)).sub(new THREE.Vector3(0, radius, 0));
    }
    
    // Smoothly damp look-at target to eliminate micro-jitter
    if (reducedEffects) lookAtTarget.current.copy(idealLookAt);
    else easing.damp3(lookAtTarget.current, idealLookAt, preset.rotationSharpness || 0.2, dt);

    // Safeguard lookAt target
    if (!isNaN(lookAtTarget.current.x)) {
      camera.lookAt(lookAtTarget.current);
    }

    restoreOccludedMaterials();
    rayDirection.current.subVectors(camera.position, lookAtTarget.current);
    const cameraDistance = rayDirection.current.length();
    if (cameraDistance > 0.5) {
      rayDirection.current.normalize();
      raycaster.current.set(lookAtTarget.current, rayDirection.current);
      raycaster.current.near = 0.35;
      raycaster.current.far = cameraDistance;

      const intersections = raycaster.current.intersectObjects(scene.children, true);
      intersections.forEach(({ object }) => {
        if (!canOccludeCamera(object)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (!occludedMaterials.current.has(material)) {
            occludedMaterials.current.set(material, {
              transparent: material.transparent,
              opacity: material.opacity,
              depthWrite: material.depthWrite,
            });
          }
          material.transparent = true;
          material.opacity = 0.16;
          material.depthWrite = false;
          material.needsUpdate = true;
        });
      });
    }

    if (
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('e2e')
    ) {
      const e2eWindow = window as Window & {
        __MUSIC_UNIVERSE_E2E__?: { cameraOccludedMaterials?: number };
      };
      if (e2eWindow.__MUSIC_UNIVERSE_E2E__) {
        e2eWindow.__MUSIC_UNIVERSE_E2E__.cameraOccludedMaterials =
          occludedMaterials.current.size;
      }
    }
    
    // Update FOV
    if (reducedEffects && camera instanceof THREE.PerspectiveCamera) camera.fov = preset.fov;
    else easing.damp(camera, 'fov', preset.fov, preset.followSharpness, dt);
    camera.updateProjectionMatrix();
  });

  return null;
}
