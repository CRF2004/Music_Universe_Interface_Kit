import rawAnalysis from './childhoodAnalysis.json';
import type { MusicWorldProject } from './musicWorldProject';
import { assertMusicWorldProject } from './validateMusicWorldProject';
import type { NormalizedMusicTimelineCue } from '../music/musicTimeline';

export const CHILDHOOD_ASSET_ID = 'scott-buckley-childhood';
export const childhoodCueSeconds = {
  arrival: 0, constellations: 22, 'weather-front': 44, 'memory-tree': 64,
  'light-path': 88.2, 'departure-gate': 96, afterglow: 124.5,
} as const;

export function applyChildhoodScore(source: MusicWorldProject): MusicWorldProject {
  const project = structuredClone(source);
  project.track = {
    source: 'asset', assetId: CHILDHOOD_ASSET_ID, title: 'Childhood', artist: 'Scott Buckley',
    expectedDurationSeconds: rawAnalysis.durationSeconds,
    rights: {
      licenseRef: 'LicenseRef-Scott-Buckley-Library',
      attribution: "'Childhood' by Scott Buckley — CC BY 4.0. www.scottbuckley.com.au · https://creativecommons.org/licenses/by/4.0/ · https://www.scottbuckley.com.au/library/childhood/ · 已做音量归一化",
    },
    analysis: { version: 1, method: 'local-peak-rms-v1', durationSeconds: rawAnalysis.durationSeconds,
      peaks: [...rawAnalysis.peaks], rmsDb: [...rawAnalysis.rmsDb],
      sections: rawAnalysis.sections.map((section,i) => ({ ...section, label: ['开场','能量转折','衰减'][i] ?? section.label })),
    },
  };
  for (const [id, seconds] of Object.entries(childhoodCueSeconds)) {
    const cue = project.timeline.cues.find(cue => cue.id === id);
    if (!cue) throw new Error(`Childhood 编排缺少段落：${id}`);
    cue.position = seconds / rawAnalysis.durationSeconds;
  }
  project.timeline.cues.sort((a,b) => a.position - b.position);
  if (!project.assets.some(asset => asset.id === CHILDHOOD_ASSET_ID)) project.assets.push({ id: CHILDHOOD_ASSET_ID, type: 'audio', licenseRef: project.track.rights.licenseRef });
  assertMusicWorldProject(project);
  return project;
}

// Chapter buttons follow authored project cues, including later manual edits.
export function studyChapters(cues: NormalizedMusicTimelineCue[]) {
  return ([['arrival','晨光'],['memory-tree','回声'],['departure-gate','归途']] as const).flatMap(([id,label]) => {
    const cue = cues.find(cue => cue.id === id);
    return cue ? [{ id, label, position: cue.position }] : [];
  });
}
