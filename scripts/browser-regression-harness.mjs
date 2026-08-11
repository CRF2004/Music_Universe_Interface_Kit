import { access, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

export async function findBrowserExecutable(requestedBrowser) {
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

  const cacheRoot =
    process.platform === 'win32' && process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'ms-playwright')
      : path.join(homedir(), '.cache', 'ms-playwright');
  const entries = await readdir(cacheRoot, { withFileTypes: true }).catch(() => []);
  const headlessCandidates = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('chromium_headless_shell-'))
    .sort((left, right) => right.name.localeCompare(left.name))
    .map((entry) =>
      path.join(cacheRoot, entry.name, 'chrome-headless-shell-linux64', 'chrome-headless-shell'),
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
    ...installedBrowsers[requestedBrowser],
    ...(requestedBrowser === 'chrome' ? headlessCandidates : []),
    ...(requestedBrowser === 'chrome' ? chromiumCandidates : []),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next installed browser candidate.
    }
  }
  throw new Error(
    `${requestedBrowser} was not found. Set CHROME_BIN or install the requested browser.`,
  );
}

export function connectCdpPipe(input, output) {
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
    input.on('error', rejectPending);
    output.on('error', rejectPending);
    output.on('close', () => rejectPending(new Error('Browser closed the DevTools pipe.')));

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
          pending.set(id, { resolve: resolveRequest, reject: rejectRequest, timeout });
          input.write(
            `${JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })}\0`,
          );
        });
      },
    });
  });
}
