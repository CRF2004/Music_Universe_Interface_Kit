#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiBaseUrl = 'https://openapi.tripo3d.com/v3';
const defaultModel = 'P1-20260311';
const defaultFaceLimit = 8000;
const defaultTimeoutSeconds = 600;
const defaultPollIntervalMs = 2000;
const officialDocs = {
  introduction: 'https://developers.tripo3d.com/zh/docs/introduction',
  quickStart: 'https://developers.tripo3d.com/en/docs/quick-start',
  terms: 'https://www.tripo3d.ai/terms',
};

const help = `Generate a review-only Tripo 3D candidate.

Usage:
  npm run assets:tripo -- text --id <candidate-id> --prompt <text> [options]
  npm run assets:tripo -- image --id <candidate-id> --image <path> [options]

Options:
  --model <snapshot>       Tripo model snapshot (default: ${defaultModel})
  --face-limit <count>     Requested face limit (default: ${defaultFaceLimit})
  --seed <integer>         Reproducible geometry/model seed
  --texture-seed <integer> Reproducible texture seed
  --no-pbr                 Disable PBR and texture generation
  --timeout <seconds>      Task timeout (default: ${defaultTimeoutSeconds})
  --dry-run                Validate and print the sanitized request without API use
  --help                   Show this help

Candidates are written under output/tripo-candidates/ and are never added to
the runtime asset manifest automatically. The API key is read from
TRIPO_API_KEY or the legacy tripo_api_key entry in .env.
`;

