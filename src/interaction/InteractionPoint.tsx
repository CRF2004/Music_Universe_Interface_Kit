import { InteractionPointDefinition } from './interactionTypes';
import { Float, Html } from '@react-three/drei';
import { useInteractionStore } from '../state/useInteractionStore';
import { visualRegistry } from './visualRegistry';
import { InteractionDispatcher } from './InteractionDispatcher';

interface Props {
  definition: InteractionPointDefinition;
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
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <Visual definition={definition} onClick={handlePointerClick} />
      </Float>

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
