import { InteractionPointDefinition } from './interactionTypes';
import { Html } from '@react-three/drei';
import { CapsuleCollider, CuboidCollider, RigidBody } from '@react-three/rapier';
import { useInteractionStore } from '../state/useInteractionStore';
import { visualRegistry } from './visualRegistry';
import { InteractionDispatcher } from './InteractionDispatcher';
import { getInteractionVisualProfile } from './visualProfiles';
import { useMusicRuntimeStore } from '../music/runtime/useMusicRuntimeStore';
import { useWorldStore } from '../state/useWorldStore';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';

interface Props {
  definition: InteractionPointDefinition;
}

function ArchiveAwakening({ awakened, bloom }: { awakened: boolean; bloom: number }) {
  const root = useRef<Group>(null);
  const reducedEffects = useWorldStore((state) => state.reducedEffects);

  useFrame(({ clock }, delta) => {
    if (!root.current) return;
    const targetScale = awakened ? 1.22 : 0.82;
    const nextScale = root.current.scale.x +
      (targetScale - root.current.scale.x) * (1 - Math.exp(-3 * delta));
    root.current.scale.setScalar(nextScale);
    if (!reducedEffects && awakened) root.current.rotation.y = clock.elapsedTime * 0.18;
  });

  return (
    <group ref={root} position={[0, 0.04, 7.65]} userData={{ cameraOccluder: false }}>
      {[0, Math.PI / 2].map((rotation) => (
        <mesh key={rotation} rotation={[-Math.PI / 2, 0, rotation]}>
          <ringGeometry args={[1.35, awakened ? 2.7 : 2.15, 64]} />
          <meshBasicMaterial
            color={awakened ? '#d9c8ff' : '#8f78c7'}
            transparent
            opacity={(awakened ? 0.23 : 0.09) + Math.min(bloom, 1.2) * 0.1}
            depthWrite={false}
          />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 2.2, 0.75, 0]} rotation={[0, 0, side * -0.18]}>
          <octahedronGeometry args={[0.34, 0]} />
          <meshStandardMaterial
            color={awakened ? '#eadfff' : '#6d5f87'}
            emissive="#9d78ff"
            emissiveIntensity={awakened ? 1.8 : 0.18}
            roughness={0.32}
          />
        </mesh>
      ))}
      <pointLight
        color="#a98aff"
        intensity={(awakened ? 1.4 : 0.35) + bloom * 0.45}
        distance={awakened ? 16 : 9}
        position={[0, 2.2, 0]}
      />
    </group>
  );
}

function InteractionCollider({ definition }: Props) {
  const profile = getInteractionVisualProfile(definition.visual.type).collider;

  if (profile.type === 'cuboid') {
    return <CuboidCollider args={profile.halfExtents} position={profile.position} />;
  }
  if (profile.type === 'capsule') {
    return (
      <CapsuleCollider
        args={[profile.halfHeight, profile.radius]}
        position={profile.position}
      />
    );
  }
  return null;
}

export default function InteractionPoint({ definition }: Props) {
  const nearestId = useInteractionStore((state) => state.nearestInteractionId);
  const isNearest = nearestId === definition.id;
  const bloom = useMusicRuntimeStore((state) => state.environment.bloomIntensity ?? 0.25);
  const isArchive = definition.id === 'memory-archive';
  const archiveAwakened = useInteractionStore(
    (state) => state.interactionFlags['memory.received'] === true,
  );

  const handlePointerClick = (e: any) => {
    e.stopPropagation();
    InteractionDispatcher.executeInteraction(definition.id, 'click');
  };

  const Visual = visualRegistry[definition.visual.type] || visualRegistry['crate'];

  return (
    <group position={definition.position} rotation={definition.rotation} scale={definition.scale}>
      <RigidBody type="fixed" colliders={false} name={`${definition.id}-collider`}>
        <InteractionCollider definition={definition} />
      </RigidBody>
      <Visual definition={definition} onClick={handlePointerClick} />
      {isArchive && <ArchiveAwakening awakened={archiveAwakened} bloom={bloom} />}

      {/* Label */}
      <Html
        position={[0, definition.visual.type === 'building' ? 6 : 2.5, 0]}
        center
        distanceFactor={10}
        style={{ pointerEvents: 'none' }}
      >
        <div className={`transition-opacity duration-300 ${isNearest ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-ink text-white px-3 py-1 rounded-sm text-sm font-display whitespace-nowrap border-2 border-white shadow-lg">
            {definition.label}
          </div>
        </div>
      </Html>
    </group>
  );
}
