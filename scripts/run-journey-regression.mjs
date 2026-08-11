import { spawn } from 'node:child_process';
import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';

const root = process.cwd();
const browserArgument = process.argv.find((argument) => argument.startsWith('--browser='));
const requestedBrowser = browserArgument?.slice('--browser='.length) ?? 'chrome';
const recoveryMode = process.argv.includes('--recovery');
const localDemoPath = process.argv.includes('--local-demo')
  ? path.join(root, 'assets', 'source', 'audio', 'crywolf-athetosis-demo.mp3')
  : null;
const outputDir = path.join(root, 'output', 'playwright', 'journey-regression');
const reportPath = path.join(outputDir, 'report.json');
const pageUrl =
  process.env.JOURNEY_REGRESSION_URL ??
  'http://localhost/?e2e=1';
const checks = [];
const snapshots = {};
const screenshots = [];
const report = {
  capturedAt: new Date().toISOString(),
  page: pageUrl,
  browser: requestedBrowser,
  mode: recoveryMode ? 'recovery' : 'journey',
  status: 'running',
  checks,
  snapshots,
  screenshots,
  consoleErrors: [],
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function check(name, condition, details = null) {
  checks.push({ name, passed: Boolean(condition), details });
  if (!condition) throw new Error(`Regression check failed: ${name}`);
}

async function waitFor(predicate, label, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let latest;
  while (Date.now() < deadline) {
    latest = await predicate();
    if (latest) return latest;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${label}. Last value: ${JSON.stringify(latest)}`);
}

async function findChromium() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const installedBrowsers =
    process.platform === 'win32'
      ? {
          chrome: [
            path.join(process.env.PROGRAMFILES ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(process.env['PROGRAMFILES(X86)'] ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
          ],
          edge: [
            path.join(process.env.PROGRAMFILES ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
            path.join(process.env['PROGRAMFILES(X86)'] ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
          ],
        }
      : { chrome: [], edge: [] };
  if (!Object.hasOwn(installedBrowsers, requestedBrowser)) {
    throw new Error(`Unsupported browser "${requestedBrowser}". Use chrome or edge.`);
  }
  const installedBrowserCandidates = installedBrowsers[requestedBrowser];
  const cacheRoot =
    process.platform === 'win32' && process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'ms-playwright')
      : path.join(homedir(), '.cache', 'ms-playwright');
  const entries = await readdir(cacheRoot, { withFileTypes: true }).catch(() => []);
  const headlessCandidates = entries
    .filter(
      (entry) =>
        entry.isDirectory() && entry.name.startsWith('chromium_headless_shell-'),
    )
    .sort((left, right) => right.name.localeCompare(left.name))
    .map((entry) =>
      path.join(
        cacheRoot,
        entry.name,
        'chrome-headless-shell-linux64',
        'chrome-headless-shell',
      ),
    );
  const chromiumCandidates = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('chromium-'))
    .sort((left, right) => right.name.localeCompare(left.name))
    .flatMap((entry) =>
      process.platform === 'win32'
        ? [path.join(cacheRoot, entry.name, 'chrome-win', 'chrome.exe')]
        : [
            path.join(cacheRoot, entry.name, 'chrome-linux64', 'chrome'),
            path.join(cacheRoot, entry.name, 'chrome-linux', 'chrome'),
          ],
    );
  const candidates = [
    ...installedBrowserCandidates,
    ...(requestedBrowser === 'chrome' ? headlessCandidates : []),
    ...(requestedBrowser === 'chrome' ? chromiumCandidates : []),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next Playwright-managed Chromium installation.
    }
  }
  throw new Error(
    `${requestedBrowser} was not found. Set CHROME_BIN or install the requested browser.`,
  );
}

function connectCdpPipe(input, output) {
  return new Promise((resolve) => {
    const pending = new Map();
    const listeners = new Map();
    let nextId = 1;
    let buffered = Buffer.alloc(0);
    const rejectPending = (error) => {
      pending.forEach(({ reject: rejectRequest, timeout }) => {
        clearTimeout(timeout);
        rejectRequest(error);
      });
      pending.clear();
    };
    input.on('error', (error) => rejectPending(error));
    output.on('error', (error) => rejectPending(error));
    output.on('close', () =>
      rejectPending(new Error('Chromium closed the DevTools pipe.')),
    );

    const handleMessage = (message) => {
      if (message.id && pending.has(message.id)) {
        const request = pending.get(message.id);
        pending.delete(message.id);
        clearTimeout(request.timeout);
        if (message.error) request.reject(new Error(message.error.message));
        else request.resolve(message.result);
        return;
      }
      listeners.get(message.method)?.forEach((listener) => listener(message.params));
    };

    output.on('data', (chunk) => {
      buffered = Buffer.concat([buffered, chunk]);
      let boundary = buffered.indexOf(0);
      while (boundary >= 0) {
        const payload = buffered.subarray(0, boundary).toString('utf8');
        buffered = buffered.subarray(boundary + 1);
        if (payload) handleMessage(JSON.parse(payload));
        boundary = buffered.indexOf(0);
      }
    });

    resolve({
      close: () => input.end(),
      on(method, listener) {
        const methodListeners = listeners.get(method) ?? new Set();
        methodListeners.add(listener);
        listeners.set(method, methodListeners);
      },
      send(method, params = {}, sessionId) {
        return new Promise((resolveRequest, rejectRequest) => {
          const id = nextId++;
          const timeout = setTimeout(() => {
            pending.delete(id);
            rejectRequest(new Error(`DevTools command timed out: ${method}`));
          }, 40_000);
          pending.set(id, {
            resolve: resolveRequest,
            reject: rejectRequest,
            timeout,
          });
          input.write(
            `${JSON.stringify({
              id,
              method,
              params,
              ...(sessionId ? { sessionId } : {}),
            })}\0`,
          );
        });
      },
    });
  });
}

await mkdir(outputDir, { recursive: true });
const profileDir = await mkdtemp(path.join(tmpdir(), 'music-universe-journey-'));
const chromium = await findChromium();

let browser;
let client;
let rootClient;
let browserLog = '';

try {
  browser = spawn(
    chromium,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-breakpad',
      '--disable-crash-reporter',
      '--allow-file-access-from-files',
      '--disable-web-security',
      '--enable-webgl',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--use-angle=swiftshader',
      '--remote-debugging-pipe',
      `--user-data-dir=${profileDir}`,
      '--window-size=1440,900',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] },
  );
  browser.stderr.on('data', (chunk) => {
    browserLog += chunk.toString();
  });
  await wait(500);
  if (browser.exitCode !== null) {
    throw new Error(
      `Chromium exited before DevTools attached (code ${browser.exitCode}).\n${browserLog}`,
    );
  }

  rootClient = await connectCdpPipe(browser.stdio[3], browser.stdio[4]);
  const target = await rootClient.send('Target.createTarget', { url: 'about:blank' });
  const attached = await rootClient.send('Target.attachToTarget', {
    targetId: target.targetId,
    flatten: true,
  });
  const sessionId = attached.sessionId;
  client = {
    close: () => undefined,
    on: (method, listener) => rootClient.on(method, listener),
    send: (method, params = {}) => rootClient.send(method, params, sessionId),
  };
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Log.enable');
  client.on('Runtime.exceptionThrown', (params) => {
    report.consoleErrors.push(
      params.exceptionDetails?.exception?.description ??
        params.exceptionDetails?.text ??
        'Unhandled runtime exception',
    );
  });
  client.on('Log.entryAdded', ({ entry }) => {
    if (entry.level === 'error') report.consoleErrors.push(entry.text);
  });
  const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.glb': 'model/gltf-binary',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
  };
  if (!process.env.JOURNEY_REGRESSION_URL) {
    await client.send('Fetch.enable', {
      patterns: [{ urlPattern: 'http://localhost/*' }],
    });
    client.on('Fetch.requestPaused', async ({ requestId, request }) => {
      try {
        const url = new URL(request.url);
        const relativePath =
          decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
        if (relativePath === '__local_demo_audio__' && localDemoPath) {
          const body = await readFile(localDemoPath);
          await client.send('Fetch.fulfillRequest', {
            requestId,
            responseCode: 200,
            responseHeaders: [
              { name: 'Content-Type', value: 'audio/mpeg' },
              { name: 'Cache-Control', value: 'no-store' },
            ],
            body: body.toString('base64'),
          });
          return;
        }
        const absolutePath = path.resolve(root, 'dist', relativePath);
        const distRoot = `${path.resolve(root, 'dist')}${path.sep}`;
        if (!absolutePath.startsWith(distRoot)) {
          throw new Error(`Unsafe dist request: ${relativePath}`);
        }
        const body = await readFile(absolutePath);
        await client.send('Fetch.fulfillRequest', {
          requestId,
          responseCode: 200,
          responseHeaders: [
            {
              name: 'Content-Type',
              value: mimeTypes[path.extname(absolutePath)] ?? 'application/octet-stream',
            },
            { name: 'Cache-Control', value: 'no-store' },
          ],
          body: body.toString('base64'),
        });
      } catch {
        try {
          await client.send('Fetch.fulfillRequest', {
            requestId,
            responseCode: 404,
            body: Buffer.from('Not found').toString('base64'),
          });
        } catch {
          // Navigation can cancel an intercepted request before it is fulfilled.
        }
      }
    });
  }
  await client.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.__JOURNEY_REGRESSION_ERRORS__ = [];
      window.addEventListener('error', (event) => {
        window.__JOURNEY_REGRESSION_ERRORS__.push(event.error?.stack || event.message);
      });
      window.addEventListener('unhandledrejection', (event) => {
        window.__JOURNEY_REGRESSION_ERRORS__.push(
          event.reason?.stack || event.reason?.message || String(event.reason)
        );
      });
    `,
  });
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await client.send('Page.navigate', { url: pageUrl });

  const evaluate = async (expression, userGesture = false) => {
    const result = await client.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture,
    });
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ??
          result.exceptionDetails.text ??
          'Browser evaluation failed.',
      );
    }
    return result.result?.value;
  };
  const worldSnapshot = () =>
    evaluate('window.__MUSIC_UNIVERSE_WORLD_E2E__?.snapshot ?? null');
  const setPlayer = async (position, yaw = Math.PI) => {
    await evaluate(
      `window.__MUSIC_UNIVERSE_E2E__?.setPlayerTransform(${JSON.stringify(position)}, ${yaw})`,
    );
    await wait(900);
  };
  const settleReviewCamera = async () => {
    await wait(2200);
  };
  const closePanel = () =>
    evaluate(`document.querySelector('[aria-label="Close dialog"]')?.click()`);
  const screenshot = async (name) => {
    const result = await client.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    const relativePath = `output/playwright/journey-regression/${name}.png`;
    await writeFile(path.join(root, relativePath), Buffer.from(result.data, 'base64'));
    screenshots.push(relativePath);
  };

  if (recoveryMode) {
    const recoveryUrl = new URL(pageUrl);
    recoveryUrl.searchParams.set('e2e', '1');
    recoveryUrl.searchParams.set('e2eFault', 'webgl2-unavailable');
    await client.send('Page.navigate', { url: recoveryUrl.toString() });
    await waitFor(
      () => evaluate(`document.body.innerText.includes('This world needs WebGL 2')`),
      'WebGL unavailable recovery page',
    );
    check(
      'WebGL unavailable shows a readable recovery page',
      await evaluate(`document.body.innerText.includes('Enable hardware acceleration')`),
    );
    check(
      'WebGL unavailable offers reload',
      await evaluate(
        `[...document.querySelectorAll('button')].some((button) => button.textContent?.trim() === 'Reload world')`,
      ),
    );
    await screenshot('recovery-webgl2-unavailable');
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await client.send('Page.reload');
      const stable = await waitFor(
        () => evaluate(`document.body.innerText.includes('This world needs WebGL 2')`),
        `WebGL unavailable reload ${attempt}`,
      );
      check(`WebGL unavailable remains stable after reload ${attempt}`, stable === true);
    }

    recoveryUrl.searchParams.set('e2eFault', 'runtime-error');
    await client.send('Page.navigate', { url: recoveryUrl.toString() });
    await waitFor(
      () => evaluate(`document.body.innerText.includes('The world could not finish loading')`),
      'runtime error recovery page',
    );
    check(
      'Runtime failure shows a readable recovery page',
      await evaluate(`document.body.innerText.includes('has not been uploaded to a server')`),
    );
    check(
      'Runtime failure offers reload',
      await evaluate(
        `[...document.querySelectorAll('button')].some((button) => button.textContent?.trim() === 'Reload world')`,
      ),
    );
    await screenshot('recovery-runtime-error');

    recoveryUrl.searchParams.delete('e2eFault');
    await client.send('Page.navigate', { url: recoveryUrl.toString() });
    const recovered = await waitFor(
      () => evaluate('Boolean(window.__MUSIC_UNIVERSE_WORLD_E2E__ && window.__MUSIC_UNIVERSE_E2E__)'),
      'world recovery after fault removal',
    );
    check('World starts normally after removing the E2E fault', recovered === true);
    report.consoleErrors.length = 0;
  } else {
    await waitFor(
    () => evaluate('Boolean(window.__MUSIC_UNIVERSE_WORLD_E2E__ && window.__MUSIC_UNIVERSE_E2E__)'),
    'world inspection probes',
  );
  await evaluate(
    `[...document.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Enter the world'))?.click()`,
    true,
  );
  await wait(500);

  snapshots.initial = await worldSnapshot();
  check('initial objective is the Listener Guide', snapshots.initial.currentObjectiveId === 'npc-guide');
  check('initial journey flags are clear', Object.keys(snapshots.initial.flags).length === 0);
  const archive = snapshots.initial.interactions.find(
    (interaction) => interaction.id === 'memory-archive',
  );
  check('Memory Archive exists in the semantic world', Boolean(archive), archive);
  check(
    'Memory Archive collider covers the normalized hangar',
    archive?.collider?.type === 'cuboid' &&
      archive.collider.halfExtents[0] >= 5.2 &&
      archive.collider.halfExtents[2] >= 7.1,
    archive?.collider,
  );
  check(
    'Memory Archive interaction is reachable outside its collider',
    archive.radius > archive.collider.halfExtents[2],
    { radius: archive.radius, halfExtents: archive.collider.halfExtents },
  );
  const invalidAudioRecovery = await evaluate(
    `(() => {
      const input = document.querySelector('input[type="file"][accept="audio/*"]');
      if (!input) throw new Error('Music file input was not found.');
      const transfer = new DataTransfer();
      transfer.items.add(new File(['not audio'], 'invalid.txt', { type: 'text/plain' }));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return {
        error: document.querySelector('[role="alert"]')?.textContent ?? '',
        recovery: document.querySelector('label[for="music-file-input"]')?.textContent?.trim() ?? '',
      };
    })()`,
    true,
  );
  check(
    'invalid audio produces a readable error',
    invalidAudioRecovery.error.includes('audio file'),
    invalidAudioRecovery,
  );
  check(
    'audio failure offers a replacement-file action',
    invalidAudioRecovery.recovery === 'Choose another audio file',
    invalidAudioRecovery,
  );
  const audioReady = await evaluate(
    `(async () => {
      const input = document.querySelector('input[type="file"][accept="audio/*"]');
      if (!input) throw new Error('Music file input was not found.');
      const useLocalDemo = ${Boolean(localDemoPath)};
      const sampleRate = 8000;
      const sampleCount = sampleRate * 4;
      const wav = new ArrayBuffer(44 + sampleCount * 2);
      const view = new DataView(wav);
      const text = (offset, value) => {
        for (let index = 0; index < value.length; index += 1) {
          view.setUint8(offset + index, value.charCodeAt(index));
        }
      };
      text(0, 'RIFF');
      view.setUint32(4, 36 + sampleCount * 2, true);
      text(8, 'WAVEfmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      text(36, 'data');
      view.setUint32(40, sampleCount * 2, true);
      const transfer = new DataTransfer();
      const blob = useLocalDemo
        ? await fetch('/__local_demo_audio__').then((response) => {
            if (!response.ok) throw new Error('Local demo audio fixture was unavailable.');
            return response.blob();
          })
        : new Blob([wav], { type: 'audio/wav' });
      transfer.items.add(new File(
        [blob],
        useLocalDemo ? "ATHETOSIS - Crywolf.mp3" : 'journey-regression.wav',
        { type: useLocalDemo ? 'audio/mpeg' : 'audio/wav' },
      ));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      const deadline = performance.now() + 20000;
      let range;
      let playButton;
      while (performance.now() < deadline) {
        range = document.querySelector('input[aria-label="Music progress"]');
        playButton = [...document.querySelectorAll('button')]
          .find((button) => button.textContent?.trim() === 'Play');
        if (range && playButton && !playButton.disabled && Number(range.max) > 0) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (!range || !playButton || playButton.disabled) {
        throw new Error('Synthetic journey audio did not become ready: ' + JSON.stringify({
          selectedFiles: input.files?.length ?? 0,
          rangePresent: Boolean(range),
          rangeMaximum: Number(range?.max ?? 0),
          playPresent: Boolean(playButton),
          playDisabled: playButton?.disabled ?? null,
          body: document.body.innerText.slice(0, 600),
        }));
      }
      return { duration: Number(range.max), currentTime: Number(range.value) };
    })()`,
    true,
  );
  check('synthetic journey audio becomes ready', audioReady.duration > 0, audioReady);
  await setPlayer([0, 0.65, 0]);
  await settleReviewCamera();
  await screenshot('00-spawn');

  // Walk forward into the front face of the Archive and assert Rapier stops the capsule.
  await setPlayer([-8, 0.65, -2.8]);
  await evaluate(
    `window.__MUSIC_UNIVERSE_E2E__?.drivePlayer([0, 0, -5], 900)`,
  );
  await wait(950);
  await wait(250);
  const collisionPosition = await evaluate(
    'window.__MUSIC_UNIVERSE_E2E__?.playerPosition ?? null',
  );
  check(
    'player is stopped outside the Archive front collider',
    Array.isArray(collisionPosition) &&
      collisionPosition[2] > -3.75 &&
      Math.abs(collisionPosition[0] + 8) < 1.25,
    collisionPosition,
  );

  await setPlayer([0, 0.65, -4]);
  check(
    'Guide interaction executes',
    await evaluate(`window.__MUSIC_UNIVERSE_WORLD_E2E__.triggerInteraction('npc-guide')`, true),
  );
  snapshots.afterGuide = await waitFor(async () => {
    const snapshot = await worldSnapshot();
    return snapshot?.currentObjectiveId === 'memory-archive' ? snapshot : null;
  }, 'Guide objective transition');
  check('Guide advances objective to Archive', snapshots.afterGuide.currentObjectiveId === 'memory-archive');
  check('Guide sets journey.started', snapshots.afterGuide.flags['journey.started'] === true);
  await closePanel();
  await wait(450);
  await screenshot('01-guide-complete');

  if (localDemoPath) {
    await evaluate(
    `(async () => {
      const input = document.querySelector('input[type="file"][accept="audio/*"]');
      if (!input) throw new Error('Audio replacement input was not found.');
      const response = await fetch('/__local_demo_audio__');
      if (!response.ok) throw new Error('Replacement audio fixture was unavailable.');
      const transfer = new DataTransfer();
      transfer.items.add(new File([await response.blob()], 'ATHETOSIS - Crywolf.mp3', {
        type: 'audio/mpeg',
      }));
      Object.defineProperty(input, 'files', { configurable: true, value: transfer.files });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })()`,
    true,
  );
  snapshots.afterTrackReplacement = await waitFor(async () => {
    const snapshot = await worldSnapshot();
    return snapshot?.currentObjectiveId === 'npc-guide' &&
      snapshot.flags?.['journey.started'] !== true
      ? snapshot
      : null;
  }, 'track replacement reset state');
  check(
    'Track replacement resets deliberate journey flags',
    snapshots.afterTrackReplacement.flags['journey.started'] !== true,
  );
  check(
    'Track replacement restores the Guide objective',
    snapshots.afterTrackReplacement.currentObjectiveId === 'npc-guide',
  );
  check(
    'Guide interaction still executes after track replacement',
    await evaluate(`window.__MUSIC_UNIVERSE_WORLD_E2E__.triggerInteraction('npc-guide')`, true),
  );
  snapshots.afterGuide = await waitFor(async () => {
    const snapshot = await worldSnapshot();
    return snapshot?.currentObjectiveId === 'memory-archive' ? snapshot : null;
  }, 'Guide objective transition after track replacement');
    await closePanel();
  }

  await setPlayer([-2, 0.65, -11]);
  check(
    'Archive interaction executes from outside the collider',
    await evaluate(
      `window.__MUSIC_UNIVERSE_WORLD_E2E__.triggerInteraction('memory-archive')`,
      true,
    ),
  );
  snapshots.afterArchive = await waitFor(async () => {
    const snapshot = await worldSnapshot();
    return snapshot?.currentObjectiveId === 'departure-gate' ? snapshot : null;
  }, 'Archive objective transition');
  check('Archive advances objective to Gate', snapshots.afterArchive.currentObjectiveId === 'departure-gate');
  check('Archive sets memory.received', snapshots.afterArchive.flags['memory.received'] === true);
  await closePanel();
  await wait(450);
  await screenshot('02-archive-complete');

  const audioSetup = await evaluate(
    `(async () => {
      const range = document.querySelector('input[aria-label="Music progress"]');
      const playButton = [...document.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === 'Play');
      if (!range || !playButton || playButton.disabled) {
        throw new Error('Synthetic journey audio controls are no longer ready.');
      }
      playButton.click();
      await new Promise((resolve) => setTimeout(resolve, 150));
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(range, String(Number(range.max) * 0.9));
      range.dispatchEvent(new Event('input', { bubbles: true }));
      range.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 200));
      [...document.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === 'Pause')?.click();
      return { duration: Number(range.max), currentTime: Number(range.value) };
    })()`,
    true,
  );
  snapshots.gateOpen = await waitFor(async () => {
    const snapshot = await worldSnapshot();
    return snapshot?.flags?.['world.departureGateOpen'] === true
      ? snapshot
      : null;
  }, 'departure gate timeline cue');
  check('synthetic audio reaches the gate cue', audioSetup.currentTime >= audioSetup.duration * 0.84, audioSetup);
  check('timeline opens the departure gate', snapshots.gateOpen.flags['world.departureGateOpen'] === true);

  await setPlayer([0, 0.65, -11.5]);
  check(
    'Gate interaction executes',
    await evaluate(
      `window.__MUSIC_UNIVERSE_WORLD_E2E__.triggerInteraction('departure-gate')`,
      true,
    ),
  );
  snapshots.completed = await waitFor(async () => {
    const snapshot = await worldSnapshot();
    return snapshot?.flags?.['journey.completed'] === true ? snapshot : null;
  }, 'journey completion state');
  check('Gate completes the journey', snapshots.completed.flags['journey.completed'] === true);
  check('completed journey has no remaining objective', snapshots.completed.currentObjectiveId === null);
  await screenshot('03-gate-complete');
  await closePanel();

  let naturalEnd = null;
  if (localDemoPath) {
    await evaluate(
      `(async () => {
        const input = document.querySelector('input[type="file"][accept="audio/*"]');
        if (!input) throw new Error('Audio replacement input was not found.');
        const response = await fetch('/__local_demo_audio__');
        if (!response.ok) throw new Error('Replacement audio fixture was unavailable.');
        const transfer = new DataTransfer();
        transfer.items.add(new File([await response.blob()], 'ATHETOSIS - Crywolf.mp3', {
          type: 'audio/mpeg',
        }));
        Object.defineProperty(input, 'files', { configurable: true, value: transfer.files });
        input.dispatchEvent(new Event('change', { bubbles: true }));
      })()`,
      true,
    );
  } else {
    naturalEnd = await evaluate(
      `(async () => {
      const range = document.querySelector('input[aria-label="Music progress"]');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(range, String(Math.max(0, Number(range.max) - 0.5)));
      range.dispatchEvent(new Event('input', { bubbles: true }));
      range.dispatchEvent(new Event('change', { bubbles: true }));
      [...document.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === 'Play')?.click();
      const deadline = performance.now() + 5000;
      while (performance.now() < deadline) {
        const playReady = [...document.querySelectorAll('button')]
          .some((button) => button.textContent?.trim() === 'Play');
        if (playReady && Number(range.value) >= Number(range.max) - 0.05) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const endedAt = Number(range.value);
      const duration = Number(range.max);
      if (endedAt < duration - 0.05) {
        throw new Error('Audio did not reach its natural end before replay.');
      }
      [...document.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === 'Play')?.click();
      await new Promise((resolve) => setTimeout(resolve, 250));
      [...document.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === 'Pause')?.click();
      return { endedAt, duration };
      })()`,
      true,
    );
    check(
      'Audio reaches its natural end before replay',
      naturalEnd.endedAt >= naturalEnd.duration - 0.05,
      naturalEnd,
    );
  }
  snapshots.replay = await waitFor(async () => {
    const snapshot = await worldSnapshot();
    return snapshot?.currentObjectiveId === 'npc-guide' &&
      snapshot.flags?.['journey.started'] !== true
      ? snapshot
      : null;
  }, 'replay reset state');
  check(
    localDemoPath
      ? 'Final track replacement resets deliberate journey flags'
      : 'Replay resets deliberate journey flags',
    snapshots.replay.flags['journey.started'] !== true,
  );
  check(
    localDemoPath
      ? 'Final track replacement restores the Guide objective'
      : 'Replay restores the Guide objective',
    snapshots.replay.currentObjectiveId === 'npc-guide',
  );
  check(
    localDemoPath
      ? 'Final track replacement reconstructs the closed gate state'
      : 'Replay reconstructs the closed gate state',
    snapshots.replay.flags['world.departureGateOpen'] !== true,
  );
  await setPlayer([0, 0.65, 0]);
  await settleReviewCamera();
  await screenshot('04-replay-reset');

  const contextLossRecovery = await evaluate(
    `(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) throw new Error('World canvas was not found.');
      canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
      return true;
    })()`,
    true,
  );
  check('WebGL context-loss event can be triggered', contextLossRecovery === true);
  const contextLossPage = await waitFor(
    () => evaluate(`document.body.innerText.includes('The world lost its graphics connection')`),
    'context-loss recovery page',
  );
  check('WebGL context loss shows a recovery page', contextLossPage === true);
  check(
    'context-loss recovery offers reload',
    await evaluate(
      `[...document.querySelectorAll('button')].some((button) => button.textContent?.trim() === 'Reload world')`,
    ),
  );

  const pageErrors = await evaluate('window.__JOURNEY_REGRESSION_ERRORS__ ?? []');
  report.consoleErrors.push(...pageErrors);
  check('browser emitted no runtime errors', report.consoleErrors.length === 0, report.consoleErrors);
  }
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.failure = error instanceof Error ? error.stack ?? error.message : String(error);
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  report.browserLog = browserLog.trim().split('\n').slice(-20);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  client?.close();
  rootClient?.close();
  if (browser && browser.exitCode === null) {
    const exited = new Promise((resolve) => {
      browser.once('exit', resolve);
      setTimeout(resolve, 2_000);
    });
    browser.kill('SIGTERM');
    await exited;
  }
  await rm(profileDir, {
    recursive: true,
    force: true,
    maxRetries: process.platform === 'win32' ? 5 : 0,
    retryDelay: 200,
  });
  process.stdout.write(
    `${report.status.toUpperCase()}: ${path.relative(root, reportPath)}\n`,
  );
  if (report.status === 'passed') {
    process.stdout.write(`${checks.length} checks passed; ${screenshots.length} screenshots captured.\n`);
  } else {
    process.stderr.write(`${report.failure}\n`);
  }
}
