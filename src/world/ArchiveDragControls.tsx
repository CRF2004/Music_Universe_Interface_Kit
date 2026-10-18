import { PivotControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo } from 'react';
import { Matrix4, PerspectiveCamera, Vector3 } from 'three';
import { useProjectStore } from '../state/useProjectStore';
import { planetRadius, surfacePosition, surfaceQuaternion, surfaceCoordinates } from './planetSurface';

export default function ArchiveDragControls() {
  const camera = useThree((state) => state.camera);
  const projectId = useProjectStore((state) => state.activeProjectId);
  const archive = useProjectStore((state) => state.project.scene.objects.find(({ id }) => id === 'memory-archive'));
  const preview = useProjectStore((state) => state.archivePreview);
  const terrain = useProjectStore((state) => state.project.scene.environment.terrain);
  const radius = planetRadius(terrain);
  const position = archive?.transform.position;
  const matrix = useMemo(() => {
    const point = surfacePosition([preview?.[0] ?? position?.[0] ?? 0, position?.[1] ?? 0, preview?.[1] ?? position?.[2] ?? 0], radius);
    return new Matrix4().compose(new Vector3(...point), surfaceQuaternion(point, radius), new Vector3(1, 1, 1));
  }, [position, preview, radius]);

  // Keep the view fixed throughout a drag and restore the listener's camera on exit.
  useLayoutEffect(() => {
    const position = useProjectStore.getState().project.scene.objects.find(({ id }) => id === 'memory-archive')?.transform.position;
    if (!position) return;
    const previousPosition = camera.position.clone();
    const previousQuaternion = camera.quaternion.clone();
    const previousFov = camera instanceof PerspectiveCamera ? camera.fov : null;
    const point = surfacePosition(position, radius);
    const rotation = surfaceQuaternion(point, radius);
    const previousUp = camera.up.clone();
    camera.up.set(0, 1, 0).applyQuaternion(rotation);
    camera.position.copy(new Vector3(0, 32, 28).applyQuaternion(rotation).add(new Vector3(...point)));
    camera.lookAt(...point);
    if (camera instanceof PerspectiveCamera) camera.fov = 50;
    camera.updateProjectionMatrix();
    return () => {
      camera.position.copy(previousPosition);
      camera.quaternion.copy(previousQuaternion);
      camera.up.copy(previousUp);
      if (camera instanceof PerspectiveCamera && previousFov !== null) camera.fov = previousFov;
      camera.updateProjectionMatrix();
      useProjectStore.getState().cancelArchiveDrag();
    };
  }, [camera, projectId, radius]);

  if (!position) return null;
  return (
    <group name="archive-edit-handle">
    <PivotControls
      matrix={matrix}
      autoTransform={false}
      activeAxes={[true, false, true]}
      disableRotations
      disableScaling
      disableSliders
      fixed
      scale={110}
      lineWidth={5}
      offset={[0, 6, 0]}
      depthTest={false}
      userData={{ cameraOccluder: false }}
      onDragStart={() => useProjectStore.getState().beginArchiveDrag()}
      onDrag={(matrix) => {
        const coordinates = surfaceCoordinates([matrix.elements[12], matrix.elements[13], matrix.elements[14]], radius);
        useProjectStore.getState().previewArchivePosition(coordinates[0], coordinates[2]);
      }}
      onDragEnd={() => useProjectStore.getState().commitArchiveDrag()}
    />
    </group>
  );
}
