import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('output/tool-pilots/annotated-bpm-2026-10-05');
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
if (manifest.samples.length !== 100 || manifest.samples.some(row => !row.sha256 || !row.file)) throw new Error('Complete frozen manifest required');
const routes = new Map([
  ['/manifest.json', [path.join(root, 'manifest.json'), 'application/json']],
  ['/detector.js', [path.resolve('output/tool-pilots/bpm-2026-10-05/detector.js'), 'text/javascript']],
  ['/fixtures.js', [path.resolve('scripts/bpm-validation-fixtures.mjs'), 'text/javascript']],
  ['/experiment.js', [path.resolve('scripts/annotated-bpm-experiment.mjs'), 'text/javascript']],
]);
for (const row of manifest.samples) routes.set(`/audio/${row.id}`, [path.join(root, 'audio', row.file), 'application/octet-stream']);
const artbeat = JSON.parse(await readFile(path.join(root, 'artbeat-manifest.json'), 'utf8'));
routes.set('/artbeat-manifest.json', [path.join(root,'artbeat-manifest.json'), 'application/json']);
routes.set('/artbeat-experiment.js', [path.resolve('scripts/artbeat-bpm-experiment.mjs'), 'text/javascript']);
for (const row of artbeat.samples) routes.set(`/artbeat/${row.id}`, [path.join(root,'artbeat-audio',row.file), 'audio/wav']);
createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const pathname = new URL(req.url, 'http://127.0.0.1:4182').pathname;
  if (pathname === '/' || pathname === '/artbeat') { const experiment = pathname === '/artbeat' ? 'artbeat-experiment' : 'experiment'; res.setHeader('Content-Type', 'text/html'); res.end(`<!doctype html><title>Annotated BPM evaluation</title><h1>Annotated BPM evaluation</h1><p>Ready</p><script type="module">import {runExperiment} from "/${experiment}.js"; window.runExperiment=runExperiment;</script>`); return; }
  if (pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  const route = routes.get(pathname);
  if (!route) { res.writeHead(404); res.end(); return; }
  try { res.setHeader('Content-Type', route[1]); res.end(await readFile(route[0])); }
  catch { res.writeHead(500); res.end('Evaluation file unavailable'); }
}).listen(4182, '127.0.0.1', () => console.log('Annotated evaluation: http://127.0.0.1:4182'));
