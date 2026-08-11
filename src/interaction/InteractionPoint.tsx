import { InteractionPointDefinition } from './interactionTypes';
import { Html } from '@react-three/drei';
import { CapsuleCollider, CuboidCollider, RigidBody } from '@react-three/rapier';
import { useInteractionStore } from '../state/useInteractionStore';
import { visualRegistry } from './visualRegistry';
import { InteractionDispatcher } from './InteractionDispatcher';
import { getInteractionVisualProfile } from './visualProfiles';

interface Props {
  definition: InteractionPointDefinition;
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
