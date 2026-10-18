"""Check complete native evidence and compare to preceding frozen-corpus runs."""
import hashlib, json, math, pathlib, statistics, sys
sys.dont_write_bytecode = True
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from importlib.util import spec_from_file_location, module_from_spec
spec=spec_from_file_location('beat_evaluation',pathlib.Path(__file__).with_name('evaluate-beat-this.py'))
evaluation=module_from_spec(spec)
spec.loader.exec_module(evaluation)

root=evaluation.ROOT
data=evaluation.DATA
report=json.loads((root/'report.json').read_text())
assert report['model']=='final0' and report['device']=='cpu' and not report['float16'] and not report['dbn']
assert report['modelSha256']==hashlib.sha256((root/'final0.ckpt').read_bytes()).hexdigest()
assert report['repeat']['sameBeats'] and report['repeat']['sameTempo']
assert len(report['rows'])==146
assert len({(row['corpus'],row['id'],row['side']) for row in report['rows']})==146

manifests={corpus:json.loads((data/file).read_text()) for corpus,file in [('fsld','manifest.json'),('artbeat','artbeat-manifest.json')]}
for row in report['rows']:
    sample=next(sample for sample in manifests[row['corpus']]['samples'] if sample['id']==row['id'])
    expected=sample.get('bpm') if row['side']=='full' else next(window['expected'] for window in sample['windows'] if window['side']==row['side'])
    assert row['expected']==expected
    if expected: assert row['classification']==evaluation.classify(row['tempo'],expected)['classification']
    assert row['tempo']==evaluation.reduce_beats(row['beats'])

def score(rows):
    times=sorted(row['ms'] for row in rows)
    return {'count':len(rows),**{key:sum(row['classification']==key for row in rows) for key in ['exact','half','double','wrong','error']},'exact4':sum(row['errorPercent'] is not None and row['errorPercent']<=4 for row in rows),'maxMs':max(times),'medianMs':statistics.median(times),'p95Ms':times[math.ceil(len(times)*.95)-1],'maxJobMs':max(row['jobMs'] for row in rows),'timeouts':sum('timeout' in (row['error'] or '') for row in rows)}

fsld=[row for row in report['rows'] if row['corpus']=='fsld']
artbeat=[row for row in report['rows'] if row['corpus']=='artbeat' and row['expected']]
decision={'fsld':score(fsld),'artbeatWindows':score(artbeat),'repeat':report['repeat'],'initialization':report['initialization'],'modelBytes':report['modelBytes'],'modelSha256':report['modelSha256'],'buckets':[{'bucket':bucket,**score([row for row in fsld if row['bucket']==bucket])} for bucket in ['under90','90to119','120to149','150plus']],'errors':[{'id':row['id'],'corpus':row['corpus'],'side':row['side'],'error':row['error']} for row in report['rows'] if row['error']]}
decision['gatePassed']=decision['fsld']['exact']>=90 and decision['fsld']['maxMs']<=2000
decision['previous']=json.loads(pathlib.Path('output/tool-pilots/percival-bpm-2026-10-05/decision.json').read_text())
training=json.loads((root/'training-tree.json').read_text())
decision['trainingAudit']={'annotationTreeCommit':training['sha'],'topLevelDirectories':[entry['path'] for entry in training['tree'] if entry['type']=='tree' and '/' not in entry['path']],'namedCorpusOverlap':any(any(name in entry['path'].lower() for name in ['fsld','freesound','artbeat']) for entry in training['tree']),'limit':'Named source/path audit only; audio fingerprint-level overlap and training rights not established.'}
decision['installedBytes']=sum(file.stat().st_size for file in (root/'deps').rglob('*') if file.is_file())
(root/'decision.json').write_text(json.dumps(decision,indent=2))
print(json.dumps({key:value for key,value in decision.items() if key!='previous'},indent=2))
