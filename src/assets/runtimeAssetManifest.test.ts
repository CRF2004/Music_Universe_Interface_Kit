import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  findRuntimeAsset,
  type RuntimeAssetManifest,
} from './runtimeAssetManifest';

const manifest: RuntimeAssetManifest = {
  schemaVersion: 1,
  totalOutputBytes: 128,
  assets: [
    {
      id: 'departure-portal',
      type: 'model',
      url: '/assets/generated/departure-portal.abc123.glb',
      sourceBytes: 512,
      outputBytes: 128,
      sha256: 'abc123',
      license: {
        spdx: 'MIT',
        author: 'Music Universe',
        provenance: 'Generated in repository.',
      },
    },
  ],
};

describe('runtime asset manifest', () => {
  it('resolves a generated asset by id and type', () => {
    assert.equal(findRuntimeAsset(manifest, 'departure-portal', 'model').outputBytes, 128);
  });

  it('rejects missing assets, type mismatches, and unsafe URLs', () => {
    assert.throws(() => findRuntimeAsset(manifest, 'missing'), /is missing/);
    assert.throws(() => findRuntimeAsset(manifest, 'departure-portal', 'audio'), /expected audio/);
    assert.throws(
      () =>
        findRuntimeAsset(
          {
            ...manifest,
            assets: [{ ...manifest.assets[0], url: 'https://example.com/portal.glb' }],
          },
          'departure-portal',
        ),
      /invalid generated URL/,
    );
  });
});
