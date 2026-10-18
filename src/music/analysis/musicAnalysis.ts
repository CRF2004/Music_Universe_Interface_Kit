export interface MusicSection { id: string; label: string; start: number }
export interface MusicAnalysis {
  version: 1;
  method: 'local-peak-rms-v1';
  durationSeconds: number;
  peaks: number[];
  rmsDb: number[];
  sections: MusicSection[];
}

export function analyzeSamples(channels: Float32Array[], sampleRate: number): MusicAnalysis {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || channels.length < 1 || channels.length > 2 || !channels[0].length || channels.some(c => c.length !== channels[0].length)) throw new Error('Invalid audio samples.');
  const length = channels[0].length;
  const durationSeconds = length / sampleRate;
  if (durationSeconds > 600) throw new Error('Analysis supports songs up to 10 minutes.');
  const count = Math.min(length, 512, Math.max(1, Math.ceil(durationSeconds * 2)));
  const peaks: number[] = [];
  const rmsDb: number[] = [];
  for (let bin = 0; bin < count; bin++) {
    const start = Math.floor(bin * length / count);
    const end = Math.floor((bin + 1) * length / count);
    let peak = 0, energy = 0;
    for (const channel of channels) for (let i = start; i < end; i++) {
      const value = channel[i];
      if (!Number.isFinite(value)) throw new Error('Audio contains nonfinite samples.');
      peak = Math.max(peak, Math.abs(value));
      energy += value * value;
    }
    peaks.push(Math.min(1, peak));
    rmsDb.push(Math.max(-96, Math.min(0, 10 * Math.log10(Math.max(1e-10, energy / ((end - start) * channels.length))))));
  }
  const mean = (from: number, to: number) => rmsDb.slice(from, to).reduce((sum, n) => sum + n, 0) / (to - from);
  const window = Math.max(1, Math.round(2 * count / durationSeconds));
  const candidates: { start: number; score: number }[] = [];
  for (let i = window; i < count - window; i++) {
    const score = Math.abs(mean(i - window, i) - mean(i, i + window));
    if (score >= 5) candidates.push({ start: i / count, score });
  }
  const starts = [0];
  for (const candidate of candidates.sort((a, b) => b.score - a.score || a.start - b.start)) {
    if (starts.length >= 12) break;
    if ((1 - candidate.start) * durationSeconds >= 8 && starts.every(start => Math.abs(start - candidate.start) * durationSeconds >= 8)) starts.push(candidate.start);
  }
  starts.sort((a, b) => a - b);
  return { version: 1, method: 'local-peak-rms-v1', durationSeconds, peaks, rmsDb, sections: starts.map((start, i) => ({ id: `section-${i + 1}`, label: `Section ${i + 1}`, start })) };
}

export function analysisIssues(value: unknown, expectedDuration?: number): string[] {
  const issues: string[] = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['must be an analysis object'];
  const record: Record<string, unknown> = Object.fromEntries(Object.entries(value));
  if (Object.keys(record).some(k => !['version', 'method', 'durationSeconds', 'peaks', 'rmsDb', 'sections'].includes(k))) issues.push('contains unsupported fields');
  if (record.version !== 1 || record.method !== 'local-peak-rms-v1') issues.push('has an unsupported method/version');
  const duration = record.durationSeconds;
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0 || duration > 600 || (expectedDuration !== undefined && Math.abs(duration - expectedDuration) > .25)) issues.push('duration must match the song and be within 10 minutes');
  for (const [key, min, max] of [['peaks', 0, 1], ['rmsDb', -96, 0]] as const) {
    const data = record[key];
    if (!Array.isArray(data) || data.length < 1 || data.length > 512 || data.some(n => typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max)) issues.push(`${key} must contain 1–512 bounded finite numbers`);
  }
  if (Array.isArray(record.peaks) && Array.isArray(record.rmsDb) && record.peaks.length !== record.rmsDb.length) issues.push('summary arrays must have equal lengths');
  const sections = record.sections;
  if (!Array.isArray(sections) || !sections.length || sections.length > 32) issues.push('must contain 1–32 sections');
  else {
    let previous = -1;
    const ids = new Set<string>();
    for (const [i, section] of sections.entries()) {
      if (!section || typeof section !== 'object' || Array.isArray(section)) { issues.push('invalid section'); continue; }
      const s: Record<string, unknown> = Object.fromEntries(Object.entries(section));
      if (Object.keys(s).some(k => !['id', 'label', 'start'].includes(k)) || typeof s.id !== 'string' || !s.id.trim() || ids.has(s.id) || typeof s.label !== 'string' || !s.label.trim() || s.label.length > 100 || typeof s.start !== 'number' || !Number.isFinite(s.start) || s.start <= previous || s.start < 0 || s.start >= 1 || (i === 0 && s.start !== 0)) issues.push('sections require unique IDs, labels, and increasing starts beginning at zero');
      if (typeof s.id === 'string') ids.add(s.id);
      if (typeof s.start === 'number') previous = s.start;
    }
  }
  return issues;
}
