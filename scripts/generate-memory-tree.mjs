#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modelRoot = path.join(repositoryRoot, 'assets', 'source', 'models');

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

const trunkMaterial = new THREE.MeshStandardMaterial({
  name: 'MemoryBark',
  color: '#50304f',
  roughness: 0.86,
  metalness: 0.04,
});
const veinMaterial = new THREE.MeshStandardMaterial({
  name: 'MemoryVein',
  color: '#ffcf87',
  emissive: '#c15b9b',
  emissiveIntensity: 1.5,
  roughness: 0.45,
});
const canopyMaterial = new THREE.MeshStandardMaterial({
  name: 'MemoryCanopy',
  color: '#cda0ff',
  emissive: '#7138a8',
  emissiveIntensity: 1.25,
  roughness: 0.55,
  transparent: true,
  opacity: 0.72,
  depthWrite: false,
});

function branch(name, position, rotation, length, radius, detail) {
  const group = new THREE.Group();
  group.name = name;
  group.position.fromArray(position);
  group.rotation.set(...rotation);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.62, radius, length, detail ? 10 : 6),
    trunkMaterial,
  );
  stem.name = `${name}Stem`;
  stem.position.y = length / 2;
  group.add(stem);

  const vein = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.09, radius * 0.13, length * 0.88, 5),
    veinMaterial,
  );
  vein.name = `${name}Vein`;
  vein.position.set(0, length * 0.52, radius * 0.92);
  group.add(vein);

  return group;
}

function canopy(name, position, scale, detail) {
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1, detail ? 2 : 1),
    canopyMaterial,
  );
  mesh.name = name;
  mesh.position.fromArray(position);
  mesh.scale.fromArray(scale);
  return mesh;
}

function quaternionValues(axis, angles) {
  return angles.flatMap((angle) =>
    new THREE.Quaternion().setFromAxisAngle(axis, angle).toArray(),
  );
}

function createMemoryTree(detailed) {
  const tree = new THREE.Group();
  tree.name = detailed ? 'MemoryTree' : 'MemoryTreeLOD';

  const rootCount = detailed ? 7 : 4;
  for (let index = 0; index < rootCount; index += 1) {
    const angle = (index / rootCount) * Math.PI * 2;
    const root = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.28, 1.8, detailed ? 8 : 5),
      trunkMaterial,
    );
    root.name = `MemoryRoot${index + 1}`;
    root.position.set(Math.sin(angle) * 0.66, 0.18, Math.cos(angle) * 0.66);
    root.rotation.set(Math.cos(angle) * 0.42, 0, -Math.sin(angle) * 0.42);
    tree.add(root);
  }

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.62, 4.3, detailed ? 14 : 7),
    trunkMaterial,
  );
  trunk.name = 'MemoryTrunk';
  trunk.position.y = 2.15;
  tree.add(trunk);

  const trunkVein = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.07, 3.8, 6),
    veinMaterial,
  );
  trunkVein.name = 'MemoryTrunkVein';
  trunkVein.position.set(0, 2.25, 0.57);
  tree.add(trunkVein);

  const branches = [
    branch('BranchNorth', [0, 3.15, 0], [0.72, 0, -0.58], 2.55, 0.25, detailed),
    branch('BranchSouth', [0, 3.35, 0], [-0.64, 0, 0.62], 2.35, 0.23, detailed),
    branch('BranchCrown', [0, 3.7, 0], [0.08, 0, 0.2], 2.15, 0.26, detailed),
  ];
  branches.forEach((item) => tree.add(item));

  const canopyDefinitions = detailed
    ? [
        ['CanopyNorth', [-1.45, 5.05, 0.9], [1.5, 1.25, 1.35]],
        ['CanopySouth', [1.35, 4.95, -0.8], [1.45, 1.2, 1.3]],
        ['CanopyCrown', [-0.25, 5.85, 0], [1.65, 1.4, 1.5]],
        ['CanopyMemory01', [0.7, 5.45, 0.95], [1.05, 0.95, 1.1]],
        ['CanopyMemory02', [-1.0, 4.65, -0.75], [1.0, 0.9, 1.0]],
      ]
    : [
        ['CanopyNorth', [-1.15, 5.0, 0.55], [1.65, 1.35, 1.45]],
        ['CanopySouth', [1.15, 4.95, -0.5], [1.6, 1.3, 1.4]],
        ['CanopyCrown', [0, 5.75, 0], [1.8, 1.5, 1.55]],
      ];

  canopyDefinitions.forEach(([name, position, scale]) => {
    tree.add(canopy(name, position, scale, detailed));
  });

  tree.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  const times = [0, 2, 4, 6, 8];
  const animations = [
    new THREE.AnimationClip('MemoryTreeIdle', 8, [
      new THREE.QuaternionKeyframeTrack(
        'BranchNorth.quaternion',
        times,
        quaternionValues(new THREE.Vector3(0, 0, 1), [0, 0.055, 0, -0.04, 0]),
      ),
      new THREE.QuaternionKeyframeTrack(
        'BranchSouth.quaternion',
        times,
        quaternionValues(new THREE.Vector3(0, 0, 1), [0, -0.045, 0, 0.06, 0]),
      ),
      new THREE.VectorKeyframeTrack(
        'CanopyCrown.scale',
        [0, 2, 4],
        [
          1.65, 1.4, 1.5,
          1.72, 1.46, 1.56,
          1.65, 1.4, 1.5,
        ].map((value) => (detailed ? value : value * 1.08)),
      ),
    ]),
  ];

  return { tree, animations };
}

async function exportTree(detailed, filename) {
  const { tree, animations } = createMemoryTree(detailed);
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(tree, {
    binary: true,
    animations,
    onlyVisible: true,
  });
  const outputPath = path.join(modelRoot, filename);
  await writeFile(outputPath, Buffer.from(result));
  console.log(`Generated ${path.relative(repositoryRoot, outputPath)}`);
}

await exportTree(true, 'memory-tree.glb');
await exportTree(false, 'memory-tree-lod.glb');
