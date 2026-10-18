import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { makeBpmFixture } from './bpm-validation-fixtures.mjs';

const directory = 'output/tool-pilots/bpm-2026-10-05';
// Independently verify fixture beat timings by recovering energy envelopes.
const context = { createBuffer: (_channels, length, sampleRate) => {
  const pcm = new Float32Array(length);
  return { getChannelData: () => pcm, duration: length / sampleRate, sampleRate };
} };
for (const sampleRate of [12000, 44100]) for (const bpm of [60, 75, 90, 100, 120, 128, 150, 180, 200]) {
  const fixture = makeBpmFixture(context, { sampleRate, bpm });
  const pcm = fixture.getChannelData(0);
  const onsets = [];
  for (let i = 1; i < pcm.length; i++) {
    if (Math.abs(pcm[i]) > .1 && Math.abs(pcm[i - 1]) <= .1 && (onsets.length === 0 || i - onsets.at(-1) > sampleRate * .2)) onsets.push(i);
  }
  assert.ok(onsets.length > 20);
  const intervals = onsets.slice(1).map((sample, i) => sample - onsets[i]).sort((a, b) => a - b);
  const recovered = 60 * sampleRate / intervals[Math.floor(intervals.length / 2)];
  assert.ok(Math.abs(recovered - bpm) / bpm < .001, `Fixture ${bpm}/${sampleRate} has incorrect timing`);
  assert.ok(Math.abs(onsets[0] / sampleRate - .25) < .005);
  assert.ok(pcm.every(Number.isFinite));
}
const chrome = JSON.parse(await readFile(`${directory}/chrome-report.json`, 'utf8'));
const edge = JSON.parse(await readFile(`${directory}/edge-report.json`, 'utf8'));
assert.equal(chrome.rows.length, 71);
assert.equal(edge.rows.length, 71);
assert.deepEqual(chrome.rows.map(row => ({ name: row.name, policy: row.policy, result: row.result, error: row.error, classification: row.classification })), edge.rows.map(row => ({ name: row.name, policy: row.policy, result: row.result, error: row.error, classification: row.classification })));
for (const report of [chrome, edge]) {
  assert.deepEqual(report.pageErrors, []);
  for (const policy of ['default-90-180', 'wide-50-220']) {
    const repeats = report.rows.filter(row => row.name === 'real-full' && row.policy === policy);
    assert.ok(repeats.every(row => JSON.stringify(row.result) === JSON.stringify(repeats[0].result)));
    const noBeat = report.rows.filter(row => ['silence', 'sustained-tone'].includes(row.name) && row.policy === policy);
    assert.ok(noBeat.every(row => row.result === null && /detectable beats/.test(row.error)));
  }
}
const bundle = JSON.parse(await readFile(`${directory}/bundle-report.json`, 'utf8'));
const summary = {
  date: '2026-10-05', toolVersion: '8.2.39', browsersAgree: true, verifiedFixtureTimings: 18,
  decision: 'Do not adopt as authoritative automatic BPM/beat-grid source. Reconsider only as user-confirmed suggestions or compare another detector against an annotated corpus.',
  bundle,
  browsers: [chrome, edge].map(report => ({
    browser: report.browser, cases: report.rows.length,
    policies: report.summary.map(policy => ({ ...policy, exactPercent: policy.exact / policy.cases * 100, exactAccuracyGatePassed: policy.exact / policy.cases >= .9 })),
    decodeMs: report.realSong.decodeMs,
    realAnalysisMaxMs: Math.max(...report.rows.filter(row => row.family === 'real').map(row => row.ms)),
    realWindowTempos: report.rows.filter(row => row.family === 'real-window').map(row => ({ offset: row.offset, policy: row.policy, bpm: row.result?.bpm })),
  })),
};
await writeFile(`${directory}/decision.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
