import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { easing } from 'maath';
import { useWorldStore } from '../state/useWorldStore';
import { cameraPresets } from './cameraPresets';

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
  const preset = cameraPresets[currentMode] || cameraPresets.explore;

  const playerRef = useRef<THREE.Object3D | null>(null);
  const playerModelRef = useRef<THREE.Object3D | null>(null);
  const lookAtTarget = useRef(new THREE.Vector3());
  const smoothedPlayerQuat = useRef(new THREE.Quaternion());
  const playerWorldPosition = useRef(new THREE.Vector3());
  const playerWorldQuaternion = useRef(new THREE.Quaternion());
  const raycaster = useRef(new THREE.Raycaster());
  const rayDirection = useRef(new THREE.Vector3());
  const occludedMaterials = useRef(new Map<THREE.Material, MaterialSnapshot>());

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
    
    if (isNaN(playerPos.x) || isNaN(playerPos.y) || isNaN(playerPos.z)) return;
    
    // Calculate relative offset based on preset rules
    const targetQuat = new THREE.Quaternion();
    
    if (preset.followRotation) {
      const euler = new THREE.Euler().setFromQuaternion(playerQuat, 'YXZ');
      targetQuat.setFromEuler(new THREE.Euler(0, euler.y, 0));
    } else {
      // Use fixed world heading
      targetQuat.setFromEuler(new THREE.Euler(0, preset.fixedHeading || 0, 0));
    }
    
    // Smooth the rotation tracking (frame-rate independent)
    const rotationSpeed = 10;
    smoothedPlayerQuat.current.slerp(targetQuat, 1 - Math.exp(-rotationSpeed * dt));
    
    const offset = new THREE.Vector3(preset.shoulderOffset || 0, preset.height, -preset.distance);
    offset.applyQuaternion(smoothedPlayerQuat.current);
    
    const targetPos = new THREE.Vector3().copy(playerPos).add(offset);
    const idealLookAt = new THREE.Vector3().copy(playerPos).add(new THREE.Vector3(0, preset.lookAtHeight, 0));

    // Smoothly damp position
    easing.damp3(camera.position, targetPos, preset.followSharpness, dt);
    
    // Smoothly damp look-at target to eliminate micro-jitter
    easing.damp3(lookAtTarget.current, idealLookAt, preset.rotationSharpness || 0.2, dt);

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
    easing.damp(camera, 'fov', preset.fov, preset.followSharpness, dt);
    camera.updateProjectionMatrix();
  });

  return null;
}
