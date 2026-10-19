import { buildWorldProject } from './worldBuilder';
import { assertMusicWorldProject } from './validateMusicWorldProject';
import type { MusicWorldProject } from './musicWorldProject';
import { applyChildhoodScore } from './childhoodScore';

// A new draft preserves all scene/track edits and the original saved study.
export function refineCoastalCast(project: MusicWorldProject): MusicWorldProject | null {
  if (project.scene.environment.look !== 'coastal-garden-v1') return null;
  const replacements = [
    { objectId: 'npc-guide', oldId: 'guide-astronaut', id: 'garden-keeper', color: '#e1c5a5' },
    { objectId: 'echo-terminal', oldId: 'support-terminal', id: 'garden-listening-cabinet', color: '#c7b18b' },
    { objectId: 'departure-gate', oldId: 'departure-portal', id: 'garden-arbor', color: '#c3bc9d' },
  ];
  const result = structuredClone(project);
  let changed = false;
  for (const replacement of replacements) {
    const object = result.scene.objects.find(object => object.id === replacement.objectId);
    if (object?.appearance?.assetId !== replacement.oldId) continue;
    object.appearance = { ...object.appearance, assetId: replacement.id, colorToken: replacement.color, outline: false };
    if (!result.assets.some(asset => asset.id === replacement.id)) result.assets.push({ id: replacement.id, type: 'model', licenseRef: 'MIT' });
    changed = true;
  }
  if (!changed) return null;
  assertMusicWorldProject(result);
  return result;
}

export function createCoastalStudy(): MusicWorldProject {
  const project = buildWorldProject({ templateId: 'memory-journey', title: '回声花园 · Echo Garden', gateAssetId: 'departure-portal' });
  project.id = 'echo-garden-study';
  project.metadata.description = 'An authored art-direction study of the existing Memory Journey. Original garden/atelier assets, warm coastal palette, curated camera and a quiet interface.';
  project.scene.environment.look = 'coastal-garden-v1';
  project.scene.environment.effects = { ...project.scene.environment.effects, outline: true, grain: false };
  project.scene.environment.camera = { ...project.scene.environment.camera, fov: 48, distance: 9.5, height: 4.5, lookAtHeight: 1.4 };
  const archive = project.scene.objects.find(object => object.id === 'memory-archive');
  if (!archive) throw new Error('Memory Journey archive is missing.');
  archive.appearance = { ...archive.appearance, assetId: 'memory-atelier', colorToken: '#e6d7b5', outline: false };
  project.assets = project.assets.filter(asset => asset.id !== 'product-tower-hangar');
  project.assets.push({ id: 'memory-atelier', type: 'model', licenseRef: 'MIT' }, { id: 'coastal-garden', type: 'model', licenseRef: 'MIT' });
  project.worldBible.palette = ['#a3ceca', '#b8bf8b', '#f1e4c8', '#548e83', '#d58d75'];
  project.worldBible.visualMotifs = ['quiet garden', 'cream atelier', 'warm stepping stones', 'coastal observatory'];
  const labels: Record<string, string> = { 'npc-guide': '守园人', 'echo-terminal': '回声终端', 'memory-archive': '记忆工坊', 'departure-gate': '归途之门' };
  for (const object of project.scene.objects) {
    object.label = labels[object.id] ?? object.label;
    for (const trigger of object.interaction.triggers) if (trigger.type === 'proximity') trigger.prompt = `按 E · ${object.label}`;
  }
  const colors = [
    ['#a3ceca', '#b8bf8b', '#c4d6c3'], ['#9fc9c5', '#b8bd88', '#c7d4bd'],
    ['#adc5c1', '#b4b68b', '#ccd1bd'], ['#bdc9be', '#beb58a', '#d8d1bd'],
    ['#bac2bd', '#b5ac88', '#d5c9b6'], ['#c6bfc8', '#b1a890', '#dbd0ca'], ['#c2c8ce', '#b8b49b', '#e2d8cf'],
  ];
  const narration = ['花园正在听。', '远处的音符，落进树影。', '风穿过窗边，旋律慢慢靠近。', '一段记忆，在这里生根。', '沿着石径，把回声带回家。', '最后一段旋律，为归途开门。', '留一会儿，听余音散去。'];
  project.timeline.cues.forEach((cue, i) => {
    const [skyColor, groundColor, fogColor] = colors[i % colors.length];
    const action = cue.actions.find(action => action.type === 'set-environment');
    if (action?.type === 'set-environment') action.payload = { ...action.payload, skyColor, groundColor, fogColor, fogDensity: .005, rainIntensity: 0, stars: i > 4 ? 40 : 0, bloomIntensity: .12 };
    for (const action of cue.actions) if (action.type === 'set-camera') action.payload.mode = 'explore';
    for (const action of cue.actions) if (action.type === 'show-narration') action.payload.body = narration[i % narration.length];
  });
  assertMusicWorldProject(project);
  return applyChildhoodScore(refineCoastalCast(project) ?? project);
}

export function createChildhoodAudition(source: MusicWorldProject): MusicWorldProject {
  const arranged = createCoastalStudy();
  const project = structuredClone(source);
  project.timeline = arranged.timeline;
  project.metadata.title = `${source.metadata.title.slice(0,75)} · Childhood 试听`;
  return applyChildhoodScore(project);
}
