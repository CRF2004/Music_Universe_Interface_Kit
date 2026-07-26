# Asset pipeline MVP

The asset pipeline keeps large editable sources separate from browser-ready
runtime assets, enforces licensing metadata and size budgets, and produces a
runtime manifest with content hashes.

## Quick start

```bash
npm run assets:validate
npm run assets:build
```

`npm run build` runs the asset build before Vite so production output always
contains the latest generated assets.

The repository also includes a reproducible Departure Portal model and an
offline preview command:

```bash
npm run assets:generate:departure-portal
npm run assets:preview:departure-portal
```

The preview is written to `output/playwright/departure-portal-preview.png`.

## Adding an asset

1. Put the source in `assets/source/models`, `textures`, or `audio`.
2. Add an entry to `assets/asset-manifest.json`.
3. Record SPDX license, author, provenance, original source URL, access date,
   license version, and the repository path to a license snapshot.
4. Run `npm run assets:build`.
5. Reference the generated URL from
   `public/assets/generated/asset-manifest.json`.

Example:

```json
{
  "id": "departure-portal",
  "type": "model",
  "source": "models/departure-portal.glb",
  "license": {
    "spdx": "CC-BY-4.0",
    "author": "Artist Name",
    "provenance": "Downloaded from the original asset page.",
    "sourceUrl": "https://example.com/original-asset",
    "accessedAt": "2026-07-26",
    "licenseVersion": "Creative Commons Attribution 4.0 International",
    "licenseFile": "assets/licenses/example-asset.snapshot.md"
  },
  "build": {
    "compress": "meshopt",
    "textureFormat": "webp",
    "textureSize": 2048,
    "simplify": false
  }
}
```

## Supported transforms

- Models: glTF Transform optimization, Meshopt by default, embedded textures
  recompressed to WebP.
- Textures: resize without enlargement and encode WebP with Sharp.
- Audio: normalize to -16 LUFS and encode Ogg Vorbis with `ffmpeg`.

`ffmpeg` is required only when audio entries exist. Model and texture tools are
local development dependencies installed by npm.

## Budgets and CI

Source and generated size budgets are defined in `assets/asset-manifest.json`.
Validation fails on missing sources, invalid extensions, duplicate IDs, missing
license metadata, path traversal, or source budget violations. The build also
fails when individual or total generated output exceeds budget.

CI validates the manifest independently, then the normal production build
exercises the complete transform using the included texture fixture.

## Cache policy

Generated filenames are stable asset IDs and the runtime manifest contains a
SHA-256 content hash. Generated binary filenames include the first 12 characters
of that hash. Configure the production host to:

- serve `asset-manifest.json` with `Cache-Control: no-cache`;
- serve generated binary assets with
  `Cache-Control: public, max-age=31536000, immutable`.

Runtime code should resolve generated assets through `asset-manifest.json`
instead of constructing filenames.
