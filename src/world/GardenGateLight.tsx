import { useWorldStore } from '../state/useWorldStore';

/** Decorative response only; portal availability remains in the music runtime. */
export default function GardenGateLight({ charging, open, afterglow }: { charging: boolean; open: boolean; afterglow: boolean }) {
  const reduced = useWorldStore(state => state.reducedEffects);
  const intensity = afterglow ? .65 : open ? .9 : charging ? .25 : 0;
  return <group name="garden-gate-light" userData={{ phase: afterglow ? 'afterglow' : open ? 'open' : charging ? 'charging' : 'closed', cameraOccluder: false }}>
    {intensity > 0 && <>
      {[-1.12, 1.12].map(x => <mesh key={x} position={[x,1.62,.22]}><sphereGeometry args={[.07,8,6]} /><meshBasicMaterial color="#ffe6a0" /></mesh>)}
      <pointLight color="#ffdfa4" intensity={intensity} distance={6} position={[0,1.8,.6]} />
    </>}
    {open && <>
      <mesh position={[0,1.5,.03]}>
        <planeGeometry args={[2,2.8]} />
        <shaderMaterial transparent depthWrite={false}
          vertexShader="varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}"
          fragmentShader="varying vec2 vUv; void main(){float d=length((vUv-.5)*vec2(1.0,.8));float a=(1.0-smoothstep(.12,.55,d))*.22;gl_FragColor=vec4(1.0,.89,.62,a);}"
        />
      </mesh>
      {!reduced && Array.from({length:8},(_,i)=><mesh key={i} position={[Math.sin(i*2.4)*.7,.5+i*.26,.18+Math.cos(i)*.1]}><sphereGeometry args={[.018,6,4]} /><meshBasicMaterial color="#ffe7a4" /></mesh>)}
    </>}
  </group>;
}
