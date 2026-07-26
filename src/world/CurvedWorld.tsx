import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useWorldStore } from '../state/useWorldStore';
import { useMusicRuntimeStore } from '../music/runtime/useMusicRuntimeStore';

export default function CurvedWorld() {
  const activeWorld = useWorldStore((state) => state.activeWorld);
  const curvature = activeWorld?.terrain.curvature ?? 0.002;
  const groundColor = useMusicRuntimeStore((state) => state.environment.groundColor);

  // Custom shader to bend the world
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color('#f7ead7') }, // paper color
        uCurvature: { value: curvature },
      },
      vertexShader: `
        varying vec2 vUv;
        uniform float uCurvature;
        void main() {
          vUv = uv;
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          
          float dist = length(worldPosition.xz);
          // Route A: Only curve after a certain radius to maintain physical alignment near character
          float bendFactor = max(0.0, dist - 15.0); 
          worldPosition.y -= pow(bendFactor, 2.0) * uCurvature;
          
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 uColor;
        void main() {
          gl_FragColor = vec4(uColor, 1.0);
        }
      `,
    });
  }, [curvature]);

  useEffect(() => {
    material.uniforms.uCurvature.value = curvature;
  }, [curvature, material]);

  useEffect(() => {
    material.uniforms.uColor.value.set(groundColor ?? '#f7ead7');
  }, [groundColor, material]);

  return (
    <group>
      {/* Visual Mesh (Non-Physical) */}
      <mesh
        name="world-ground"
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        position={[0, -0.01, 0]}
        userData={{ cameraOccluder: false }}
      >
        <planeGeometry args={[1000, 1000, 100, 100]} />
        <primitive object={material} attach="material" />
      </mesh>

      {/* Stable Physics Floor - Fixed at Y=0, 1km wide, 10m thick to prevent tunneling */}
      <RigidBody type="fixed" colliders={false} position={[0, -5, 0]}>
        <CuboidCollider args={[500, 5, 500]} />
      </RigidBody>
    </group>
  );
}
