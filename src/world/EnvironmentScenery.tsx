import { BallCollider, RigidBody } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  Color,
  Group,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
} from 'three';
import { useMusicRuntimeStore } from '../music/runtime/useMusicRuntimeStore';
import { useInteractionStore } from '../state/useInteractionStore';
import { createMemoryGroveLayout, createRockLayout } from './environmentLayout';
import { createTerrainReliefLayout } from './environmentLayout';
import { useWorldStore } from '../state/useWorldStore';

const ROCK_COUNT = 42;
const MEMORY_SHARD_COUNT = 20;
const TERRAIN_RELIEF_COUNT = 14;

function TerrainRelief() {
  const curvature = useWorldStore((state) => state.activeWorld?.terrain.curvature ?? 0.002);
  const layout = useMemo(() => createTerrainReliefLayout(TERRAIN_RELIEF_COUNT), []);

  return (
    <group name="terrain-relief" userData={{ cameraOccluder: true }}>
      {layout.map((relief, index) => {
        const radius = Math.hypot(relief.position[0], relief.position[2]);
        const bend = Math.max(0, radius - 15);
        return (
          <mesh
            key={index}
            position={[
              relief.position[0],
              -bend * bend * curvature - 0.38,
              relief.position[2],
            ]}
            rotation={[0, relief.rotation, 0]}
            scale={relief.scale}
            receiveShadow
          >
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial
              color={index % 3 === 0 ? '#625775' : index % 3 === 1 ? '#71647e' : '#514b67'}
              roughness={0.96}
              metalness={0.01}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function InstancedRocks() {
  const mesh = useRef<InstancedMesh>(null);
  const layout = useMemo(() => createRockLayout(ROCK_COUNT), []);
  const helper = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    if (!mesh.current) return;
    layout.forEach((rock, index) => {
      helper.position.set(...rock.position);
      helper.rotation.set(rock.rotation * 0.18, rock.rotation, rock.rotation * 0.12);
      helper.scale.set(rock.scale, rock.scale * (0.7 + (index % 4) * 0.12), rock.scale * 0.85);
      helper.updateMatrix();
      mesh.current?.setMatrixAt(index, helper.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingBox();
    mesh.current.computeBoundingSphere();
  }, [helper, layout]);

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
    <group>
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, ROCK_COUNT]}
        castShadow
        receiveShadow
        frustumCulled={false}
        userData={{ cameraOccluder: true }}
      >
        <dodecahedronGeometry args={[0.58, 0]} />
        <primitive object={material} attach="material" />
      </instancedMesh>
      {layout.map((rock, index) => (
        <RigidBody
          key={index}
          type="fixed"
          colliders={false}
          position={[rock.position[0], rock.scale * 0.42, rock.position[2]]}
        >
          <BallCollider args={[rock.scale * 0.48]} />
        </RigidBody>
      ))}
    </group>
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
      <group position={[5, 18, -48]} rotation={[0.18, -0.25, -0.12]}>
      <mesh>
        <sphereGeometry args={[9, 48, 32]} />
        <meshStandardMaterial
          color="#5d67a5"
          emissive="#263a72"
          emissiveIntensity={0.18}
          roughness={0.92}
          metalness={0.02}
        />
      </mesh>
        <mesh rotation={[Math.PI / 2.5, 0.2, 0]}>
          <ringGeometry args={[11.2, 12.1, 96]} />
          <meshBasicMaterial color="#9e94d4" transparent opacity={0.24} depthWrite={false} side={2} />
        </mesh>
      </group>
      <mesh position={[-24, 26, -62]}>
        <sphereGeometry args={[4.2, 32, 20]} />
        <meshStandardMaterial
          color="#b87fa7"
          emissive="#5c355f"
          emissiveIntensity={0.22}
          roughness={0.88}
        />
      </mesh>
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

function MemoryGrove() {
  const mesh = useRef<InstancedMesh>(null);
  const helper = useMemo(() => new Object3D(), []);
  const received = useInteractionStore(
    (state) => state.interactionFlags['memory.received'] === true,
  );
  const layout = useMemo(() => createMemoryGroveLayout(MEMORY_SHARD_COUNT), []);
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#6f65a7',
        emissive: '#7f6dca',
        emissiveIntensity: 0.25,
        roughness: 0.48,
        metalness: 0.08,
      }),
    [],
  );

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    layout.forEach((shard, index) => {
      helper.position.set(...shard.position);
      const wake = received ? 1 : 0;
      helper.position.y += wake * (0.42 + Math.sin(clock.elapsedTime * 0.9 + shard.phase) * 0.22);
      helper.rotation.set(shard.lean, shard.phase + clock.elapsedTime * wake * 0.16, shard.lean * 0.7);
      const pulse = 1 + wake * Math.sin(clock.elapsedTime * 1.6 + shard.phase) * 0.12;
      helper.scale.set(
        shard.scale * 0.62,
        shard.scale * (1.5 + (index % 3) * 0.42 + wake * 0.7) * pulse,
        shard.scale * 0.62,
      );
      helper.updateMatrix();
      mesh.current.setMatrixAt(index, helper.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    material.color.set(received ? '#9a86d8' : '#514b68');
    material.emissiveIntensity = received ? 0.95 : 0.08;
  });

  return (
    <group userData={{ cameraOccluder: false }}>
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, MEMORY_SHARD_COUNT]}
        frustumCulled={false}
      >
        <coneGeometry args={[0.7, 1.8, 5]} />
        <primitive object={material} attach="material" />
      </instancedMesh>
      {[-1, 1].map((side) => (
        <pointLight
          key={side}
          color={new Color('#8f7aff')}
          intensity={received ? 1.8 : 0.12}
          distance={14}
          position={[side * 7.5, 2.2, -12]}
        />
      ))}
    </group>
  );
}

export default function EnvironmentScenery() {
  return (
    <group>
      <TerrainRelief />
      <InstancedRocks />
      <MemoryGrove />
      <SkyOrnaments />
    </group>
  );
}
