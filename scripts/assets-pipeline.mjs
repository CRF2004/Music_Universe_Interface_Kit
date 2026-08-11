#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { access, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);
const ffmpegPath = ffmpegInstaller.path;
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(repositoryRoot, 'assets', 'asset-manifest.json');
const sourceRoot = path.join(repositoryRoot, 'assets', 'source');
const licenseRoot = path.join(repositoryRoot, 'assets', 'licenses');
const outputRoot = path.join(repositoryRoot, 'public', 'assets', 'generated');
const gltfTransformCli = path.join(
  repositoryRoot,
  'node_modules',
  '@gltf-transform',
  'cli',
  'bin',
  'cli.js',
);

const typeExtensions = {
  model: new Set(['.glb', '.gltf']),
  texture: new Set(['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff', '.svg']),
  audio: new Set(['.wav', '.flac', '.aiff', '.aif', '.mp3', '.m4a', '.ogg']),
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 'B';
  for (const candidate of units) {
    value /= 1024;
    unit = candidate;
    if (value < 1024) break;
  }
  return `${value.toFixed(2)} ${unit}`;
}

function sourcePathFor(asset) {
  const resolved = path.resolve(sourceRoot, asset.source);
  if (resolved !== sourceRoot && !resolved.startsWith(`${sourceRoot}${path.sep}`)) {
    throw new Error(`Asset "${asset.id ?? '<unknown>'}" escapes assets/source.`);
  }
  return resolved;
}

async function loadManifest() {
  return JSON.parse(await readFile(manifestPath, 'utf8'));
}

async function listSourceFiles(directory = sourceRoot) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(absolutePath)));
    } else if (entry.name !== 'README.md') {
      files.push(path.relative(sourceRoot, absolutePath).split(path.sep).join('/'));
    }
  }
  return files.sort();
}

