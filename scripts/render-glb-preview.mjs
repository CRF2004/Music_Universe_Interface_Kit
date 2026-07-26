#!/usr/bin/env node

import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import * as THREE from 'three';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = path.resolve(
  process.argv[2] ??
    path.join(repositoryRoot, 'assets/source/models/departure-portal.glb'),
);
const outputPath = path.resolve(
  process.argv[3] ?? path.join(repositoryRoot, 'output/playwright/departure-portal-preview.png'),
);

function parseGlb(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('Input is not a GLB file.');
  let offset = 12;
  let json;
  let binary;
  while (offset < buffer.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const chunk = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(chunk));
    if (type === 0x004e4942) binary = chunk;
    offset += 8 + length;
  }
  if (!json || !binary) throw new Error('GLB must contain JSON and BIN chunks.');
  return { json, binary };
}

const componentReaders = {
  5121: { bytes: 1, read: (view, offset) => view.getUint8(offset) },
  5123: { bytes: 2, read: (view, offset) => view.getUint16(offset, true) },
  5125: { bytes: 4, read: (view, offset) => view.getUint32(offset, true) },
  5126: { bytes: 4, read: (view, offset) => view.getFloat32(offset, true) },
};

function readAccessor(json, binary, accessorIndex) {
  const accessor = json.accessors[accessorIndex];
  const bufferView = json.bufferViews[accessor.bufferView];
  const reader = componentReaders[accessor.componentType];
  if (!reader) throw new Error(`Unsupported component type ${accessor.componentType}.`);
  const componentCount = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type];
  const stride = bufferView.byteStride ?? reader.bytes * componentCount;
  const start = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
  return Array.from({ length: accessor.count }, (_, index) =>
    Array.from({ length: componentCount }, (_, component) =>
      reader.read(view, start + index * stride + component * reader.bytes),
    ),
  );
}

function nodeMatrix(node) {
  if (node.matrix) return new THREE.Matrix4().fromArray(node.matrix);
  return new THREE.Matrix4().compose(
    new THREE.Vector3().fromArray(node.translation ?? [0, 0, 0]),
    new THREE.Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]),
    new THREE.Vector3().fromArray(node.scale ?? [1, 1, 1]),
  );
}

function colorForMaterial(material = {}) {
  const base = material.pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1, 1];
  const emissive = material.emissiveFactor ?? [0, 0, 0];
  return {
    color: new THREE.Color(
      Math.min(1, base[0] + emissive[0] * 0.35),
      Math.min(1, base[1] + emissive[1] * 0.35),
      Math.min(1, base[2] + emissive[2] * 0.35),
    ),
    opacity: base[3] ?? 1,
  };
}

const { json, binary } = parseGlb(await readFile(inputPath));
const triangles = [];
const light = new THREE.Vector3(0.35, 0.8, 0.45).normalize();
const cameraPosition = new THREE.Vector3(7.2, 5.3, 9.2);

function visitNode(nodeIndex, parentMatrix) {
  const node = json.nodes[nodeIndex];
  const worldMatrix = parentMatrix.clone().multiply(nodeMatrix(node));
  if (node.mesh !== undefined) {
    for (const primitive of json.meshes[node.mesh].primitives) {
      const positions = readAccessor(json, binary, primitive.attributes.POSITION);
      const indices =
        primitive.indices === undefined
          ? positions.map((_, index) => [index])
          : readAccessor(json, binary, primitive.indices);
      const material = colorForMaterial(json.materials?.[primitive.material]);
      for (let index = 0; index < indices.length; index += 3) {
        const points = [0, 1, 2].map((offset) =>
          new THREE.Vector3()
            .fromArray(positions[indices[index + offset][0]])
            .applyMatrix4(worldMatrix),
        );
        const normal = new THREE.Vector3()
          .subVectors(points[1], points[0])
          .cross(new THREE.Vector3().subVectors(points[2], points[0]))
          .normalize();
        const brightness = 0.34 + 0.66 * Math.abs(normal.dot(light));
        triangles.push({
          points,
          depth:
            points.reduce((sum, point) => sum + point.distanceToSquared(cameraPosition), 0) / 3,
          color: material.color.clone().multiplyScalar(brightness),
          opacity: material.opacity,
        });
      }
    }
  }
  for (const child of node.children ?? []) visitNode(child, worldMatrix);
}

const scene = json.scenes[json.scene ?? 0];
for (const node of scene.nodes) visitNode(node, new THREE.Matrix4());

const width = 1200;
const height = 900;
const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
camera.position.copy(cameraPosition);
camera.lookAt(0, 2, 0);
camera.updateMatrixWorld();
camera.updateProjectionMatrix();

triangles.sort((a, b) => b.depth - a.depth);
const paths = triangles
  .map((triangle) => {
    const points = triangle.points.map((point) => {
      const projected = point.clone().project(camera);
      return `${((projected.x + 1) * width) / 2},${((-projected.y + 1) * height) / 2}`;
    });
    return `<polygon points="${points.join(' ')}" fill="#${triangle.color.getHexString()}" fill-opacity="${triangle.opacity.toFixed(3)}"/>`;
  })
  .join('');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <radialGradient id="background">
      <stop offset="0" stop-color="#41346e"/>
      <stop offset="1" stop-color="#151a35"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#background)"/>
  <ellipse cx="600" cy="760" rx="285" ry="58" fill="#090c19" opacity="0.45"/>
  ${paths}
  <text x="48" y="68" fill="#ffffff" font-family="sans-serif" font-size="30" font-weight="700">Departure Portal · GLB preview</text>
</svg>`;

await mkdir(path.dirname(outputPath), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(outputPath);
console.log(`Rendered ${path.relative(repositoryRoot, outputPath)}`);
