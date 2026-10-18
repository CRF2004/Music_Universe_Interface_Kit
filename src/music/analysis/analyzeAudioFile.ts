import { analysisIssues, type MusicAnalysis } from './musicAnalysis';

export async function analyzeAudioFile(file: File, duration: number, signal: AbortSignal): Promise<MusicAnalysis> {
  if (file.size > 40 * 1024 * 1024 || duration > 600) throw new Error('Local analysis supports songs up to 10 minutes and 40 MiB. Timeline editing remains available.');
  signal.throwIfAborted();
  const context = new AudioContext({ sampleRate: 12000 });
  let worker: Worker | undefined;
  try {
    const buffer = await new Promise<AudioBuffer>((resolve, reject) => {
      const finish = () => { window.clearTimeout(timeout); signal.removeEventListener('abort', cancel); };
      const cancel = () => { finish(); reject(new Error('Analysis canceled.')); };
      const timeout = window.setTimeout(() => { finish(); reject(new Error('Audio decoding timed out. You can retry or edit manually.')); }, 15000);
      signal.addEventListener('abort', cancel, { once: true });
      void file.arrayBuffer().then(bytes => { signal.throwIfAborted(); return context.decodeAudioData(bytes); }).then(buffer => { finish(); resolve(buffer); }, error => { finish(); reject(error); });
    });
    signal.throwIfAborted();
    if (buffer.duration > 600 || buffer.numberOfChannels > 2) throw new Error('Analysis supports mono/stereo songs up to 10 minutes.');
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i).slice());
    worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
    const observed = worker;
    return await new Promise<MusicAnalysis>((resolve, reject) => {
      const finish = (error?: Error, result?: MusicAnalysis) => {
        clearTimeout(timeout);
        signal.removeEventListener('abort', cancel);
        if (error) reject(error); else if (result) resolve(result);
      };
      const cancel = () => finish(new Error('Analysis canceled.'));
      const timeout = window.setTimeout(() => finish(new Error('Analysis timed out. You can retry or edit the timeline manually.')), 15000);
      signal.addEventListener('abort', cancel, { once: true });
      observed.onerror = () => finish(new Error('Local analysis could not start. Try again.'));
      observed.onmessage = (event: MessageEvent<{ result?: MusicAnalysis; error?: string }>) => {
        if (event.data.error) finish(new Error(event.data.error));
        else if (!event.data.result || analysisIssues(event.data.result, duration).length) finish(new Error('The analysis result did not match this song.'));
        else finish(undefined, event.data.result);
      };
      observed.postMessage({ channels, sampleRate: buffer.sampleRate }, channels.map(c => c.buffer));
    });
  } finally { worker?.terminate(); await context.close(); }
}
