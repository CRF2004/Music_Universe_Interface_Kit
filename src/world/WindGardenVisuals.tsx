import { useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Group, Shape } from 'three';
import { useInteractionStore } from '../state/useInteractionStore';
import { useAudioPlayerStore } from '../music/player/useAudioPlayerStore';
import { useWorldStore } from '../state/useWorldStore';
import { WIND } from '../interaction/windGardenRuntime';

export function PaperWheel({ spinning = false }: { spinning?: boolean }) {
  const rotor = useRef<Group>(null);
  const reduced = useWorldStore(state => state.reducedEffects);
  const blade = useMemo(() => new Shape().moveTo(0, 0).lineTo(.53, .04).lineTo(.58, .48).lineTo(.13, .43).closePath(), []);
  useFrame(() => {
    if (rotor.current) rotor.current.rotation.z = spinning && !reduced ? -useAudioPlayerStore.getState().currentTime * 2.8 : -.2;
  });
  return <group>
    <mesh position={[0, .78, -.035]} castShadow><cylinderGeometry args={[.035, .055, 1.56, 8]} /><meshStandardMaterial color="#a47c54" /></mesh>
    <group ref={rotor} position={[0, 1.6, 0]}>
      {['#d99a85', '#eee1b4', '#79aaa1', '#d5bd75'].map((color, i) => <mesh key={color} rotation={[0, 0, i * Math.PI / 2]} castShadow><shapeGeometry args={[blade]} /><meshStandardMaterial color={color} side={2} roughness={.85} /></mesh>)}
      <mesh position={[0, 0, .03]}><sphereGeometry args={[.09, 10, 6]} /><meshStandardMaterial color="#f5e8ce" /></mesh>
    </group>
  </group>;
}

export function PickupWheel({ onClick }: { onClick?: (event: ThreeEvent<MouseEvent>) => void }) {
  const carried = useInteractionStore(state => state.interactionFlags[WIND.carried] === true);
  return <group onClick={onClick} visible={!carried} name="wind-paper-pickup"><PaperWheel />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .035, 0]}><ringGeometry args={[.55, .62, 32]} /><meshBasicMaterial color="#f4df9b" /></mesh>
  </group>;
}

export function FlowerbedWheel({ onClick }: { onClick?: (event: ThreeEvent<MouseEvent>) => void }) {
  const flags = useInteractionStore(state => state.interactionFlags);
  const root = useRef<Group>(null);
  const reduced = useWorldStore(state => state.reducedEffects);
  const rotation = flags[WIND.awakened] === true ? 0 : flags[WIND.turned] === true ? -.6 : -1.3;
  useFrame((_, delta) => { if (root.current) root.current.rotation.y += (rotation - root.current.rotation.y) * (reduced ? 1 : 1 - Math.exp(-7 * delta)); });
  return <group onClick={onClick} name="wind-flowerbed-wheel">
    <mesh receiveShadow position={[0, .06, 0]}><cylinderGeometry args={[1.3, 1.45, .12, 32]} /><meshStandardMaterial color="#d6c7a1" /></mesh>
    <mesh position={[0, .14, 0]}><cylinderGeometry args={[.38, .5, .2, 16]} /><meshStandardMaterial color="#9c7d5f" /></mesh>
    {Array.from({ length: 12 }, (_, i) => <group key={i} position={[Math.cos(i * Math.PI / 6), .12, Math.sin(i * Math.PI / 6)]}>
      <mesh position={[0, .16, 0]}><cylinderGeometry args={[.015, .02, .32, 5]} /><meshStandardMaterial color="#748d62" /></mesh>
      <mesh position={[0, .32, 0]} scale={flags[WIND.awakened] === true ? [.18, .08, .18] : [.06, .1, .06]}><icosahedronGeometry args={[1, 0]} /><meshStandardMaterial color={i % 2 ? '#e5b394' : '#f2dfac'} /></mesh>
    </group>)}
    <group ref={root} visible={flags[WIND.planted] === true}><PaperWheel spinning={flags[WIND.awakened] === true} />
      <mesh position={[0, .28, .65]} rotation={[-Math.PI / 2, 0, 0]}><coneGeometry args={[.15, .45, 3]} /><meshStandardMaterial color="#46766b" /></mesh>
    </group>
    {[-1, 1].map(side => <mesh key={side} position={[side * .9, .14, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.13, 8]} /><meshBasicMaterial color="#f4e3ad" /></mesh>)}
  </group>;
}
