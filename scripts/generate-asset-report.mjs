#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { parseGlb, renderGlbPreview } from './render-glb-preview.mjs';

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(repositoryRoot, 'assets/source');
const reportRoot = path.resolve(process.argv[2] ?? path.join(repositoryRoot, 'output/assets'));
const previewRoot = path.join(reportRoot, 'previews');
const manifest = JSON.parse(
  await readFile(path.join(repositoryRoot, 'assets/asset-manifest.json'), 'utf8'),
);
const generatedRoot = path.join(repositoryRoot, 'public/assets/generated');
const generatedManifest = JSON.parse(
  await readFile(path.join(generatedRoot, 'asset-manifest.json'), 'utf8').catch(() => {
    throw new Error('Generated asset manifest missing. Run npm run assets:build first.');
  }),
);
const generatedAssets = new Map(
  generatedManifest.assets.map((asset) => [asset.id, asset]),
);

function modelMetrics(buffer) {
  const { json } = parseGlb(buffer);
  let triangles = 0;
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const count =
        primitive.indices === undefined
          ? json.accessors[primitive.attributes.POSITION].count
          : json.accessors[primitive.indices].count;
      triangles += Math.floor(count / 3);
    }
  }
  return {
    scenes: json.scenes?.length ?? 0,
    nodes: json.nodes?.length ?? 0,
    meshes: json.meshes?.length ?? 0,
    materials: json.materials?.length ?? 0,
    textures: json.textures?.length ?? 0,
    animations: json.animations?.length ?? 0,
    triangles,
  };
}

async function audioMetrics(sourcePath) {
  const { stdout: probeOutput } = await execFileAsync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration:stream=sample_rate,channels',
      '-of',
      'json',
      sourcePath,
    ],
  );
  const probe = JSON.parse(probeOutput);
  const { stderr: loudnessOutput } = await execFileAsync(
    'ffmpeg',
    ['-hide_banner', '-nostats', '-i', sourcePath, '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-'],
    { maxBuffer: 8 * 1024 * 1024 },
  ).catch((error) => ({ stderr: error.stderr ?? '' }));
  const loudnessMatches = [...String(loudnessOutput).matchAll(/I:\s+(-?[\d.]+) LUFS/g)];
  const integratedLufs = Number(loudnessMatches.at(-1)?.[1] ?? Number.NaN);
  const { stdout: pcm } = await execFileAsync(
    'ffmpeg',
    ['-v', 'error', '-i', sourcePath, '-ac', '1', '-ar', '8000', '-f', 'f32le', 'pipe:1'],
    { encoding: 'buffer', maxBuffer: 16 * 1024 * 1024 },
  );
  const samples = new Float32Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.byteLength / 4));
  const seamDelta = Math.abs((samples.at(-1) ?? 0) - (samples[0] ?? 0));
  return {
    durationSeconds: Number(probe.format.duration),
    sampleRate: Number(probe.streams[0]?.sample_rate ?? 0),
    channels: Number(probe.streams[0]?.channels ?? 0),
    integratedLufs:
      Number.isFinite(integratedLufs) && integratedLufs > -69 ? integratedLufs : null,
    loopSeamDeltaDbfs:
      seamDelta > 0 ? Number((20 * Math.log10(seamDelta)).toFixed(2)) : -120,
  };
}

