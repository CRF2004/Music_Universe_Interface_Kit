import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultMusicWorldProject } from '../content/defaultMusicWorldProject';
import { importMusicWorldProject, exportMusicWorldProject } from './musicWorldProjectIO';
import type { MusicWorldProject } from './musicWorldProject';

test('v1 curved drafts migrate once and preserve authored content and song identity', () => {
  const old: Omit<MusicWorldProject, 'schemaVersion'> & { schemaVersion: 1 } = { ...structuredClone(defaultMusicWorldProject), schemaVersion: 1 };
  old.scene.environment.terrain = { type: 'curved-plane', size: [1000, 1000], curvature: 0.002 };
  old.scene.objects[2].transform.position = [-70, 0, 35];
  old.timeline.cues[2].position = 0.41;
  const input = JSON.stringify(old);
  const migrated = importMusicWorldProject(input);
  assert.equal(migrated.schemaVersion, 2);
  assert.deepEqual(migrated.scene.environment.terrain, { type: 'sphere', size: [120, 120], curvature: 1 / 120 });
  assert.deepEqual(migrated.scene.objects, old.scene.objects);
  assert.deepEqual(migrated.track, old.track);
  assert.deepEqual(migrated.timeline, old.timeline);
  assert.deepEqual(migrated.metadata, old.metadata);
  assert.equal(JSON.stringify(old), input);
  assert.deepEqual(importMusicWorldProject(exportMusicWorldProject(migrated)), migrated);
});

test('migration rejects corrupt legacy data before changing the terrain', () => {
  const old = { ...structuredClone(defaultMusicWorldProject), schemaVersion: 1 };
  old.timeline.cues[0].position = 2;
  assert.throws(() => importMusicWorldProject(JSON.stringify(old)), /position/);
});
