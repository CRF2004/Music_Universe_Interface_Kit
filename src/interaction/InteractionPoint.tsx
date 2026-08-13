import { InteractionPointDefinition } from './interactionTypes';
import { Html } from '@react-three/drei';
import { CapsuleCollider, CuboidCollider, RigidBody } from '@react-three/rapier';
import { useInteractionStore } from '../state/useInteractionStore';
import { visualRegistry } from './visualRegistry';
import { InteractionDispatcher } from './InteractionDispatcher';
import { consumePointerLockAcquisitionClick } from './interactionInput';
import { getInteractionVisualProfile } from './visualProfiles';
import { useMusicRuntimeStore } from '../music/runtime/useMusicRuntimeStore';
import { useWorldStore } from '../state/useWorldStore';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Color, Mesh, MeshStandardMaterial, type Group } from 'three';

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

function ArchiveFacadeDetail({ awakened }: { awakened: boolean }) {
  const root = useRef<Group>(null);
  const reducedEffects = useWorldStore((state) => state.reducedEffects);

  useFrame(({ clock }, delta) => {
    if (!root.current) return;
    const target = awakened ? 1 : 0;
    const progress = Number(root.current.userData.awakeningProgress ?? 0);
    const next = progress + (target - progress) * (1 - Math.exp(-3.4 * delta));
    root.current.userData.awakeningProgress = next;
    root.current.traverse((object) => {
      if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) return;
      if (object.userData.archiveLight !== true) return;
      object.material.emissiveIntensity = 0.18 + next *
        (reducedEffects ? 0.8 : 1.35 + Math.sin(clock.elapsedTime * 1.8) * 0.16);
    });
  });

  const frameMaterial = (
    <meshStandardMaterial color="#433a59" roughness={0.58} metalness={0.2} />
  );
  const lightMaterial = (
    <meshStandardMaterial
      color="#c8b4ef"
      emissive="#9d78ff"
      emissiveIntensity={0.18}
      roughness={0.34}
      metalness={0.12}
    />
  );

  return (
    <group
      ref={root}
      name="archive-facade-detail"
      position={[0, 0, 7.18]}
      userData={{ awakeningProgress: awakened ? 1 : 0, cameraOccluder: false }}
    >
      <mesh position={[0, 1.72, 0.035]}>
        <boxGeometry args={[3.15, 3.42, 0.18]} />
        <meshStandardMaterial color="#201c2d" roughness={0.9} metalness={0.05} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 1.78, 1.82, 0]} scale={[0.54, 4.05, 0.34]}>
            <boxGeometry args={[1, 1, 1]} />
            {frameMaterial}
          </mesh>
          <mesh
            position={[side * 1.46, 1.82, 0.2]}
            scale={[0.09, 3.36, 0.09]}
            userData={{ archiveLight: true }}
          >
            <boxGeometry args={[1, 1, 1]} />
            {lightMaterial}
          </mesh>
          {[2.72, 3.72].map((height) => (
            <mesh
              key={height}
              position={[side * 3.42, height, -0.02]}
              scale={[2.2, 0.18, 0.22]}
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#65577c" roughness={0.7} metalness={0.12} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 3.66, 0]} scale={[3.92, 0.55, 0.45]}>
        <boxGeometry args={[1, 1, 1]} />
        {frameMaterial}
      </mesh>
      <mesh position={[0, 3.45, 0.23]} scale={[2.82, 0.09, 0.09]} userData={{ archiveLight: true }}>
        <boxGeometry args={[1, 1, 1]} />
        {lightMaterial}
      </mesh>
      <mesh position={[0, 0.035, 1.12]} scale={[2.8, 0.07, 2.35]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#574a70" roughness={0.82} metalness={0.08} />
      </mesh>
      {[0.38, 0.92, 1.46, 2].map((offset) => (
        <mesh key={offset} position={[0, 0.085, offset]} scale={[2.42, 0.035, 0.055]} userData={{ archiveLight: true }}>
          <boxGeometry args={[1, 1, 1]} />
          {lightMaterial}
        </mesh>
      ))}
      <pointLight color="#a98aff" intensity={awakened ? 1.15 : 0.18} distance={9} position={[0, 2, 2]} />
    </group>
  );
}

function ArchiveBuildingResponse({
  awakened,
  children,
}: {
  awakened: boolean;
  children: React.ReactNode;
}) {
  const root = useRef<Group>(null);
  const progress = useRef(awakened ? 1 : 0);
  const accent = useRef(new Color('#9d78ff'));
  const transitionStart = useRef(performance.now());
  const transitionStartProgress = useRef(progress.current);

  useEffect(() => {
    transitionStart.current = performance.now();
    transitionStartProgress.current = progress.current;
  }, [awakened]);

  useFrame(({ clock }) => {
    if (!root.current) return;
    const elapsed = (performance.now() - transitionStart.current) / 1000;
    const blend = 1 - Math.exp(-2.8 * elapsed);
    const target = awakened ? 1 : 0;
    progress.current = transitionStartProgress.current +
      (target - transitionStartProgress.current) * blend;
    const pulse = awakened ? 0.86 + Math.sin(clock.elapsedTime * 2.1) * 0.14 : 0;
    root.current.position.y = progress.current * 0.045;
    root.current.scale.y = 1 + progress.current * 0.012;
    root.current.userData.awakeningProgress = progress.current;
    root.current.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (!(material instanceof MeshStandardMaterial)) return;
        if (material.userData.archiveBaseEmissive === undefined) {
          material.userData.archiveBaseEmissive = material.emissive.getHex();
          material.userData.archiveBaseIntensity = material.emissiveIntensity;
        }
        const baseEmissive = new Color(Number(material.userData.archiveBaseEmissive));
        material.emissive.copy(baseEmissive).lerp(accent.current, progress.current * 0.78);
        material.emissiveIntensity =
          Number(material.userData.archiveBaseIntensity) + progress.current * pulse;
      });
    });
  });

  return <group ref={root} name="archive-building-body">{children}</group>;
}

