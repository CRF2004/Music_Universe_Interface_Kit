import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Object3D, type Group, type InstancedMesh } from 'three';
import { useAudioPlayerStore } from '../music/player/useAudioPlayerStore';
import { useInteractionStore } from '../state/useInteractionStore';
import { useWorldStore } from '../state/useWorldStore';
import { MEMORY_FRAGMENT_COUNT, sampleMemoryFragment } from './memoryFragmentSampling';

/** Local to the Archive, so edited placements follow the same surface frame. */
export default function MemoryRecoveryFeedback() {
  const recovered = useInteractionStore((state) => state.interactionFlags['memory.received'] === true);
  const reducedEffects = useWorldStore((state) => state.reducedEffects);
  const root = useRef<Group>(null);
  const fragments = useRef<InstancedMesh>(null);
  const helper = useMemo(() => new Object3D(), []);

  useFrame(() => {
    if (!root.current || !fragments.current) return;
    root.current.visible = recovered;
    fragments.current.count = recovered && !reducedEffects ? MEMORY_FRAGMENT_COUNT : 0;
    root.current.userData.fragmentCount = fragments.current.count;
    if (!recovered || reducedEffects) return;
    const time = useAudioPlayerStore.getState().currentTime;
    for (let index = 0; index < MEMORY_FRAGMENT_COUNT; index += 1) {
      const pose = sampleMemoryFragment(index, time);
      helper.position.set(...pose.position);
      helper.rotation.set(0, pose.rotation, Math.PI / 4);
      helper.scale.setScalar(pose.scale);
      helper.updateMatrix();
      fragments.current.setMatrixAt(index, helper.matrix);
    }
    fragments.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={root} name="memory-recovery-feedback" position={[0, 1.45, 7.7]}
      visible={recovered} userData={{ cameraOccluder: false, fragmentCount: 0 }}>
      <mesh position={[0, 1.25, 0]}>
        <octahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color="#fff1ac" emissive="#e8bf62" emissiveIntensity={0.8} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.25, 0]}>
        <torusGeometry args={[0.44, 0.018, 6, 40]} />
        <meshBasicMaterial color="#f5dfa1" transparent opacity={0.65} depthWrite={false} />
      </mesh>
      <instancedMesh name="memory-recovery-fragments" frustumCulled={false} ref={fragments} args={[undefined, undefined, MEMORY_FRAGMENT_COUNT]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#ffe1a1" />
      </instancedMesh>
    </group>
  );
}