await mkdir(previewRoot, { recursive: true });
const reports = [];
for (const asset of manifest.assets) {
  const sourcePath = path.join(sourceRoot, asset.source);
  const sourceBytes = (await stat(sourcePath)).size;
  const generated = generatedAssets.get(asset.id);
  if (!generated) {
    throw new Error(`Generated asset "${asset.id}" is missing. Run npm run assets:build.`);
  }
  const generatedPath = path.join(repositoryRoot, 'public', generated.url.replace(/^\//, ''));
  let metrics;
  let preview;
  if (asset.type === 'model') {
    metrics = modelMetrics(await readFile(generatedPath));
    preview = path.join(previewRoot, `${asset.id}.png`);
    // The lightweight renderer intentionally reads the uncompressed source;
    // runtime output can contain Meshopt-compressed buffer views.
    await renderGlbPreview(sourcePath, preview);
  } else if (asset.type === 'texture') {
    const metadata = await sharp(generatedPath).metadata();
    metrics = {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      channels: metadata.channels,
    };
  } else {
    metrics = await audioMetrics(generatedPath);
  }
  reports.push({
    id: asset.id,
    type: asset.type,
    source: asset.source,
    sourceBytes,
    outputBytes: generated.outputBytes,
    sizeReductionPercent: Number(
      ((1 - generated.outputBytes / Math.max(sourceBytes, 1)) * 100).toFixed(1),
    ),
    generatedUrl: generated.url,
    sha256: generated.sha256,
    license: asset.license,
    preview: preview ? path.relative(repositoryRoot, preview) : null,
    metrics,
  });
}

const modelRows = reports
  .filter((asset) => asset.type === 'model')
  .map(
    (asset) =>
      `| ${asset.id} | ${asset.metrics.triangles} | ${asset.metrics.meshes} | ${asset.metrics.materials} | ${asset.metrics.textures} | ${asset.metrics.animations} | ${asset.sourceBytes} | ${asset.outputBytes} | ${asset.sizeReductionPercent}% |`,
  );
const textureRows = reports
  .filter((asset) => asset.type === 'texture')
  .map(
    (asset) =>
      `| ${asset.id} | ${asset.metrics.width}×${asset.metrics.height} | ${asset.metrics.format} | ${asset.metrics.channels} | ${asset.sourceBytes} | ${asset.outputBytes} |`,
  );
const audioRows = reports
  .filter((asset) => asset.type === 'audio')
  .map(
    (asset) =>
      `| ${asset.id} | ${asset.metrics.durationSeconds.toFixed(3)} | ${asset.metrics.integratedLufs ?? 'n/a'} | ${asset.metrics.loopSeamDeltaDbfs} | ${asset.sourceBytes} | ${asset.outputBytes} |`,
  );
const markdown = `# Asset report

Generated: ${new Date().toISOString()}

## Models

| Asset | Triangles | Meshes | Materials | Textures | Animations | Source bytes | Output bytes | Reduction |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
${modelRows.join('\n')}

## Textures

| Asset | Dimensions | Runtime format | Channels | Source bytes | Output bytes |
|---|---:|---|---:|---:|---:|
${textureRows.join('\n')}

## Audio

| Asset | Duration (s) | Integrated LUFS | Loop seam delta (dBFS) | Source bytes | Output bytes |
|---|---:|---:|---:|---:|---:|
${audioRows.join('\n')}
`;

await mkdir(reportRoot, { recursive: true });
await writeFile(path.join(reportRoot, 'asset-report.json'), `${JSON.stringify(reports, null, 2)}\n`);
await writeFile(path.join(reportRoot, 'asset-report.md'), markdown);

const pilotIds = ['guide-astronaut', 'support-terminal', 'product-tower-hangar', 'docs-portal-gate'];
const pilotPreviews = pilotIds.map((id) => path.join(previewRoot, `${id}.png`));
const pilotPreviewBuffers = await Promise.all(
  pilotPreviews.map((preview) => sharp(preview).resize(600, 450).png().toBuffer()),
);
const contactSheet = path.join(reportRoot, 'external-pilot-contact-sheet.png');
await sharp({
  create: { width: 1200, height: 900, channels: 4, background: '#11152d' },
})
  .composite(
    pilotPreviewBuffers.map((input, index) => ({
      input,
      left: (index % 2) * 600,
      top: Math.floor(index / 2) * 450,
    })),
  )
  .png()
  .toFile(contactSheet);

console.log(`Generated ${path.relative(repositoryRoot, reportRoot)}`);
