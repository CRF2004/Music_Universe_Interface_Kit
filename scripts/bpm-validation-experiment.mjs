import { guess } from '/detector.js';
import { makeBpmFixture, classifyTempo } from '/fixtures.js';

export async function runExperiment() {
  const context = new OfflineAudioContext(1, 12000, 12000);
  const rows = [];
  const policies = [{ name: 'default-90-180', range: undefined }, { name: 'wide-50-220', range: { minTempo: 50, maxTempo: 220 } }];
  const analyze = async (name, buffer, policy, expected, extra = {}) => {
    const start = performance.now();
    let result, error;
    try { result = await guess(buffer, ...(policy.range ? [policy.range] : [])); }
    catch (caught) { error = caught.message; }
    const row = { name, policy: policy.name, sampleRate: buffer.sampleRate, duration: buffer.duration, expected, result: result ?? null, error: error ?? null, ms: performance.now() - start, ...(expected ? classifyTempo(result?.tempo, expected) : {}), ...extra };
    rows.push(row);
    document.querySelector('p').textContent = `Completed ${rows.length}: ${name} — ${result?.bpm ?? error}`;
    return row;
  };
  // Warm-up excluded from timing summaries.
  await guess(makeBpmFixture(context, {}));
  for (const sampleRate of [12000, 44100]) for (const bpm of [60, 75, 90, 100, 120, 128, 150, 180, 200]) {
    const buffer = makeBpmFixture(context, { bpm, sampleRate });
    for (const policy of policies) await analyze(`steady-${bpm}`, buffer, policy, bpm, { family: 'steady' });
  }
  for (const fixture of [
    { name: 'offset-128', bpm: 128, offset: 1.17 },
    { name: 'accent-75', bpm: 75, kind: 'accent' },
    { name: 'mixed-120', bpm: 120, kind: 'mixed' },
    { name: 'syncopated-100', bpm: 100, kind: 'syncopated' },
    { name: 'short-120', bpm: 120, duration: 3 },
    { name: 'silence', kind: 'silence' },
    { name: 'sustained-tone', kind: 'tone' },
    { name: 'variable-120-150', bpm: 120, kind: 'variable', expected: null },
  ]) for (const policy of policies) {
    await analyze(fixture.name, makeBpmFixture(context, fixture), policy, fixture.expected === null || ['silence', 'tone'].includes(fixture.kind) ? null : fixture.bpm, { family: 'edge' });
  }
  const repeatBuffer = makeBpmFixture(context, { bpm: 128 });
  for (let repeat = 0; repeat < 3; repeat++) await analyze('repeat-128', repeatBuffer, policies[1], 128, { family: 'repeat', repeat });
  const bytes = await (await fetch('/demo.mp3')).arrayBuffer();
  const decodeStart = performance.now();
  const decodeContext = new OfflineAudioContext(2, 12000, 12000);
  const demo = await decodeContext.decodeAudioData(bytes);
  const decodeMs = performance.now() - decodeStart;
  for (const policy of policies) {
    for (let repeat = 0; repeat < 3; repeat++) await analyze('real-full', demo, policy, null, { family: 'real', repeat });
    for (const offset of [0, 60, 120, 180, 240]) {
      const start = performance.now();
      let result, error;
      try { result = await guess(demo, offset, Math.min(30, demo.duration - offset), ...(policy.range ? [policy.range] : [])); }
      catch (caught) { error = caught.message; }
      rows.push({ name: `real-window-${offset}`, family: 'real-window', policy: policy.name, offset, result: result ?? null, error: error ?? null, ms: performance.now() - start });
    }
  }
  const steady = rows.filter(row => row.family === 'steady');
  const summary = policies.map(policy => {
    const cases = steady.filter(row => row.policy === policy.name);
    return { policy: policy.name, cases: cases.length, exact: cases.filter(row => row.classification === 'exact').length, half: cases.filter(row => row.classification === 'half').length, double: cases.filter(row => row.classification === 'double').length, wrongOrError: cases.filter(row => ['wrong', 'error'].includes(row.classification)).length, maxMs: Math.max(...cases.map(row => row.ms)) };
  });
  const report = { version: '8.2.39', browser: navigator.userAgent, timestamp: new Date().toISOString(), realSong: { duration: demo.duration, sampleRate: demo.sampleRate, channels: demo.numberOfChannels, decodeMs, groundTruthBpm: null }, summary, rows };
  window.bpmValidationReport = report;
  document.querySelector('p').textContent = JSON.stringify(summary);
  return report;
}
