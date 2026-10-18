import { classifyTempo } from '/fixtures.js';

export async function runExperiment() {
  const corpus = new URL(location.href).searchParams.get('corpus') || 'fsld';
  const manifest = await (await fetch(corpus === 'artbeat' ? '/artbeat-manifest.json' : '/manifest.json')).json();
  const context = new OfflineAudioContext(2,44100,44100);
  let worker = new Worker('/worker.js');
  const rows = [];
  const analyze = (signal,maxBPM) => new Promise(resolve => {
    const timer = setTimeout(()=>{worker.terminate();worker=new Worker('/worker.js');resolve({error:'15-second worker timeout',ms:15000});},15000);
    worker.onmessage = ({data})=>{clearTimeout(timer);resolve(data);};
    worker.onerror = event=>{clearTimeout(timer);worker.terminate();worker=new Worker('/worker.js');resolve({error:event.message,ms:null});};
    worker.postMessage({signal,maxBPM});
  });
  const policies = [{name:'default-50-210',maxBPM:210},{name:'wide-50-300',maxBPM:300}];
  for (const sample of manifest.samples) {
    let buffer,decodeError;
    const decodeStart = performance.now();
    try { buffer=await context.decodeAudioData(await (await fetch(`/${corpus==='artbeat'?'artbeat':'audio'}/${sample.id}`)).arrayBuffer()); }
    catch(error){decodeError=error.message;}
    const decodeMs=performance.now()-decodeStart;
    const windows=corpus==='artbeat'?[{side:'full',offset:0,duration:buffer?.duration},...sample.windows]:[{side:'full',offset:0,duration:buffer?.duration,expected:sample.bpm}];
    for(const window of windows) {
      let signal;
      if(buffer){
        const from=Math.round(window.offset*44100),to=Math.min(buffer.length,Math.round((window.offset+window.duration)*44100));
        signal=new Float32Array(to-from);
        for(let channel=0;channel<buffer.numberOfChannels;channel++){const data=buffer.getChannelData(channel);for(let i=0;i<signal.length;i++)signal[i]+=data[from+i]/buffer.numberOfChannels;}
      }
      for(const policy of policies){
        const answer=signal?await analyze(signal,policy.maxBPM):{error:decodeError,ms:null};
        const tempo=answer.result?.bpm;
        const valid=Number.isFinite(tempo)&&tempo>0;
        rows.push({id:sample.id,side:window.side,bucket:sample.bucket??null,policy:policy.name,expected:window.expected??null,tempo:valid?tempo:null,error:answer.error??(valid?null:'No valid positive BPM'),ms:answer.ms,decodeMs,duration:window.duration??null,...(window.expected?classifyTempo(valid?tempo:undefined,window.expected):{})});
      }
    }
    document.querySelector('p').textContent=`${corpus}: ${sample.id}, ${rows.length} cases`;
  }
  worker.terminate();
  const summary=policies.map(policy=>{const cases=rows.filter(row=>row.policy===policy.name&&row.expected);return {policy:policy.name,count:cases.length,...Object.fromEntries(['exact','half','double','wrong','error'].map(key=>[key,cases.filter(row=>row.classification===key).length])),exact4:cases.filter(row=>row.errorPercent!==null&&row.errorPercent<=4).length,maxMs:Math.max(...cases.map(row=>row.ms??0))};});
  return {tool:'Essentia.js PercivalBpmEstimator',version:'0.1.3',sampleRate:44100,corpus,browser:navigator.userAgent,summary,rows};
}
