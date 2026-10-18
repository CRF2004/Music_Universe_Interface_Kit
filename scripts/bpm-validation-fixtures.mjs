// Original deterministic synthetic PCM for the isolated BPM tool spike.
export function makeBpmFixture(context, { bpm = 120, sampleRate = 12000, duration = 30, offset = .25, kind = 'kick' }) {
  const audio = context.createBuffer(1, Math.round(sampleRate * duration), sampleRate);
  const data = audio.getChannelData(0);
  let seed = 1729;
  const noise = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2147483648 - 1; };
  if (kind === 'silence') return audio;
  if (kind === 'tone') {
    for (let i = 0; i < data.length; i++) data[i] = .25 * Math.sin(2 * Math.PI * 440 * i / sampleRate);
    return audio;
  }
  if (kind === 'mixed') for (let i = 0; i < data.length; i++) data[i] = .12 * Math.sin(2 * Math.PI * 330 * i / sampleRate);
  let beat = 0;
  for (let time = offset; time < duration;) {
    const start = Math.round(time * sampleRate);
    const accent = kind === 'accent' && beat % 2 ? .35 : .8;
    for (let n = 0; n < sampleRate * .12 && start + n < data.length; n++) {
      const t = n / sampleRate;
      data[start + n] += accent * Math.exp(-t * 35) * Math.sin(2 * Math.PI * 65 * t);
    }
    if (kind === 'syncopated' || kind === 'mixed') {
      // Quiet off-beat hats: known quarter-note reference remains bpm.
      const hat = Math.round((time + 30 / bpm) * sampleRate);
      for (let n = 0; n < sampleRate * .025 && hat + n < data.length; n++) data[hat + n] += .16 * noise() * Math.exp(-n / sampleRate * 180);
    }
    beat++;
    time += 60 / (kind === 'variable' && time >= duration / 2 ? 150 : bpm);
  }
  return audio;
}

export function classifyTempo(actual, expected) {
  if (!Number.isFinite(actual)) return { classification: 'error', errorPercent: null };
  const errorPercent = Math.abs(actual - expected) / expected * 100;
  if (errorPercent <= 2) return { classification: 'exact', errorPercent };
  if (Math.abs(actual / expected - .5) <= .01) return { classification: 'half', errorPercent };
  if (Math.abs(actual / expected - 2) <= .04) return { classification: 'double', errorPercent };
  return { classification: 'wrong', errorPercent };
}
