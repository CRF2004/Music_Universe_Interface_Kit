import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  defaultExperienceSettings,
  useExperienceSettingsStore,
} from './useExperienceSettingsStore';

describe('experience settings store', () => {
  beforeEach(() => useExperienceSettingsStore.setState(defaultExperienceSettings));

  it('clamps independent music and effects volume', () => {
    const state = useExperienceSettingsStore.getState();
    state.setMusicVolume(2);
    state.setEffectsVolume(-1);

    assert.equal(useExperienceSettingsStore.getState().musicVolume, 1);
    assert.equal(useExperienceSettingsStore.getState().effectsVolume, 0);
  });

  it('mutes channels without discarding their volume and toggles subtitles', () => {
    const state = useExperienceSettingsStore.getState();
    state.setMusicVolume(0.35);
    state.setEffectsVolume(0.45);
    state.toggleMusicMuted();
    state.toggleEffectsMuted();
    state.toggleSubtitles();

    const result = useExperienceSettingsStore.getState();
    assert.equal(result.musicVolume, 0.35);
    assert.equal(result.effectsVolume, 0.45);
    assert.equal(result.musicMuted, true);
    assert.equal(result.effectsMuted, true);
    assert.equal(result.subtitlesEnabled, false);
  });
});
