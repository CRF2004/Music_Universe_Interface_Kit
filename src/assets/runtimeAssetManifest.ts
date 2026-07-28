import { useEffect, useState } from 'react';

export type RuntimeAssetType = 'model' | 'texture' | 'audio';

export interface RuntimeAssetEntry {
  id: string;
  type: RuntimeAssetType;
  url: string;
  sourceBytes: number;
  outputBytes: number;
  sha256: string;
  license: {
    spdx: string;
    author: string;
    provenance: string;
    sourceUrl: string;
    accessedAt: string;
    licenseVersion: string;
    licenseFile: string;
  };
}

export interface RuntimeAssetManifest {
  schemaVersion: 1;
  totalOutputBytes: number;
  assets: RuntimeAssetEntry[];
}

export function findRuntimeAsset(
  manifest: RuntimeAssetManifest,
  id: string,
  type?: RuntimeAssetType,
) {
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.assets)) {
    throw new Error('Unsupported runtime asset manifest.');
  }
  const asset = manifest.assets.find((candidate) => candidate.id === id);
  if (!asset) throw new Error(`Runtime asset "${id}" is missing.`);
  if (type && asset.type !== type) {
    throw new Error(`Runtime asset "${id}" is ${asset.type}, expected ${type}.`);
  }
  if (!/^assets\/generated\/[a-z0-9][a-z0-9.-]+$/.test(asset.url)) {
    throw new Error(`Runtime asset "${id}" has an invalid generated URL.`);
  }
  return asset;
}

export function resolveRuntimeAssetUrl(assetUrl: string, baseUrl: string) {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalizedBaseUrl}${assetUrl}`;
}

let manifestPromise: Promise<RuntimeAssetManifest> | undefined;

export function loadRuntimeAssetManifest() {
  const baseUrl = import.meta.env.BASE_URL;
  manifestPromise ??= fetch(`${baseUrl}assets/generated/asset-manifest.json`, {
    cache: 'no-cache',
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Asset manifest request failed with ${response.status}.`);
    }
    return (await response.json()) as RuntimeAssetManifest;
  });
  return manifestPromise;
}

type RuntimeAssetState =
  | { status: 'loading'; asset?: undefined; error?: undefined }
  | { status: 'ready'; asset: RuntimeAssetEntry; error?: undefined }
  | { status: 'error'; asset?: undefined; error: Error };

export function useRuntimeAsset(id: string, type?: RuntimeAssetType): RuntimeAssetState {
  const [state, setState] = useState<RuntimeAssetState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    loadRuntimeAssetManifest()
      .then((manifest) => findRuntimeAsset(manifest, id, type))
      .then((asset) => ({
        ...asset,
        url: resolveRuntimeAssetUrl(asset.url, import.meta.env.BASE_URL),
      }))
      .then((asset) => {
        if (!cancelled) setState({ status: 'ready', asset });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, type]);

  return state;
}
