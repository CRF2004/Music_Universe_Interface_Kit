import React from 'react';
import { InteractionPointDefinition } from './interactionTypes';

export type VisualComponent = React.FC<{ 
  definition: InteractionPointDefinition, 
  onClick?: (e: any) => void 
}>;

const NPCVisual: VisualComponent = ({ definition, onClick }) => (
  <mesh castShadow onClick={onClick} position={[0, 0.8, 0]}>
    <capsuleGeometry args={[0.4, 0.8, 4, 8]} />
    <meshStandardMaterial color={definition.visual.colorToken || '#42a5ff'} />
  </mesh>
);

const PhoneBoothVisual: VisualComponent = ({ definition, onClick }) => (
  <mesh castShadow onClick={onClick} position={[0, 1, 0]}>
    <boxGeometry args={[1, 2, 1]} />
    <meshStandardMaterial color={definition.visual.colorToken || '#ff3b2f'} />
  </mesh>
);

const BuildingVisual: VisualComponent = ({ definition, onClick }) => (
  <mesh castShadow onClick={onClick} position={[0, 2.5, 0]}>
    <boxGeometry args={[3, 5, 3]} />
    <meshStandardMaterial color={definition.visual.colorToken || '#9f63ff'} />
  </mesh>
);

const VehicleVisual: VisualComponent = ({ definition, onClick }) => (
  <group onClick={onClick}>
    <mesh castShadow position={[0, 0.5, 0]}>
      <boxGeometry args={[2, 1, 1]} />
      <meshStandardMaterial color={definition.visual.colorToken || '#ffd84a'} />
    </mesh>
    {/* Cabin */}
    <mesh castShadow position={[-0.2, 1, 0]}>
      <boxGeometry args={[1, 0.6, 0.8]} />
      <meshStandardMaterial color={definition.visual.colorToken || '#ffd84a'} />
    </mesh>
  </group>
);

const PortalVisual: VisualComponent = ({ definition, onClick }) => (
  <mesh castShadow onClick={onClick} position={[0, 1.5, 0]}>
    <torusGeometry args={[1.5, 0.2, 16, 32]} />
    <meshStandardMaterial 
      color={definition.visual.colorToken || '#4adb7d'} 
      emissive={definition.visual.colorToken || '#4adb7d'} 
      emissiveIntensity={2} 
    />
  </mesh>
);

const CrateVisual: VisualComponent = ({ definition, onClick }) => (
  <mesh castShadow onClick={onClick} position={[0, 0.5, 0]}>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color={definition.visual.colorToken || '#ffd84a'} />
  </mesh>
);

export const visualRegistry: Record<string, VisualComponent> = {
  npc: NPCVisual,
  'phone-booth': PhoneBoothVisual,
  building: BuildingVisual,
  portal: PortalVisual,
  crate: CrateVisual,
  vehicle: VehicleVisual,
};

export const registerVisual = (type: string, component: VisualComponent) => {
  visualRegistry[type] = component;
};
