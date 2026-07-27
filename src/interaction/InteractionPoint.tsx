import { InteractionPointDefinition } from './interactionTypes';
import { Html } from '@react-three/drei';
import { CapsuleCollider, CuboidCollider, RigidBody } from '@react-three/rapier';
import { useInteractionStore } from '../state/useInteractionStore';
import { visualRegistry } from './visualRegistry';
import { InteractionDispatcher } from './InteractionDispatcher';

interface Props {
  definition: InteractionPointDefinition;
}

function InteractionCollider({ definition }: Props) {
  const type = definition.visual.type;

  if (type === 'building') {
    return <CuboidCollider args={[4, 2.6, 2.8]} position={[0, 2.6, 0]} />;
  }
  if (type === 'phone-booth') {
    return <CuboidCollider args={[1.1, 0.9, 0.55]} position={[0, 0.9, 0]} />;
  }
  if (type === 'vehicle') {
    return <CuboidCollider args={[1, 0.8, 0.55]} position={[0, 0.8, 0]} />;
  }
  if (type === 'npc') {
    return <CapsuleCollider args={[0.4, 0.4]} position={[0, 0.8, 0]} />;
  }
  if (type === 'crate') {
    return <CuboidCollider args={[0.5, 0.5, 0.5]} position={[0, 0.5, 0]} />;
  }

  // Portals stay physically traversable.
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
      <Html position={[0, definition.visual.type === 'building' ? 6 : 2.5, 0]} center distanceFactor={10}>
        <div className={`transition-opacity duration-300 ${isNearest ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-ink text-white px-3 py-1 rounded-sm text-sm font-display whitespace-nowrap border-2 border-white shadow-lg">
            {definition.label}
          </div>
        </div>
      </Html>
    </group>
  );
}
