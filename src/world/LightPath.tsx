import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  Object3D,
  ShaderMaterial,
} from 'three';
import { lightPathPhase, lightPathPoint } from './environmentLayout';

const NODE_COUNT = 34;

export default function LightPath() {
  const mesh = useRef<InstancedMesh>(null);
  const helper = useMemo(() => new Object3D(), []);
  const phases = useMemo(
    () => Float32Array.from({ length: NODE_COUNT }, (_, index) => lightPathPhase(index, NODE_COUNT)),
    [],
  );
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uColorA: { value: new Color('#fff5b8') },
          uColorB: { value: new Color('#b18cff') },
        },
        vertexShader: `
          attribute float aPhase;
          varying float vPhase;
          varying float vPulse;
          uniform float uTime;
          void main() {
            vPhase = aPhase;
            vPulse = 0.62 + 0.38 * sin(uTime * 3.2 - aPhase * 18.0);
            vec3 transformed = position * (0.8 + vPulse * 0.34);
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(transformed, 1.0);
          }
        `,
        fragmentShader: `
          varying float vPhase;
          varying float vPulse;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          void main() {
            vec3 color = mix(uColorA, uColorB, vPhase);
            gl_FragColor = vec4(color, 0.56 + vPulse * 0.38);
          }
        `,
      }),
    [],
  );

  useLayoutEffect(() => {
    if (!mesh.current) return;
    for (let index = 0; index < NODE_COUNT; index += 1) {
      helper.position.set(...lightPathPoint(index, NODE_COUNT));
      const phase = lightPathPhase(index, NODE_COUNT);
      helper.scale.setScalar(0.16 + phase * 0.12);
      helper.rotation.set(Math.PI / 2, phase * 1.5, 0);
      helper.updateMatrix();
      mesh.current.setMatrixAt(index, helper.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [helper]);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <group>
      <instancedMesh ref={mesh} args={[undefined, undefined, NODE_COUNT]} frustumCulled={false}>
        <octahedronGeometry args={[1, 0]}>
          <instancedBufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
        </octahedronGeometry>
        <primitive object={material} attach="material" />
      </instancedMesh>
      <mesh position={[0, 0.025, -10.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.5, 17, 1, 1]} />
        <meshBasicMaterial
          color="#8d6bff"
          transparent
          opacity={0.075}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
