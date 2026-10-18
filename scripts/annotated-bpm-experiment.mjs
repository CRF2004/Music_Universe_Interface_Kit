import { guess } from '/detector.js';
import { classifyTempo } from '/fixtures.js';

export async function runExperiment(sampleRate = 12000) {
  const manifest = await (await fetch('/manifest.json')).json();
  const context = new OfflineAudioContext(2, sampleRate, sampleRate);
  const rows = [];
  const policies = [{ name: 'default-90-180' }, { name: 'wide-50-220', range: { minTempo: 50, maxTempo: 220 } }];
  for (const sample of manifest.samples) {
    let buffer, decodeError;
    const start = performance.now();
    try { buffer = await context.decodeAudioData(await (await fetch(`/audio/${sample.id}`)).arrayBuffer()); }
    catch (caught) { decodeError = caught.message; }
    const decodeMs = performance.now() - start;
    for (const policy of policies) {
      let result, error = decodeError, timer;
      const algorithmStart = performance.now();
      if (buffer) {
        try {
          result = await Promise.race([
            guess(buffer, ...(policy.range ? [policy.range] : [])),
            new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error('15-second job timeout')), 15000); }),
          ]);
        } catch (caught) { error = caught.message; }
        finally { clearTimeout(timer); }
      }
      rows.push({ id: sample.id, expected: sample.bpm, bucket: sample.bucket, policy: policy.name, result: result ?? null, error: error ?? null, ...classifyTempo(result?.tempo, sample.bpm), duration: buffer?.duration ?? null, decodeMs, ms: performance.now() - algorithmStart });
    }
    document.querySelector('p').textContent = `Completed ${rows.length / 2}/${manifest.samples.length}`;
  }
  const summary = policies.map(policy => {
    const cases = rows.filter(row => row.policy === policy.name);
    return { policy: policy.name, count: cases.length, ...Object.fromEntries(['exact', 'half', 'double', 'wrong', 'error'].map(key => [key, cases.filter(row => row.classification === key).length])), maxMs: Math.max(...cases.map(row => row.ms)) };
  });
  const report = { version: '8.2.39', sampleRate, browser: navigator.userAgent, timestamp: new Date().toISOString(), summary, rows };
  window.bpmValidationReport = report;
  return report;
}
