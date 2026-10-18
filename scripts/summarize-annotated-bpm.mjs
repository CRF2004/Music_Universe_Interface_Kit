import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { classifyTempo } from './bpm-validation-fixtures.mjs';

const root = path.resolve('output/tool-pilots/annotated-bpm-2026-10-05');
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
assert.equal(manifest.samples.length, 100);
assert.equal(new Set(manifest.samples.map(row => row.id)).size, 100);
for (const sample of manifest.samples) {
  assert.equal(createHash('sha256').update(await readFile(path.join(root, 'audio', sample.file))).digest('hex'), sample.sha256);
  assert.ok(sample.labels.length > 0);
  assert.ok(sample.labels.every(label => label.defined_tempo && !label.discard && !label.save_for_later));
}
const reports = await Promise.all(['chrome', 'edge'].map(async browser => JSON.parse(await readFile(path.join(root, `${browser}-report.json`), 'utf8'))));
for (const report of reports) {
  assert.equal(report.version, '8.2.39');
  assert.equal(report.rows.length, 200);
  assert.deepEqual(report.pageErrors, []);
  assert.equal(new Set(report.rows.map(row => `${row.id}:${row.policy}`)).size, 200);
  for (const row of report.rows) {
    assert.equal(row.expected, manifest.samples.find(sample => sample.id === row.id).bpm);
    assert.equal(row.classification, classifyTempo(row.result?.tempo, row.expected).classification);
  }
}
const stable = report => report.rows.map(({id, policy, expected, result, error, classification}) => ({id, policy, expected, result, error, classification}));
assert.deepEqual(stable(reports[0]), stable(reports[1]));
const details = reports.map(report => ({ browser: report.browser, summary: report.summary, buckets: ['under90', '90to119', '120to149', '150plus'].map(bucket => ({bucket, policies: report.summary.map(policy => { const rows = report.rows.filter(row => row.bucket === bucket && row.policy === policy.policy); return {policy: policy.policy, count: rows.length, exact: rows.filter(row => row.classification === 'exact').length}; })})), maxDecodeMs: Math.max(...report.rows.map(row => row.decodeMs)), durationRange: [Math.min(...report.rows.map(row => row.duration)), Math.max(...report.rows.map(row => row.duration))] }));
const evidence = {samples: manifest.samples.length, eligible: manifest.eligible, excluded: manifest.excluded, multiAnnotator: manifest.samples.filter(row => row.labels.length > 1).length, browsersAgree: true, details, passed: reports.every(report => report.summary.every(policy => policy.exact >= 90 && policy.maxMs <= 2000))};
const sensitivity = JSON.parse(await readFile(path.join(root,'chrome-44100-report.json'),'utf8'));
assert.equal(sensitivity.sampleRate,44100);
assert.equal(sensitivity.rows.length,200);
evidence.samplingRateCheck = sensitivity.summary;
const artbeat = JSON.parse(await readFile(path.join(root,'artbeat-manifest.json'),'utf8'));
assert.equal(artbeat.samples.length,24);
for (const sample of artbeat.samples) assert.equal(createHash('sha256').update(await readFile(path.join(root,'artbeat-audio',sample.file))).digest('hex'),sample.sha256);
const artReports = await Promise.all(['chrome','edge'].map(async browser=>JSON.parse(await readFile(path.join(root,`artbeat-${browser}-report.json`),'utf8'))));
for (const report of artReports) {
  assert.equal(report.rows.length,92);
  assert.deepEqual(report.pageErrors,[]);
  assert.equal(new Set(report.rows.map(row=>`${row.id}:${row.side}:${row.policy}`)).size,92);
  for (const row of report.rows.filter(row=>row.expected)) {
    assert.equal(row.expected,artbeat.samples.find(sample=>sample.id===row.id).windows.find(window=>window.side===row.side).expected);
    assert.equal(row.classification,classifyTempo(row.result?.tempo,row.expected).classification);
  }
}
const artStable = report=>report.rows.map(({ms,...row})=>row);
assert.deepEqual(artStable(artReports[0]),artStable(artReports[1]));
evidence.artbeat = {clips:24,windows:22,browsersAgree:true,summary:artReports[0].summary,maxMs:Math.max(...artReports.flatMap(report=>report.rows.map(row=>row.ms))),wholeClipErrors:artReports[0].rows.filter(row=>row.side==='full'&&row.error).length};
await writeFile('docs/research/artbeat-bpm-samples-2026-10-05.json',JSON.stringify(artbeat,null,2));
await writeFile(path.join(root, 'decision.json'), JSON.stringify(evidence, null, 2));
await writeFile('docs/research/annotated-bpm-samples-2026-10-05.json', JSON.stringify({source: manifest.source, selection: manifest.selection, samples: manifest.samples.map(({id,bpm,bucket,source,license,sha256,labels,metadata}) => ({id,bpm,bucket,source,license,sha256,author:metadata.username,annotators:labels.map(label => label.annotator)}))}, null, 2));
console.log(JSON.stringify(evidence, null, 2));