function parseEnvFile(contents) {
  const values = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

async function loadApiKey() {
  const fileValues = await readFile(path.join(repositoryRoot, '.env'), 'utf8')
    .then(parseEnvFile)
    .catch(() => ({}));
  return (
    process.env.TRIPO_API_KEY ||
    process.env.tripo_api_key ||
    fileValues.TRIPO_API_KEY ||
    fileValues.tripo_api_key
  );
}

function parseInteger(name, value, { minimum = Number.MIN_SAFE_INTEGER } = {}) {
  if (!/^-?\d+$/.test(value ?? '')) throw new Error(`${name} must be an integer.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`${name} must be a safe integer >= ${minimum}.`);
  }
  return parsed;
}

function parseArguments(argv) {
  if (argv.length === 0 || argv.includes('--help')) return { help: true };
  const mode = argv[0];
  if (!['text', 'image'].includes(mode)) {
    throw new Error('First argument must be "text" or "image".');
  }

  const options = {
    mode,
    model: defaultModel,
    faceLimit: defaultFaceLimit,
    pbr: true,
    timeoutSeconds: defaultTimeoutSeconds,
    dryRun: false,
  };
  const valueOptions = new Set([
    '--id',
    '--prompt',
    '--image',
    '--model',
    '--face-limit',
    '--seed',
    '--texture-seed',
    '--timeout',
  ]);

  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--no-pbr') {
      options.pbr = false;
      continue;
    }
    if (argument === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (!valueOptions.has(argument)) throw new Error(`Unknown option: ${argument}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${argument} requires a value.`);
    }
    index += 1;
    if (argument === '--id') options.id = value;
    if (argument === '--prompt') options.prompt = value;
    if (argument === '--image') options.image = value;
    if (argument === '--model') options.model = value;
    if (argument === '--face-limit') {
      options.faceLimit = parseInteger('--face-limit', value, { minimum: 50 });
    }
    if (argument === '--seed') options.seed = parseInteger('--seed', value);
    if (argument === '--texture-seed') {
      options.textureSeed = parseInteger('--texture-seed', value);
    }
    if (argument === '--timeout') {
      options.timeoutSeconds = parseInteger('--timeout', value, { minimum: 1 });
    }
  }

  if (!options.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.id)) {
    throw new Error('--id must use lowercase kebab-case.');
  }
  if (options.mode === 'text' && !options.prompt?.trim()) {
    throw new Error('Text generation requires --prompt.');
  }
  if (options.mode === 'image' && !options.image) {
    throw new Error('Image generation requires --image.');
  }
  if (options.faceLimit > 20000 && options.model.startsWith('P1-')) {
    throw new Error('P Series supports a maximum --face-limit of 20000.');
  }
  return options;
}

async function requestJson(url, { apiKey, method = 'GET', body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.code !== 0 || !payload?.data) {
    const detail = payload?.message ?? payload?.error ?? response.statusText;
    throw new Error(`Tripo request failed (${response.status}): ${detail}`);
  }
  return payload.data;
}

async function uploadImage(imagePath, apiKey) {
  const extension = path.extname(imagePath).slice(1).toLowerCase();
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
    throw new Error('Image input must be JPG, JPEG, PNG, or WebP.');
  }
  const bytes = await readFile(imagePath);
  if (bytes.byteLength > 20 * 1024 * 1024) {
    throw new Error('Image input exceeds Tripo\'s 20 MB generation limit.');
  }
  const presign = await requestJson(`${apiBaseUrl}/files/presign`, {
    apiKey,
    method: 'POST',
    body: { format: extension },
  });
  const uploadResponse = await fetch(presign.presigned_url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: bytes,
  });
  if (!uploadResponse.ok) {
    throw new Error(`Tripo image upload failed (${uploadResponse.status}).`);
  }
  return {
    fileToken: presign.file_token,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.byteLength,
  };
}

function generationPayload(options, input) {
  return {
    ...(options.mode === 'text' ? { prompt: options.prompt.trim() } : { input }),
    model: options.model,
    face_limit: options.faceLimit,
    texture: options.pbr,
    pbr: options.pbr,
    ...(options.seed === undefined ? {} : { model_seed: options.seed }),
    ...(options.textureSeed === undefined
      ? {}
      : { texture_seed: options.textureSeed }),
  };
}

async function waitForTask(taskId, apiKey, timeoutSeconds) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    const task = await requestJson(`${apiBaseUrl}/tasks/${taskId}`, { apiKey });
    process.stdout.write(`\rTripo task ${task.status}: ${task.progress ?? 0}%`);
    if (task.status === 'success') {
      process.stdout.write('\n');
      return task;
    }
    if (['failed', 'cancelled', 'banned'].includes(task.status)) {
      process.stdout.write('\n');
      throw new Error(`Tripo task ended with status "${task.status}".`);
    }
    await new Promise((resolve) => setTimeout(resolve, defaultPollIntervalMs));
  }
  process.stdout.write('\n');
  throw new Error(`Tripo task timed out after ${timeoutSeconds} seconds.`);
}

async function download(url, destination) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Candidate download failed (${response.status}).`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(destination, bytes);
  return bytes;
}

function previewFilename(url) {
  const extension = path.extname(new URL(url).pathname).toLowerCase();
  return `preview${['.png', '.jpg', '.jpeg', '.webp'].includes(extension) ? extension : '.image'}`;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(help);
    return;
  }

  let imageMetadata;
  let resolvedImagePath;
  if (options.mode === 'image') {
    resolvedImagePath = path.resolve(repositoryRoot, options.image);
    const bytes = await readFile(resolvedImagePath);
    imageMetadata = {
      sha256: createHash('sha256').update(bytes).digest('hex'),
      bytes: bytes.byteLength,
      repositoryPath: path.relative(repositoryRoot, resolvedImagePath),
    };
  }

  const sanitizedPayload = generationPayload(options, options.mode === 'image' ? '<file-token>' : undefined);
  if (options.dryRun) {
    console.log(JSON.stringify({
      mode: options.mode,
      id: options.id,
      endpoint: `/generation/${options.mode}-to-model`,
      payload: sanitizedPayload,
      image: imageMetadata,
      outputRoot: `output/tripo-candidates/${options.id}/<timestamp>`,
    }, null, 2));
    return;
  }

  const apiKey = await loadApiKey();
  if (!apiKey) {
    throw new Error('Missing TRIPO_API_KEY (or legacy tripo_api_key) in the environment or .env.');
  }

  let input;
  if (options.mode === 'image') {
    const upload = await uploadImage(resolvedImagePath, apiKey);
    input = upload.fileToken;
    imageMetadata = { ...imageMetadata, sha256: upload.sha256, bytes: upload.bytes };
  }
  const payload = generationPayload(options, input);
  const created = await requestJson(`${apiBaseUrl}/generation/${options.mode}-to-model`, {
    apiKey,
    method: 'POST',
    body: payload,
  });
  const task = await waitForTask(created.task_id, apiKey, options.timeoutSeconds);
  if (!task.output?.model_url) throw new Error('Successful Tripo task did not return model_url.');

  const timestamp = new Date().toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z');
  const candidateRoot = path.join(repositoryRoot, 'output', 'tripo-candidates', options.id, timestamp);
  await mkdir(candidateRoot, { recursive: true });
  const modelBytes = await download(task.output.model_url, path.join(candidateRoot, 'candidate.glb'));
  if (modelBytes.subarray(0, 4).toString('ascii') !== 'glTF') {
    throw new Error('Downloaded candidate is not a binary glTF file.');
  }
  const previewFile = task.output.rendered_image_url
    ? previewFilename(task.output.rendered_image_url)
    : null;
  if (previewFile) {
    await download(task.output.rendered_image_url, path.join(candidateRoot, previewFile));
  }

  const receipt = {
    schemaVersion: 1,
    status: 'candidate-needs-review',
    provider: 'tripo',
    candidateId: options.id,
    generatedAt: new Date().toISOString(),
    mode: options.mode,
    request: payload,
    inputImage: imageMetadata ?? null,
    task: {
      id: task.task_id,
      type: task.type,
      creditsConsumed: task.credits_consumed ?? null,
      createdAt: task.created_at ?? null,
      completedAt: task.completed_at ?? null,
    },
    output: {
      file: 'candidate.glb',
      bytes: modelBytes.byteLength,
      sha256: createHash('sha256').update(modelBytes).digest('hex'),
      preview: previewFile,
    },
    officialDocs,
    acceptance: {
      acceptedIntoManifest: false,
      rightsReviewed: false,
      geometryReviewed: false,
      perceptuallyReviewed: false,
      performanceReviewed: false,
    },
  };
  await writeFile(
    path.join(candidateRoot, 'generation-receipt.json'),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
  console.log(`Candidate downloaded to ${path.relative(repositoryRoot, candidateRoot)}`);
  console.log('Review it before copying into assets/source/models or editing the asset manifest.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
