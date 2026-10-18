"""Fetch original evaluation archives; audio stays in ignored output/."""
import io, json, pathlib, urllib.request, urllib.error, zipfile, hashlib, time, math, statistics, re, sys

ROOT = pathlib.Path('output/tool-pilots/annotated-bpm-2026-10-05')
ROOT.mkdir(parents=True, exist_ok=True)
URL = 'https://zenodo.org/records/3967852/files/FSL10K.zip?download=1'

class RemoteZip(io.RawIOBase):
    def __init__(self):
        self.position = 0
        self.cache = {}
        request = urllib.request.Request(URL, headers={'Range': 'bytes=-65536'})
        with urllib.request.urlopen(request, timeout=60) as response:
            if response.status != 206:
                raise RuntimeError('Source must support selective range downloads')
            self.size = int(response.headers['Content-Range'].split('/')[-1])
            self.tail = response.read()
        self.requests = 1
    def seekable(self): return True
    def tell(self): return self.position
    def seek(self, offset, whence=0):
        self.position = offset if whence == 0 else self.position + offset if whence == 1 else self.size + offset
        return self.position
    def read(self, size=-1):
        end = self.size if size < 0 else min(self.size, self.position + size)
        start = self.position
        self.position = end
        if start >= self.size - len(self.tail):
            return self.tail[start - (self.size - len(self.tail)):end - (self.size - len(self.tail))]
        key = (start, end)
        for (cached_start, cached_end), data in self.cache.items():
            if cached_start <= start and end <= cached_end:
                return data[start-cached_start:end-cached_start]
        if key not in self.cache:
            for attempt in range(4):
                try:
                    request = urllib.request.Request(URL, headers={'Range': f'bytes={start}-{end-1}'})
                    with urllib.request.urlopen(request, timeout=90) as response:
                        if response.status != 206: raise RuntimeError('Range response required')
                        self.cache[key] = response.read()
                    self.requests += 1
                    break
                except urllib.error.HTTPError as error:
                    if error.code != 429 or attempt == 3: raise
                    time.sleep(int(error.headers.get('Retry-After', '60')))
        return self.cache[key]

def fetch(name, url, md5=None):
    target = ROOT / name
    if not target.exists():
        urllib.request.urlretrieve(url, target)
    if md5 and hashlib.md5(target.read_bytes()).hexdigest() != md5:
        raise RuntimeError(f'Archive checksum mismatch: {name}')
    return target

