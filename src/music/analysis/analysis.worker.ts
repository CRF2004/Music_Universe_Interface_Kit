import { analyzeSamples } from './musicAnalysis';
self.onmessage = (event: MessageEvent<{ channels: Float32Array[]; sampleRate: number }>) => {
  try { self.postMessage({ result: analyzeSamples(event.data.channels, event.data.sampleRate) }); }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'Analysis failed.' }); }
};
