import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { appendTempoTap, estimateTapBpm, nearestBeatSeconds, tempoIssues } from './musicTempo';

describe('creator-confirmed tempo', () => {
  it('estimates even tapping and rejects insufficient, uneven and invalid taps', () => {
    assert.equal(estimateTapBpm([0, 500, 1000, 1500]), 120);
    assert.equal(estimateTapBpm([0, 250, 500, 750]), 240);
    assert.equal(estimateTapBpm([0, 2000, 4000, 6000]), 30);
    assert.equal(estimateTapBpm([0, 500, 1000]), null);
    for (const taps of [[0, 500, 600, 1500], [0, 0, 0, 0], [0, 500, NaN, 1500], [1500, 1000, 500, 0]]) assert.equal(estimateTapBpm(taps), null);
    let taps: number[] = [];
    for (let i = 0; i < 20; i++) taps = appendTempoTap(taps, i * 500);
    assert.equal(taps.length, 9);
    assert.equal(estimateTapBpm(taps), 120);
    assert.deepEqual(appendTempoTap(taps, 12000), [12000]);
    assert.deepEqual(appendTempoTap([500], 500), [500]);
  });

  it('snaps deterministically within song boundaries with a first-beat offset', () => {
    const tempo = { bpm: 120, offsetSeconds: .2, source: 'manual' as const };
    assert.equal(nearestBeatSeconds(10.1, 60, tempo), 10.2);
    assert.equal(nearestBeatSeconds(0, 60, tempo), .2);
    assert.equal(nearestBeatSeconds(60, 60, tempo), 59.7);
    assert.equal(nearestBeatSeconds(60, 60, { ...tempo, offsetSeconds: 0 }), 60);
    assert.equal(nearestBeatSeconds(.45, 60, tempo), .7);
    assert.equal(nearestBeatSeconds(10, 60, { ...tempo, bpm: 0 }), null);
    assert.equal(nearestBeatSeconds(NaN, 60, tempo), null);
  });

  it('validates finite bounded tempo, provenance, known duration and exact fields', () => {
    const tempo = { bpm: 120, offsetSeconds: 0, source: 'tap' };
    assert.deepEqual(tempoIssues(tempo, 60), []);
    for (const value of [null, { ...tempo, bpm: Infinity }, { ...tempo, bpm: 29 }, { ...tempo, bpm: 301 }, { ...tempo, offsetSeconds: -1 }, { ...tempo, offsetSeconds: 60 }, { ...tempo, source: 'ai' }, { ...tempo, extra: true }]) assert.ok(tempoIssues(value, 60).length);
    assert.ok(tempoIssues(tempo).length);
  });
});
