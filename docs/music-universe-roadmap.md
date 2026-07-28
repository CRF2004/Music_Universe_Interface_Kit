# Music Universe Product Roadmap

> Status: active product direction
> Last updated: 2026-07-26

## Vision

Turn music into worlds people can enter.

Music Universe is a runtime and creation system for short, explorable music
experiences. Its durable advantage is the semantic layer connecting music
structure, narrative intent, spatial state, interaction, and reusable assets.
It is not primarily a generic 3D interface kit or a 3D generation showcase.

## Initial user and job

The initial user is an independent musician or creator who wants to turn one
track into a memorable interactive experience without building a game.

The first product promise is:

> Choose a track, shape one coherent 3–5 minute journey, preview it reliably,
> and share the result.

## Product principles

1. **Complete experience before broad generation.** One authored journey that
   works end to end is more valuable than many disconnected generation demos.
2. **Semantic schema before model integrations.** AI, templates, and human
   editing must all produce the same versioned project format.
3. **Author control before full automation.** Generated interpretations and
   assets remain reviewable and replaceable.
4. **Web performance is a product constraint.** Worlds must load and run on the
   target browser/device budget.
5. **Rights travel with assets.** Audio and asset provenance are part of the
   project, publishing, and remix model.
6. **Reuse before generation.** Prefer templates, licensed libraries, runtime
   effects, and generated hero landmarks over generating every object.

## Product pipeline

```text
Track
  -> analysis and creator intent
  -> world bible
  -> narrative timeline
  -> versioned MusicWorldProject
  -> asset selection / generation
  -> runtime validation and preview
  -> export / publishing
```

The `MusicWorldProject` boundary must exist before automated generation or
community publishing becomes a core dependency.

## Current baseline

The repository already has:

- React Three Fiber and Rapier exploration runtime;
- deterministic, audio-duration-based timeline replay;
- music-reactive environment, camera, narration, landmarks, and portal state;
- spatial scene compilation and validation;
- interaction and adapter foundations;
- licensed asset manifest, optimization pipeline, LOD utilities, and budgets;
- unit tests for timeline, store, movement, asset resolution, LOD, and scenery layout.

The current experience still uses one default normalized timeline for every
track. It does not yet provide music analysis, project persistence, a creator
editor, a public share page, or a complete mobile input path.

## Phase 0 — Baseline and reliability

**Goal:** make the current runtime a trustworthy development baseline.

Deliverables:

- current-state and roadmap documents match `main`;
- full real-browser audio lifecycle is verified;
- WebGL/audio loading and failure states are explicit;
- desktop browser support and minimum device targets are documented;
- bundle, load-time, frame-rate, and asset budgets are measured in CI or a
  repeatable local check;
- stale experiments and local artifacts are separated from product source.

Exit gate:

- tests, type-check, asset build, and production build pass;
- a real track completes `load -> play -> seek -> natural end -> replay ->
  replace` in supported browsers;
- critical failures leave the user with a useful recovery action.

## Phase 1 — One complete vertical slice

**Goal:** prove that a Music Universe experience is enjoyable and understandable.

Scope:

- ship one curated **Journey** or **Memory** template;
- include a built-in demonstration track or a legally distributable sample;
- add onboarding, movement guidance, a clear beginning and ending;
- include three meaningful interactions tied to the narrative;
- provide replay, restart, mute/volume, subtitles, and reduced-effects controls;
- choose and document either a usable touch-control path or a desktop-only
  launch constraint;
- conduct small user tests with musicians and listeners.

Exit gate:

- a first-time user can enter and finish the experience without developer help;
- timeline, landmarks, interactions, and ending behave correctly after seeking
  and replay;
- the target device maintains the agreed performance floor;
- user feedback supports continuing with creation tools.

Non-goals:

- multiple templates;
- public community database;
- generative 3D world model integration;
- multiplayer or complex quests.

## Phase 2 — Versioned project schema and creator workflow

**Goal:** make worlds reproducible and editable rather than hard-coded demos.

Define a versioned `MusicWorldProject` containing:

```text
project metadata
track metadata and analysis
world bible
timeline cues
scene and landmarks
interactions and flags
asset records and licenses
presentation and accessibility settings
```

Deliverables:

- JSON Schema, validation, defaults, and version migration strategy;
- import/export and local save/recovery;
- timeline and environment editing;
- template and licensed-asset selection;
- real condition evaluation, project flags, and runtime event dispatch;
- preview/build validation with actionable errors.

Exit gate:

- a creator can produce, save, reopen, edit, and export a complete project
  without changing TypeScript source;
- the exported project deterministically reconstructs the same experience.

## Phase 3 — Assisted music-to-world generation

**Goal:** reduce authoring time while preserving creator control.

Recommended order:

1. extract duration, waveform, loudness, tempo, and candidate sections;
2. generate an editable world bible and emotional arc;
3. recommend a template, cues, effects, and licensed assets;
4. let the creator accept, edit, or replace every recommendation;
5. compile into the same `MusicWorldProject` used by manual editing;
6. generate only distinctive hero assets where reuse is insufficient.

Exit gate:

- generation produces valid projects within an explicit time and cost budget;
- creators can understand and correct the result;
- generation failures fall back to template editing without losing work.

## Phase 4 — Controlled sharing and publishing

**Goal:** validate sharing before building a social platform.

Deliverables:

- project hosting and immutable published versions;
- private, unlisted, and public visibility;
- audio rights declaration and takedown process;
- asset-license and attribution propagation;
- moderation and abuse reporting;
- shareable experience pages with social preview metadata;
- operational storage, CDN, and bandwidth budgets.

Exit gate:

- published experiences remain reproducible and legally traceable;
- creators can unpublish and update without breaking version history;
- operational cost per published/listened experience is understood.

## Phase 5 — Remixable universe

Only after controlled publishing is stable:

- project lineage and remix permissions;
- reusable templates and interaction modules;
- creator attribution and discovery;
- community asset reuse;
- public music world database;
- optional additional experience templates: Encounter, Transformation, and
  Open Planet.

## Cross-cutting risk gates

| Risk | Required response before expansion |
|---|---|
| Music copyright | Rights declaration, allowed-use policy, takedown path, and non-public workflow |
| Asset licensing | Per-asset provenance, license snapshot for custom terms, attribution generation |
| Performance | Target devices, bundle/load/runtime budgets, fallback quality levels |
| Accessibility | Keyboard, focus, captions, volume, reduced effects, touch strategy |
| Generation consistency | Schema validation, editable output, template fallback |
| Content moderation | Visibility controls, reporting, enforcement and audit trail |
| Cost control | Per-project analysis/generation/storage/delivery budgets |

## Explicitly deferred

- multiplayer;
- real spherical gravity;
- OS/file-system replacement features;
- procedural cities and complex quest systems;
- WebGPU requirement;
- monorepo migration without a proven packaging need;
- integrations with multiple world models before the project schema is stable.

## Roadmap change rule

A proposal may move work earlier only when it:

1. directly improves the current phase exit gate;
2. resolves a blocking reliability, rights, accessibility, or performance risk;
3. does not introduce an unproven platform dependency.

Other ideas go to a future backlog and do not change `NOW.md`.