def select_and_download():
    annotations = json.loads((ROOT / 'annotations.json').read_text())
    metadata = json.loads((ROOT / 'metadata.json').read_text())
    grouped = {}
    for name, annotation in annotations.items():
        sound_id = re.search(r'sound-(\d+)\.json$', name).group(1)
        grouped.setdefault(sound_id, []).append({'annotator': name.split('/')[1], **annotation})
    members = json.loads((ROOT / 'audio-members.json').read_text())
    audio = {pathlib.PurePosixPath(item['name']).name.split('_')[0]: item for item in members if item['name'].startswith('audio/') and item['size'] > 0}
    eligible, excluded = [], {}
    for sound_id, labels in grouped.items():
        reason = None
        try: bpms = [float(label['bpm']) for label in labels]
        except (ValueError, KeyError, TypeError): bpms = []
        info = metadata.get(sound_id, {})
        license_url = info.get('license', '')
        if not bpms or any(not math.isfinite(bpm) or bpm <= 0 for bpm in bpms): reason = 'invalid-bpm'
        elif any(label.get('discard') or label.get('save_for_later') or not label.get('defined_tempo') for label in labels): reason = 'uncertain-label'
        elif max(bpms) / min(bpms) > 1.02: reason = 'annotator-disagreement'
        elif not re.match(r'https?://creativecommons.org/(publicdomain/zero/1\.0/|licenses/by/(1\.0|2\.0|2\.5|3\.0|4\.0)/)$', license_url): reason = 'license'
        elif sound_id not in audio: reason = 'missing-audio'
        elif any(label.get('instrumentation', {}).get('vocal') for label in labels): reason = 'vocal-rights-review'
        elif re.search(r'\b(sampled|sampling|remix|copyright|movie|film|radio|youtube|cover|song excerpt)\b', info.get('description', '') + ' ' + info.get('name', ''), re.I): reason = 'provenance-review'
        if reason:
            excluded[reason] = excluded.get(reason, 0) + 1
            continue
        bpm = statistics.median(bpms)
        bucket = 'under90' if bpm < 90 else '90to119' if bpm < 120 else '120to149' if bpm < 150 else '150plus'
        eligible.append({'id': sound_id, 'bpm': bpm, 'bucket': bucket, 'labels': labels, 'metadata': info, 'member': audio[sound_id]['name'], 'source': f'https://freesound.org/people/{info["username"]}/sounds/{sound_id}/', 'license': license_url, 'order': hashlib.sha256(('fsld-v1-' + sound_id).encode()).hexdigest()})
    buckets = {bucket: sorted([row for row in eligible if row['bucket'] == bucket], key=lambda row: row['order']) for bucket in ['under90', '90to119', '120to149', '150plus']}
    selected = []
    while len(selected) < 100 and any(buckets.values()):
        for rows in buckets.values():
            if rows and len(selected) < 100: selected.append(rows.pop(0))
    manifest = {'source': URL, 'selection': 'Expert valid labels, <=2% agreement, CC0/CC BY, vocal/provenance risk exclusions; SHA256 ID order round-robin four tempo buckets', 'eligible': len(eligible), 'excluded': excluded, 'samples': selected}
    target = ROOT / 'manifest.json'
    if target.exists():
        previous = json.loads(target.read_text())
        if [row['id'] for row in previous['samples']] != [row['id'] for row in selected]: raise RuntimeError('Frozen selection changed')
        for row in selected:
            old = next(item for item in previous['samples'] if item['id'] == row['id'])
            if old.get('sha256'): row['sha256'] = old['sha256']
    target.write_text(json.dumps(manifest, indent=2))
    (ROOT / 'audio').mkdir(exist_ok=True)
    remote = RemoteZip()
    with zipfile.ZipFile(remote) as archive:
        for index, row in enumerate(selected):
            output = ROOT / 'audio' / pathlib.PurePosixPath(row['member']).name
            if not output.exists():
                item = archive.getinfo(row['member'])
                remote.seek(item.header_offset)
                remote.read(item.compress_size + 1024)
                output.write_bytes(archive.read(item))
                remote.cache = {}
                time.sleep(0.7)
            row['file'] = output.name
            digest = hashlib.sha256(output.read_bytes()).hexdigest()
            if row.get('sha256') and row['sha256'] != digest: raise RuntimeError(f'Frozen audio changed: {row["id"]}')
            row['sha256'] = digest
            print(f'{index+1}/100 {row["id"]}', flush=True)
    target.write_text(json.dumps(manifest, indent=2))
    print(json.dumps({'eligible': len(eligible), 'selected': len(selected), 'excluded': excluded, 'rangeRequests': remote.requests}))

if __name__ == '__main__':
    if '--select' in sys.argv:
        select_and_download()
        sys.exit()
    annotations = fetch('annotations.zip', 'https://zenodo.org/records/3967852/files/annotations.zip?download=1', '3920ee437802cf047a990b2968fa066c')
    with zipfile.ZipFile(annotations) as archive:
        names = archive.namelist()
        (ROOT / 'annotation-members.json').write_text(json.dumps(names, indent=2))
        examples = {name: json.loads(archive.read(name)) for name in names if name.endswith('.json')}
        (ROOT / 'annotations.json').write_text(json.dumps(examples, indent=2))
    remote = RemoteZip()
    with zipfile.ZipFile(remote) as archive:
        (ROOT / 'audio-members.json').write_text(json.dumps([{'name': item.filename, 'size': item.file_size} for item in archive.infolist()], indent=2))
        metadata = [name for name in archive.namelist() if name == 'metadata.json' or name.endswith('/metadata.json')]
        for name in metadata:
            (ROOT / 'metadata.json').write_bytes(archive.read(name))
    print(json.dumps({'annotations': len(examples), 'metadata': metadata, 'rangeRequests': remote.requests, 'sample': list(examples.items())[:2]}))
