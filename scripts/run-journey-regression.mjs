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
  browserLaunchEnvironment,
  connectCdpPipe,
  findBrowserExecutable,
} from './browser-regression-harness.mjs';

const root = process.cwd();
const browserArgument = process.argv.find((argument) => argument.startsWith('--browser='));
const requestedBrowser = browserArgument?.slice('--browser='.length) ?? 'chrome';
const recoveryMode = process.argv.includes('--recovery');
const headedMode = process.argv.includes('--headed');
const hardwareMode = headedMode || process.argv.includes('--hardware');
const creatorAcceptanceMode = process.argv.includes('--creator-acceptance');
const planetMode = process.argv.includes('--planet');
const localDemoPath = process.argv.includes('--local-demo')
  ? path.join(root, 'assets', 'source', 'audio', 'crywolf-athetosis-demo.mp3')
  : null;
const outputDir = path.resolve(process.env.JOURNEY_REGRESSION_OUTPUT ?? path.join(root, 'output', 'playwright', 'journey-regression'));
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
  hardware: hardwareMode,
  mode: recoveryMode ? 'recovery' : 'journey',
  creatorAcceptance: creatorAcceptanceMode,
  status: 'running',
  checks,
  snapshots,
  screenshots,
  consoleErrors: [],
  acceptanceFindings: [],
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
      ...(hardwareMode
        ? []
        : ['--enable-unsafe-swiftshader', '--use-angle=swiftshader']),
      '--remote-debugging-pipe',
      `--user-data-dir=${profileDir}`,
      '--window-size=1440,900',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'], env: browserLaunchEnvironment() },
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
  report.browserVersion = await rootClient.send('Browser.getVersion');
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
    if (entry.level === 'error' && !ignoredMissingFavicon) report.consoleErrors.push(`${entry.text}${entry.url ? ` (${entry.url})` : ''}`);
  });
  const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.glb': 'model/gltf-binary',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.mp3': 'audio/mpeg',
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
        if (value instanceof Blob && value.type === 'application/json') {
          value.text().then((json) => { window.__JOURNEY_EXPORTED_PROJECT__ = json; });
        }
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
  const toSurface = (position, radius) => {
    if (radius === null) return position;
    const [x, height, z] = position;
    const distance = Math.hypot(x, z);
    const scale = distance > 1e-8 ? Math.sin(distance / radius) * (radius + height) / distance : 1;
    return [x * scale, Math.cos(distance / radius) * (radius + height) - radius, z * scale];
  };
  const toAuthored = (position, radius) => {
    if (!position || radius === null) return position;
    const [x, y, z] = position;
    const horizontal = Math.hypot(x, z);
    const distance = Math.atan2(horizontal, y + radius) * radius;
    const scale = horizontal > 1e-8 ? distance / horizontal : 0;
    // Keep exact coordinate assertions stable after the reversible spherical projection.
    const round = (value) => Math.round(value * 1e9) / 1e9;
    return [round(x * scale), round(Math.hypot(x, y + radius, z) - radius), round(z * scale)];
  };
  const rawWorldSnapshot = () => evaluate('window.__MUSIC_UNIVERSE_WORLD_E2E__?.getSnapshot?.() ?? null');
  // Existing edit assertions compare authored coordinates; retain physical coordinates as evidence.
  const worldSnapshot = async () => {
    const snapshot = await rawWorldSnapshot();
    if (!snapshot || snapshot.planetRadius === null) return snapshot;
    const radius = snapshot.planetRadius;
    snapshot.physical = structuredClone(snapshot);
    snapshot.playerPosition = toAuthored(snapshot.playerPosition, radius);
    snapshot.interactions.forEach((item) => { item.position = toAuthored(item.position, radius); });
    for (const field of ['archiveVisualPosition', 'archiveColliderPosition']) snapshot.editor[field] = toAuthored(snapshot.editor[field], radius);
    for (const field of ['memoryTree', 'departureGate', 'departureGateCharge', 'departureGateAfterglow']) {
      if (snapshot.visuals[field]) snapshot.visuals[field].position = toAuthored(snapshot.visuals[field].position, radius);
    }
    return snapshot;
  };
  const setPlayer = async (position, yaw = Math.PI) => {
    const radius = (await rawWorldSnapshot())?.planetRadius ?? null;
    const physicalPosition = toSurface(position, radius);
    const reached = await waitFor(async () => {
      const actual = await evaluate(
        `(() => {
          const api = window.__MUSIC_UNIVERSE_E2E__;
          if (!api) return null;
          api.setPlayerTransform(${JSON.stringify(physicalPosition)}, ${yaw});
          return api.getPlayerPosition?.() ?? null;
        })()`,
      );
      return Array.isArray(actual) &&
        Math.abs(actual[0] - physicalPosition[0]) < 0.15 &&
        Math.abs(actual[2] - physicalPosition[2]) < 0.15
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
    const relativePath = path.relative(root, path.join(outputDir, `${name}.png`)).split(path.sep).join('/');
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
  } else if (planetMode) {
    await waitFor(() => evaluate(`document.activeElement?.textContent?.trim() === 'Enter the world'`), 'planet onboarding');
    await evaluate(`[...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Enter the world')?.click()`, true);
    await evaluate(`document.activeElement?.blur()`);
    await waitFor(rawWorldSnapshot, 'planet runtime');
    check('Planet has a 60m radius', (await rawWorldSnapshot()).planetRadius === 60);
    const telemetry = () => evaluate(`(() => { const api = window.__MUSIC_UNIVERSE_E2E__; return api ? {position:api.getPlayerPosition(),up:api.groundUp,camera:api.cameraPosition,grounded:api.grounded,velocity:api.velocity} : null; })()`);
    const radialHeight = (point) => Math.hypot(point[0], point[1] + 60, point[2]) - 60;
    for (const [label, coordinates] of [['arrival',[0,0.8,2]], ['equator',[94,0.8,0]], ['underside',[175,0.8,15]]]) {
      await setPlayer(coordinates);
      const resting = await waitFor(async () => {
        const state = await telemetry();
        return state?.grounded && Math.abs(radialHeight(state.position) - 0.65) < 0.08 ? state : null;
      }, `${label} surface contact`);
      check(`${label}: feet touch physical planet surface`, true, resting);
      check(`${label}: camera stays above the ground`, radialHeight(resting.camera) > 0.5, resting);
      const initial = resting.position;
      await evaluate(`window.__MUSIC_UNIVERSE_E2E__.drivePlayer([0,0,-5],1000)`);
      await wait(1200);
      const walked = await telemetry();
      check(`${label}: tangent movement follows curvature`, Math.abs(radialHeight(walked.position)-0.65)<0.12 && Math.hypot(...walked.position.map((value,index)=>value-initial[index]))>3, walked);
      await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space'});
      await wait(120);
      await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space'});
      const jumped = await waitFor(async () => {
        const state = await telemetry();
        return state && radialHeight(state.position) > 0.85 ? state : null;
      }, `${label} outward jump`, 1500);
      check(`${label}: jump moves outward from the planet`, true, jumped);
      await waitFor(async()=> (await telemetry())?.grounded, `${label} jump lands`);
      await settleReviewCamera();
      await screenshot(`planet-${label}`);
    }
    await setPlayer([94,0.8,0]);
    await settleReviewCamera();
    // Keep a great-circle route away from the authored northern buildings/rocks.
    await lockWorldPointer('continuous orbit pointer');
    await evaluate(`(() => { const api=window.__MUSIC_UNIVERSE_E2E__;const [x,y,z,w]=api.cameraQuaternion;const forward=[-2*(x*z+w*y),-2*(y*z-w*x),-(1-2*(x*x+y*y))];const up=api.groundUp;const dot=forward.reduce((sum,v,i)=>sum+v*up[i],0);const tangent=forward.map((v,i)=>v-dot*up[i]);const len=Math.hypot(...tangent);const f=tangent.map(v=>v/len);const desired=[0,0,-1];const cross=[f[1]*desired[2]-f[2]*desired[1],f[2]*desired[0]-f[0]*desired[2],f[0]*desired[1]-f[1]*desired[0]];const angle=Math.atan2(cross.reduce((sum,v,i)=>sum+v*up[i],0),f.reduce((sum,v,i)=>sum+v*desired[i],0));document.dispatchEvent(new MouseEvent('mousemove',{movementX:-angle/0.0024,movementY:0}));})()`);
    await wait(500);
    const orbitInitial = await telemetry();
    await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'w',code:'KeyW'});
    await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Shift',code:'ShiftLeft'});
    const orbitStart = Date.now();
    const orbitSamples = [];
    while(Date.now()-orbitStart<54000) {
      await wait(1500);
      const sample = await telemetry();
      orbitSamples.push(sample);
      if(Math.abs(radialHeight(sample.position)-0.65)>0.2) throw new Error('Player left planet surface during full orbit');
    }
    await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'w',code:'KeyW'});
    await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Shift',code:'ShiftLeft'});
    const orbitDot = (sample) => sample.up.reduce((sum,value,index)=>sum+value*orbitInitial.up[index],0);
    check('Continuous keyboard movement completes a great circle', orbitSamples.some(sample=>orbitDot(sample)<-0.9) && orbitDot(orbitSamples.at(-1))>0.6, orbitSamples);
    await evaluate(`document.exitPointerLock()`);
    await evaluate(`document.querySelector('[aria-label="Open project editor"]').click()`,true);
    await evaluate(`(() => { const set=(label,value)=>{const el=document.querySelector('[aria-label="'+label+'"]');const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));};set('Memory Archive X coordinate','130');set('Memory Archive Z coordinate','25');})()`);
    await evaluate(`[...document.querySelectorAll('button')].find(button=>button.textContent==='Apply position').click()`,true);
    const moved = await waitFor(async()=>{const state=await rawWorldSnapshot();return Math.abs(radialHeight(state.editor.archiveVisualPosition))<0.01 && state.editor.archiveVisualPosition[1]<-90 ? state : null;},'Archive underside placement');
    check('Archive visual and collision both reconstruct on underside', moved.editor.archiveVisualPosition.every((value,index)=>Math.abs(value-moved.editor.archiveColliderPosition[index])<0.01),moved);
    await evaluate(`document.querySelector('[aria-label="Drag Memory Archive in world"]').click()`,true);
    await wait(350);
    const farHandle = await waitFor(async()=>{const state=await rawWorldSnapshot();return state?.editor.mode==='drag' && state.editor.handles.length===2 ? state.editor.handles[0] : null;},'underside drag handle');
    await screenshot('planet-archive-underside-before-drag');
    await client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:farHandle.x,y:farHandle.y});
    await client.send('Input.dispatchMouseEvent',{type:'mousePressed',x:farHandle.x,y:farHandle.y,button:'left',clickCount:1});
    await waitFor(async()=> (await rawWorldSnapshot())?.editor.dragging,'underside pointer drag');
    await client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:farHandle.x+65,y:farHandle.y,buttons:1,button:'left'});
    const farPreview = await waitFor(async()=>{const state=await rawWorldSnapshot();return state?.editor.preview && Math.abs(state.editor.preview[0]-130)>0.1 ? state : null;},'underside drag preview');
    check('Underside drag preview stays on the sphere and keeps committed collision',Math.abs(radialHeight(farPreview.editor.archiveVisualPosition))<0.01 && farPreview.editor.archiveColliderPosition.every((value,index)=>Math.abs(value-moved.editor.archiveColliderPosition[index])<0.01),farPreview);
    await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:farHandle.x+65,y:farHandle.y,button:'left',clickCount:1});
    const farCommitted = await waitFor(async()=>{const state=await rawWorldSnapshot();return !state.editor.dragging && state.editor.preview===null ? state : null;},'underside drag commit');
    check('Underside drag commits matching visual and collision',farCommitted.editor.archiveVisualPosition.every((value,index)=>Math.abs(value-farCommitted.editor.archiveColliderPosition[index])<0.01),farCommitted);
    await screenshot('planet-archive-underside-drag');
    await evaluate(`document.querySelector('[aria-label="Finish Archive dragging"]').click()`,true);
    await evaluate(`document.querySelector('[aria-label="Undo project edit"]').click()`,true);
    await evaluate(`document.querySelector('[aria-label="Undo project edit"]').click()`,true);
    await evaluate(`document.querySelector('[aria-label="Close project editor"]').click()`,true);
    await setPlayer([0,0.8,2]);
    await lockWorldPointer('immersive controls');
    check('Exploring hides player controls and objective panels',await waitFor(()=>evaluate(`document.querySelector('[aria-label="Music player"]').hidden && document.querySelector('[aria-label="Current journey objective"]').hidden && document.querySelector('[aria-label="Open project editor"]').closest('[hidden]')!==null`),'panels hidden'));
    await evaluate(`document.dispatchEvent(new MouseEvent('mousemove',{movementX:180,movementY:30}))`);
    await wait(350);
    const cameraAfterTurn = (await telemetry()).camera;
    await wait(200);
    const cameraSettled = (await telemetry()).camera;
    check('Mouse-look camera settles promptly after input stops',Math.hypot(...cameraSettled.map((value,index)=>value-cameraAfterTurn[index]))<0.06,{cameraAfterTurn,cameraSettled});
    await screenshot('planet-immersive');
    await evaluate(`document.exitPointerLock()`);
    check('Releasing pointer restores keyboard-accessible controls',await waitFor(()=>evaluate(`!document.querySelector('[aria-label="Music player"]').hidden && !document.querySelector('[aria-label="Current journey objective"]').hidden`),'panels restored'));
    await wait(1200);
    const beforeMigration = await rawWorldSnapshot();
    await evaluate(`new Promise((resolve,reject)=>{const open=indexedDB.open('music-universe-projects',1);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result;const transaction=db.transaction('drafts','readwrite');const store=transaction.objectStore('drafts');const request=store.get('project-library-v2');request.onsuccess=()=>{const library=JSON.parse(request.result);for(const draft of library.drafts){const project=JSON.parse(draft.projectJson);project.schemaVersion=1;project.scene.environment.terrain={type:'curved-plane',size:[1000,1000],curvature:0.002};draft.projectJson=JSON.stringify(project);}store.put(JSON.stringify(library),'project-library-v2');};transaction.oncomplete=()=>{db.close();resolve(true);};transaction.onerror=()=>reject(transaction.error);};})`);
    await client.send('Page.reload',{ignoreCache:true});
    const afterMigration = await waitFor(async()=>{const state=await rawWorldSnapshot();return state?.planetRadius===60 && state.editor.archiveVisualPosition ? state : null;},'legacy draft hydration');
    check('Existing v1 local drafts reopen as spherical v2 with original object placement',afterMigration.interactions.every((item,index)=>item.id===beforeMigration.interactions[index].id && item.position.every((value,axis)=>Math.abs(value-beforeMigration.interactions[index].position[axis])<0.01)),{beforeMigration,afterMigration});
    await evaluate(`document.querySelector('[aria-label="Open project editor"]').click()`,true);
    check('Migrated draft shows its current schema to the creator',await waitFor(()=>evaluate(`document.body.innerText.includes('schema v2')`),'migrated version label'));
    check('Planet browser has no runtime errors',report.consoleErrors.length===0,report.consoleErrors);
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
  if (hardwareMode) {
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
  check(
    'Listener Guide identity rig faces the arrival point',
    snapshots.initial.visuals.listenerGuide?.mounted === true &&
      Math.abs(snapshots.initial.visuals.listenerGuide.facingYaw - Math.PI) < 0.01,
    snapshots.initial.visuals.listenerGuide,
  );
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
  const readStoredLibrary = () => evaluate(`new Promise((resolve, reject) => {
    const open = indexedDB.open('music-universe-projects', 1);
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains('drafts')) open.result.createObjectStore('drafts');
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const database = open.result;
      const request = database.transaction('drafts', 'readonly').objectStore('drafts').get('project-library-v2');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        database.close();
        resolve(request.result ?? null);
      };
    };
  })`);
  const readStoredProject = async () => {
    const libraryJson = await readStoredLibrary();
    if (!libraryJson) return null;
    const library = JSON.parse(libraryJson);
    return library.drafts.find((draft) => JSON.parse(draft.projectJson).id === library.activeProjectId)?.projectJson ?? null;
  };
  const originalProjectJson = await waitFor(readStoredProject, 'default project draft creation');
  check(
    'Default MusicWorldProject draft is created in IndexedDB',
    JSON.parse(originalProjectJson).schemaVersion === 2,
  );
  await evaluate(`document.querySelector('[aria-label="Open project editor"]')?.click()`, true);
  check(
    'Project editor opens with keyboard focus inside the dialog',
    await waitFor(
      () => evaluate(`document.activeElement?.getAttribute('aria-label') === 'Close project editor'`),
      'project editor focus',
    ),
  );
  await screenshot('project-editor');
  await evaluate(`document.querySelector('[aria-label="Create project"]')?.click()`, true);
  check(
    'Project library creates and opens a new draft',
    await waitFor(
      () => evaluate(`document.querySelector('[aria-label="Active project name"]')?.value === 'Untitled Memory Journey'`),
      'new project activation',
    ),
  );
  await evaluate(`(() => {
    const input = document.querySelector('[aria-label="Active project name"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'Regression Draft');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Rename')?.click();
  })()`, true);
  check(
    'Project library renames the active draft',
    await waitFor(
      () => evaluate(`Boolean(document.querySelector('[aria-label="Duplicate project Regression Draft"]'))`),
      'renamed project row',
    ),
  );
  await evaluate(`document.querySelector('[aria-label="Duplicate project Regression Draft"]')?.click()`, true);
  check(
    'Project library duplicates and opens an independent draft',
    await waitFor(
      () => evaluate(`document.querySelector('[aria-label="Active project name"]')?.value === 'Regression Draft Copy'`),
      'duplicated project activation',
    ),
  );
  await evaluate(`document.querySelector('[aria-label="Delete project Regression Draft Copy"]')?.click()`, true);
  check(
    'Deleting a project moves it to recoverable trash',
    await waitFor(
      () => evaluate(`Boolean(document.querySelector('[aria-label="Restore project Regression Draft Copy"]'))`),
      'deleted project trash entry',
    ),
  );
  await evaluate(`document.querySelector('[aria-label="Restore project Regression Draft Copy"]')?.click()`, true);
  check(
    'A deleted project can be restored',
    await waitFor(
      () => evaluate(`Boolean(document.querySelector('[aria-label="Open project Regression Draft Copy"]'))`),
      'restored project row',
    ),
  );
  await evaluate(`document.querySelector('[aria-label="Open project Regression Draft"]')?.click()`, true);
  await evaluate(`(() => {
    const cue = document.querySelector('[aria-label="Timeline cue"]');
    const selectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
    selectSetter.call(cue, 'weather-front');
    cue.dispatchEvent(new Event('change', { bubbles: true }));
  })()`, true);
  await waitFor(
    () => evaluate(`document.querySelector('[aria-label="Timeline cue"]')?.value === 'weather-front'`),
    'weather-front cue selection',
  );
  await evaluate(`(() => {
    const input = document.querySelector('[aria-label="Timeline cue normalized position"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, '0.41');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Apply cue position')?.click();
  })()`, true);
  const savedCueProject = await waitFor(async () => {
    const json = await readStoredProject();
    if (!json) return null;
    const project = JSON.parse(json);
    return project.metadata.title === 'Regression Draft' &&
      project.timeline.cues.find(({ id }) => id === 'weather-front')?.position === 0.41
      ? project
      : null;
  }, 'timeline cue autosave');
  check('Normalized timeline cue edit autosaves in the active project', Boolean(savedCueProject));
  await evaluate(`document.querySelector('[aria-label="Undo project edit"]')?.click()`, true);
  check('Cue undo reconstructs the prior normalized timeline', await waitFor(() => evaluate(`Number(document.querySelector('[aria-label="Timeline cue normalized position"]')?.value) !== 0.41`), 'cue undo'));
  await evaluate(`document.querySelector('[aria-label="Redo project edit"]')?.click()`, true);
  check('Cue redo restores the edited timeline', await waitFor(() => evaluate(`Number(document.querySelector('[aria-label="Timeline cue normalized position"]')?.value) === 0.41`), 'cue redo'));
  const setEnvironmentFields = (values) => evaluate(`(() => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    for (const [label, value] of Object.entries(${JSON.stringify(values)})) {
      const input = document.querySelector('[aria-label="' + label + '"]');
      if (!input) throw new Error('Missing environment input: ' + label);
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  })()`, true);
  const applyEnvironment = () => evaluate(`[...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Apply environment action')?.click()`, true);
  const historyBeforeEnvironment = (await worldSnapshot()).editor.undoCount;
  await setEnvironmentFields({ 'Cue sky color': '#123456', 'Cue ground color': '#654321', 'Cue rain intensity': '0.2', 'Cue bloom intensity': '1.2' });
  await applyEnvironment();
  const environmentProject = await waitFor(async () => {
    const json = await readStoredProject();
    const project = json && JSON.parse(json);
    return project?.timeline.cues.find(({ id }) => id === 'weather-front')?.actions[0].payload.rainIntensity === 0.2 ? project : null;
  }, 'environment action autosave');
  check('Environment action edits save all fields as one transaction and preserve fog and narration',
    (await worldSnapshot()).editor.undoCount === historyBeforeEnvironment + 1 &&
    environmentProject.timeline.cues[2].actions[0].payload.fogDensity === 0.006 &&
    environmentProject.timeline.cues[2].actions[1].type === 'show-narration');
  await evaluate(`document.querySelector('[aria-label="Undo project edit"]')?.click()`, true);
  check('Environment undo restores action fields in the inspector', await waitFor(() => evaluate(`document.querySelector('[aria-label="Cue rain intensity"]')?.value === '0.7'`), 'environment undo'));
  await setEnvironmentFields({ 'Cue rain intensity': '2' });
  await applyEnvironment();
  check('Invalid environment edit preserves the redo branch and committed draft',
    (await worldSnapshot()).editor.redoCount === 1 && await evaluate(`document.querySelector('[aria-label="Project draft status"]')?.textContent.includes('between 0 and 1')`));
  await evaluate(`document.querySelector('[aria-label="Redo project edit"]')?.click()`, true);
  await waitFor(() => evaluate(`document.querySelector('[aria-label="Cue rain intensity"]')?.value === '0.2'`), 'environment redo');
  await evaluate(`document.querySelector('[aria-label="Cue sky color"]')?.focus()`, true);
  await pressKey('Tab');
  check('Environment action fields support keyboard navigation', await evaluate(`document.activeElement?.getAttribute('aria-label') === 'Cue ground color'`));
  await evaluate(`document.querySelector('[aria-label="Cue action editor"]')?.scrollIntoView({ block: 'end' })`, true);
  await screenshot('cue-environment-editor');
  await client.send('Emulation.setDeviceMetricsOverride', { width: 800, height: 600, deviceScaleFactor: 1, mobile: false });
  await evaluate(`document.querySelector('[aria-label="Cue action editor"]')?.scrollIntoView({ block: 'end' })`, true);
  check('Environment action inputs fit the compact editor', await evaluate(`(() => {
    const inputs = [...document.querySelectorAll('[aria-label^="Cue "]')];
    return inputs.length >= 4 && inputs.every((input) => {
      const rect = input.getBoundingClientRect();
      return rect.width > 50 && rect.left >= 0 && rect.right <= innerWidth;
    });
  })()`));
  await screenshot('cue-environment-800x600');
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await waitFor(async () => {
    const json = await readStoredProject();
    return json && JSON.parse(json).timeline.cues[2].actions[0].payload.skyColor === '#123456';
  }, 'environment redo autosave');
  await evaluate(`[...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Export project')?.click()`, true);
  const exportedEnvironmentJson = await waitFor(() => evaluate('window.__JOURNEY_EXPORTED_PROJECT__ ?? null'), 'environment project export');
  check('Downloaded environment project contains the applied parameters', JSON.parse(exportedEnvironmentJson).timeline.cues[2].actions[0].payload.rainIntensity === 0.2);
  await client.send('Page.reload', { ignoreCache: true });
  await waitFor(() => evaluate('Boolean(window.__MUSIC_UNIVERSE_WORLD_E2E__ && window.__MUSIC_UNIVERSE_E2E__)'), 'environment draft reload');
  await evaluate(`document.querySelector('[aria-label="Open project editor"]')?.click()`, true);
  await evaluate(`(() => {
    const cue = document.querySelector('[aria-label="Timeline cue"]');
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(cue, 'weather-front');
    cue.dispatchEvent(new Event('change', { bubbles: true }));
  })()`, true);
  check('Refresh restores edited environment fields with empty session history', await waitFor(async () =>
    await evaluate(`document.querySelector('[aria-label="Cue sky color"]')?.value === '#123456'`) && (await worldSnapshot()).editor.undoCount === 0,
  'environment refresh restoration'));
  await evaluate(`(() => {
    const input = document.querySelector('[aria-label="Import MusicWorldProject"]');
    const transfer = new DataTransfer();
    transfer.items.add(new File([${JSON.stringify(exportedEnvironmentJson)}], 'environment.musicworld.json', { type: 'application/json' }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`, true);
  check('Environment project round-trip retains edited parameters', await waitFor(async () => {
    const json = await readStoredProject();
    return json && JSON.parse(json).id !== environmentProject.id && JSON.parse(json).timeline.cues[2].actions[0].payload.bloomIntensity === 1.2;
  }, 'environment project import'));
  await evaluate(`document.querySelector('[aria-label="Open project Memory Journey"]')?.click()`, true);
  await waitFor(
    () => evaluate(`document.querySelector('[aria-label="Active project name"]')?.value === 'Memory Journey'`),
    'default project reopening',
  );
  check('Opening a different draft clears edit history', (await worldSnapshot()).editor.undoCount === 0);
  await evaluate(`(() => {
    const setValue = (label, value) => {
      const input = document.querySelector('[aria-label="' + label + '"]');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setValue('Memory Archive X coordinate', '-9');
    setValue('Memory Archive Z coordinate', '-12');
    [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Apply position')?.click();
  })()`, true);
  const editedArchive = await waitFor(async () => {
    const snapshot = await worldSnapshot();
    const interaction = snapshot?.interactions?.find(({ id }) => id === 'memory-archive');
    return interaction?.position?.[0] === -9 && interaction?.position?.[2] === -12
      ? interaction
      : null;
  }, 'edited Archive runtime position');
  check('Archive position edit updates the runtime preview', Boolean(editedArchive), editedArchive);
  const savedEditedProject = await waitFor(async () => {
    const json = await readStoredProject();
    if (!json) return null;
    const project = JSON.parse(json);
    const position = project.scene.objects.find(({ id }) => id === 'memory-archive')?.transform?.position;
    return position?.[0] === -9 && position?.[2] === -12 ? project : null;
  }, 'edited project autosave');
  check('Archive edit autosaves to IndexedDB', Boolean(savedEditedProject));
  await evaluate(`document.querySelector('[aria-label="Undo project edit"]')?.click()`, true);
  check('Coordinate edit undo reconstructs the original Archive', await waitFor(async () => {
    const snapshot = await worldSnapshot();
    return snapshot?.interactions?.find(({ id }) => id === 'memory-archive')?.position[0] === -8;
  }, 'Archive undo'));
  await evaluate(`document.querySelector('[aria-label="Redo project edit"]')?.click()`, true);
  await waitFor(async () => (await worldSnapshot())?.interactions?.find(({ id }) => id === 'memory-archive')?.position[0] === -9, 'Archive redo');
  await evaluate(`document.querySelector('[aria-label="Drag Memory Archive in world"]')?.click()`, true);
  const editorBefore = await waitFor(async () => {
    const snapshot = await worldSnapshot();
    return snapshot?.editor?.mode === 'drag' && snapshot.editor.handles.length === 2 ? snapshot.editor : null;
  }, 'Archive drag handles');
  await screenshot('archive-drag-editor');
  await wait(5000);
  snapshots.archiveEditorPerformance = await evaluate('window.__MUSIC_UNIVERSE_PERFORMANCE_E2E__ ?? null');
  await client.send('Emulation.setDeviceMetricsOverride', { width: 800, height: 600, deviceScaleFactor: 1, mobile: false });
  await wait(150);
  check('Drag controls remain reachable beside the music player at 800x600', await evaluate(`(() => {
    const toolbar = document.querySelector('[aria-label="Archive drag editor"]').getBoundingClientRect();
    const player = document.querySelector('[aria-label="Music player"]').getBoundingClientRect();
    const done = document.querySelector('[aria-label="Finish Archive dragging"]').getBoundingClientRect();
    return toolbar.left >= 0 && toolbar.right <= innerWidth && done.bottom <= innerHeight && toolbar.left >= player.right;
  })()`));
  await screenshot('archive-drag-800x600');
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await wait(150);
  const drag = async (release = true) => {
    const handle = (await worldSnapshot()).editor.handles[0];
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: handle.x, y: handle.y });
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: handle.x, y: handle.y, button: 'left', clickCount: 1 });
    await waitFor(async () => (await worldSnapshot())?.editor?.dragging, 'drag pointer acquisition');
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: handle.x + 65, y: handle.y, button: 'left', buttons: 1 });
    const preview = await waitFor(async () => {
      const snapshot = await worldSnapshot();
      return snapshot?.editor?.preview && Math.abs(snapshot.editor.preview[0] + 9) > 0.1 ? snapshot : null;
    }, 'live Archive drag preview');
    if (release) await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: handle.x + 65, y: handle.y, button: 'left', clickCount: 1 });
    return { handle, preview };
  };
  const canceled = await drag(false);
  check('Drag preview moves the visual while retaining committed collision and project position',
    Math.abs(canceled.preview.editor.archiveVisualPosition[0] + 9) > 0.1 &&
    Math.abs(canceled.preview.editor.archiveColliderPosition[0] + 9) < 0.01 &&
    canceled.preview.interactions.find(({ id }) => id === 'memory-archive').position[0] === -9);
  check('Dragging leaves world pointer unlocked', await evaluate('document.pointerLockElement === null'));
  await pressKey('Escape');
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: canceled.handle.x + 65, y: canceled.handle.y, button: 'left', clickCount: 1 });
  check('Escape cancels the live drag without a history entry', await waitFor(async () => {
    const editor = (await worldSnapshot())?.editor;
    return editor?.preview === null && !editor.dragging && editor.undoCount === editorBefore.undoCount && Math.abs(editor.archiveVisualPosition[0] + 9) < 0.01;
  }, 'drag cancellation'));
  const interrupted = await drag(false);
  await evaluate(`window.dispatchEvent(new Event('blur'))`, true);
  await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: interrupted.handle.x + 65, y: interrupted.handle.y, button: 'left', clickCount: 1 });
  check('Losing focus cancels an in-flight drag', (await worldSnapshot()).editor.preview === null && (await worldSnapshot()).editor.undoCount === editorBefore.undoCount);
  const playerBeforeDrag = (await worldSnapshot()).playerPosition;
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW' });
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'e', code: 'KeyE' });
  await wait(250);
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW' });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'e', code: 'KeyE' });
  const blockedEditorSnapshot = await worldSnapshot();
  check('World movement and narrative interaction are blocked in drag mode',
    Math.hypot(...blockedEditorSnapshot.playerPosition.map((value, index) => value - playerBeforeDrag[index])) < 0.01 && Object.keys(blockedEditorSnapshot.flags).length === 0);
  await drag();
  const committedDrag = await waitFor(async () => {
    const snapshot = await worldSnapshot();
    return snapshot?.editor?.undoCount === editorBefore.undoCount + 1 && snapshot.editor.preview === null ? snapshot : null;
  }, 'drag commit');
  const draggedPosition = committedDrag.interactions.find(({ id }) => id === 'memory-archive').position;
  check('One pointer drag creates one undo record and reconstructs collision',
    Math.abs(draggedPosition[0] + 9) > 0.1 && Math.abs(committedDrag.editor.archiveColliderPosition[0] - draggedPosition[0]) < 0.01);
  check('Committed drag autosaves', await waitFor(async () => {
    const json = await readStoredProject();
    return json && Math.abs(JSON.parse(json).scene.objects.find(({ id }) => id === 'memory-archive').transform.position[0] - draggedPosition[0]) < 0.01;
  }, 'drag autosave'));
  await screenshot('archive-drag-committed');
  // Keep the remainder of the existing journey at its reviewed coordinates.
  await evaluate(`document.querySelector('[aria-label="Undo project edit"]')?.focus()`, true);
  await pressKey('z', 2);
  check('Editor keyboard undo restores the Archive and collider', await waitFor(async () => {
    const snapshot = await worldSnapshot();
    return snapshot?.interactions?.find(({ id }) => id === 'memory-archive')?.position[0] === -9 &&
      Math.abs(snapshot.editor.archiveColliderPosition[0] + 9) < 0.01;
  }, 'keyboard undo after drag'));
  await evaluate(`document.querySelector('[aria-label="Finish Archive dragging"]')?.click()`, true);
  await waitFor(() => evaluate(`Boolean(document.querySelector('[aria-label="Memory Archive X coordinate"]'))`), 'return to coordinate editor');
  await waitFor(async () => {
    const json = await readStoredProject();
    return json && JSON.parse(json).scene.objects.find(({ id }) => id === 'memory-archive').transform.position[0] === -9;
  }, 'undo autosave');
  const objectUrlCountBeforeExport = await evaluate(`window.__JOURNEY_OBJECT_URLS__.created.length`);
  await evaluate(
    `[...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Export project')?.click()`,
    true,
  );
  check(
    'Project export creates and revokes a JSON download URL',
    await waitFor(async () => {
      const counts = await evaluate(`({
        created: window.__JOURNEY_OBJECT_URLS__.created.length,
        revoked: window.__JOURNEY_OBJECT_URLS__.revoked.length,
      })`);
      return counts.created > objectUrlCountBeforeExport && counts.revoked >= counts.created
        ? counts
        : null;
    }, 'project export download'),
  );
  await evaluate(`(() => {
    const input = document.querySelector('[aria-label="Import MusicWorldProject"]');
    const transfer = new DataTransfer();
    transfer.items.add(new File(['{"schemaVersion":999}'], 'invalid.musicworld.json', { type: 'application/json' }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  check(
    'Invalid project import shows a validation error',
    await waitFor(
      () => evaluate(`document.querySelector('[aria-label="Project draft status"]')?.textContent?.includes('schemaVersion') ?? false`),
      'invalid project import error',
    ),
  );
  check(
    'Invalid project import preserves the active runtime project',
    (await worldSnapshot()).interactions.find(({ id }) => id === 'memory-archive').position[0] === -9,
  );
  await evaluate(`document.querySelector('[aria-label="Close project editor"]')?.click()`, true);
  await client.send('Page.reload', { ignoreCache: true });
  await waitFor(
    () => evaluate('Boolean(window.__MUSIC_UNIVERSE_WORLD_E2E__ && window.__MUSIC_UNIVERSE_E2E__)'),
    'world after draft reload',
  );
  const restoredArchive = await waitFor(async () => {
    const snapshot = await worldSnapshot();
    const interaction = snapshot?.interactions?.find(({ id }) => id === 'memory-archive');
    return interaction?.position?.[0] === -9 && interaction?.position?.[2] === -12
      ? interaction
      : null;
  }, 'restored Archive position');
  check('Refresh restores the autosaved project draft', Boolean(restoredArchive), restoredArchive);
  await evaluate(`document.querySelector('[aria-label="Open project editor"]')?.click()`, true);
  await evaluate(`(() => {
    const input = document.querySelector('[aria-label="Import MusicWorldProject"]');
    const transfer = new DataTransfer();
    transfer.items.add(new File([${JSON.stringify(originalProjectJson)}], 'memory-journey.musicworld.json', { type: 'application/json' }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  const importedArchive = await waitFor(async () => {
    const snapshot = await worldSnapshot();
    const interaction = snapshot?.interactions?.find(({ id }) => id === 'memory-archive');
    return interaction?.position?.[0] === -8 && interaction?.position?.[2] === -11
      ? interaction
      : null;
  }, 'imported original Archive position');
  check('Valid project import reconstructs the exported runtime state', Boolean(importedArchive), importedArchive);
  await waitFor(async () => {
    const json = await readStoredProject();
    return json && JSON.parse(json).scene.objects.find(({ id }) => id === 'memory-archive')?.transform?.position?.[0] === -8;
  }, 'imported project autosave');
  await evaluate(`document.querySelector('[aria-label="Close project editor"]')?.click()`, true);
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
      // Keep normalized cue samples distinct with the progress input's one-second step.
      const sampleCount = sampleRate * 20;
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
  const creatorAudioFixture = creatorAcceptanceMode && localDemoPath ? { name: 'ATHETOSIS - Crywolf.mp3', type: 'audio/mpeg' } : creatorAcceptanceMode ? await evaluate(`(async () => {
    const bytes = new Uint8Array(await window.__JOURNEY_AUDIO_FIXTURE__.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    return { base64: btoa(binary), name: ${JSON.stringify(localDemoPath ? 'ATHETOSIS - Crywolf.mp3' : 'journey-regression.wav')}, type: ${JSON.stringify(localDemoPath ? 'audio/mpeg' : 'audio/wav')} };
  })()`, true) : null;
  if (creatorAcceptanceMode) {
    const project = await waitFor(async () => {
      const json = await readStoredProject();
      const stored = json && JSON.parse(json);
      return stored?.track.source === 'local-file' && stored.track.expectedDurationSeconds === audioReady.duration ? stored : null;
    }, 'uploaded project track autosave');
    snapshots.creatorAudioAssociation = { uploadedDuration: audioReady.duration, exportedTrack: project.track };
    check('Uploaded song saves its identity and real duration with separate unverified rights', /^[a-f0-9]{64}$/.test(project.track.file?.sha256) && project.track.assetId === undefined && project.track.rights.licenseRef === 'LicenseRef-User-Provided-Unverified');
  }
  await evaluate(`document.querySelector('[aria-label="Toggle reduced visual effects"]')?.click()`, true);
  const seekForEnvironment = (fraction) => evaluate(`(() => {
    const range = document.querySelector('[aria-label="Music progress"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(range, String(Number(range.max) * ${fraction}));
    range.dispatchEvent(new Event('input', { bubbles: true }));
    range.dispatchEvent(new Event('change', { bubbles: true }));
  })()`, true);
  await evaluate(`[...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Play')?.click()`, true);
  await waitFor(() => evaluate(`[...document.querySelectorAll('button')].some((button) => button.textContent?.trim() === 'Pause')`), 'playback before environment edit');
  await seekForEnvironment(0.4);
  await evaluate(`document.querySelector('[aria-label="Open project editor"]')?.click()`, true);
  await evaluate(`(() => {
    const cue = document.querySelector('[aria-label="Timeline cue"]');
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(cue, 'weather-front');
    cue.dispatchEvent(new Event('change', { bubbles: true }));
  })()`, true);
  await waitFor(() => evaluate(`document.querySelector('[aria-label="Cue rain intensity"]')?.value === '0.7'`), 'live environment inspector');
  await setEnvironmentFields({ 'Cue sky color': '#123456', 'Cue rain intensity': '0.2', 'Cue bloom intensity': '1.2' });
  await applyEnvironment();
  await evaluate(`[...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Pause')?.click()`, true);
  check('Editing during playback reconstructs the environment at authoritative music time', await waitFor(async () => {
    const environment = (await worldSnapshot())?.environment;
    return environment?.skyColor === '#123456' && environment.rainIntensity === 0.2 && environment.bloomIntensity === 1.2;
  }, 'edited live environment'));
  await evaluate(`document.querySelector('[aria-label="Close project editor"]')?.click()`, true);
  check('Edited sky, rain and bloom reach their rendered targets', await waitFor(async () => {
    const rendered = (await worldSnapshot())?.environment.rendered;
    return rendered?.skyColor === '#123456' && Math.abs(rendered.rainIntensity - 0.2) < 0.02 && Math.abs(rendered.bloomIntensity - 1.2) < 0.02;
  }, 'edited environment visual settling', 7000));
  await screenshot('cue-environment-preview');
  await seekForEnvironment(0);
  check('Backward seek restores the environment before the edited cue', await waitFor(async () => (await worldSnapshot())?.environment.skyColor === '#233a72', 'environment backward seek'));
  await seekForEnvironment(0.4);
  check('Forward seek reconstructs the edited environment', await waitFor(async () => (await worldSnapshot())?.environment.skyColor === '#123456', 'environment forward seek'));
  await evaluate(`document.querySelector('[aria-label="Open project editor"]')?.click()`, true);
  await evaluate(`document.querySelector('[aria-label="Undo project edit"]')?.click()`, true);
  check('Undo reconstructs the original active environment', await waitFor(async () => (await worldSnapshot())?.environment.rainIntensity === 0.7, 'live environment undo'));
  await evaluate(`document.querySelector('[aria-label="Redo project edit"]')?.click()`, true);
  check('Redo reconstructs the edited active environment', await waitFor(async () => (await worldSnapshot())?.environment.rainIntensity === 0.2, 'live environment redo'));
  await evaluate(`document.querySelector('[aria-label="Undo project edit"]')?.click()`, true);
  await evaluate(`document.querySelector('[aria-label="Close project editor"]')?.click()`, true);
  await seekForEnvironment(0);
  await evaluate(`document.querySelector('[aria-label="Toggle reduced visual effects"]')?.click()`, true);
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
  check(
    'Player settles into the idle animation state',
    await evaluate(`window.__MUSIC_UNIVERSE_E2E__?.animationState === 'idle'`),
  );
  await evaluate(`window.__MUSIC_UNIVERSE_E2E__?.drivePlayer([0, 0, -5], 800)`);
  const walkState = await waitFor(
    async () => {
      const state = await evaluate(`window.__MUSIC_UNIVERSE_E2E__?.animationState ?? null`);
      return state === 'walk' ? state : null;
    },
    'player walk animation state',
    700,
  );
  check(
    'Player enters the walk animation state at normal movement speed',
    walkState === 'walk',
    walkState,
  );
  await setPlayer([0, 0.65, 0]);
  await evaluate(`window.__MUSIC_UNIVERSE_E2E__?.drivePlayer([0, 0, -7.5], 800)`);
  const runState = await waitFor(
    async () => {
      const state = await evaluate(`window.__MUSIC_UNIVERSE_E2E__?.animationState ?? null`);
      return state === 'run' ? state : null;
    },
    'player run animation state',
    700,
  );
  check(
    'Player enters the run animation state at sprint speed',
    runState === 'run',
    runState,
  );
  await setPlayer([0, 0.65, 0]);

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
    return snapshot?.visuals?.archiveAwakening >= 0.92 &&
      snapshot.visuals.archiveFacadeAwakening >= 0.92
      ? snapshot
      : null;
  }, 'Archive building body awakening', 5000);
  check(
    'Archive interaction awakens the building body',
    snapshots.archiveAwakened.visuals.archiveAwakening >= 0.92,
    snapshots.archiveAwakened.visuals.archiveAwakening,
  );
  check(
    'Archive interaction illuminates the readable entrance facade',
    snapshots.archiveAwakened.visuals.archiveFacadeAwakening >= 0.92,
    snapshots.archiveAwakened.visuals.archiveFacadeAwakening,
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
      const playbackDeadline = performance.now() + 3000;
      while (![...document.querySelectorAll('button')].some((button) => button.textContent?.trim() === 'Pause')) {
        if (performance.now() > playbackDeadline) throw new Error('Audio did not enter playing state for transition sampling.');
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
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
      snapshot.visuals.archiveFacadeAwakening < 0.08 &&
      snapshot.visuals.departureGateCharge === null &&
      snapshot.visuals.departureGate === null &&
      snapshot.visuals.departureGateAfterglow === null
      ? snapshot
      : null;
  }, 'replay visual state reconstruction', 6000);
  check(
    'Replay returns Archive to rest and removes every Gate phase',
    snapshots.replayVisualsSettled.visuals.archiveAwakening < 0.08 &&
      snapshots.replayVisualsSettled.visuals.archiveFacadeAwakening < 0.08,
    snapshots.replayVisualsSettled.visuals,
  );
  await setPlayer([0, 0.65, 0]);
  await settleReviewCamera();
  await screenshot('04-replay-reset');

  if (creatorAcceptanceMode) {
    // Keep spatial, timing and action edits together through the full file workflow.
    const button = (label) => evaluate(`[...document.querySelectorAll('button')].find((element) => element.textContent?.trim() === ${JSON.stringify(label)})?.click()`, true);
    const input = (label, value) => setEnvironmentFields({ [label]: value });
    const selectWeather = () => evaluate(`(() => {
      const cue = document.querySelector('[aria-label="Timeline cue"]');
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(cue, 'weather-front');
      cue.dispatchEvent(new Event('change', { bubbles: true }));
    })()`, true);
    const uploadCreatorSong = (reattach, wrong = false) => evaluate(`(async () => {
      const fixture = ${JSON.stringify(creatorAudioFixture)};
      const bytes = ${localDemoPath ? "new Uint8Array(await fetch('/__local_demo_audio__').then((response) => response.arrayBuffer()))" : "Uint8Array.from(atob(fixture.base64), (character) => character.charCodeAt(0))"};
      if (${wrong}) bytes[bytes.length - 1] ^= 1;
      const transfer = new DataTransfer();
      transfer.items.add(new File([bytes], fixture.name, { type: fixture.type }));
      const input = document.querySelector(${JSON.stringify(reattach ? '[aria-label="Restore original project song"]' : '#music-file-input')});
      if (!input) throw new Error('Song selection entry point was missing.');
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })()`, true);
    await evaluate(`document.querySelector('[aria-label="Open project editor"]')?.click()`, true);
    await evaluate(`document.querySelector('[aria-label="Create project"]')?.click()`, true);
    await input('Active project name', 'Creator Acceptance');
    await button('Rename');
    check('Creating a project clears the previous project song', await evaluate(`!document.querySelector('[aria-label="Music progress"]')`));
    await evaluate(`document.querySelector('[aria-label="Close project editor"]')?.click()`, true);
    await uploadCreatorSong(false);
    await waitFor(() => evaluate(`Number(document.querySelector('[aria-label="Music progress"]')?.max) === ${audioReady.duration}`), 'combined creator song load');
    await evaluate(`document.querySelector('[aria-label="Open project editor"]')?.click()`, true);
    await setEnvironmentFields({ 'Memory Archive X coordinate': '-12', 'Memory Archive Z coordinate': '-15' });
    await button('Apply position');
    await evaluate(`document.querySelector('[aria-label="Drag Memory Archive in world"]')?.click()`, true);
    await waitFor(async () => (await worldSnapshot())?.editor.handles[0], 'combined creator drag handle');
    await wait(150);
    const handle = (await worldSnapshot()).editor.handles[0];
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: handle.x, y: handle.y });
    await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: handle.x, y: handle.y, button: 'left', clickCount: 1 });
    await waitFor(async () => (await worldSnapshot())?.editor.dragging, 'combined creator drag acquisition');
    await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: handle.x + 40, y: handle.y, button: 'left', buttons: 1 });
    await waitFor(async () => Math.abs((await worldSnapshot())?.editor.preview?.[0] + 12) > 0.1, 'combined creator preview');
    await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: handle.x + 40, y: handle.y, button: 'left', clickCount: 1 });
    const draggedPosition = await waitFor(async () => {
      const editor = (await worldSnapshot())?.editor;
      return !editor?.dragging && editor?.undoCount === 2 ? editor.archiveVisualPosition : null;
    }, 'combined creator drag commit');
    await evaluate(`document.querySelector('[aria-label="Finish Archive dragging"]')?.click()`, true);
    await selectWeather();
    await input('Timeline cue normalized position', '0.41');
    await button('Apply cue position');
    await setEnvironmentFields({ 'Cue sky color': '#2468ac', 'Cue ground color': '#654321', 'Cue rain intensity': '0.2', 'Cue bloom intensity': '1.2' });
    await applyEnvironment();
    check('Combined creator edits produce four bounded transactions', (await worldSnapshot()).editor.undoCount === 4);
    for (let index = 0; index < 3; index += 1) await evaluate(`document.querySelector('[aria-label="Undo project edit"]')?.click()`, true);
    check('Mixed undo restores drag, cue and action together', await waitFor(async () => {
      const snapshot = await worldSnapshot();
      return snapshot.editor.archiveVisualPosition[0] === -12 && await evaluate(`document.querySelector('[aria-label="Timeline cue normalized position"]')?.value === '0.34' && document.querySelector('[aria-label="Cue rain intensity"]')?.value === '0.7'`);
    }, 'combined undo'));
    for (let index = 0; index < 3; index += 1) await evaluate(`document.querySelector('[aria-label="Redo project edit"]')?.click()`, true);
    check('Mixed redo restores all creator edits together', await waitFor(async () => {
      const snapshot = await worldSnapshot();
      return Math.abs(snapshot.editor.archiveVisualPosition[0] - draggedPosition[0]) < 0.001 && await evaluate(`document.querySelector('[aria-label="Timeline cue normalized position"]')?.value === '0.41' && document.querySelector('[aria-label="Cue sky color"]')?.value === '#2468ac'`);
    }, 'combined redo'));
    const authoredJson = await waitFor(async () => {
      const json = await readStoredProject();
      const project = json && JSON.parse(json);
      return project?.metadata.title === 'Creator Acceptance' && project.timeline.cues[2].position === 0.41 && project.timeline.cues[2].actions[0].payload.skyColor === '#2468ac' ? json : null;
    }, 'combined autosave');
    await evaluate('window.__JOURNEY_EXPORTED_PROJECT__ = null', true);
    await button('Export project');
    const authoredExport = await waitFor(() => evaluate('window.__JOURNEY_EXPORTED_PROJECT__ ?? null'), 'combined download');
    check('The downloaded file equals the autosaved combined project', authoredExport === authoredJson);
    await writeFile(path.join(outputDir, 'creator-authored.musicworld.json'), authoredExport);
    const authoredProject = JSON.parse(authoredExport);
    const sameContent = (project) => ['scene', 'timeline', 'worldBible', 'assets', 'presentation', 'track'].every((key) => JSON.stringify(project[key]) === JSON.stringify(authoredProject[key]));
    await evaluate(`document.querySelector('[aria-label="Duplicate project Creator Acceptance"]')?.click()`, true);
    await waitFor(() => evaluate(`document.querySelector('[aria-label="Active project name"]')?.value === 'Creator Acceptance Copy'`), 'combined duplicate');
    check('Changing to a duplicate clears playback and offers its saved song', await evaluate(`!document.querySelector('[aria-label="Music progress"]') && Boolean(document.querySelector('[aria-label="Project song recovery"]'))`));
    await setEnvironmentFields({ 'Memory Archive X coordinate': '24', 'Memory Archive Z coordinate': '-15' });
    await button('Apply position');
    await evaluate(`document.querySelector('[aria-label="Open project Creator Acceptance"]')?.click()`, true);
    check('Reopening the authored draft preserves every edit after changing a duplicate', await waitFor(async () => {
      const json = await readStoredProject();
      return json && JSON.parse(json).id === authoredProject.id && sameContent(JSON.parse(json));
    }, 'combined draft reopen'));
    await client.send('Page.reload', { ignoreCache: true });
    await waitFor(() => evaluate('Boolean(window.__MUSIC_UNIVERSE_WORLD_E2E__ && window.__MUSIC_UNIVERSE_E2E__)'), 'combined refresh');
    check('Refresh reconstructs the complete authored project and clears history', sameContent(JSON.parse(await readStoredProject())) && (await worldSnapshot()).editor.undoCount === 0);
    snapshots.creatorAudioAfterRefresh = await waitFor(() => evaluate(`(() => {
      const recovery = document.querySelector('[aria-label="Project song recovery"]');
      return recovery ? { hasPlayableTrack: Boolean(document.querySelector('[aria-label="Music progress"]')), recoveryText: recovery.innerText } : null;
    })()`), 'matching song recovery prompt');
    check('Refresh identifies the saved song and its original-file restore entry point', snapshots.creatorAudioAfterRefresh.recoveryText.includes(creatorAudioFixture.name));
    await screenshot('creator-song-recovery');
    await client.send('Emulation.setDeviceMetricsOverride', { width: 800, height: 600, deviceScaleFactor: 1, mobile: false });
    check('Song recovery stays within a small viewport and exposes keyboard file selection', await evaluate(`(() => {
      const panel = document.querySelector('[aria-label="Music player"]');
      const input = document.querySelector('[aria-label="Restore original project song"]');
      panel.querySelector('details').open = true;
      input.focus();
      const rect = panel.getBoundingClientRect();
      return document.activeElement === input && input.parentElement.className.includes('focus-within:ring-4') && rect.top >= 0 && rect.bottom <= innerHeight && getComputedStyle(panel).overflowY === 'auto';
    })()`));
    await screenshot('creator-song-recovery-800x600');
    await evaluate(`document.querySelector('[aria-label="Music player"] details').open = false`);
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await uploadCreatorSong(true, true);
    check('A same-name altered file is rejected without replacing the saved project', await waitFor(() => evaluate(`document.querySelector('[role="alert"]')?.textContent.includes('does not match')`), 'wrong original song rejection') && sameContent(JSON.parse(await readStoredProject())));
    await uploadCreatorSong(true);
    check('Matching original song restores playback without changing the project', await waitFor(() => evaluate(`Number(document.querySelector('[aria-label="Music progress"]')?.max) === ${audioReady.duration}`), 'original song reattachment') && sameContent(JSON.parse(await readStoredProject())));
    await evaluate(`document.querySelector('[aria-label="Open project editor"]')?.click()`, true);
    await evaluate(`(() => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([${JSON.stringify(authoredExport)}], 'creator-authored.musicworld.json', { type: 'application/json' }));
      const input = document.querySelector('[aria-label="Import MusicWorldProject"]');
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })()`, true);
    check('Import creates an independent project with identical authored content', await waitFor(async () => {
      const json = await readStoredProject();
      const project = json && JSON.parse(json);
      return project && project.id !== authoredProject.id && sameContent(project);
    }, 'combined import'));
    await evaluate(`document.querySelector('[aria-label="Close project editor"]')?.click()`, true);
    check('Imported local projects request their own matching song', await waitFor(() => evaluate(`Boolean(document.querySelector('[aria-label="Restore original project song"]'))`), 'imported song recovery'));
    await uploadCreatorSong(true);
    await waitFor(() => evaluate(`Number(document.querySelector('[aria-label="Music progress"]')?.max) === ${audioReady.duration}`), 'authored project song loading');
    await button('Play');
    await waitFor(() => evaluate(`[...document.querySelectorAll('button')].some((button) => button.textContent?.trim() === 'Pause')`), 'authored project playback');
    await seekForEnvironment(0.45);
    await button('Pause');
    snapshots.creatorAuthored = await waitFor(async () => {
      const snapshot = await worldSnapshot();
      return snapshot?.environment.skyColor === '#2468ac' && snapshot.environment.rainIntensity === 0.2 && snapshot.environment.bloomIntensity === 1.2 ? snapshot : null;
    }, 'imported authored runtime');
    check('Imported project reconstructs authored timeline, rendered Archive and collision', Math.abs(snapshots.creatorAuthored.editor.archiveVisualPosition[0] - draggedPosition[0]) < 0.001 && Math.abs(snapshots.creatorAuthored.editor.archiveColliderPosition[0] - draggedPosition[0]) < 0.001);
    await waitFor(async () => (await worldSnapshot())?.environment.rendered.skyColor === '#2468ac', 'authored rendered sky', 15000);
    await screenshot('creator-authored-preview');
    await seekForEnvironment(0.38);
    check('Imported cue timing keeps weather unchanged before the authored event', await waitFor(async () => (await worldSnapshot())?.environment.skyColor === '#334b85', 'authored cue before threshold'));
    await seekForEnvironment(0.45);
    check('Imported cue timing applies the authored action after its event', await waitFor(async () => (await worldSnapshot())?.environment.skyColor === '#2468ac', 'authored cue after threshold'));
    await seekForEnvironment(0);
    check('Imported authored project reconstructs its opening on backward seek', await waitFor(async () => (await worldSnapshot())?.environment.skyColor === '#233a72', 'authored opening'));
    const authoredEnd = await evaluate(`(async () => {
      const range = document.querySelector('[aria-label="Music progress"]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(range, String(Number(range.max) - 2));
      range.dispatchEvent(new Event('input', { bubbles: true }));
      range.dispatchEvent(new Event('change', { bubbles: true }));
      [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Play')?.click();
      const deadline = performance.now() + 15000;
      while (performance.now() < deadline) {
        const ended = [...document.querySelectorAll('button')].some((button) => button.textContent?.trim() === 'Play');
        if (ended && Number(range.value) >= Number(range.max) - 0.05) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return { currentTime: Number(range.value), duration: Number(range.max), readyToReplay: [...document.querySelectorAll('button')].some((button) => button.textContent?.trim() === 'Play') };
    })()`, true);
    check('Authored imported project reaches its original song natural ending', authoredEnd.readyToReplay && authoredEnd.currentTime >= Math.floor(authoredEnd.duration), authoredEnd);
    await button('Play');
    await waitFor(() => evaluate(`[...document.querySelectorAll('button')].some((button) => button.textContent?.trim() === 'Pause')`), 'authored replay starts');
    await button('Pause');
    check('Original song replay reconstructs the authored project opening', await waitFor(async () => (await worldSnapshot())?.environment.skyColor === '#233a72', 'authored replay opening'));
  }

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
  if (creatorAcceptanceMode) {
    report.creatorVerdict = report.acceptanceFindings.some(({ severity }) => severity === 'blocking') ? 'blocked' : 'passed';
    if (report.creatorVerdict === 'blocked') process.exitCode = 2;
  }
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
    maxRetries: process.platform === 'win32' ? 15 : 0,
    retryDelay: 500,
  }).catch((error) => { report.profileCleanupWarning = error.message; });
  process.stdout.write(
    `${report.status.toUpperCase()}: ${path.relative(root, reportPath)}\n`,
  );
  if (report.status === 'passed') {
    process.stdout.write(`${checks.length} checks passed; ${screenshots.length} screenshots captured.\n`);
    if (creatorAcceptanceMode) process.stdout.write(`Creator acceptance: ${report.creatorVerdict.toUpperCase()}; ${report.acceptanceFindings.length} findings.\n`);
  } else {
    process.stderr.write(`${report.failure}\n`);
  }
}
