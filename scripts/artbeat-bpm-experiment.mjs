import { guess } from '/detector.js';
import { classifyTempo } from '/fixtures.js';

export async function runExperiment() {
  const manifest = await (await fetch('/artbeat-manifest.json')).json();
  const context = new OfflineAudioContext(2, 12000, 12000);
  const rows = [];
  const policies = [{name:'default-90-180'}, {name:'wide-50-220', range:{minTempo:50,maxTempo:220}}];
  for (const sample of manifest.samples) {
    const buffer = await context.decodeAudioData(await (await fetch(`/artbeat/${sample.id}`)).arrayBuffer());
    for (const window of [{side:'full', offset:0, duration:buffer.duration}, ...sample.windows]) for (const policy of policies) {
      let result, error, timer;
      const start = performance.now();
      try {
        result = await Promise.race([
          guess(buffer, window.offset, window.duration, ...(policy.range ? [policy.range] : [])),
          new Promise((resolve,reject) => {timer=setTimeout(()=>reject(new Error('15-second job timeout')),15000);}),
        ]);
      } catch (caught) { error = caught.message; }
      finally { clearTimeout(timer); }
      rows.push({id:sample.id,side:window.side,policy:policy.name,expected:window.expected ?? null,result:result ?? null,error:error ?? null,ms:performance.now()-start,...(window.expected ? classifyTempo(result?.tempo,window.expected) : {})});
    }
    document.querySelector('p').textContent = `ARTBeaT completed ${sample.id}`;
  }
  const summary = policies.map(policy=>{const cases=rows.filter(row=>row.policy===policy.name && row.expected);return {policy:policy.name,count:cases.length,...Object.fromEntries(['exact','half','double','wrong','error'].map(key=>[key,cases.filter(row=>row.classification===key).length]))};});
  return {version:'8.2.39',browser:navigator.userAgent,summary,rows};
}
