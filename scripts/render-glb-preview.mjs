#!/usr/bin/env node

import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import * as THREE from 'three';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = path.resolve(
  process.argv[2] ?? path.join(repositoryRoot, 'assets/source/models/departure-portal.glb'),
);
const outputPath = path.resolve(
  process.argv[3] ?? path.join(repositoryRoot, 'output/playwright/departure-portal-preview.png'),
);

export function parseGlb(buffer) {
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

export async function renderGlbPreview(sourcePath, destinationPath) {
  const { json, binary } = parseGlb(await readFile(sourcePath));
  const triangles = [];
  const bounds = new THREE.Box3();
  const light = new THREE.Vector3(0.35, 0.8, 0.45).normalize();

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
          points.forEach((point) => bounds.expandByPoint(point));
          const normal = new THREE.Vector3()
            .subVectors(points[1], points[0])
            .cross(new THREE.Vector3().subVectors(points[2], points[0]))
            .normalize();
          triangles.push({
            points,
            brightness: 0.34 + 0.66 * Math.abs(normal.dot(light)),
            color: material.color,
            opacity: material.opacity,
          });
        }
      }
    }
    for (const child of node.children ?? []) visitNode(child, worldMatrix);
  }

  const scene = json.scenes[json.scene ?? 0];
  for (const node of scene.nodes) visitNode(node, new THREE.Matrix4());

  const panelWidth = 600;
  const panelHeight = 450;
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z, 0.5);
  const views = [
    { label: 'FRONT', direction: new THREE.Vector3(0, 0.22, 1) },
    { label: 'RIGHT', direction: new THREE.Vector3(1, 0.22, 0) },
    { label: 'BACK', direction: new THREE.Vector3(0, 0.22, -1) },
    { label: 'PERSPECTIVE', direction: new THREE.Vector3(1, 0.72, 1) },
  ];

  const panels = views.map(({ label, direction }, viewIndex) => {
    const camera = new THREE.PerspectiveCamera(34, panelWidth / panelHeight, 0.01, radius * 20);
    camera.position.copy(center).add(direction.normalize().multiplyScalar(radius * 2.65));
    camera.lookAt(center);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    const ordered = triangles
      .map((triangle) => ({
        ...triangle,
        depth:
          triangle.points.reduce(
            (sum, point) => sum + point.distanceToSquared(camera.position),
            0,
          ) / 3,
      }))
      .sort((a, b) => b.depth - a.depth);
    const paths = ordered
      .map((triangle) => {
        const points = triangle.points.map((point) => {
          const projected = point.clone().project(camera);
          return `${((projected.x + 1) * panelWidth) / 2},${((-projected.y + 1) * panelHeight) / 2}`;
        });
        const color = triangle.color.clone().multiplyScalar(triangle.brightness);
        return `<polygon points="${points.join(' ')}" fill="#${color.getHexString()}" fill-opacity="${triangle.opacity.toFixed(3)}"/>`;
      })
      .join('');
    const x = (viewIndex % 2) * panelWidth;
    const y = Math.floor(viewIndex / 2) * panelHeight;
    return `<g transform="translate(${x} ${y})" clip-path="url(#panel-${viewIndex})">
      <rect width="${panelWidth}" height="${panelHeight}" fill="#171a35"/>
      ${paths}
      <text x="24" y="38" fill="#ffffff" opacity="0.72" font-family="monospace" font-size="18">${label}</text>
    </g>`;
  });

  const title = path.basename(sourcePath, path.extname(sourcePath));
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
    <defs>
      ${views.map((_, index) => `<clipPath id="panel-${index}"><rect width="${panelWidth}" height="${panelHeight}"/></clipPath>`).join('')}
    </defs>
    ${panels.join('')}
    <rect x="0" y="842" width="1200" height="58" fill="#090c19" opacity="0.88"/>
    <text x="28" y="879" fill="#ffffff" font-family="sans-serif" font-size="25" font-weight="700">${title} · multi-angle GLB preview</text>
  </svg>`;

  await mkdir(path.dirname(destinationPath), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(destinationPath);
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  await renderGlbPreview(inputPath, outputPath);
  console.log(`Rendered ${path.relative(repositoryRoot, outputPath)}`);
}
