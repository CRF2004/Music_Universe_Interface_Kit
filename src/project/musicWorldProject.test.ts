import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defaultMusicWorldProject } from '../content/defaultMusicWorldProject';
import { compileNormalizedMusicTimeline } from '../music/musicTimeline';
import { compileSpatialScene } from '../schema';
import { exportMusicWorldProject, importMusicWorldProject } from './musicWorldProjectIO';
import { validateMusicWorldProject } from './validateMusicWorldProject';
import type { MusicWorldProject } from './musicWorldProject';

describe('MusicWorldProject v2', () => {
  it('accepts and round-trips the default Memory Journey project', () => {
    const validation = validateMusicWorldProject(defaultMusicWorldProject);
    assert.deepEqual(validation, { valid: true, issues: [] });

    const restored = importMusicWorldProject(exportMusicWorldProject(defaultMusicWorldProject));
    assert.deepEqual(restored, defaultMusicWorldProject);
  });

  it('reconstructs the same world and duration-relative timeline after import', () => {
    const restored = importMusicWorldProject(exportMusicWorldProject(defaultMusicWorldProject));
    const world = compileSpatialScene(restored.scene);
    const timeline = compileNormalizedMusicTimeline(restored.timeline.cues, 200);

    assert.equal(world.id, 'memory-journey');
    assert.deepEqual(world.interactions.map(({ id }) => id), [
      'npc-guide',
      'echo-terminal',
      'memory-archive',
      'departure-gate',
    ]);
    assert.deepEqual(timeline.map(({ atSeconds }) => atSeconds), [0, 32, 68, 104, 136, 168, 192]);
  });

  it('rejects unsupported versions, invalid cue positions, and missing license references', () => {
    const input = structuredClone(defaultMusicWorldProject) as unknown as Record<string, unknown>;
    input.schemaVersion = 999;
    const timeline = input.timeline as { cues: Array<Record<string, unknown>> };
    timeline.cues[0].position = 1.1;
    const assets = input.assets as Array<Record<string, unknown>>;
    assets[0].licenseRef = '';
    input.unknownField = true;

    const result = validateMusicWorldProject(input);
    assert.equal(result.valid, false);
    assert.deepEqual(result.issues.map(({ path }) => path), [
      '$.unknownField',
      '$.schemaVersion',
      '$.timeline.cues[0].position',
      '$.assets[0].licenseRef',
    ]);
  });

  it('reports malformed JSON separately from project validation errors', () => {
    assert.throws(() => importMusicWorldProject('{'), /Invalid MusicWorldProject JSON/);
    assert.throws(() => importMusicWorldProject('{}'), /Invalid MusicWorldProject/);
  });

  it('rejects malformed file identities at import and keeps legacy local tracks readable', () => {
    const project: MusicWorldProject = structuredClone(defaultMusicWorldProject);
    project.track = { source: 'local-file', title: 'My song', rights: { licenseRef: 'LicenseRef-User-Provided-Unverified', attribution: 'Private preview' } };
    assert.equal(validateMusicWorldProject(project).valid, true);
    project.track.file = { name: 'song.wav', sizeBytes: 42, sha256: 'a'.repeat(64) };
    assert.deepEqual(importMusicWorldProject(exportMusicWorldProject(project)).track, project.track);
    for (const file of [
      { name: '', sizeBytes: 42, sha256: 'a'.repeat(64) },
      { name: 'song.wav', sizeBytes: 1.5, sha256: 'a'.repeat(64) },
      { name: 'song.wav', sizeBytes: 42, sha256: 'A'.repeat(64) },
    ]) {
      assert.throws(() => importMusicWorldProject(JSON.stringify({ ...project, track: { ...project.track, file } })), /Invalid MusicWorldProject/);
    }
    assert.throws(() => importMusicWorldProject(JSON.stringify({ ...project, track: { ...project.track, source: 'asset', assetId: 'crywolf-athetosis-demo' } })), /only allowed for local-file/);
  });

  it('rejects invalid environment payloads at the import boundary with field paths', () => {
    for (const payload of [
      { skyColor: 'invalid' }, { rainIntensity: 1.1 }, { bloomIntensity: -1 },
      { fogDensity: 2 }, { stars: 1001 }, { stars: 1.5 }, { surprise: true },
    ]) {
      const input = structuredClone(defaultMusicWorldProject);
      const action = input.timeline.cues[0].actions[0];
      Object.assign(action.payload, payload);
      const result = validateMusicWorldProject(input);
      assert.equal(result.valid, false);
      assert.match(result.issues[0].path, /^\$\.timeline\.cues\[0\]\.actions\[0\]\.payload\./);
      assert.throws(() => importMusicWorldProject(JSON.stringify(input)), /payload/);
    }
  });
});
