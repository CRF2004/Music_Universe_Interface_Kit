import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Group, Material, Mesh } from 'three';

interface RevealTransitionProps {
  visible: boolean;
  duration?: number;
  minimumScale?: number;
  children: ReactNode;
  name: string;
}

export default function RevealTransition({
  visible,
  duration = 1.2,
  minimumScale = 0.04,
  children,
  name,
}: RevealTransitionProps) {
  const root = useRef<Group>(null);
  const progress = useRef(visible ? 1 : 0);
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  useFrame((_, delta) => {
    if (!root.current || !mounted) return;
    const direction = visible ? 1 : -1;
    progress.current = Math.min(1, Math.max(0, progress.current + direction * delta / duration));
    const eased = 1 - Math.pow(1 - progress.current, 3);
    root.current.scale.setScalar(minimumScale + eased * (1 - minimumScale));
    root.current.position.y = (1 - eased) * -0.55;
    root.current.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material: Material) => {
        if (!('opacity' in material)) return;
        const revealMaterial = material as Material & { opacity: number; transparent: boolean };
        if (revealMaterial.userData.revealBaseOpacity === undefined) {
          revealMaterial.userData.revealBaseOpacity = revealMaterial.opacity;
        }
        revealMaterial.transparent = true;
        revealMaterial.opacity = Number(revealMaterial.userData.revealBaseOpacity) * eased;
      });
    });
    if (!visible && progress.current === 0) setMounted(false);
  });

  if (!mounted) return null;
  return (
    <group ref={root} name={name} scale={minimumScale} userData={{ revealProgress: progress.current }}>
      {children}
    </group>
  );
}
