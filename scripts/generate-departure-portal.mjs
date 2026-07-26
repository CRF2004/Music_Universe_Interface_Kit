#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(
  repositoryRoot,
  'assets',
  'source',
  'models',
  'departure-portal.glb',
);

class NodeFileReader {
  result = null;
  error = null;
  onload = null;
  onloadend = null;
  onerror = null;

  async readAsArrayBuffer(blob) {
    try {
      this.result = await blob.arrayBuffer();
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    } catch (error) {
      this.error = error;
      this.onerror?.({ target: this });
      this.onloadend?.({ target: this });
    }
  }

  async readAsDataURL(blob) {
    try {
      const bytes = Buffer.from(await blob.arrayBuffer());
      this.result = `data:${blob.type};base64,${bytes.toString('base64')}`;
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    } catch (error) {
      this.error = error;
      this.onerror?.({ target: this });
      this.onloadend?.({ target: this });
    }
  }
}

globalThis.FileReader ??= NodeFileReader;

const portal = new THREE.Group();
portal.name = 'DeparturePortal';

const stoneMaterial = new THREE.MeshStandardMaterial({
  name: 'PortalStone',
  color: '#302858',
  roughness: 0.48,
  metalness: 0.58,
});
const edgeMaterial = new THREE.MeshStandardMaterial({
  name: 'PortalEdge',
  color: '#c9b7ff',
  emissive: '#7957e8',
  emissiveIntensity: 2.2,
  roughness: 0.2,
  metalness: 0.72,
});
const energyMaterial = new THREE.MeshStandardMaterial({
  name: 'PortalEnergy',
  color: '#9be7ff',
  emissive: '#5636d8',
  emissiveIntensity: 3.5,
  roughness: 0.08,
  metalness: 0,
  transparent: true,
  opacity: 0.72,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const goldMaterial = new THREE.MeshStandardMaterial({
  name: 'PortalGlyph',
  color: '#ffe58b',
  emissive: '#f0a52d',
  emissiveIntensity: 1.8,
  roughness: 0.28,
  metalness: 0.75,
});

const base = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.35, 0.42, 12), stoneMaterial);
base.name = 'PortalBase';
base.position.y = 0.21;
portal.add(base);

const baseInlay = new THREE.Mesh(
  new THREE.CylinderGeometry(1.72, 1.96, 0.08, 48),
  edgeMaterial,
);
baseInlay.name = 'PortalBaseInlay';
baseInlay.position.y = 0.46;
portal.add(baseInlay);

const frame = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.24, 16, 96), stoneMaterial);
frame.name = 'PortalFrame';
frame.position.y = 2.05;
portal.add(frame);

const frameEdge = new THREE.Mesh(
  new THREE.TorusGeometry(1.65, 0.075, 10, 96),
  edgeMaterial,
);
frameEdge.name = 'PortalFrameEdge';
frameEdge.position.set(0, 2.05, 0.205);
portal.add(frameEdge);

const energy = new THREE.Mesh(new THREE.CircleGeometry(1.47, 96), energyMaterial);
energy.name = 'PortalEnergySurface';
energy.position.set(0, 2.05, 0.03);
portal.add(energy);

const energyBack = energy.clone();
energyBack.name = 'PortalEnergyBack';
energyBack.position.z = -0.03;
portal.add(energyBack);

const glyphRing = new THREE.Group();
glyphRing.name = 'PortalGlyphRing';
glyphRing.position.y = 2.05;
for (let index = 0; index < 12; index += 1) {
  const angle = (index / 12) * Math.PI * 2;
  const glyph = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.12), goldMaterial);
  glyph.name = `PortalGlyph${String(index + 1).padStart(2, '0')}`;
  glyph.position.set(Math.sin(angle) * 2.02, Math.cos(angle) * 2.02, 0);
  glyph.rotation.z = -angle;
  glyphRing.add(glyph);
}
portal.add(glyphRing);

for (const direction of [-1, 1]) {
  const buttress = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.25, 0.82), stoneMaterial);
  buttress.name = direction < 0 ? 'PortalButtressLeft' : 'PortalButtressRight';
  buttress.position.set(direction * 1.78, 0.92, 0);
  buttress.rotation.z = direction * -0.16;
  portal.add(buttress);
}

const topGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), goldMaterial);
topGem.name = 'PortalCrown';
topGem.position.y = 4.15;
topGem.rotation.z = Math.PI / 4;
portal.add(topGem);

portal.traverse((object) => {
  if (object.isMesh) {
    object.castShadow = true;
    object.receiveShadow = true;
  }
});

const spinTimes = [0, 2, 4, 6, 8];
const spinValues = spinTimes.flatMap((_, index) => {
  const quaternion = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    index === spinTimes.length - 1 ? Math.PI * 2 - 0.001 : index * (Math.PI / 2),
  );
  return quaternion.toArray();
});
const spinTrack = new THREE.QuaternionKeyframeTrack(
  'PortalGlyphRing.quaternion',
  spinTimes,
  spinValues,
);
const pulseTrack = new THREE.VectorKeyframeTrack(
  'PortalEnergySurface.scale',
  [0, 1.5, 3],
  [1, 1, 1, 1.04, 1.04, 1.04, 1, 1, 1],
);
const animations = [
  new THREE.AnimationClip('PortalIdle', 8, [spinTrack, pulseTrack]),
];

const exporter = new GLTFExporter();
const result = await exporter.parseAsync(portal, {
  binary: true,
  animations,
  onlyVisible: true,
});
await writeFile(outputPath, Buffer.from(result));

console.log(`Generated ${path.relative(repositoryRoot, outputPath)}`);
