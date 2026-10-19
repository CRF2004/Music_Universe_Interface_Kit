export interface MusicTempo {
  bpm: number;
  offsetSeconds: number;
  source: 'manual' | 'tap';
}

export function tempoIssues(value: unknown, duration?: number): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['must be a tempo object'];
  const tempo: Record<string, unknown> = Object.fromEntries(Object.entries(value));
  const issues: string[] = [];
  if (Object.keys(tempo).some(key => !['bpm', 'offsetSeconds', 'source'].includes(key))) issues.push('contains unsupported fields');
  if (typeof tempo.bpm !== 'number' || !Number.isFinite(tempo.bpm) || tempo.bpm < 30 || tempo.bpm > 300) issues.push('bpm must be between 30 and 300');
  if (typeof tempo.offsetSeconds !== 'number' || !Number.isFinite(tempo.offsetSeconds) || tempo.offsetSeconds < 0 || duration === undefined || tempo.offsetSeconds >= duration) issues.push('offsetSeconds must be within the known song duration');
  if (tempo.source !== 'manual' && tempo.source !== 'tap') issues.push('source must be manual or tap');
  return issues;
}

// A bounded tap window avoids stale taps and rejects uneven tapping.
export function appendTempoTap(taps: number[], now: number): number[] {
  if (!Number.isFinite(now)) return [];
  const previous = taps.at(-1);
  if (previous === undefined || now <= previous || now - previous > 2000) return [now];
  return [...taps, now].slice(-9);
}

export function estimateTapBpm(taps: number[]): number | null {
  if (taps.length < 4 || taps.length > 9 || taps.some(t => !Number.isFinite(t))) return null;
  const intervals = taps.slice(1).map((t, i) => t - taps[i]);
  const sorted = [...intervals].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  if (median < 200 || median > 2000 || intervals.some(interval => Math.abs(interval - median) > median * .2)) return null;
  return Math.round(60000 / median * 100) / 100;
}

export function nearestBeatSeconds(seconds: number, duration: number, tempo: MusicTempo): number | null {
  if (!Number.isFinite(seconds) || !Number.isFinite(duration) || duration <= 0 || tempoIssues(tempo, duration).length) return null;
  const period = 60 / tempo.bpm;
  const last = Math.max(0, Math.floor((duration - tempo.offsetSeconds) / period + 1e-9));
  const index = Math.max(0, Math.min(last, Math.round((seconds - tempo.offsetSeconds) / period)));
  return Math.min(duration, tempo.offsetSeconds + index * period);
}
