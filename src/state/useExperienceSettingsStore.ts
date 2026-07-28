import { create } from 'zustand';

export interface ExperienceSettingsSnapshot {
  musicVolume: number;
  effectsVolume: number;
  musicMuted: boolean;
  effectsMuted: boolean;
  subtitlesEnabled: boolean;
}

interface ExperienceSettingsState extends ExperienceSettingsSnapshot {
  hydrate: () => void;
  setMusicVolume: (volume: number) => void;
  setEffectsVolume: (volume: number) => void;
  toggleMusicMuted: () => void;
  toggleEffectsMuted: () => void;
  toggleSubtitles: () => void;
}

const STORAGE_KEY = 'music-universe.experience-settings';

export const defaultExperienceSettings: ExperienceSettingsSnapshot = {
  musicVolume: 0.8,
  effectsVolume: 0.7,
  musicMuted: false,
  effectsMuted: false,
  subtitlesEnabled: true,
};

function clampVolume(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function persist(snapshot: ExperienceSettingsSnapshot) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function settingsFromState(state: ExperienceSettingsState): ExperienceSettingsSnapshot {
  return {
    musicVolume: state.musicVolume,
    effectsVolume: state.effectsVolume,
    musicMuted: state.musicMuted,
    effectsMuted: state.effectsMuted,
    subtitlesEnabled: state.subtitlesEnabled,
  };
}

export const useExperienceSettingsStore = create<ExperienceSettingsState>((set, get) => ({
  ...defaultExperienceSettings,

  hydrate() {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<ExperienceSettingsSnapshot>;
      set({
        musicVolume:
          typeof parsed.musicVolume === 'number'
            ? clampVolume(parsed.musicVolume)
            : defaultExperienceSettings.musicVolume,
        effectsVolume:
          typeof parsed.effectsVolume === 'number'
            ? clampVolume(parsed.effectsVolume)
            : defaultExperienceSettings.effectsVolume,
        musicMuted:
          typeof parsed.musicMuted === 'boolean'
            ? parsed.musicMuted
            : defaultExperienceSettings.musicMuted,
        effectsMuted:
          typeof parsed.effectsMuted === 'boolean'
            ? parsed.effectsMuted
            : defaultExperienceSettings.effectsMuted,
        subtitlesEnabled:
          typeof parsed.subtitlesEnabled === 'boolean'
            ? parsed.subtitlesEnabled
            : defaultExperienceSettings.subtitlesEnabled,
      });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  },

  setMusicVolume(musicVolume) {
    set({ musicVolume: clampVolume(musicVolume) });
    persist(settingsFromState(get()));
  },

  setEffectsVolume(effectsVolume) {
    set({ effectsVolume: clampVolume(effectsVolume) });
    persist(settingsFromState(get()));
  },

  toggleMusicMuted() {
    set((state) => ({ musicMuted: !state.musicMuted }));
    persist(settingsFromState(get()));
  },

  toggleEffectsMuted() {
    set((state) => ({ effectsMuted: !state.effectsMuted }));
    persist(settingsFromState(get()));
  },

  toggleSubtitles() {
    set((state) => ({ subtitlesEnabled: !state.subtitlesEnabled }));
    persist(settingsFromState(get()));
  },
}));
