import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const reportPath = process.argv[2];
if (!reportPath) throw new Error('Usage: node crew/tools/validate-experience-report.mjs <report.json>');

const report = JSON.parse(await readFile(reportPath, 'utf8'));
const required = ['schemaVersion', 'scenarioId', 'commit', 'environment', 'limits', 'outcome', 'actions', 'findings', 'evidence'];
for (const key of required) {
  if (!(key in report)) throw new Error(`Report is missing "${key}".`);
}
if (report.schemaVersion !== 1) throw new Error('Unsupported report schema version.');
if (!Array.isArray(report.actions) || !Array.isArray(report.findings) || !Array.isArray(report.evidence)) {
  throw new Error('Actions, findings, and evidence must be arrays.');
}

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const evidence = new Set(report.evidence);
for (const finding of report.findings) {
  if (!['observation', 'inference', 'recommendation'].includes(finding.kind)) {
    throw new Error(`Unknown finding kind: ${finding.kind}`);
  }
  if (!['blocked', 'severe', 'moderate', 'minor'].includes(finding.severity)) {
    throw new Error(`Unknown finding severity: ${finding.severity}`);
  }
  for (const item of finding.evidence ?? []) evidence.add(item);
}
for (const item of evidence) {
  const resolved = path.resolve(repositoryRoot, item);
  if (!resolved.startsWith(`${repositoryRoot}${path.sep}`)) {
    throw new Error(`Evidence escapes the repository: ${item}`);
  }
  await access(resolved);
}

process.stdout.write(`Valid experience report: ${reportPath}\n`);
