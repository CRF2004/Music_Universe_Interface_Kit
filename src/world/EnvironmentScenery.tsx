import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  Color,
  Group,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
} from 'three';
import { useMusicRuntimeStore } from '../music/runtime/useMusicRuntimeStore';
import { createRockLayout } from './environmentLayout';

const ROCK_COUNT = 42;

function InstancedRocks() {
  const mesh = useRef<InstancedMesh>(null);
  const layout = useMemo(() => createRockLayout(ROCK_COUNT), []);
  const helper = useMemo(() => new Object3D(), []);

  useFrame(() => {
    if (!mesh.current || mesh.current.userData.ready) return;
    layout.forEach((rock, index) => {
      helper.position.set(...rock.position);
      helper.rotation.set(rock.rotation * 0.18, rock.rotation, rock.rotation * 0.12);
      helper.scale.set(rock.scale, rock.scale * (0.7 + (index % 4) * 0.12), rock.scale * 0.85);
      helper.updateMatrix();
      mesh.current?.setMatrixAt(index, helper.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.userData.ready = true;
  });

  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#4e466a',
        roughness: 0.92,
        metalness: 0.04,
      }),
    [],
  );

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, ROCK_COUNT]}
      castShadow
      receiveShadow
      userData={{ cameraOccluder: true }}
    >
      <dodecahedronGeometry args={[0.58, 0]} />
      <primitive object={material} attach="material" />
    </instancedMesh>
  );
}

function SkyOrnaments() {
  const root = useRef<Group>(null);
  const bloom = useMusicRuntimeStore((state) => state.environment.bloomIntensity ?? 0.25);

  useFrame(({ clock }, delta) => {
    if (!root.current) return;
    root.current.rotation.y += delta * 0.008;
    root.current.position.y = Math.sin(clock.elapsedTime * 0.12) * 0.35;
  });

  return (
    <group ref={root} userData={{ cameraOccluder: false }}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 18, 11, -24]} rotation={[0.25, side * 0.35, 0]}>
          <mesh>
            <torusGeometry args={[5.2, 0.035, 6, 80, Math.PI * 1.45]} />
            <meshBasicMaterial
              color={side < 0 ? '#a98aff' : '#79c9ff'}
              transparent
              opacity={0.18 + bloom * 0.08}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
          <pointLight
            color={new Color(side < 0 ? '#a98aff' : '#79c9ff')}
            intensity={0.15 + bloom * 0.15}
            distance={18}
          />
        </group>
      ))}
    </group>
  );
}

export default function EnvironmentScenery() {
  return (
    <group>
      <InstancedRocks />
      <SkyOrnaments />
    </group>
  );
}
