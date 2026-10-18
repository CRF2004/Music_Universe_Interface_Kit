self.exports = {};
let initialized;
const runtimeReady = new Promise(resolve => { initialized = resolve; });
self.Module = {onRuntimeInitialized: () => initialized()};
importScripts('/essentia-wasm.umd.js');
const backend = self.exports.EssentiaWASM;
delete self.exports;
importScripts('/essentia.js-core.umd.min.js');
const ready = runtimeReady.then(() => new Essentia(backend));
self.onmessage = async ({data}) => {
  let vector;
  const start = performance.now();
  try {
    const engine = await ready;
    vector = engine.arrayToVector(data.signal);
    const result = engine.PercivalBpmEstimator(vector, 1024, 2048, 128, 128, data.maxBPM, 50, 44100);
    self.postMessage({result, ms:performance.now()-start});
  } catch (error) { self.postMessage({error:String(error),ms:performance.now()-start}); }
  finally { vector?.delete(); }
};
