const endpoint = process.env.CHROME_DEBUG_URL ?? 'http://127.0.0.1:9223';
const sampleTarget = Number(process.env.PERFORMANCE_SAMPLE_COUNT ?? 300);
const timeoutMs = Number(process.env.PERFORMANCE_TIMEOUT_MS ?? 30_000);
const viewportWidth = Number(process.env.PERFORMANCE_VIEWPORT_WIDTH ?? 0);
const viewportHeight = Number(process.env.PERFORMANCE_VIEWPORT_HEIGHT ?? 0);
const deviceScaleFactor = Number(process.env.PERFORMANCE_DEVICE_SCALE_FACTOR ?? 1);
const scenario = process.env.PERFORMANCE_SCENARIO ?? 'current';
const settleMs = Number(process.env.PERFORMANCE_SETTLE_MS ?? 5_000);

function assertPositiveFinite(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
}

assertPositiveFinite(sampleTarget, 'PERFORMANCE_SAMPLE_COUNT');
assertPositiveFinite(timeoutMs, 'PERFORMANCE_TIMEOUT_MS');
assertPositiveFinite(settleMs, 'PERFORMANCE_SETTLE_MS');
if (!['current', 'departure'].includes(scenario)) {
  throw new Error('PERFORMANCE_SCENARIO must be "current" or "departure".');
}
if (viewportWidth || viewportHeight) {
  assertPositiveFinite(viewportWidth, 'PERFORMANCE_VIEWPORT_WIDTH');
  assertPositiveFinite(viewportHeight, 'PERFORMANCE_VIEWPORT_HEIGHT');
  assertPositiveFinite(deviceScaleFactor, 'PERFORMANCE_DEVICE_SCALE_FACTOR');
}

async function findPageTarget() {
  const response = await fetch(`${endpoint}/json/list`);
  if (!response.ok) {
    throw new Error(`Chrome target discovery failed: HTTP ${response.status}`);
  }

  const targets = await response.json();
  const target = targets.find(
    (candidate) =>
      candidate.type === 'page' &&
      candidate.webSocketDebuggerUrl &&
      candidate.url?.includes('e2e=1'),
  );

  if (!target) {
    throw new Error(`No Chrome page with ?e2e=1 found at ${endpoint}.`);
  }
  return target;
}

function connectToTarget(webSocketUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    const pending = new Map();
    let nextId = 1;

    const closeWithError = (error) => {
      pending.forEach(({ reject: rejectRequest }) => rejectRequest(error));
      pending.clear();
      reject(error);
    };

    socket.addEventListener('error', () => {
      closeWithError(new Error('Could not connect to the Chrome DevTools target.'));
    });
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) return;
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    });
    socket.addEventListener('open', () => {
      resolve({
        close: () => socket.close(),
        send(method, params = {}) {
          return new Promise((resolveRequest, rejectRequest) => {
            const id = nextId++;
            pending.set(id, { resolve: resolveRequest, reject: rejectRequest });
            socket.send(JSON.stringify({ id, method, params }));
          });
        },
      });
    });
  });
}

const target = await findPageTarget();
const client = await connectToTarget(target.webSocketDebuggerUrl);
let scenarioSetup = null;

