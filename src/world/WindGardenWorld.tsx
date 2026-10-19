import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { InstancedMesh, Object3D, Vector3 } from 'three';
import { useProjectStore } from '../state/useProjectStore';
import { useInteractionStore } from '../state/useInteractionStore';
import { useAudioPlayerStore } from '../music/player/useAudioPlayerStore';
import { useWorldStore } from '../state/useWorldStore';
import { interactionEventBus } from '../interaction/interactionRuntime';
import { InteractionDispatcher } from '../interaction/InteractionDispatcher';
import { WIND, windBloom, windResponseAt } from '../interaction/windGardenRuntime';
import { planetRadius, surfaceDistance, surfacePosition, surfaceQuaternion } from './planetSurface';
import SurfaceGroup from './SurfaceGroup';

export default function WindGardenWorld() {
  const project = useProjectStore(state => state.project);
  const config = project.scene.windGarden;
  const flags = useInteractionStore(state => state.interactionFlags);
  const reduced = useWorldStore(state => state.reducedEffects);
  const responseAt = useRef<number | null>(null);
  const previousTime = useRef(0);
  const petals = useRef<InstancedMesh>(null);
  const radius = planetRadius(project.scene.environment.terrain);
  const helper = useMemo(() => new Object3D(), []);
  const position = useMemo(() => new Vector3(), []);
  const flowerPoints = useMemo(() => {
    if (!config) return [];
    return config.path.slice(1).flatMap((to, segment) => {
      const from = config.path[segment];
      return Array.from({ length: 8 }, (_, i) => {
        const t = i / 8;
        return [from[0] + (to[0] - from[0]) * t + (i % 2 ? .65 : -.65), .09, from[2] + (to[2] - from[2]) * t] as [number, number, number];
      });
    });
  }, [config]);
  useEffect(() => interactionEventBus.subscribe(event => {
    if (event.type === 'interaction.runtime-reset') responseAt.current = null;
    if (event.type === 'interaction.flag-changed' && event.key === WIND.awakened && event.value === true && config) {
      responseAt.current = windResponseAt(useAudioPlayerStore.getState().currentTime, config.responseMarkersSeconds);
    }
  }), [config]);
  useFrame(({ scene }) => {
    if (!config) return;
    const current = useInteractionStore.getState().interactionFlags;
    const audio = useAudioPlayerStore.getState();
    if (!audio.playing || audio.currentTime < previousTime.current - .2) responseAt.current = null;
    previousTime.current = audio.currentTime;
    const bloom = current[WIND.awakened] === true ? windBloom(audio.currentTime, responseAt.current, reduced) : 0;
    flowerPoints.forEach((point, i) => {
      helper.position.set(...surfacePosition(point, radius));
      helper.quaternion.copy(surfaceQuaternion(helper.position.toArray(), radius));
      helper.rotateX(-Math.PI / 2); helper.rotateZ(i * 2.4);
      const reveal = Math.max(0, Math.min(1, bloom * 1.8 - i / flowerPoints.length * .8));
      helper.scale.set(.28 * reveal, .15 * reveal, 1); helper.updateMatrix();
      petals.current?.setMatrixAt(i, helper.matrix);
    });
    if (petals.current) petals.current.instanceMatrix.needsUpdate = true;
    scene.userData.windGarden = { bloom, stage: current[WIND.completed] ? 'complete' : current[WIND.awakened] ? 'walk' : 'before', responseAt: responseAt.current };
    const player = scene.getObjectByName('player');
    if (!player || !audio.started || useProjectStore.getState().editorMode !== null) return;
    player.getWorldPosition(position);
    for (const id of [config.checkpointId, config.destinationId]) {
      const definition = useInteractionStore.getState().interactions.get(id);
      if (!definition) continue;
      const key = `${id}:zone-enter`;
      if (useInteractionStore.getState().triggerState.executedTriggers.has(key)) continue;
      if (!InteractionDispatcher.checkConditions(definition.triggers[0]?.conditions)) continue;
      if (surfaceDistance(position.toArray(), definition.position, radius) < (definition.radius ?? 2.8)) InteractionDispatcher.executeInteraction(id, 'zone-enter');
    }
  });
  if (!config) return null;
  const destination = project.scene.objects.find(object => object.id === config.destinationId)!.transform.position;
  return <group name="wind-garden-world" userData={{ cameraOccluder: false }}>
    <instancedMesh ref={petals} args={[undefined, undefined, flowerPoints.length]} name="wind-petal-path"><circleGeometry args={[1, 6]} /><meshStandardMaterial color="#edbc9f" roughness={1} /></instancedMesh>
    {/* Stone paving and interactive locations use the same sphere projection. */}
    {[3, 1, -1, -4.5, -6.5, -8].map((z, i) => <SurfaceGroup key={z} position={[i % 2 ? .25 : -.2, .025, z]}><mesh receiveShadow rotation={[-Math.PI / 2, 0, .2 * i]}><circleGeometry args={[.8, 7]} /><meshStandardMaterial color="#d9ceaf" /></mesh></SurfaceGroup>)}
    <SurfaceGroup position={[-2.6, 0, -3.5]}><group rotation={[0, .2, 0]}>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[1.4, .6, .4]} position={[0, .6, 0]} /></RigidBody>
      <mesh castShadow position={[0, .55, 0]}><boxGeometry args={[2.8, .16, .75]} /><meshStandardMaterial color="#b68c68" /></mesh>
      <mesh castShadow position={[0, 1.05, -.35]}><boxGeometry args={[2.8, .7, .12]} /><meshStandardMaterial color="#c39b74" /></mesh>
      {[-1, 1].map(x => <mesh key={x} position={[x, .25, 0]}><boxGeometry args={[.15, .5, .55]} /><meshStandardMaterial color="#697a65" /></mesh>)}
    </group></SurfaceGroup>
    {[[-5, -5], [4, -6], [-5, -13], [1, -19], [13, -16], [14, -25], [2, -30]].map(([x, z], i) => <SurfaceGroup key={`${x}:${z}`} position={[x, 0, z]}>
      <RigidBody type="fixed" colliders={false}><CuboidCollider args={[.2, 1.3, .2]} position={[0, 1.3, 0]} /></RigidBody>
      <mesh castShadow position={[0, 1.3, 0]}><cylinderGeometry args={[.16, .25, 2.6, 7]} /><meshStandardMaterial color="#998469" /></mesh>
      <mesh castShadow position={[0, 3.25, 0]} scale={[1.2, 1.4, 1]}><icosahedronGeometry args={[1.5, 1]} /><meshStandardMaterial color={i % 2 ? '#a6b589' : '#91aa88'} flatShading /></mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, .025, 0]}><circleGeometry args={[1.2, 16]} /><meshBasicMaterial color="#647d58" transparent opacity={.12} depthWrite={false} /></mesh>
    </SurfaceGroup>)}
    <SurfaceGroup position={destination} name="wind-listening-pavilion">
      <mesh receiveShadow position={[0, .04, 0]}><cylinderGeometry args={[2.4, 2.4, .08, 32]} /><meshStandardMaterial color="#d8ccb0" /></mesh>
      <mesh castShadow position={[0, 3.1, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[3.3, 1.25, 4]} /><meshStandardMaterial color="#6b9b8d" flatShading /></mesh>
      {[-1.7, 1.7].flatMap(x => [-1.7, 1.7].map(z => <RigidBody type="fixed" colliders={false} key={`${x}:${z}`} position={[x, 1.3, z]}><CuboidCollider args={[.09, 1.3, .09]} /><mesh castShadow><boxGeometry args={[.18, 2.6, .18]} /><meshStandardMaterial color="#c0ad83" /></mesh></RigidBody>))}
      <mesh position={[0, 2.55, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.7, 2, 4]} /><meshStandardMaterial color={flags[WIND.completed] ? '#eacb83' : '#b6c3a0'} side={2} /></mesh>
    </SurfaceGroup>
  </group>;
}