function GuideIdentity({ active }: { active: boolean }) {
  const root = useRef<Group>(null);
  const reducedEffects = useWorldStore((state) => state.reducedEffects);
  useFrame(({ clock }) => {
    if (!root.current || reducedEffects) return;
    root.current.position.y = 0.08 + Math.sin(clock.elapsedTime * 1.7) * 0.08;
    root.current.rotation.y = Math.sin(clock.elapsedTime * 0.55) * 0.12;
  });
  return (
    <group ref={root} position={[0, 0.08, 0]} userData={{ cameraOccluder: false }}>
      <mesh position={[0, 1.05, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.72, 0.025, 8, 64]} />
        <meshBasicMaterial
          color={active ? '#d8f3ff' : '#75bfff'}
          transparent
          opacity={active ? 0.78 : 0.36}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 1.45, 0]} rotation={[0, 0, Math.PI / 4]}>
        <octahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial
          color="#dff7ff"
          emissive="#42a5ff"
          emissiveIntensity={active ? 2 : 0.8}
          roughness={0.28}
        />
      </mesh>
      <pointLight color="#4ab5ff" intensity={active ? 1.1 : 0.45} distance={7} position={[0, 1.1, 0]} />
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
  const isGuide = definition.id === 'npc-guide';
  const archiveAwakened = useInteractionStore(
    (state) => state.interactionFlags['memory.received'] === true,
  );

  const handlePointerClick = (e: any) => {
    e.stopPropagation();
    if (consumePointerLockAcquisitionClick()) return;
    InteractionDispatcher.executeInteraction(definition.id, 'click');
  };

  const Visual = visualRegistry[definition.visual.type] || visualRegistry['crate'];

  return (
    <group position={definition.position} rotation={definition.rotation} scale={definition.scale}>
      <RigidBody type="fixed" colliders={false} name={`${definition.id}-collider`}>
        <InteractionCollider definition={definition} />
      </RigidBody>
      {isArchive ? (
        <ArchiveBuildingResponse awakened={archiveAwakened}>
          <Visual definition={definition} onClick={handlePointerClick} />
        </ArchiveBuildingResponse>
      ) : (
        <Visual definition={definition} onClick={handlePointerClick} />
      )}
      {isGuide && <GuideIdentity active={isNearest} />}
      {isArchive && <ArchiveFacadeDetail awakened={archiveAwakened} />}
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
