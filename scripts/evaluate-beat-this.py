"""Isolated native inference on frozen BPM evaluation audio. No product imports."""
import hashlib, importlib.metadata, json, math, multiprocessing, pathlib, platform, statistics, sys, time

ROOT = pathlib.Path('output/tool-pilots/beat-this-2026-10-05').resolve()
DATA = pathlib.Path('output/tool-pilots/annotated-bpm-2026-10-05').resolve()
EXPECTED_MODEL_SHA256 = '8c328b45f59d8dd3dff219253ff6a8d6482be57d0133a29140e2febbf8eb8331'

def classify(actual, expected):
    if actual is None or not math.isfinite(actual): return {'classification':'error','errorPercent':None}
    error = abs(actual-expected)/expected*100
    kind = 'exact' if error <= 2 else 'half' if abs(actual/expected-.5)<=.01 else 'double' if abs(actual/expected-2)<=.04 else 'wrong'
    return {'classification':kind,'errorPercent':error}

def reduce_beats(beats):
    intervals = [b-a for a,b in zip(beats,beats[1:]) if .2 <= b-a <= 2]
    return 60/statistics.median(intervals) if intervals else None

def worker(connection):
    sys.path.insert(0,str(ROOT/'deps'))
    try:
        import numpy as np
        import soundfile as sf
        import torch
        from beat_this.inference import Audio2Beats
        torch.set_num_threads(4)
        torch.set_num_interop_threads(1)
        start=time.perf_counter()
        model=Audio2Beats(checkpoint_path=str(ROOT/'final0.ckpt'),device='cpu',float16=False,dbn=False)
        packages={name:importlib.metadata.version(name) for name in ['beat-this','torch','torchaudio','numpy','einops','rotary-embedding-torch','soxr','soundfile']}
        connection.send({'ready':True,'loadMs':(time.perf_counter()-start)*1000,'packages':packages,'threads':4})
    except Exception as error:
        connection.send({'ready':False,'error':repr(error)})
        return
    while True:
        job=connection.recv()
        if job is None: return
        start=time.perf_counter()
        try:
            signal,sr=sf.read(job['path'],dtype='float32',always_2d=True)
            signal=np.mean(signal,axis=1)
            if job.get('window'):
                window=job['window']
                signal=signal[round(window['offset']*sr):round((window['offset']+window['duration'])*sr)]
            decode_ms=(time.perf_counter()-start)*1000
            inference_start=time.perf_counter()
            beats,downbeats=model(signal,sr)
            beats=[float(value) for value in beats]
            downbeats=[float(value) for value in downbeats]
            if any(not math.isfinite(value) for value in beats) or any(b<=a for a,b in zip(beats,beats[1:])): raise RuntimeError('Invalid predicted beat ordering')
            tempo=reduce_beats(beats)
            connection.send({'tempo':tempo,'beats':beats,'downbeats':downbeats,'error':None if tempo else 'No valid consecutive beat interval','decodeMs':decode_ms,'ms':(time.perf_counter()-inference_start)*1000,'duration':len(signal)/sr,'sampleRate':sr})
        except Exception as error:
            connection.send({'tempo':None,'error':repr(error),'beats':[],'downbeats':[],'ms':(time.perf_counter()-start)*1000})

def start_worker():
    parent,child=multiprocessing.Pipe()
    process=multiprocessing.Process(target=worker,args=(child,))
    process.start()
    child.close()
    if not parent.poll(90):
        process.terminate(); process.join()
        raise RuntimeError('Model initialization timeout')
    info=parent.recv()
    if not info['ready']:
        process.join(); raise RuntimeError(info['error'])
    return process,parent,info

def main():
    model=ROOT/'final0.ckpt'
    if hashlib.sha256(model.read_bytes()).hexdigest()!=EXPECTED_MODEL_SHA256: raise RuntimeError('Official checkpoint hash changed')
    jobs=[]
    for corpus,manifest_name,folder in [('fsld','manifest.json','audio'),('artbeat','artbeat-manifest.json','artbeat-audio')]:
        manifest=json.loads((DATA/manifest_name).read_text())
        for sample in manifest['samples']:
            file=DATA/folder/sample['file']
            if hashlib.sha256(file.read_bytes()).hexdigest()!=sample['sha256']: raise RuntimeError(f'Audio hash changed: {sample["id"]}')
            jobs.append({'corpus':corpus,'id':sample['id'],'side':'full','path':str(file),'expected':sample.get('bpm'),'bucket':sample.get('bucket')})
            for window in sample.get('windows',[]): jobs.append({'corpus':corpus,'id':sample['id'],'side':window['side'],'path':str(file),'expected':window['expected'],'window':window})
    process,connection,initialization=start_worker()
    rows=[]
    report={'model':'final0','modelSha256':EXPECTED_MODEL_SHA256,'modelBytes':model.stat().st_size,'device':'cpu','float16':False,'dbn':False,'initialization':initialization,'platform':platform.platform(),'timestamp':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'rows':rows}
    try:
        for index,job in enumerate(jobs):
            connection.send(job)
            start=time.perf_counter()
            if connection.poll(30): answer=connection.recv()
            else:
                process.terminate();process.join();connection.close()
                answer={'tempo':None,'error':'30-second inference job timeout','ms':30000,'beats':[],'downbeats':[]}
                process,connection,_=start_worker()
            row={key:value for key,value in job.items() if key!='path'}
            row.update(answer);row['jobMs']=(time.perf_counter()-start)*1000
            if job['expected']: row.update(classify(answer['tempo'],job['expected']))
            rows.append(row)
            (ROOT/'report.partial.json').write_text(json.dumps(report,indent=2))
            print(f'{index+1}/{len(jobs)} {job["corpus"]} {job["id"]} {job["side"]}: {answer["tempo"]} {answer["error"]}',flush=True)
        connection.send(jobs[0])
        if not connection.poll(30): raise RuntimeError('Repeat check timeout')
        repeat=connection.recv()
        report['repeat']={'id':jobs[0]['id'],'sameBeats':repeat['beats']==rows[0]['beats'],'sameTempo':repeat['tempo']==rows[0]['tempo'],'ms':repeat['ms']}
        (ROOT/'report.json').write_text(json.dumps(report,indent=2))
    finally:
        if process.is_alive(): connection.send(None);process.join(timeout=5)
        if process.is_alive(): process.terminate();process.join()
        connection.close()

if __name__=='__main__':
    multiprocessing.freeze_support()
    main()
