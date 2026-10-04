import { PivotControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo } from 'react';
import { Matrix4, PerspectiveCamera } from 'three';
import { useProjectStore } from '../state/useProjectStore';

export default function ArchiveDragControls() {
  const camera = useThree((state) => state.camera);
  const projectId = useProjectStore((state) => state.activeProjectId);
  const archive = useProjectStore((state) => state.project.scene.objects.find(({ id }) => id === 'memory-archive'));
  const preview = useProjectStore((state) => state.archivePreview);
  const position = archive?.transform.position;
  const matrix = useMemo(() => new Matrix4().makeTranslation(
    preview?.[0] ?? position?.[0] ?? 0,
    position?.[1] ?? 0,
    preview?.[1] ?? position?.[2] ?? 0,
  ), [position, preview]);

  // Keep the view fixed throughout a drag and restore the listener's camera on exit.
  useLayoutEffect(() => {
    const position = useProjectStore.getState().project.scene.objects.find(({ id }) => id === 'memory-archive')?.transform.position;
    if (!position) return;
    const previousPosition = camera.position.clone();
    const previousQuaternion = camera.quaternion.clone();
    const previousFov = camera instanceof PerspectiveCamera ? camera.fov : null;
    camera.position.set(position[0], position[1] + 32, position[2] + 28);
    camera.lookAt(position[0], position[1], position[2]);
    if (camera instanceof PerspectiveCamera) camera.fov = 50;
    camera.updateProjectionMatrix();
    return () => {
      camera.position.copy(previousPosition);
      camera.quaternion.copy(previousQuaternion);
      if (camera instanceof PerspectiveCamera && previousFov !== null) camera.fov = previousFov;
      camera.updateProjectionMatrix();
      useProjectStore.getState().cancelArchiveDrag();
    };
  }, [camera, projectId]);

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
      onDrag={(matrix) => useProjectStore.getState().previewArchivePosition(matrix.elements[12], matrix.elements[14])}
      onDragEnd={() => useProjectStore.getState().commitArchiveDrag()}
    />
    </group>
  );
}
