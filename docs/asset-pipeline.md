# Asset pipeline MVP

The asset pipeline keeps large editable sources separate from browser-ready
runtime assets, enforces licensing metadata and size budgets, and produces a
runtime manifest with content hashes.

## Quick start

### Echo Garden authored study

`node scripts/generate-echo-garden.mjs` deterministically regenerates the original
`memory-atelier`, `coastal-garden`, `garden-keeper` and
`garden-listening-cabinet` and `garden-arbor` source models. Run the ordinary asset build
after regeneration. Their provenance, MIT snapshot and optimization settings are
in the asset manifest. The atelier shares the reviewed building envelope; the
garden is authored for a 60 m sphere and currently bakes decorative placements
into one model. The versioned visual kit is required to reproduce its lighting,
ground and camera. See [the practical assessment](echo-garden-study.md).

```bash
npm run assets:validate
npm run assets:build
npm run assets:report
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

For a distinctive hero asset that cannot be satisfied by reuse, the repository
also has an optional Tripo text/image-to-3D candidate CLI. It writes only to an
ignored review directory and cannot bypass this pipeline. Real runs spend
credits and need a prior dry run plus owner confirmation; interrupted runs are
recovered with `resume`, never by regenerating. See
[`tripo-asset-generation.md`](tripo-asset-generation.md) for the official
tutorial URLs, commands, reference-image preparation, rights review, and staged
product plan.

## Adding an asset

Creator-facing selection uses the bounded catalog in
`src/assets/worldAssetCatalog.ts`; it currently reuses accepted models only.
Optional scene `appearance.assetId` must name a compatible catalog entry and a
matching licensed project model reference. Render normalization and collision
use `getInteractionVisualProfile(type, assetId)`. This does not authorize
arbitrary uploaded models or move generation candidates into the runtime.
The world-builder preflight resolves template licenses and verifies the four
selected main model binaries against generated-manifest sizes and SHA-256.
Audio and additional musical landmarks retain their existing loading paths.

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

## Automated inspection

`npm run assets:report` writes:

- `output/assets/asset-report.json`
- `output/assets/asset-report.md`
- one four-angle PNG for every GLB
- `output/assets/external-pilot-contact-sheet.png`

Model reports include triangle, mesh, material, texture, and animation counts.
Texture reports include dimensions and channels. Audio reports include duration,
sample rate, channels, integrated loudness where the clip is long enough for
EBU R128 measurement, and decoded first/last-sample loop seam delta.

For pull requests that introduce a visual asset set, copy the relevant generated
contact sheet into `docs/asset-previews/` and embed it in the PR description.
