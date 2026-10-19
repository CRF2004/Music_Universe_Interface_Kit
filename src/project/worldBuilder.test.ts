import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { buildWorldProject, preflightWorldAssets } from './worldBuilder';
import { exportMusicWorldProject, importMusicWorldProject } from './musicWorldProjectIO';
import { defaultMusicWorldProject } from '../content/defaultMusicWorldProject';
import { compileSpatialScene } from '../schema';
import { getInteractionVisualProfile } from '../interaction/visualProfiles';
import { worldAssetSlots } from '../assets/worldAssetCatalog';
import type { RuntimeAssetManifest } from '../assets/runtimeAssetManifest';
import type { MusicWorldProject } from './musicWorldProject';

const options = { templateId: 'memory-journey' as const, title: 'My world', gateAssetId: 'departure-portal' };

describe('template world assembly', () => {
  it('builds approved gate choices with intact journey semantics and a stable JSON round-trip', () => {
    for (const gateAssetId of ['docs-portal-gate', 'departure-portal', 'garden-arbor']) {
      const project = buildWorldProject({ ...options, gateAssetId });
      assert.equal(project.metadata.title, 'My world');
      assert.deepEqual(project.timeline, defaultMusicWorldProject.timeline);
      assert.deepEqual(project.scene.spawn, defaultMusicWorldProject.scene.spawn);
      for (const slot of worldAssetSlots) {
        const object = project.scene.objects.find(object => object.id === slot.id);
        const original = defaultMusicWorldProject.scene.objects.find(object => object.id === slot.id);
        assert.ok(object); assert.ok(original);
        assert.deepEqual(object.transform, original.transform);
        assert.deepEqual(object.interaction, original.interaction);
        assert.equal(object.appearance?.assetId, slot.id === 'departure-gate' ? gateAssetId : slot.assetId);
      }
      const imported = importMusicWorldProject(exportMusicWorldProject(project));
      assert.deepEqual(imported, project);
      const gate = compileSpatialScene(imported.scene).interactions.find(object => object.id === 'departure-gate');
      assert.equal(gate?.visual.assetId, gateAssetId);
      assert.deepEqual(getInteractionVisualProfile('portal', gateAssetId).collider, { type: 'none' });
    }
    const baseline: MusicWorldProject = defaultMusicWorldProject;
    assert.equal(baseline.scene.objects[0].appearance?.assetId, undefined);
  });

  it('rejects incompatible assets, empty titles, missing model references and incorrect licenses', () => {
    assert.throws(() => buildWorldProject({ ...options, title: ' ' }), /名称/);
    assert.throws(() => buildWorldProject({ ...options, gateAssetId: 'product-tower-hangar' }), /离场门/);
    const project = buildWorldProject(options);
    const gate = project.scene.objects.find(object => object.id === 'departure-gate');
    assert.ok(gate?.appearance);
    gate.appearance.assetId = 'product-tower-hangar';
    assert.throws(() => exportMusicWorldProject(project), /compatible/);
    gate.appearance.assetId = 'departure-portal';
    project.assets = project.assets.filter(asset => asset.id !== 'departure-portal');
    assert.throws(() => exportMusicWorldProject(project), /licensed model/);
    const guide = project.assets.find(asset => asset.id === 'guide-astronaut');
    assert.ok(guide); guide.licenseRef = 'Unknown';
    assert.throws(() => exportMusicWorldProject(project), /licensed model/);
    assert.throws(() => getInteractionVisualProfile('portal', 'product-tower-hangar'), /Incompatible/);
  });

  it('checks asset provenance and model bytes, rejecting stale HTML or corrupted files', async () => {
    const project = buildWorldProject(options);
    const bytes = new Uint8Array([103, 108, 84, 70]);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const manifest: RuntimeAssetManifest = {
      schemaVersion: 1, totalOutputBytes: project.assets.length * 4,
      assets: project.assets.map(ref => ({
        id: ref.id, type: ref.type, url: `assets/generated/${ref.id}.glb`, sourceBytes: 4, outputBytes: 4, sha256: hash,
        license: { spdx: ref.licenseRef, author: 'Fixture', provenance: 'Test fixture', sourceUrl: 'https://example.com/test', accessedAt: '2026-10-18', licenseVersion: 'Fixture', licenseFile: 'test.md' },
      })),
    };
    const fetch = mock.method(globalThis, 'fetch', async () => new Response(bytes));
    const signal = new AbortController().signal;
    try {
      await preflightWorldAssets(project, manifest, '/', signal);
      assert.equal(fetch.mock.callCount(), 4);
      const missing = structuredClone(manifest);
      missing.assets = missing.assets.filter(asset => asset.id !== 'departure-portal');
      await assert.rejects(preflightWorldAssets(project, missing, '/', signal), /missing/);
      const badLicense = structuredClone(manifest); badLicense.assets[0].license.spdx = 'Unknown';
      await assert.rejects(preflightWorldAssets(project, badLicense, '/', signal), /许可/);
      fetch.mock.mockImplementation(async () => new Response('<html>Not a model</html>'));
      await assert.rejects(preflightWorldAssets(project, manifest, '/', signal), /不完整/);
      fetch.mock.mockImplementation(async () => new Response(new Uint8Array([1, 2, 3, 4])));
      await assert.rejects(preflightWorldAssets(project, manifest, '/', signal), /不完整/);
      fetch.mock.mockImplementation(async () => new Response(null, { status: 404 }));
      await assert.rejects(preflightWorldAssets(project, manifest, '/', signal), /加载失败/);
    } finally { fetch.mock.restore(); }
  });
});