async function validateManifest(manifest) {
  const errors = [];
  const warnings = [];
  const sourceSizes = new Map();
  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];

  if (manifest.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  if (!manifest.budgets || typeof manifest.budgets !== 'object') {
    errors.push('budgets must be an object.');
  } else {
    const budgetFields = [
      ['totalOutputBytes', manifest.budgets.totalOutputBytes],
      ...Object.entries(typeExtensions).flatMap(([type]) => [
        [`${type}.maxSourceBytes`, manifest.budgets[type]?.maxSourceBytes],
        [`${type}.maxOutputBytes`, manifest.budgets[type]?.maxOutputBytes],
      ]),
    ];
    for (const [field, value] of budgetFields) {
      if (!Number.isSafeInteger(value) || value <= 0) {
        errors.push(`budgets.${field} must be a positive integer.`);
      }
    }
  }
  if (!Array.isArray(manifest.assets)) errors.push('assets must be an array.');

  const ids = new Set();
  const declaredSources = new Set();

  for (const [index, asset] of assets.entries()) {
    const label = asset.id ? `Asset "${asset.id}"` : `assets[${index}]`;

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(asset.id ?? '')) {
      errors.push(`${label} id must use lower-kebab-case.`);
    } else if (ids.has(asset.id)) {
      errors.push(`${label} has a duplicate id.`);
    }
    ids.add(asset.id);

    if (!typeExtensions[asset.type]) {
      errors.push(`${label} type must be model, texture, or audio.`);
      continue;
    }

    if (typeof asset.source !== 'string' || asset.source.length === 0) {
      errors.push(`${label} must declare source.`);
      continue;
    }

    declaredSources.add(asset.source.replaceAll('\\', '/'));
    const extension = path.extname(asset.source).toLowerCase();
    if (!typeExtensions[asset.type].has(extension)) {
      errors.push(`${label} source extension "${extension}" is invalid for ${asset.type}.`);
    }

    const license = asset.license;
    if (
      !license?.spdx ||
      !license?.author ||
      !license?.provenance ||
      !license?.sourceUrl ||
      !license?.accessedAt ||
      !license?.licenseVersion ||
      !license?.licenseFile
    ) {
      errors.push(
        `${label} license must include spdx, author, provenance, sourceUrl, accessedAt, licenseVersion, and licenseFile.`,
      );
    } else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(license.accessedAt)) {
        errors.push(`${label} license.accessedAt must use YYYY-MM-DD.`);
      }
      const normalizedLicenseFile = license.licenseFile.replaceAll('\\', '/');
      if (
        !normalizedLicenseFile.startsWith('assets/licenses/') ||
        normalizedLicenseFile.includes('../')
      ) {
        errors.push(`${label} license.licenseFile must stay inside assets/licenses.`);
      } else {
        const licensePath = path.resolve(repositoryRoot, normalizedLicenseFile);
        if (licensePath !== licenseRoot && !licensePath.startsWith(`${licenseRoot}${path.sep}`)) {
          errors.push(`${label} license.licenseFile escapes assets/licenses.`);
        } else {
          try {
            const licenseStat = await stat(licensePath);
            if (!licenseStat.isFile()) throw new Error('not a file');
          } catch (error) {
            errors.push(`${label} license snapshot cannot be read: ${error.message}.`);
          }
        }
      }
    }

    const settings = asset.build ?? {};
    if (asset.type === 'texture') {
      if (settings.format !== undefined && settings.format !== 'webp') {
        errors.push(`${label} build.format currently supports only "webp".`);
      }
      if (
        settings.quality !== undefined &&
        (!Number.isInteger(settings.quality) || settings.quality < 1 || settings.quality > 100)
      ) {
        errors.push(`${label} build.quality must be an integer from 1 to 100.`);
      }
    }
    if (
      asset.type === 'model' &&
      settings.compress !== undefined &&
      !['meshopt', 'draco', 'quantize'].includes(settings.compress)
    ) {
      errors.push(`${label} build.compress must be meshopt, draco, or quantize.`);
    }
    if (
      asset.type === 'audio' &&
      settings.quality !== undefined &&
      (!Number.isInteger(settings.quality) || settings.quality < 0 || settings.quality > 10)
    ) {
      errors.push(`${label} build.quality must be an integer from 0 to 10.`);
    }

    let sourcePath;
    try {
      sourcePath = sourcePathFor(asset);
      const sourceStat = await stat(sourcePath);
      if (!sourceStat.isFile()) throw new Error('not a file');
      sourceSizes.set(asset.id, sourceStat.size);
      const maximum = manifest.budgets?.[asset.type]?.maxSourceBytes;
      if (Number.isFinite(maximum) && sourceStat.size > maximum) {
        errors.push(
          `${label} source is ${formatBytes(sourceStat.size)}, over the ${formatBytes(maximum)} budget.`,
        );
      }
    } catch (error) {
      errors.push(`${label} source cannot be read: ${error.message}.`);
    }
  }

  try {
    const undeclared = (await listSourceFiles()).filter((file) => !declaredSources.has(file));
    for (const file of undeclared) warnings.push(`Undeclared source asset: ${file}`);
  } catch (error) {
    errors.push(`Cannot scan assets/source: ${error.message}.`);
  }

  return { errors, warnings, sourceSizes };
}

async function assertValid(manifest) {
  const result = await validateManifest(manifest);
  for (const warning of result.warnings) console.warn(`warning: ${warning}`);
  if (result.errors.length > 0) {
    throw new Error(result.errors.map((error) => `- ${error}`).join('\n'));
  }
  return result;
}

async function buildTexture(asset, sourcePath) {
  const settings = asset.build ?? {};
  const format = settings.format ?? 'webp';
  if (format !== 'webp') throw new Error(`Texture "${asset.id}" currently supports format "webp".`);

  const outputPath = path.join(outputRoot, `${asset.id}.webp`);
  await sharp(sourcePath)
    .rotate()
    .resize({
      width: settings.maxWidth ?? 2048,
      height: settings.maxHeight ?? 2048,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: settings.quality ?? 82, effort: 5 })
    .toFile(outputPath);
  return outputPath;
}

async function buildModel(asset, sourcePath) {
  await access(gltfTransformCli);
  const settings = asset.build ?? {};
  const outputPath = path.join(outputRoot, `${asset.id}.glb`);
  await execFileAsync(
    process.execPath,
    [
      gltfTransformCli,
      'optimize',
      sourcePath,
      outputPath,
      '--compress',
      settings.compress ?? 'meshopt',
      '--texture-compress',
      settings.textureFormat ?? 'webp',
      '--texture-size',
      String(settings.textureSize ?? 2048),
      '--simplify',
      String(settings.simplify ?? false),
    ],
    { cwd: repositoryRoot, maxBuffer: 10 * 1024 * 1024 },
  );
  await execFileAsync(
    process.execPath,
    [gltfTransformCli, 'validate', outputPath],
    { cwd: repositoryRoot, maxBuffer: 10 * 1024 * 1024 },
  );
  return outputPath;
}

