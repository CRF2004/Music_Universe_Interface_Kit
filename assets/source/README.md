# Source assets

This directory contains editable or lossless source assets. Runtime code must
reference generated files under `public/assets/generated/`, never these files
directly.

Directory conventions:

- `models/`: `.glb` or `.gltf` sources, authored in metres, Y-up, forward -Z.
- `textures/`: `.png`, `.jpg`, `.webp`, `.tif`, `.tiff`, or `.svg` sources.
- `audio/`: `.wav`, `.flac`, `.aiff`, `.mp3`, `.m4a`, or `.ogg` sources.

Every source file must have a matching entry in `assets/asset-manifest.json`,
including SPDX license, author, provenance, and build settings.
