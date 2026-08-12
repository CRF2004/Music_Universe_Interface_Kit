import { InteractionPointDefinition } from './interactionTypes';
import { Html } from '@react-three/drei';
import { CapsuleCollider, CuboidCollider, RigidBody } from '@react-three/rapier';
import { useInteractionStore } from '../state/useInteractionStore';
import { visualRegistry } from './visualRegistry';
import { InteractionDispatcher } from './InteractionDispatcher';
import { getInteractionVisualProfile } from './visualProfiles';
import { useMusicRuntimeStore } from '../music/runtime/useMusicRuntimeStore';

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
  const bloom = useMusicRuntimeStore((state) => state.environment.bloomIntensity ?? 0.25);
  const isArchive = definition.id === 'memory-archive';

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
      {isArchive && (
        <group position={[0, 0.04, 7.65]} userData={{ cameraOccluder: false }}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.35, 2.35, 48]} />
            <meshBasicMaterial
              color="#b89cff"
              transparent
              opacity={0.14 + Math.min(bloom, 1.2) * 0.14}
              depthWrite={false}
            />
          </mesh>
          <pointLight
            color="#a98aff"
            intensity={0.45 + bloom * 0.55}
            distance={11}
            position={[0, 2.2, 0]}
          />
        </group>
      )}

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
