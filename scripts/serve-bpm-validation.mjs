import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const directory = path.resolve('output/tool-pilots/bpm-2026-10-05');
await mkdir(directory, { recursive: true });
const manifest = JSON.parse(await readFile(path.join(directory, 'node_modules/web-audio-beat-detector/package.json'), 'utf8'));
if (manifest.version !== '8.2.39') throw new Error('Expected pinned detector 8.2.39. Install it in the isolated directory first.');
await build({ entryPoints: [path.join(directory, 'node_modules/web-audio-beat-detector/build/es2019/module.js')], bundle: true, minify: true, format: 'esm', platform: 'browser', outfile: path.join(directory, 'detector.js') });
const bundled = await readFile(path.join(directory, 'detector.js'));
const size = { version: manifest.version, license: manifest.license, bytes: bundled.length, gzipBytes: gzipSync(bundled).length, dependencies: manifest.dependencies };
await writeFile(path.join(directory, 'bundle-report.json'), JSON.stringify(size, null, 2));
const routes = new Map([
  ['/detector.js', [path.join(directory, 'detector.js'), 'text/javascript']],
  ['/fixtures.js', [path.resolve('scripts/bpm-validation-fixtures.mjs'), 'text/javascript']],
  ['/experiment.js', [path.resolve('scripts/bpm-validation-experiment.mjs'), 'text/javascript']],
  ['/demo.mp3', [path.resolve('assets/source/audio/crywolf-athetosis-demo.mp3'), 'audio/mpeg']],
]);
const server = createServer(async (req, res) => {
  if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>Isolated BPM validation</title><h1>BPM tool validation</h1><p>Local synthetic fixtures and authorized demo only.</p><script type="module">import { runExperiment } from "/experiment.js"; window.runExperiment=runExperiment;</script>'); return; }
  const route = routes.get(req.url);
  if (!route) { res.writeHead(404); res.end(); return; }
  try { res.setHeader('Content-Type', route[1]); res.setHeader('Cache-Control', 'no-store'); res.end(await readFile(route[0])); }
  catch { res.writeHead(500); res.end('Fixture unavailable'); }
});
server.listen(4182, '127.0.0.1', () => console.log(JSON.stringify({ url: 'http://127.0.0.1:4182', ...size })));
