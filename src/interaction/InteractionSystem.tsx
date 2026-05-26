import { useFrame, useThree } from '@react-three/fiber';
import { useInteractionStore } from '../state/useInteractionStore';
import * as THREE from 'three';
import { useEffect } from 'react';
import { InteractionDispatcher } from './InteractionDispatcher';

export default function InteractionSystem() {
  const { scene } = useThree();
  const setNearestInteraction = useInteractionStore((state) => state.setNearestInteraction);
  const interactions = useInteractionStore((state) => state.interactions);
  const nearestId = useInteractionStore((state) => state.nearestInteractionId);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && nearestId) {
        InteractionDispatcher.executeInteraction(nearestId, 'proximity'); // We use proximity as the default 'E' trigger type or logic
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nearestId]);

  useFrame(() => {
    const player = scene.getObjectByName('player');
    if (!player) return;

    let minBoardDist = Infinity;
    let nearestId: string | null = null;

    interactions.forEach((item) => {
      if (!item.enabled) return;
      
      const itemPos = new THREE.Vector3(...item.position);
      const dist = player.position.distanceTo(itemPos);
      
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
