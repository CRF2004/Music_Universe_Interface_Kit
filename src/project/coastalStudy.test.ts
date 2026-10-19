import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createCoastalStudy, createChildhoodAudition, refineCoastalCast } from './coastalStudy';
import { CHILDHOOD_ASSET_ID, childhoodCueSeconds, studyChapters } from './childhoodScore';
import { defaultMusicWorldProject } from '../content/defaultMusicWorldProject';
import { buildWorldProject } from './worldBuilder';
import { exportMusicWorldProject, importMusicWorldProject } from './musicWorldProjectIO';
import { validateMusicWorldProject } from './validateMusicWorldProject';
import { compileNormalizedMusicTimeline } from '../music/musicTimeline';
import { replayMusicTimeline } from '../music/runtime/musicExperienceRuntime';
import { getInteractionVisualProfile } from '../interaction/visualProfiles';

describe('Echo Garden authored visual study', () => {
  it('aligns Childhood cues to authored seconds and reconstructs gate state at boundaries', () => {
    const project = createCoastalStudy();
    const duration = project.track.expectedDurationSeconds!;
    assert.equal(project.track.assetId, CHILDHOOD_ASSET_ID);
    assert.equal(project.track.artist, 'Scott Buckley');
    assert.ok(project.track.rights.attribution.includes('CC BY 4.0'));
    assert.equal(project.track.analysis?.rmsDb.length, project.track.analysis?.peaks.length);
    for (const [id,seconds] of Object.entries(childhoodCueSeconds)) {
      assert.ok(Math.abs(project.timeline.cues.find(cue => cue.id === id)!.position * duration - seconds) < 1e-6);
    }
    const cues = compileNormalizedMusicTimeline(project.timeline.cues,duration);
    assert.equal(replayMusicTimeline(cues,95.9).portals.departure,undefined);
    assert.equal(replayMusicTimeline(cues,96.1).portals.departure,true);
    assert.equal(replayMusicTimeline(cues,124.6).landmarks['departure-afterglow'],true);
    assert.equal(replayMusicTimeline(cues,0).portals.departure,undefined);
    assert.deepEqual(importMusicWorldProject(exportMusicWorldProject(project)),project);
  });
  it('keeps chapter jumps attached to project cues after manual timing edits', () => {
    const project = createCoastalStudy();
    const gate = project.timeline.cues.find(cue => cue.id === 'departure-gate')!;
    gate.position = .8;
    assert.equal(studyChapters(project.timeline.cues).find(chapter => chapter.id === gate.id)?.position,.8);
    assert.equal(studyChapters(project.timeline.cues.filter(cue => cue.id !== gate.id)).some(chapter => chapter.id === gate.id),false);
  });
  it('makes an audition value with preserved scene edits and an unchanged original project', () => {
    const original = createCoastalStudy(); original.track = structuredClone(defaultMusicWorldProject.track);
    original.scene.objects.find(object => object.id === 'memory-archive')!.transform.position = [-9,0,-10];
    const before = structuredClone(original), audition = createChildhoodAudition(original);
    assert.deepEqual(original,before);
    assert.deepEqual(audition.scene,before.scene);
    assert.equal(audition.track.assetId,CHILDHOOD_ASSET_ID);
    assert.equal(audition.assets.filter(asset => asset.id === CHILDHOOD_ASSET_ID).length,1);
  });
  it('upgrades the legacy cast in a new value, preserving authored edits and avoiding repeated upgrades', () => {
    const legacy = createCoastalStudy();
    legacy.metadata.title = 'My edited garden';
    legacy.scene.objects.find(object => object.id === 'npc-guide')!.appearance!.assetId = 'guide-astronaut';
    legacy.scene.objects.find(object => object.id === 'echo-terminal')!.appearance!.assetId = 'support-terminal';
    legacy.scene.objects.find(object => object.id === 'departure-gate')!.appearance!.assetId = 'departure-portal';
    legacy.scene.objects.find(object => object.id === 'memory-archive')!.transform.position = [-9, 0, -10];
    const before = structuredClone(legacy);
    const refined = refineCoastalCast(legacy);
    assert.ok(refined);
    assert.deepEqual(legacy, before);
    assert.equal(refined.metadata.title, before.metadata.title);
    assert.deepEqual(refined.scene.objects.find(object => object.id === 'memory-archive'), before.scene.objects.find(object => object.id === 'memory-archive'));
    assert.equal(refined.scene.objects.find(object => object.id === 'npc-guide')?.appearance?.assetId, 'garden-keeper');
    assert.equal(refined.scene.objects.find(object => object.id === 'echo-terminal')?.appearance?.assetId, 'garden-listening-cabinet');
    assert.equal(refined.scene.objects.find(object => object.id === 'departure-gate')?.appearance?.assetId, 'garden-arbor');
    assert.deepEqual(getInteractionVisualProfile('portal', 'garden-arbor').collider, { type: 'none' });
    assert.equal(getInteractionVisualProfile('portal', 'garden-arbor').materialStyle, 'natural');
    assert.equal(getInteractionVisualProfile('portal', 'departure-portal').materialStyle, undefined);
    assert.equal(refineCoastalCast(refined), null);
    assert.equal(refined.assets.filter(asset => asset.id === 'garden-keeper').length, 1);
    assert.deepEqual(getInteractionVisualProfile('npc', 'garden-keeper').collider, getInteractionVisualProfile('npc', 'guide-astronaut').collider);
    assert.deepEqual(getInteractionVisualProfile('phone-booth', 'garden-listening-cabinet').collider, getInteractionVisualProfile('phone-booth', 'support-terminal').collider);
  });
  it('keeps the complete journey and preserves art direction through ordinary export/import', () => {
    const study = createCoastalStudy();
    const restored = importMusicWorldProject(exportMusicWorldProject(study));
    assert.deepEqual(restored, study);
    assert.equal(restored.scene.environment.look, 'coastal-garden-v1');
    assert.equal(restored.scene.objects.find(object => object.id === 'memory-archive')?.appearance?.assetId, 'memory-atelier');
    assert.deepEqual(getInteractionVisualProfile('building', 'memory-atelier').collider, getInteractionVisualProfile('building', 'product-tower-hangar').collider);
    assert.equal(restored.scene.objects.length, 4);
    const normal = buildWorldProject({ templateId: 'memory-journey', title: 'Baseline', gateAssetId: 'departure-portal' });
    assert.equal(normal.scene.environment.look, undefined);
    assert.notEqual(normal.scene.objects.find(object => object.id === 'memory-archive')?.appearance?.assetId, 'memory-atelier');
  });
  it('rejects missing scenery, unsupported looks and a mismatched planet radius', () => {
    const study = createCoastalStudy();
    study.assets = study.assets.filter(asset => asset.id !== 'coastal-garden');
    assert.equal(validateMusicWorldProject(study).valid, false);
    const wrongRadius = createCoastalStudy(); wrongRadius.scene.environment.terrain.size = [100,100];
    assert.equal(validateMusicWorldProject(wrongRadius).valid, false);
    const unknownLook = { ...createCoastalStudy(), scene: { ...createCoastalStudy().scene, environment: { ...createCoastalStudy().scene.environment, look: 'unknown-look' } } };
    assert.equal(validateMusicWorldProject(unknownLook).valid, false);
  });
  it('reconstructs identical art state when seeking back and forth and keeps the ending gate', () => {
    const study = createCoastalStudy();
    const cues = compileNormalizedMusicTimeline(study.timeline.cues, 278);
    const before = replayMusicTimeline(cues, 10);
    const after = replayMusicTimeline(cues, 260);
    assert.equal(after.portals.departure, true);
    assert.equal(before.environment.rainIntensity, 0);
    assert.notEqual(before.environment.skyColor, after.environment.skyColor);
    assert.deepEqual(replayMusicTimeline(cues, 10), before);
    assert.equal(study.scene.environment.look, 'coastal-garden-v1');
  });
});
