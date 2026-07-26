import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compileNormalizedMusicTimeline } from '../musicTimeline';
import { defaultNormalizedMusicTimeline } from './defaultMusicTimeline';
import { replayMusicTimeline } from './musicExperienceRuntime';
import { isCameraMode } from './runtimeCamera';

describe('music timeline runtime', () => {
  const cues = compileNormalizedMusicTimeline(defaultNormalizedMusicTimeline, 100);

  it('compiles normalized positions against the real duration', () => {
    assert.deepEqual(cues.map((cue) => cue.atSeconds), [0, 16, 34, 52, 68, 84, 96]);
  });

  it('reconstructs state deterministically when seeking backward', () => {
    const late = replayMusicTimeline(cues, 90);
    assert.equal(late.portals.departure, true);
    assert.equal(late.landmarks['memory-tree'], true);
    assert.equal(late.landmarks['light-path'], true);

    const early = replayMusicTimeline(cues, 20);
    assert.equal(early.portals.departure, undefined);
    assert.equal(early.landmarks['memory-tree'], undefined);
    assert.equal(early.landmarks['light-path'], undefined);
    assert.equal(early.narration, 'Distant notes gather into constellations.');
  });

  it('reconstructs hidden portal and landmark states after replay', () => {
    const changedCues = [
      {
        atSeconds: 10,
        id: 'open',
        label: 'Open',
        actions: [
          { type: 'set-portal' as const, payload: { id: 'departure', open: true } },
          { type: 'set-landmark' as const, payload: { id: 'memory-tree', visible: true } },
        ],
      },
      {
        atSeconds: 20,
        id: 'close',
        label: 'Close',
        actions: [
          { type: 'set-portal' as const, payload: { id: 'departure', open: false } },
          { type: 'set-landmark' as const, payload: { id: 'memory-tree', visible: false } },
        ],
      },
    ];

    assert.deepEqual(replayMusicTimeline(changedCues, 25).portals, { departure: false });
    assert.deepEqual(replayMusicTimeline(changedCues, 25).landmarks, { 'memory-tree': false });
    assert.deepEqual(replayMusicTimeline(changedCues, 5).portals, {});
    assert.deepEqual(replayMusicTimeline(changedCues, 5).landmarks, {});
  });

  it('returns a clean state before metadata is available', () => {
    assert.deepEqual(replayMusicTimeline([], 30), {
      environment: {},
      portals: {},
      landmarks: {},
    });
  });

  it('accepts only supported camera modes', () => {
    assert.equal(isCameraMode('cinematic'), true);
    assert.equal(isCameraMode('ui-safe'), true);
    assert.equal(isCameraMode('orbit'), false);
    assert.equal(isCameraMode(undefined), false);
  });
});
