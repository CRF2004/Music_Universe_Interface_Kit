# Tripo 3D candidate asset workflow

> Status: optional internal authoring tool; not a runtime or creator-facing dependency
> Last reviewed: 2026-08-03

Tripo can generate review candidates from text or images when the licensed
library and repository-authored options cannot satisfy a distinctive hero-asset
need. It does not replace the asset manifest, rights review, optimization,
collision review, performance budgets, or perceptual validation.

## Product boundary

This integration is deliberately development-only during the current roadmap
phase:

- the API key is read only by a local Node.js script;
- generated files go to ignored `output/tripo-candidates/` staging;
- no candidate is added to `assets/source` or the runtime manifest automatically;
- the listener runtime never calls Tripo or loads a temporary Tripo URL;
- a template or reviewed existing asset remains the fallback;
- creator-facing generation remains a Phase 3 capability after the versioned
  `MusicWorldProject` and editing workflow exist.

The Terms of User Agreement currently prohibit making the Generative 3D
Foundation Model Service available to third parties or end users without prior
written authorization. Obtain an applicable Tripo agreement before building or
shipping a creator-facing integration.

## Official documentation

Record these original URLs in reviews and refresh the legal/technical check
before any production use:

- Chinese introduction/tutorial:
  <https://developers.tripo3d.com/zh/docs/introduction>
- API quick start:
  <https://developers.tripo3d.com/en/docs/quick-start>
- Text-to-model, P Series:
  <https://developers.tripo3d.com/en/docs/generation-text-to-model/p>
- Image-to-model, P Series:
  <https://developers.tripo3d.com/en/docs/generation-image-to-model/p>
- Image upload with a presigned URL:
  <https://developers.tripo3d.com/en/docs/files-presign>
- Task query and result metadata:
  <https://developers.tripo3d.com/en/docs/task-query>
- Model capabilities and snapshot versions:
  <https://developers.tripo3d.com/en/models/v3-1>
- API landing page and usage pricing:
  <https://developers.tripo3d.com/>
- Terms of User Agreement:
  <https://www.tripo3d.ai/terms>
- Tripo Studio plan comparison:
  <https://www.tripo3d.ai/pricing>

The developer documentation and commercial terms are external and may change.
The date above records the last repository review, not a permanent grant.

## Setup

Put the credential in the ignored repository `.env` file:

```dotenv
TRIPO_API_KEY="replace-with-local-key"
```

The CLI also accepts the existing lowercase `tripo_api_key` name for local
compatibility. Prefer `TRIPO_API_KEY` for new setups. Never prefix the key with
`VITE_`, put it in frontend state, print it, or commit the real value.

Inspect the command without spending credits:

```bash
npm run assets:tripo -- --help
```

## Generate a candidate

Text example:

```bash
npm run assets:tripo -- text \
  --id memory-archive-pilot \
  --prompt "A solitary low-poly memory archive for a dreamlike blue music planet, readable doorway, asymmetric silhouette, no text, no logo" \
  --model P1-20260311 \
  --face-limit 8000 \
  --seed 3101
```

Image example, using only a reference image authorized for generative use:

```bash
npm run assets:tripo -- image \
  --id memory-archive-concept-pilot \
  --image references/memory-archive-front.png \
  --model P1-20260311 \
  --face-limit 8000 \
  --seed 3101
```

Use `--dry-run` to validate arguments and see the sanitized payload without
uploading data or spending credits. P Series is the default because its
documented 50–20,000 face range is closer to the project's WebGL needs than an
unconstrained high-fidelity mesh.

Each successful run immediately downloads the temporary result into:

```text
output/tripo-candidates/<candidate-id>/<timestamp>/
  candidate.glb
  preview.<format>             # when returned by Tripo
  generation-receipt.json
```

The receipt records the provider, model snapshot, prompt or input-image hash,
seed, face limit, task ID, consumed credits when reported, output hash, official
documentation URLs, and incomplete review gates. It never records the API key
or the temporary signed upload/download URLs.

## Candidate acceptance

Do not copy a generated candidate into `assets/source/models` until all of the
following are complete:

1. Confirm the account/API terms in force at generation time allow the intended
   commercial, modification, distribution, and publishing path.
2. Save a dated terms or license snapshot under `assets/licenses` and use a
   reviewed `LicenseRef-*` identifier; do not label generated output CC0 or MIT.
3. Confirm every text/image input is owned or licensed for generative use and
   excludes unauthorized brands, people, characters, products, artwork, and
   protected architecture.
4. Review silhouette, topology, holes, normals, UVs, materials, texture noise,
   scale, Y-up orientation, forward `-Z`, bottom pivot, and animation data.
5. If it replaces an interaction prop, update the reviewed visual/collider
   profile and its tests in the same change.
6. Add an explicit manifest entry with generation provenance and build settings.
7. Run `npm run assets:validate`, `npm run assets:build`, and
   `npm run assets:report`; inspect the contact sheet and the in-world timeline
   states.
8. Run the Journey regression and measure the target device if the asset changes
   loading, GPU memory, draw calls, or frame rate materially.
9. Retain the current reviewed/template visual as the failure fallback.

Tripo does not warrant that output is unique or non-infringing. Human review is
therefore a release gate, even for paid/API output.

## Staged integration plan

### Stage A — Internal candidate pilot (current tooling, gated execution)

- Wait for the second first-time observation round to confirm that visual
  roughness, rather than comprehension or authored events, is the limiting gap.
- If confirmed, generate three fixed-seed Memory Archive candidates and accept
  at most one.
- Compare the existing and candidate Archive with fixed-camera screenshots,
  full Journey regression, asset report, collider inspection, and target-device
  performance.
- Keep the CLI optional and provider-specific; do not add Tripo to runtime code.

Success means one accepted asset improves the vertical slice without breaking
rights traceability, deterministic replay, collision, loading, or performance.
It does not mean that bulk generation is approved.

### Stage B — Provider-neutral project records (Roadmap Phase 2)

- Add provider-neutral candidate/accepted asset provenance, generation cost,
  input-rights declaration, review status, and fallback references to the
  versioned `MusicWorldProject` asset record.
- Ensure manual, library, and generated assets compile through the same manifest
  and validation path.
- Keep provider task IDs and parameters as optional provenance metadata rather
  than runtime behavior.

### Stage C — Assisted creator generation (Roadmap Phase 3)

- Obtain written authorization and applicable commercial/API terms for
  exposing generation to creators.
- Put credentials, task polling/webhooks, downloads, storage, quotas, retries,
  and moderation in a backend adapter; never call Tripo from the browser.
- Let creators compare, accept, edit, replace, and reject every candidate.
- Enforce per-project time, attempt, face/texture, storage, and monetary budgets.
- Fall back to template editing and licensed assets without losing creator work.

### Stage D — Provider resilience (only after proven need)

- Define a small generation adapter contract based on validated project assets,
  not Tripo response objects.
- Add another provider only if reliability, quality, regional availability, or
  cost evidence justifies it.
- Preserve downloaded immutable artifacts and receipts so published projects do
  not depend on provider availability or expiring URLs.
