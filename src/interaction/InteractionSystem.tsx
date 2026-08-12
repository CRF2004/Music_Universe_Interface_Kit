import { useFrame, useThree } from '@react-three/fiber';
import { useInteractionStore } from '../state/useInteractionStore';
import * as THREE from 'three';
import { useEffect } from 'react';
import { InteractionDispatcher } from './InteractionDispatcher';
import {
  blocksWorldInteractionKey,
  horizontalInteractionDistance,
} from './interactionInput';

export default function InteractionSystem() {
  const { scene } = useThree();
  const setNearestInteraction = useInteractionStore((state) => state.setNearestInteraction);
  const interactions = useInteractionStore((state) => state.interactions);
  const nearestId = useInteractionStore((state) => state.nearestInteractionId);
  const playerPosition = new THREE.Vector3();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      const editing =
        target instanceof HTMLElement && blocksWorldInteractionKey(target);
      if (e.code === 'KeyE' && nearestId && !editing) {
        e.preventDefault();
        InteractionDispatcher.executeInteraction(nearestId, 'proximity'); // We use proximity as the default 'E' trigger type or logic
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nearestId]);

  useEffect(() => {
    const handlePointerInteraction = (event: MouseEvent) => {
      if (event.button !== 0 || document.pointerLockElement?.tagName !== 'CANVAS') return;
      const currentNearestId = useInteractionStore.getState().nearestInteractionId;
      if (!currentNearestId) return;
      event.preventDefault();
      InteractionDispatcher.executeInteraction(currentNearestId, 'click');
    };
    window.addEventListener('mousedown', handlePointerInteraction);
    return () => window.removeEventListener('mousedown', handlePointerInteraction);
  }, []);

  useFrame(() => {
    const player = scene.getObjectByName('player');
    if (!player) return;
    player.getWorldPosition(playerPosition);

    let minBoardDist = Infinity;
    let nearestId: string | null = null;

    interactions.forEach((item) => {
      if (!item.enabled) return;
      
      const dist = horizontalInteractionDistance(
        [playerPosition.x, playerPosition.y, playerPosition.z],
        item.position,
      );
      
      if (dist < (item.radius || 3) && dist < minBoardDist) {
        minBoardDist = dist;
        nearestId = item.id;
      }
    });

    if (nearestId !== useInteractionStore.getState().nearestInteractionId) {
      setNearestInteraction(nearestId);
    }
  });

  return null;
}
