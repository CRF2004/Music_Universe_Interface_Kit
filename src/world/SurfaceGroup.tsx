import type { ReactNode } from 'react';
import { useProjectStore } from '../state/useProjectStore';
import { planetRadius, surfacePosition, surfaceRotation, type SurfacePosition } from './planetSurface';

export default function SurfaceGroup({ position, children, name }: { position: SurfacePosition; children: ReactNode; name?: string }) {
  const terrain = useProjectStore((state) => state.project.scene.environment.terrain);
  const radius = planetRadius(terrain);
  const worldPosition = surfacePosition(position, radius);
  return <group name={name} position={worldPosition} rotation={surfaceRotation(worldPosition, radius)}>{children}</group>;
}
