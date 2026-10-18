"""Prepare local ARTBeaT diagnostics from the original downloaded ZIP."""
import hashlib, json, pathlib, statistics, zipfile, io, wave

ROOT = pathlib.Path('output/tool-pilots/annotated-bpm-2026-10-05')
SOURCE = 'https://audiolabs-erlangen.de/resources/MIR/2024-ARTBeaT'
archive_path = ROOT / 'ARTBeaT_Dataset.zip'
samples = []
with zipfile.ZipFile(archive_path) as archive:
    if archive.testzip(): raise RuntimeError('Archive CRC mismatch')
    license_text = archive.read('ARTBeaT_Dataset/LICENSE').decode('utf8')
    if 'Rico Rosenbusch' not in license_text or 'CC BY 4.0' not in license_text: raise RuntimeError('Unexpected license')
    for name in sorted(archive.namelist()):
        if not name.startswith('ARTBeaT_Dataset/Audio/') or not name.endswith('.wav'): continue
        file = pathlib.PurePosixPath(name).name
        sound_id = file[:2]
        # Piano performance provenance needs a separate review.
        if sound_id == '18': continue
        data = archive.read(name)
        output = ROOT / 'artbeat-audio' / file
        output.parent.mkdir(exist_ok=True)
        output.write_bytes(data)
        with wave.open(io.BytesIO(data)) as audio: duration = audio.getnframes() / audio.getframerate()
        csv_name = 'ARTBeaT_Dataset/Annotations/gt_csv/' + file[:-4] + '_gt.csv'
        csv_data = archive.read(csv_name)
        times = [float(line) for line in csv_data.decode('utf8').splitlines() if line.strip()]
        if any(b <= a for a,b in zip(times,times[1:])): raise RuntimeError('Reference timestamps must increase')
        windows = []
        if 5 <= int(sound_id) <= 15:
            for side, start in [('first',0),('last',duration * .75)]:
                end = start + duration * .25
                beats = [value for value in times if start <= value <= end]
                if len(beats) < 3: raise RuntimeError(f'Insufficient reference beats: {sound_id}')
                bpm = 60 / statistics.median([b-a for a,b in zip(beats,beats[1:])])
                windows.append({'side':side,'offset':start,'duration':end-start,'expected':bpm,'beats':len(beats)})
        samples.append({'id':sound_id,'file':file,'duration':duration,'sha256':hashlib.sha256(data).hexdigest(),'referenceSha256':hashlib.sha256(csv_data).hexdigest(),'windows':windows})
manifest = {'source':SOURCE,'author':'Rico Rosenbusch','license':'https://creativecommons.org/licenses/by/4.0/','archiveSha256':hashlib.sha256(archive_path.read_bytes()).hexdigest(),'excluded':['18: piano performance provenance review'],'reference':'Supplied gt_csv beat times; first/last quarter median intervals on abrupt-change cases 05–15 only. Whole clips have no global truth BPM.','samples':samples}
(ROOT/'artbeat-manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps({'clips':len(samples),'windows':sum(len(row['windows']) for row in samples),'archiveSha256':manifest['archiveSha256']}))
