import { Color, MeshStandardMaterial } from 'three';

export function createCoastalGroundMaterial() {
  const material = new MeshStandardMaterial({ color: '#b8bf8b', roughness: 1 });
  material.onBeforeCompile = shader => {
    shader.uniforms.uCoastWater = { value: new Color('#76b5b5') };
    shader.uniforms.uCoastSand = { value: new Color('#e8dbb8') };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCoastWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCoastWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCoastWorld;\nuniform vec3 uCoastWater;\nuniform vec3 uCoastSand;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 p = vCoastWorld.xz - vec2(0.0, -9.0);
        float a = atan(p.y, p.x);
        float coast = 28.0 + sin(a * 3.0) * 1.4 + sin(a * 7.0) * 0.6;
        float d = length(p);
        float land = 1.0 - smoothstep(coast - 1.4, coast + 0.2, d);
        float grass = 1.0 - smoothstep(coast - 4.0, coast - 2.0, d);
        float stonePath = 1.0 - smoothstep(1.0, 1.9, abs(vCoastWorld.x - 1.2));
        stonePath *= 1.0 - smoothstep(19.0, 25.0, abs(vCoastWorld.z + 8.0));
        vec3 lawn = mix(diffuseColor.rgb, uCoastSand, stonePath * 0.38);
        vec3 shore = mix(uCoastSand, lawn, grass);
        float ripple = sin(d * 3.2 + sin(a * 8.0)) * 0.5 + 0.5;
        vec3 sea = uCoastWater * (0.94 + ripple * 0.055);
        diffuseColor.rgb = mix(sea, shore, land);
      `);
  };
  material.customProgramCacheKey = () => 'coastal-ground-v1';
  return material;
}
