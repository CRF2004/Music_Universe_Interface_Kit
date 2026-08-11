import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const endpoint = process.env.CREW_CHROME_DEBUG_URL ?? 'http://127.0.0.1:9223';
const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  throw new Error('Usage: node crew/tools/hardware-browser.mjs <info|screenshot|click|hold|press|wait> [...]');
}

const targets = await fetch(`${endpoint}/json/list`).then((response) => response.json());
const target = targets.find(
  (candidate) => candidate.type === 'page' && candidate.url?.includes('127.0.0.1:4173'),
);
if (!target?.webSocketDebuggerUrl) throw new Error('Music Universe Chrome page was not found.');
await fetch(`${endpoint}/json/activate/${target.id}`);

const client = await connect(target.webSocketDebuggerUrl);
try {
  await client.send('Page.enable');
  await client.send('Input.setIgnoreInputEvents', { ignore: false });

  if (command === 'info') {
    const version = await client.send('Browser.getVersion');
    process.stdout.write(`${JSON.stringify({ browser: version.product, userAgent: version.userAgent, page: target.url }, null, 2)}\n`);
  } else if (command === 'screenshot') {
    const destination = args[0];
    if (!destination) throw new Error('screenshot requires an output path.');
    const result = await client.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, Buffer.from(result.data, 'base64'));
    process.stdout.write(`${destination}\n`);
  } else if (command === 'click') {
    const [screenshotX, screenshotY] = args.map(Number);
    assertFinite(screenshotX, 'x');
    assertFinite(screenshotY, 'y');
    const screenshot = await client.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    const image = Buffer.from(screenshot.data, 'base64');
    const imageWidth = image.readUInt32BE(16);
    const imageHeight = image.readUInt32BE(20);
    const metrics = await client.send('Page.getLayoutMetrics');
    const viewport = metrics.cssVisualViewport ?? metrics.visualViewport;
    const x = screenshotX * viewport.clientWidth / imageWidth;
    const y = screenshotY * viewport.clientHeight / imageHeight;
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    process.stdout.write(`${JSON.stringify({ screenshot: [screenshotX, screenshotY], css: [x, y] })}\n`);
  } else if (command === 'press') {
    await pressKey(client, args[0]);
  } else if (command === 'hold') {
    const key = args[0];
    const duration = Number(args[1]);
    assertFinite(duration, 'duration');
    const descriptor = keyDescriptor(key);
    await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...descriptor });
    await new Promise((resolve) => setTimeout(resolve, Math.min(10_000, Math.max(0, duration))));
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', ...descriptor });
  } else if (command === 'wait') {
    const duration = Number(args[0]);
    assertFinite(duration, 'duration');
    await new Promise((resolve) => setTimeout(resolve, Math.min(30_000, Math.max(0, duration))));
  } else {
    throw new Error(`Unsupported hardware-browser command: ${command}`);
  }
} finally {
  client.close();
}

function assertFinite(value, label) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be a finite number.`);
}

async function pressKey(client, key) {
  const descriptor = keyDescriptor(key);
  await client.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...descriptor });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', ...descriptor });
}

function keyDescriptor(key) {
  const named = {
    Enter: { key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 },
    Escape: { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 },
    Space: { key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 },
    ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', windowsVirtualKeyCode: 38, nativeVirtualKeyCode: 38 },
    ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40, nativeVirtualKeyCode: 40 },
    ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37, nativeVirtualKeyCode: 37 },
    ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39, nativeVirtualKeyCode: 39 },
  };
  if (named[key]) return named[key];
  if (/^[a-z]$/i.test(key ?? '')) {
    const upper = key.toUpperCase();
    return {
      key: key.toLowerCase(),
      code: `Key${upper}`,
      windowsVirtualKeyCode: upper.charCodeAt(0),
      nativeVirtualKeyCode: upper.charCodeAt(0),
    };
  }
  throw new Error(`Unsupported key: ${key}`);
}

function connect(webSocketUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    const pending = new Map();
    let nextId = 1;
    socket.addEventListener('error', () => reject(new Error('Could not connect to Chrome.')));
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
