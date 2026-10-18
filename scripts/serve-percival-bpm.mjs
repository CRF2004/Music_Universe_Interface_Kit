import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import path from 'node:path';
const corpusRoot=path.resolve('output/tool-pilots/annotated-bpm-2026-10-05');
const toolRoot=path.resolve('output/tool-pilots/percival-bpm-2026-10-05');
const packageRoot=path.join(toolRoot,'node_modules/essentia.js');
const metadata=JSON.parse(await readFile(path.join(packageRoot,'package.json'),'utf8'));
if(metadata.version!=='0.1.3')throw new Error('Pinned version required');
const routes=new Map([
  ['/fixtures.js',[path.resolve('scripts/bpm-validation-fixtures.mjs'),'text/javascript']],
  ['/worker.js',[path.resolve('scripts/percival-bpm-worker.js'),'text/javascript']],
  ['/experiment.js',[path.resolve('scripts/percival-bpm-experiment.mjs'),'text/javascript']],
]);
const payload=[];
for(const file of ['essentia-wasm.umd.js','essentia.js-core.umd.min.js']){
  const target=path.join(packageRoot,'dist',file),bytes=await readFile(target);
  routes.set('/'+file,[target,file.endsWith('.wasm')?'application/wasm':'text/javascript']);
  payload.push({file,bytes:bytes.length,gzipBytes:gzipSync(bytes).length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
await writeFile(path.join(toolRoot,'payload.json'),JSON.stringify({version:metadata.version,license:metadata.license,payload},null,2));
for(const [name,prefix,folder] of [['manifest.json','audio','audio'],['artbeat-manifest.json','artbeat','artbeat-audio']]){
  const target=path.join(corpusRoot,name),manifest=JSON.parse(await readFile(target,'utf8'));
  routes.set('/'+name,[target,'application/json']);
  for(const row of manifest.samples){const file=path.join(corpusRoot,folder,row.file);if(createHash('sha256').update(await readFile(file)).digest('hex')!==row.sha256)throw new Error('Frozen audio hash mismatch');routes.set(`/${prefix}/${row.id}`,[file,'audio/wav']);}
}
createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');const url=new URL(req.url,'http://127.0.0.1:4183');
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Percival BPM comparison</title><h1>Percival BPM comparison</h1><p>Ready</p><script type="module">import {runExperiment} from "/experiment.js";window.runExperiment=runExperiment;</script>');return;}
  if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
  const route=routes.get(url.pathname);if(!route){res.writeHead(404);res.end();return;}
  try{res.setHeader('Content-Type',route[1]);res.end(await readFile(route[0]));}catch{res.writeHead(500);res.end('Evaluation source unavailable');}
}).listen(4183,'127.0.0.1',()=>console.log('Percival local evaluation http://127.0.0.1:4183'));
