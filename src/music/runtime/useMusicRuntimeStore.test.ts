import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { useMusicRuntimeStore } from './useMusicRuntimeStore';

describe('music runtime store', () => {
  it('clears optional state when replacing the runtime snapshot', () => {
    const { setRuntime } = useMusicRuntimeStore.getState();

    setRuntime({
      environment: { skyColor: '#000000' },
      cameraMode: 'cinematic',
      narration: 'Old narration',
      portals: { departure: true },
      landmarks: { 'memory-tree': true },
    });

    setRuntime({
      environment: {},
      portals: {},
      landmarks: {},
    });

    const state = useMusicRuntimeStore.getState();
    assert.equal(state.cameraMode, undefined);
    assert.equal(state.narration, undefined);
    assert.deepEqual(state.environment, {});
    assert.deepEqual(state.portals, {});
    assert.deepEqual(state.landmarks, {});
  });
});