async function buildAudio(asset, sourcePath) {
  if (!ffmpegPath) {
    throw new Error(`Audio "${asset.id}" requires a supported ffmpeg binary.`);
  }
  await access(ffmpegPath);
  const settings = asset.build ?? {};
  const outputPath = path.join(outputRoot, `${asset.id}.ogg`);
  await execFileAsync(
    ffmpegPath,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      sourcePath,
      '-vn',
      '-af',
      `loudnorm=I=${settings.loudnessLufs ?? -16}:LRA=11:TP=-1.5`,
      '-c:a',
      'libvorbis',
      '-q:a',
      String(settings.quality ?? 5),
      outputPath,
    ],
    { cwd: repositoryRoot, maxBuffer: 10 * 1024 * 1024 },
  );
  return outputPath;
}

async function fileDigest(filePath) {
  return createHash('sha256').update(await readFile(filePath)).digest('hex');
}

async function buildAssets(manifest, sourceSizes) {
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  const generatedAssets = [];

  for (const asset of manifest.assets) {
    const sourcePath = sourcePathFor(asset);
    let outputPath;
    if (asset.type === 'texture') outputPath = await buildTexture(asset, sourcePath);
    if (asset.type === 'model') outputPath = await buildModel(asset, sourcePath);
    if (asset.type === 'audio') outputPath = await buildAudio(asset, sourcePath);

    const outputBytes = (await stat(outputPath)).size;
    const maximum = manifest.budgets?.[asset.type]?.maxOutputBytes;
    if (Number.isFinite(maximum) && outputBytes > maximum) {
      throw new Error(
        `Asset "${asset.id}" output is ${formatBytes(outputBytes)}, over the ${formatBytes(maximum)} budget.`,
      );
    }

    const sha256 = await fileDigest(outputPath);
    const extension = path.extname(outputPath);
    const hashedOutputPath = path.join(
      outputRoot,
      `${asset.id}.${sha256.slice(0, 12)}${extension}`,
    );
    await rename(outputPath, hashedOutputPath);

    generatedAssets.push({
      id: asset.id,
      type: asset.type,
      url: `assets/generated/${path.basename(hashedOutputPath)}`,
      sourceBytes: sourceSizes.get(asset.id),
      outputBytes,
      sha256,
      license: asset.license,
    });
    console.log(
      `${asset.id}: ${formatBytes(sourceSizes.get(asset.id))} → ${formatBytes(outputBytes)}`,
    );
  }

  const totalOutputBytes = generatedAssets.reduce((sum, asset) => sum + asset.outputBytes, 0);
  if (totalOutputBytes > manifest.budgets.totalOutputBytes) {
    throw new Error(
      `Generated assets total ${formatBytes(totalOutputBytes)}, over the ${formatBytes(manifest.budgets.totalOutputBytes)} budget.`,
    );
  }

  const generatedManifest = {
    schemaVersion: 1,
    totalOutputBytes,
    assets: generatedAssets,
  };
  await writeFile(
    path.join(outputRoot, 'asset-manifest.json'),
    `${JSON.stringify(generatedManifest, null, 2)}\n`,
  );
  console.log(`Total generated assets: ${formatBytes(totalOutputBytes)}`);
}

async function main() {
  const command = process.argv[2] ?? 'validate';
  if (!['validate', 'build'].includes(command)) {
    throw new Error('Usage: node scripts/assets-pipeline.mjs <validate|build>');
  }

  const manifest = await loadManifest();
  const validation = await assertValid(manifest);
  console.log(
    `Validated ${manifest.assets.length} asset${manifest.assets.length === 1 ? '' : 's'}.`,
  );

  if (command === 'build') await buildAssets(manifest, validation.sourceSizes);
}

main().catch((error) => {
  console.error(`Asset pipeline failed:\n${error.message}`);
  process.exitCode = 1;
});
