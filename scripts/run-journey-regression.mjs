import { spawn } from 'node:child_process';
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  connectCdpPipe,
  findBrowserExecutable,
} from './browser-regression-harness.mjs';

const root = process.cwd();
const browserArgument = process.argv.find((argument) => argument.startsWith('--browser='));
const requestedBrowser = browserArgument?.slice('--browser='.length) ?? 'chrome';
const recoveryMode = process.argv.includes('--recovery');
const headedMode = process.argv.includes('--headed');
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
  headed: headedMode,
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

await mkdir(outputDir, { recursive: true });
const profileDir = await mkdtemp(path.join(tmpdir(), 'music-universe-journey-'));
const chromium = await findBrowserExecutable(requestedBrowser);

let browser;
let client;
let rootClient;
let browserLog = '';

try {
  browser = spawn(
    chromium,
    [
      ...(headedMode ? [] : ['--headless=new']),
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-breakpad',
      '--disable-crash-reporter',
      '--disable-backgrounding-occluded-windows',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--allow-file-access-from-files',
      '--disable-web-security',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      ...(headedMode
        ? []
        : ['--enable-unsafe-swiftshader', '--use-angle=swiftshader']),
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
  const targets = await rootClient.send('Target.getTargets');
  const pageTarget = targets.targetInfos.find(
    (targetInfo) => targetInfo.type === 'page' && targetInfo.url === 'about:blank',
  );
  const targetId = pageTarget?.targetId ??
    (await rootClient.send('Target.createTarget', { url: 'about:blank' })).targetId;
  await rootClient.send('Target.activateTarget', { targetId });
  const attached = await rootClient.send('Target.attachToTarget', {
    targetId,
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
    const ignoredMissingFavicon =
      entry.level === 'error' &&
      entry.source === 'network' &&
      /favicon\.ico|Failed to load resource: the server responded with a status of 404/.test(
        entry.url ?? entry.text,
      );
    if (entry.level === 'error' && !ignoredMissingFavicon) report.consoleErrors.push(entry.text);
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
      window.__JOURNEY_OBJECT_URLS__ = { created: [], revoked: [] };
      const createObjectURL = URL.createObjectURL.bind(URL);
      const revokeObjectURL = URL.revokeObjectURL.bind(URL);
      URL.createObjectURL = (value) => {
        const url = createObjectURL(value);
        window.__JOURNEY_OBJECT_URLS__.created.push(url);
        return url;
      };
      URL.revokeObjectURL = (url) => {
        window.__JOURNEY_OBJECT_URLS__.revoked.push(url);
        return revokeObjectURL(url);
      };
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
  await rootClient.send('Target.activateTarget', { targetId });
  await client.send('Page.bringToFront');

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
    evaluate('window.__MUSIC_UNIVERSE_WORLD_E2E__?.getSnapshot?.() ?? window.__MUSIC_UNIVERSE_WORLD_E2E__?.snapshot ?? null');
  const setPlayer = async (position, yaw = Math.PI) => {
    const reached = await waitFor(async () => {
      const actual = await evaluate(
        `(() => {
          const api = window.__MUSIC_UNIVERSE_E2E__;
          if (!api) return null;
          api.setPlayerTransform(${JSON.stringify(position)}, ${yaw});
          return api.getPlayerPosition?.() ?? null;
        })()`,
      );
      return Array.isArray(actual) &&
        Math.abs(actual[0] - position[0]) < 0.15 &&
        Math.abs(actual[2] - position[2]) < 0.15
        ? actual
        : null;
    }, `player transform ${JSON.stringify(position)}`, 3000);
    await wait(800);
    return reached;
  };
  const settleReviewCamera = async () => {
    await wait(2200);
  };
  const closePanel = () =>
    evaluate(`document.querySelector('[aria-label="Close dialog"]')?.click()`);
  const pressKey = async (key, modifiers = 0) => {
    await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key, modifiers });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key, modifiers });
  };
  const clickCanvasCenter = async () => {
    const canvasCenter = await evaluate(`(() => {
      const bounds = document.querySelector('canvas')?.getBoundingClientRect();
      return bounds ? { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 } : null;
    })()`);
    await client.send('Input.dispatchMouseEvent', {
      type: 'mousePressed', x: canvasCenter.x, y: canvasCenter.y,
      button: 'left', clickCount: 1,
    });
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased', x: canvasCenter.x, y: canvasCenter.y,
      button: 'left', clickCount: 1,
    });
  };
  const lockWorldPointer = async (label) =>
    waitFor(async () => {
      if (await evaluate(`document.pointerLockElement?.tagName === 'CANVAS'`)) return true;
      await rootClient.send('Target.activateTarget', { targetId });
      await client.send('Page.bringToFront');
      await wait(150);
      await clickCanvasCenter();
      await wait(200);
      return evaluate(`document.pointerLockElement?.tagName === 'CANVAS'`);
    }, label);
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
    () => evaluate(`document.activeElement?.textContent?.trim() === 'Enter the world'`),
    'onboarding dialog focus',
  );
  check(
    'Onboarding dialog receives initial focus',
    await evaluate(`document.activeElement?.textContent?.trim() === 'Enter the world'`),
  );
  await pressKey('Tab');
  check(
    'Onboarding dialog traps forward Tab focus',
    await evaluate(`document.activeElement?.textContent?.trim() === 'Enter the world'`),
  );
  await evaluate(
    `[...document.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Enter the world'))?.click()`,
    true,
  );
  await wait(500);

  if (headedMode) {
    await rootClient.send('Target.activateTarget', { targetId });
    await client.send('Page.bringToFront');
    await wait(250);
    check(
      'Clicking the world locks and hides the pointer',
      await lockWorldPointer('world pointer lock'),
    );
    await evaluate(`document.exitPointerLock()`);
    check(
      'The browser releases the world pointer',
      await waitFor(
        () => evaluate(`document.pointerLockElement === null`),
        'pointer lock release',
      ),
    );
  }

  await waitFor(
    () => evaluate('Boolean(window.__MUSIC_UNIVERSE_WORLD_E2E__ && window.__MUSIC_UNIVERSE_E2E__)'),
    'world inspection probes',
  ).catch(async (error) => {
    const visiblePage = await evaluate('document.body.innerText.slice(0, 800)');
    throw new Error(`${error.message}\nVisible page:\n${visiblePage}`);
  });
  if (headedMode) {
    const renderer = await evaluate(`(() => {
      const gl = document.querySelector('canvas')?.getContext('webgl2');
      const extension = gl?.getExtension('WEBGL_debug_renderer_info');
      return extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : '';
    })()`);
    check(
      'Hardware WebGL renderer is active',
      Boolean(renderer) && !/swiftshader|llvmpipe|software/i.test(renderer),
      renderer,
    );
  }

  await evaluate(`document.querySelector('[aria-label="Open journey guide"]')?.click()`, true);
  await waitFor(
    () => evaluate(`document.activeElement?.textContent?.trim() === 'Enter the world'`),
    'help dialog focus',
  );
  await pressKey('Escape');
  check(
    'Escape closes help and restores trigger focus',
    await waitFor(
      () => evaluate(`document.activeElement?.getAttribute('aria-label') === 'Open journey guide'`),
      'help trigger focus restoration',
    ),
  );
  check(
    'Reduced effects exposes an unpressed state',
    await evaluate(
      `document.querySelector('[aria-label="Toggle reduced visual effects"]')?.getAttribute('aria-pressed') === 'false'`,
    ),
  );
  await evaluate(
    `document.querySelector('[aria-label="Toggle reduced visual effects"]')?.click()`,
    true,
  );
  check(
    'Reduced effects exposes its pressed state',
    await evaluate(
      `document.querySelector('[aria-label="Toggle reduced visual effects"]')?.getAttribute('aria-pressed') === 'true'`,
    ),
  );

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
  await evaluate(
    `(() => {
      const input = document.querySelector('input[type="file"][accept="audio/*"]');
      const transfer = new DataTransfer();
      transfer.items.add(new File(['corrupt audio'], 'corrupt.wav', { type: 'audio/wav' }));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })()`,
    true,
  );
  const decodeFailure = await waitFor(
    () => evaluate(
      `document.querySelector('[role="alert"]')?.textContent?.includes('could not decode') ?? false`,
    ),
    'audio decode failure recovery',
  );
  check('Corrupt audio produces a decode recovery message', decodeFailure === true);
  check(
    'Decode failure keeps the replacement-file action available',
    await evaluate(
      `document.querySelector('label[for="music-file-input"]')?.textContent?.trim() === 'Choose another audio file'`,
    ),
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
      window.__JOURNEY_AUDIO_FIXTURE__ = blob;
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
  await evaluate(
    `document.querySelector('details summary')?.click()`,
    true,
  );
  check(
    'Audio controls expose labeled music and effects sliders',
    await evaluate(
      `Boolean(document.querySelector('[aria-label="Music volume"]') && document.querySelector('[aria-label="Effects volume"]'))`,
    ),
  );
  check(
    'Subtitles expose their enabled pressed state',
    await evaluate(
      `[...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Subtitles'))?.getAttribute('aria-pressed') === 'true'`,
    ),
  );
  await evaluate(
    `(() => {
      const button = [...document.querySelectorAll('button')]
        .find((candidate) => candidate.textContent?.trim() === 'Mute');
      button?.click();
    })()`,
    true,
  );
  check(
    'Mute exposes its pressed state',
    await waitFor(
      () => evaluate(
        `[...document.querySelectorAll('button')].some((button) => button.textContent?.trim() === 'Unmute' && button.getAttribute('aria-pressed') === 'true')`,
      ),
      'mute pressed state',
    ),
  );
  await evaluate(
    `[...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Unmute')?.click()`,
    true,
  );
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 800,
    height: 600,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await wait(350);
  const compactLayout = await evaluate(
    `(() => {
      const player = document.querySelector('[aria-label="Music player"]')?.getBoundingClientRect();
      const objective = document.querySelector('[aria-label="Current journey objective"]')?.getBoundingClientRect();
      if (!player || !objective) return null;
      const overlaps = !(
        player.right <= objective.left ||
        player.left >= objective.right ||
        player.bottom <= objective.top ||
        player.top >= objective.bottom
      );
      return {
        overlaps,
        playerInside: player.left >= 0 && player.bottom <= innerHeight,
        objectiveInside: objective.right <= innerWidth && objective.top >= 0,
      };
    })()`,
  );
  check(
    'Compact desktop layout keeps primary HUD regions visible and separate',
    compactLayout && !compactLayout.overlaps && compactLayout.playerInside && compactLayout.objectiveInside,
    compactLayout,
  );
  await screenshot('accessibility-800x600');
  await evaluate(
    `document.querySelector('[aria-label="Toggle reduced visual effects"]')?.click()`,
    true,
  );
  check(
    'Reduced effects returns to its unpressed state before visual regression',
    await evaluate(
      `document.querySelector('[aria-label="Toggle reduced visual effects"]')?.getAttribute('aria-pressed') === 'false'`,
    ),
  );
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await wait(350);
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
    'window.__MUSIC_UNIVERSE_E2E__?.getPlayerPosition?.() ?? null',
  );
  check(
    'player is stopped outside the Archive front collider',
    Array.isArray(collisionPosition) &&
      collisionPosition[2] > -3.75 &&
      Math.abs(collisionPosition[0] + 8) < 1.25,
    collisionPosition,
  );

  await setPlayer([0, 0.65, -4]);
  if (headedMode) {
    await lockWorldPointer('pointer lock before click interaction');
    await clickCanvasCenter();
    check(
      'Locked-pointer click executes the nearest interaction',
      await waitFor(
        () => evaluate(`Boolean(document.querySelector('[role="dialog"]'))`),
        'locked-pointer interaction dialog',
      ),
    );
    check(
      'Opening an interaction panel releases the pointer',
      await waitFor(
        () => evaluate(`document.pointerLockElement === null`),
        'panel pointer release',
      ),
    );
    await closePanel();
  }
  check(
    'Guide interaction executes',
    headedMode ||
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

  await evaluate(
    `(async () => {
      const input = document.querySelector('input[type="file"][accept="audio/*"]');
      if (!input) throw new Error('Audio replacement input was not found.');
      const blob = window.__JOURNEY_AUDIO_FIXTURE__;
      if (!blob) throw new Error('Replacement audio fixture was unavailable.');
      const transfer = new DataTransfer();
      transfer.items.add(new File([blob], ${localDemoPath ? "'ATHETOSIS - Crywolf.mp3'" : "'journey-regression.wav'"}, {
        type: ${localDemoPath ? "'audio/mpeg'" : "'audio/wav'"},
      }));
      input.files = transfer.files;
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
  const objectUrlLifecycle = await evaluate('window.__JOURNEY_OBJECT_URLS__');
  check(
    'Track replacement revokes the previous object URL',
    objectUrlLifecycle.created.length >= 3 && objectUrlLifecycle.revoked.length >= 2,
    objectUrlLifecycle,
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
  snapshots.archiveAwakened = await waitFor(async () => {
    const snapshot = await worldSnapshot();
    return snapshot?.visuals?.archiveAwakening >= 0.92 ? snapshot : null;
  }, 'Archive building body awakening', 5000);
  check(
    'Archive interaction awakens the building body',
    snapshots.archiveAwakened.visuals.archiveAwakening >= 0.92,
    snapshots.archiveAwakened.visuals.archiveAwakening,
  );
  await closePanel();
  await setPlayer([-8, 0.65, -2.8]);
  await settleReviewCamera();
  await screenshot('02-archive-complete');

  // Review the Tree from a stable, unobstructed world-space angle. Keeping the
  // camera at the Archive only proved that the object mounted off-screen.
  await setPlayer([-16, 0.65, -7]);

  await evaluate(
    `(async () => {
      const range = document.querySelector('input[aria-label="Music progress"]');
      const playButton = [...document.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === 'Play');
      if (!playButton || playButton.disabled) throw new Error('Audio was not ready for transition sampling.');
      playButton.click();
      await new Promise((resolve) => setTimeout(resolve, 120));
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(range, String(Number(range.max) * 0.75));
      range.dispatchEvent(new Event('input', { bubbles: true }));
      range.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 80));
      [...document.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === 'Pause')?.click();
    })()`,
    true,
  );
  const treeTransition = await waitFor(async () => {
    const snapshot = await worldSnapshot();
    const scale = snapshot?.visuals?.memoryTree?.scale ?? 0;
    return scale > 0.04 && scale < 0.95 ? snapshot : null;
  }, 'Memory Tree middle reveal frame', 3000);
  check(
    'Memory Tree is mounted at its reviewed landmark position during reveal',
    treeTransition?.visuals?.memoryTree?.mounted === true &&
      treeTransition.visuals.memoryTree.scale > 0.04 &&
      treeTransition.visuals.memoryTree.scale < 0.95 &&
      Math.abs(treeTransition.visuals.memoryTree.position[0] - -16) < 0.05 &&
      Math.abs(treeTransition.visuals.memoryTree.position[2] - -12) < 0.05,
    treeTransition?.visuals?.memoryTree,
  );
  await screenshot('02a-memory-tree-revealing');
  snapshots.treeStable = await waitFor(async () => {
    const snapshot = await worldSnapshot();
    return snapshot?.visuals?.memoryTree?.scale >= 0.99 ? snapshot : null;
  }, 'Memory Tree stable reveal frame', 5000);
  check(
    'Memory Tree settles at full scale after reveal',
    snapshots.treeStable.visuals.memoryTree.scale >= 0.99,
    snapshots.treeStable.visuals.memoryTree,
  );
  await screenshot('02b-memory-tree-stable');

  const environmentBeforeCue = snapshots.treeStable.environment.rendered;
  await evaluate(
    `(async () => {
      const range = document.querySelector('input[aria-label="Music progress"]');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(range, String(Number(range.max) * 0.9));
      range.dispatchEvent(new Event('input', { bubbles: true }));
      range.dispatchEvent(new Event('change', { bubbles: true }));
    })()`,
    true,
  );
  const environmentTransitionStart = await waitFor(async () => {
    const snapshot = await worldSnapshot();
    if (!snapshot) return null;
    const targetChanged =
      snapshot.environment.rainIntensity !== snapshots.treeStable.environment.rainIntensity ||
      snapshot.environment.bloomIntensity !== snapshots.treeStable.environment.bloomIntensity ||
      snapshot.environment.stars !== snapshots.treeStable.environment.stars;
    const notSnapped =
      Math.abs(snapshot.environment.rendered.rainIntensity - snapshot.environment.rainIntensity) > 0.01 &&
      Math.abs(snapshot.environment.rendered.bloomIntensity - snapshot.environment.bloomIntensity) > 0.01 &&
      Math.abs(snapshot.environment.rendered.fogDensity - snapshot.environment.fogDensity) > 0.0001 &&
      Math.abs(snapshot.environment.rendered.stars - snapshot.environment.stars) > 1;
    return targetChanged && notSnapped ? snapshot : null;
  }, 'environment transition start frame', 3000);
  await wait(350);
  const environmentTransition = await worldSnapshot();
  const approaches = (start, later, target) =>
    Math.abs(later - target) < Math.abs(start - target);
  check(
    'Environment cue interpolates stars, rain, bloom, and fog toward the new target',
    approaches(
      environmentTransitionStart.environment.rendered.rainIntensity,
      environmentTransition.environment.rendered.rainIntensity,
      environmentTransition.environment.rainIntensity,
    ) && approaches(
      environmentTransitionStart.environment.rendered.bloomIntensity,
      environmentTransition.environment.rendered.bloomIntensity,
      environmentTransition.environment.bloomIntensity,
    ) && approaches(
      environmentTransitionStart.environment.rendered.fogDensity,
      environmentTransition.environment.rendered.fogDensity,
      environmentTransition.environment.fogDensity,
    ) && approaches(
      environmentTransitionStart.environment.rendered.stars,
      environmentTransition.environment.rendered.stars,
      environmentTransition.environment.stars,
    ),
    {
      beforeCue: environmentBeforeCue,
      start: environmentTransitionStart.environment,
      later: environmentTransition.environment,
    },
  );

  await setPlayer([0, 0.65, -11.5]);
  await settleReviewCamera();

  await evaluate(
    `(async () => {
      const range = document.querySelector('input[aria-label="Music progress"]');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(range, String(Number(range.max) * 0.72));
      range.dispatchEvent(new Event('input', { bubbles: true }));
      range.dispatchEvent(new Event('change', { bubbles: true }));
    })()`,
    true,
  );
  snapshots.gateCharging = await waitFor(async () => {
    const snapshot = await worldSnapshot();
    return snapshot?.visuals?.departureGateCharge?.scale >= 0.99 &&
      snapshot?.visuals?.departureGate === null
      ? snapshot
      : null;
  }, 'Departure Gate charging phase', 5000);
  check(
    'Light Path cue charges the Gate before it opens',
    snapshots.gateCharging.visuals.departureGateCharge.scale >= 0.99 &&
      snapshots.gateCharging.flags['world.departureGateOpen'] !== true,
    snapshots.gateCharging.visuals,
  );
  await screenshot('02c-gate-charging');

  const audioSetup = await evaluate(
    `(async () => {
      const range = document.querySelector('input[aria-label="Music progress"]');
      if (!range || range.disabled) {
        throw new Error('Synthetic journey audio controls are no longer ready.');
      }
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(range, String(Number(range.max) * 0.9));
      range.dispatchEvent(new Event('input', { bubbles: true }));
      range.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 40));
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
  snapshots.gateOpening = await waitFor(async () => {
    const snapshot = await worldSnapshot();
    const scale = snapshot?.visuals?.departureGate?.scale ?? 0;
    return scale > 0.04 && scale < 0.98 ? snapshot : null;
  }, 'Departure Gate middle opening frame', 3000);
  check(
    'Departure Gate is captured during its opening transition',
    snapshots.gateOpening.visuals.departureGate.scale > 0.04 &&
      snapshots.gateOpening.visuals.departureGate.scale < 0.98 &&
      Math.abs(snapshots.gateOpening.visuals.departureGate.position[0]) < 0.05 &&
      Math.abs(snapshots.gateOpening.visuals.departureGate.position[2] - -15) < 0.05,
    snapshots.gateOpening.visuals.departureGate,
  );
  await screenshot('02d-gate-opening');
  snapshots.gateStable = await waitFor(async () => {
    const snapshot = await worldSnapshot();
    return snapshot?.visuals?.departureGate?.scale >= 0.99 ? snapshot : null;
  }, 'Departure Gate stable opening frame', 5000);
  check(
    'Departure Gate settles at full scale after opening',
    snapshots.gateStable.visuals.departureGate.scale >= 0.99,
    snapshots.gateStable.visuals.departureGate,
  );
  await screenshot('02e-gate-open');

  await evaluate(
    `(async () => {
      const range = document.querySelector('input[aria-label="Music progress"]');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(range, String(Number(range.max) * 0.98));
      range.dispatchEvent(new Event('input', { bubbles: true }));
      range.dispatchEvent(new Event('change', { bubbles: true }));
    })()`,
    true,
  );
  snapshots.gateAfterglow = await waitFor(async () => {
    const snapshot = await worldSnapshot();
    return snapshot?.visuals?.departureGateAfterglow?.scale >= 0.99 ? snapshot : null;
  }, 'Departure Gate afterglow phase', 5000);
  check(
    'Afterglow cue adds a stable Gate afterglow',
    snapshots.gateAfterglow.visuals.departureGateAfterglow.scale >= 0.99,
    snapshots.gateAfterglow.visuals.departureGateAfterglow,
  );
  await screenshot('02f-gate-afterglow');

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
  check(
    'Completion dialog focuses its Close action',
    await waitFor(
      () => evaluate(`document.activeElement?.getAttribute('aria-label') === 'Close dialog'`),
      'completion dialog focus',
    ),
  );
  await screenshot('03-gate-complete');
  await pressKey('Tab', 8);
  check(
    'Completion dialog traps backward Tab focus',
    await evaluate(`document.activeElement?.textContent?.trim() === 'Stay in the afterglow'`),
  );
  await pressKey('Tab');
  check(
    'Completion dialog wraps forward Tab focus',
    await evaluate(`document.activeElement?.getAttribute('aria-label') === 'Close dialog'`),
  );
  await pressKey('Escape');
  check(
    'Escape closes the completion dialog',
    await waitFor(
      () => evaluate(`!document.querySelector('[role="dialog"]')`),
      'completion dialog close',
    ),
  );

  let naturalEnd = null;
  if (localDemoPath && !headedMode) {
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
        input.files = transfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      })()`,
      true,
    );
  } else {
    naturalEnd = await evaluate(
      `(async () => {
      const range = document.querySelector('input[aria-label="Music progress"]');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(range, String(Math.max(0, Number(range.max) - 2)));
      range.dispatchEvent(new Event('input', { bubbles: true }));
      range.dispatchEvent(new Event('change', { bubbles: true }));
      [...document.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === 'Play')?.click();
      const deadline = performance.now() + 15000;
      while (performance.now() < deadline) {
        const playReady = [...document.querySelectorAll('button')]
          .some((button) => button.textContent?.trim() === 'Play');
        if (playReady && Number(range.value) >= Number(range.max) - 0.05) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const endedAt = Number(range.value);
      const duration = Number(range.max);
      const buttonLabel = [...document.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === 'Play' || button.textContent?.trim() === 'Pause')
        ?.textContent?.trim();
      if (endedAt < Math.floor(duration) || buttonLabel !== 'Play') {
        throw new Error(
          'Audio did not reach its natural end before replay. ' +
          JSON.stringify({ endedAt, duration, buttonLabel })
        );
      }
      [...document.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === 'Play')?.click();
      await new Promise((resolve) => setTimeout(resolve, 250));
      [...document.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === 'Pause')?.click();
      return { endedAt, duration, buttonLabel };
      })()`,
      true,
    );
    check(
      'Audio reaches its natural end before replay',
      naturalEnd.endedAt >= Math.floor(naturalEnd.duration) && naturalEnd.buttonLabel === 'Play',
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
    localDemoPath && !headedMode
      ? 'Final track replacement resets deliberate journey flags'
      : 'Replay resets deliberate journey flags',
    snapshots.replay.flags['journey.started'] !== true,
  );
  check(
    localDemoPath && !headedMode
      ? 'Final track replacement restores the Guide objective'
      : 'Replay restores the Guide objective',
    snapshots.replay.currentObjectiveId === 'npc-guide',
  );
  check(
    localDemoPath && !headedMode
      ? 'Final track replacement reconstructs the closed gate state'
      : 'Replay reconstructs the closed gate state',
    snapshots.replay.flags['world.departureGateOpen'] !== true,
  );
  snapshots.replayVisualsSettled = await waitFor(async () => {
    const snapshot = await worldSnapshot();
    return snapshot?.visuals?.archiveAwakening < 0.08 &&
      snapshot.visuals.departureGateCharge === null &&
      snapshot.visuals.departureGate === null &&
      snapshot.visuals.departureGateAfterglow === null
      ? snapshot
      : null;
  }, 'replay visual state reconstruction', 6000);
  check(
    'Replay returns Archive to rest and removes every Gate phase',
    snapshots.replayVisualsSettled.visuals.archiveAwakening < 0.08,
    snapshots.replayVisualsSettled.visuals,
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
