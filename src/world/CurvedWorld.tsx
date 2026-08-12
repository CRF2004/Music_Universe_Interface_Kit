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
        uAccent: { value: new THREE.Color('#81709d') },
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vDistance;
        uniform float uCurvature;
        void main() {
          vUv = uv;
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          
          float dist = length(worldPosition.xz);
          vDistance = dist;
          // Route A: Only curve after a certain radius to maintain physical alignment near character
          float bendFactor = max(0.0, dist - 15.0); 
          worldPosition.y -= pow(bendFactor, 2.0) * uCurvature;
          
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vDistance;
        uniform vec3 uColor;
        uniform vec3 uAccent;
        float hash(vec2 value) {
          return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453123);
        }
        void main() {
          vec2 broadGrid = abs(fract(vUv * 72.0) - 0.5);
          float seams = smoothstep(0.475, 0.498, max(broadGrid.x, broadGrid.y));
          float grain = hash(floor(vUv * 480.0));
          float mottling = hash(floor(vUv * 95.0)) * 0.5 + hash(floor(vUv * 31.0)) * 0.5;
          float distanceMix = smoothstep(8.0, 42.0, vDistance);
          vec3 layered = mix(uColor, uAccent, distanceMix * 0.24 + seams * 0.06);
          layered *= 0.9 + grain * 0.055 + mottling * 0.085;
          gl_FragColor = vec4(layered, 1.0);
        }
      `,
    });
  }, [curvature]);

  useEffect(() => {
    material.uniforms.uCurvature.value = curvature;
  }, [curvature, material]);

  useEffect(() => {
    material.uniforms.uColor.value.set(groundColor ?? '#f7ead7');
    material.uniforms.uAccent.value
      .set(groundColor ?? '#f7ead7')
      .offsetHSL(0.04, 0.08, -0.09);
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
