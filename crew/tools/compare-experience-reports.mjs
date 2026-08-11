import { readFile } from 'node:fs/promises';

const [baselinePath, candidatePath] = process.argv.slice(2);
if (!baselinePath || !candidatePath) {
  throw new Error('Usage: node crew/tools/compare-experience-reports.mjs <baseline.json> <candidate.json>');
}
const load = async (file) => JSON.parse(await readFile(file, 'utf8'));
const [baseline, candidate] = await Promise.all([load(baselinePath), load(candidatePath)]);
const metrics = ['firstObjectiveSeconds', 'frictionCount', 'misactionCount', 'backtrackCount'];
const comparison = Object.fromEntries(
  metrics.map((metric) => [metric, {
    baseline: baseline.outcome[metric],
    candidate: candidate.outcome[metric],
    delta:
      typeof baseline.outcome[metric] === 'number' && typeof candidate.outcome[metric] === 'number'
        ? candidate.outcome[metric] - baseline.outcome[metric]
        : null,
  }]),
);
comparison.completed = { baseline: baseline.outcome.completed, candidate: candidate.outcome.completed };
comparison.replayDiscovered = {
  baseline: baseline.outcome.replayDiscovered,
  candidate: candidate.outcome.replayDiscovered,
};
comparison.findingsBySeverity = {
  baseline: countSeverity(baseline.findings),
  candidate: countSeverity(candidate.findings),
};

process.stdout.write(`${JSON.stringify(comparison, null, 2)}\n`);

function countSeverity(findings) {
  return findings.reduce((counts, finding) => {
    counts[finding.severity] = (counts[finding.severity] ?? 0) + 1;
    return counts;
  }, {});
}

