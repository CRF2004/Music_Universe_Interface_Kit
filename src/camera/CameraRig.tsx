import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { easing } from 'maath';
import { useWorldStore } from '../state/useWorldStore';
import { cameraPresets } from './cameraPresets';

export default function CameraRig() {
  const { camera, scene } = useThree();
  const currentMode = useWorldStore((state) => state.currentCameraMode);
  const preset = cameraPresets[currentMode] || cameraPresets.explore;

  const playerRef = useRef<THREE.Object3D | null>(null);
  const lookAtTarget = useRef(new THREE.Vector3());
  const smoothedPlayerQuat = useRef(new THREE.Quaternion());

  useFrame((state, delta) => {
    // Cap delta to prevent massive jumps after tab focus or initial load
    const dt = Math.min(delta, 0.1);

    if (!playerRef.current) {
      playerRef.current = scene.getObjectByName('player');
      if (playerRef.current) {
        // Immediate sync on first find to avoid starting from [0,0,0]
        lookAtTarget.current.copy(playerRef.current.position).add(new THREE.Vector3(0, preset.lookAtHeight, 0));
        smoothedPlayerQuat.current.copy(playerRef.current.quaternion);
        camera.position.copy(playerRef.current.position).add(new THREE.Vector3(0, preset.height, -preset.distance));
      }
      return;
    }

    // Smoothly damp player position and rotation tracking
    const playerPos = playerRef.current.position;
    const playerQuat = playerRef.current.quaternion;
    
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
    
    // Update FOV
    easing.damp(camera, 'fov', preset.fov, preset.followSharpness, dt);
    camera.updateProjectionMatrix();
  });

  return null;
}
