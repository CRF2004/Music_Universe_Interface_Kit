import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertMatchingAudio, identifyAudioFile, localTrackRecord } from './projectAudioIdentity';

describe('project song identity', () => {
  it('records actual file identity and duration with unverified private rights', async () => {
    const identity = await identifyAudioFile(new File(['my song'], 'Original.wav', { type: 'audio/wav' }));
    const track = localTrackRecord(identity, 20);
    assert.equal(track.source, 'local-file');
    assert.equal(track.title, 'Original.wav');
    assert.equal(track.expectedDurationSeconds, 20);
    assert.match(track.file?.sha256 ?? '', /^[a-f0-9]{64}$/);
    assert.equal(track.assetId, undefined);
    assert.equal(track.rights.licenseRef, 'LicenseRef-User-Provided-Unverified');
  });
  it('accepts identical renamed content and rejects changed content, size or duration', async () => {
    const original = await identifyAudioFile(new File(['my song'], 'Original.wav'));
    const renamed = await identifyAudioFile(new File(['my song'], 'Renamed.wav'));
    const changed = await identifyAudioFile(new File(['no song'], 'Original.wav'));
    const track = localTrackRecord(original, 20);
    assert.doesNotThrow(() => assertMatchingAudio(track, renamed, 20));
    assert.throws(() => assertMatchingAudio(track, changed, 20), /does not match/);
    assert.throws(() => assertMatchingAudio(track, { ...original, sizeBytes: 99 }, 20), /does not match/);
    assert.throws(() => assertMatchingAudio(track, original, 21), /different duration/);
    assert.throws(() => assertMatchingAudio({ ...track, file: undefined }, original, 20), /older project/);
  });
});