try {
  await client.send('Runtime.enable');
  const browserVersion = await client.send('Browser.getVersion');
  if (viewportWidth && viewportHeight) {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: viewportWidth,
      height: viewportHeight,
      deviceScaleFactor,
      mobile: false,
    });
    await client.send('Page.reload', { ignoreCache: true });
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  if (scenario === 'departure') {
    const setup = await client.send('Runtime.evaluate', {
      expression: `(async () => {
        let input;
        let range;
        let playButton;
        const controlsDeadline = performance.now() + 15_000;
        while (performance.now() < controlsDeadline) {
          input = document.querySelector('input[type="file"][accept="audio/*"]');
          range = document.querySelector('input[aria-label="Music progress"]');
          playButton = [...document.querySelectorAll('button')]
            .find((button) => button.textContent?.trim() === 'Play');
          if (input && range && playButton) break;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        if (!input || !range || !playButton) {
          throw new Error('Could not find the music controls.');
        }

        const sampleRate = 8_000;
        const sampleCount = sampleRate * 12;
        const wav = new ArrayBuffer(44 + sampleCount * 2);
        const view = new DataView(wav);
        const writeText = (offset, text) => {
          for (let index = 0; index < text.length; index += 1) {
            view.setUint8(offset + index, text.charCodeAt(index));
          }
        };
        writeText(0, 'RIFF');
        view.setUint32(4, 36 + sampleCount * 2, true);
        writeText(8, 'WAVEfmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeText(36, 'data');
        view.setUint32(40, sampleCount * 2, true);
        const blob = new Blob([wav], { type: 'audio/wav' });
        const transfer = new DataTransfer();
        transfer.items.add(new File([blob], 'performance-journey.wav', { type: 'audio/wav' }));
        input.files = transfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));

        const readyDeadline = performance.now() + 8_000;
        while (
          performance.now() < readyDeadline &&
          (playButton.disabled || Number(range.max) <= 0)
        ) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        if (playButton.disabled || Number(range.max) <= 0) {
          throw new Error('The representative audio did not become ready.');
        }

        playButton.click();
        await new Promise((resolve) => setTimeout(resolve, 150));
        const rangeValueSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value',
        )?.set;
        range.step = 'any';
        rangeValueSetter?.call(range, String(Number(range.max) * 0.9));
        range.dispatchEvent(new Event('input', { bubbles: true }));
        range.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 150));
        const pauseButton = [...document.querySelectorAll('button')]
          .find((button) => button.textContent?.trim() === 'Pause');
        pauseButton?.click();
        await new Promise((resolve) => setTimeout(resolve, 750));
        window.__MUSIC_UNIVERSE_E2E__?.setPlayerTransform([0, 0.65, -5], Math.PI);
        await new Promise((resolve) => setTimeout(resolve, 750));
        return {
          duration: Number(range.max),
          position: Number(document.querySelector('input[aria-label="Music progress"]')?.value ?? 0),
          memoryTreeVisible: document.body.textContent?.includes('Memory Tree') ?? false,
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (setup.exceptionDetails) {
      const diagnostics = await client.send('Runtime.evaluate', {
        expression: `({
          title: document.title,
          body: document.body?.innerText?.slice(0, 800),
          resources: performance.getEntriesByType('resource').map((entry) => entry.name).slice(-30)
        })`,
        returnByValue: true,
      });
      throw new Error(
        `${setup.exceptionDetails.text ?? 'Scenario setup failed.'}\n${JSON.stringify(
          diagnostics.result?.value ?? null,
          null,
          2,
        )}`,
      );
    }
    scenarioSetup = setup.result?.value ?? null;
    await new Promise((resolve) => setTimeout(resolve, settleMs));
  }
  const result = await client.send('Runtime.evaluate', {
    expression: `(async () => {
      const deadline = performance.now() + ${timeoutMs};
      while (
        performance.now() < deadline &&
        (
          !window.__MUSIC_UNIVERSE_PERFORMANCE_E2E__ ||
          window.__MUSIC_UNIVERSE_PERFORMANCE_E2E__.sampleCount < ${sampleTarget}
        )
      ) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      return window.__MUSIC_UNIVERSE_PERFORMANCE_E2E__ ?? null;
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? 'Performance evaluation failed.');
  }

  const telemetry = result.result?.value;
  if (!telemetry) {
    const diagnostics = await client.send('Runtime.evaluate', {
      expression: `({
        title: document.title,
        body: document.body?.innerText?.slice(0, 800),
        startup: window.__MUSIC_UNIVERSE_E2E__ ?? null
      })`,
      returnByValue: true,
    });
    throw new Error(
      `The page did not publish performance telemetry.\n${JSON.stringify(
        diagnostics.result?.value ?? null,
        null,
        2,
      )}`,
    );
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        page: target.url,
        browser: browserVersion.product,
        userAgent: browserVersion.userAgent,
        scenario,
        scenarioSetup,
        ...telemetry,
        hardwareAccelerated:
          !/swiftshader|llvmpipe|software/i.test(telemetry.renderer ?? ''),
      },
      null,
      2,
    )}\n`,
  );
} finally {
  client.close();
}
