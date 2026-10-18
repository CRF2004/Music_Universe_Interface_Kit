import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {classifyTempo} from './bpm-validation-fixtures.mjs';
const root=path.resolve('output/tool-pilots/percival-bpm-2026-10-05');
const prior=path.resolve('output/tool-pilots/annotated-bpm-2026-10-05');
const evidence={tool:'Essentia.js PercivalBpmEstimator',version:'0.1.3',thresholdPercent:2,gateExactPercent:90};
for(const corpus of ['fsld','artbeat']){
  const manifest=JSON.parse(await readFile(path.join(prior,corpus==='fsld'?'manifest.json':'artbeat-manifest.json'),'utf8'));
  const reports=await Promise.all(['chrome','edge'].map(async browser=>JSON.parse(await readFile(path.join(root,`${corpus}-${browser}.json`),'utf8'))));
  for(const report of reports){
    assert.equal(report.version,'0.1.3');assert.equal(report.sampleRate,44100);assert.equal(report.corpus,corpus);
    assert.equal(report.rows.length,corpus==='fsld'?200:92);assert.deepEqual(report.pageErrors,[]);
    assert.equal(new Set(report.rows.map(row=>`${row.id}:${row.side}:${row.policy}`)).size,report.rows.length);
    for(const row of report.rows){const sample=manifest.samples.find(sample=>sample.id===row.id);assert.ok(sample);const expected=corpus==='fsld'?sample.bpm:row.side==='full'?null:sample.windows.find(window=>window.side===row.side).expected;assert.equal(row.expected,expected);if(expected)assert.equal(row.classification,classifyTempo(row.tempo??undefined,expected).classification);}
  }
  const stable=report=>report.rows.map(({id,side,policy,expected,tempo,error,classification})=>({id,side,policy,expected,tempo,error,classification}));
  assert.deepEqual(stable(reports[0]),stable(reports[1]));
  const original=JSON.parse(await readFile(path.join(prior,corpus==='fsld'?'chrome-report.json':'artbeat-chrome-report.json'),'utf8'));
  const original44100=corpus==='fsld'?JSON.parse(await readFile(path.join(prior,'chrome-44100-report.json'),'utf8')):null;
  const subset=rows=>['single','multiple'].map(name=>{const matching=rows.filter(row=>{const sample=manifest.samples.find(sample=>sample.id===row.id);return name==='single'?sample.labels.length===1:sample.labels.length>1;});return {name,count:matching.length,exact:matching.filter(row=>row.classification==='exact').length,exact4:matching.filter(row=>row.errorPercent!==null&&row.errorPercent<=4).length};});
  evidence[corpus]={browsersAgree:true,previous12000:original.summary,previous44100:original44100?.summary??null,browsers:reports.map(report=>({browser:report.browser,summary:report.summary,maxDecodeMs:Math.max(...report.rows.map(row=>row.decodeMs)),fullErrors:report.rows.filter(row=>row.side==='full'&&row.error).length})),...(corpus==='fsld'?{subsets:reports[0].summary.map(policy=>({policy:policy.policy,subsets:subset(reports[0].rows.filter(row=>row.policy===policy.policy))})),buckets:['under90','90to119','120to149','150plus'].map(bucket=>({bucket,policies:reports[0].summary.map(policy=>{const rows=reports[0].rows.filter(row=>row.bucket===bucket&&row.policy===policy.policy);return {policy:policy.policy,count:rows.length,exact:rows.filter(row=>row.classification==='exact').length};})}))}:{})};
}
evidence.payload=JSON.parse(await readFile(path.join(root,'payload.json'),'utf8'));
evidence.passed=evidence.fsld.browsers.every(browser=>browser.summary.every(policy=>policy.exact>=90&&policy.maxMs<=2000));
await writeFile(path.join(root,'decision.json'),JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence,null,2));
