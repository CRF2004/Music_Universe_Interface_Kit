# World Development and Autonomous Validation Tooling

> Status: active tooling direction
> Last reviewed: 2026-08-04

## Problem

The current loop depends too heavily on a person noticing a visual or physical
defect, describing it, and waiting for a code-level correction. Automated unit
tests cover deterministic state well, but they do not yet describe enough of
the rendered world for an agent to verify spatial coherence on its own.

The goal is not to build a general game engine. The goal is to make the current
Memory Journey faster to inspect, change, and regress.

## Repository-native tools

### Reviewed visual profiles

`src/interaction/visualProfiles.ts` is the shared contract between normalized
model height and physical collider shape. A model replacement must update this
profile and its test in the same change.

This prevents render code and physics code from independently hard-coding
incompatible dimensions.

### Physics debug view

Open a local or deployed build with:

```text
?physicsDebug=1
```

This uses the existing `@react-three/rapier` debug renderer to draw the live
collider world. It is a development-only URL switch and adds no visible control
to normal research sessions.

### Machine-readable world inspection

Open the experience with:

```text
?e2e=1
```

The browser exposes:

```text
window.__MUSIC_UNIVERSE_WORLD_E2E__
```

It contains a current snapshot of:

- world id and player position;
- current objective and nearest interaction;
- journey flags and music-driven environment state;
- interaction positions, radii, and reviewed collider profiles.

It also provides `triggerInteraction(id)` for deterministic browser smoke
checks. This complements the existing player, audio, and performance telemetry.

## Recommended next automation slice

Build one repository script that launches the production preview and drives the
existing browser probes through the complete journey:

```text
load
  -> snapshot spawn state
  -> move to Guide
  -> assert collision boundary
  -> trigger Guide
  -> assert objective becomes Archive
  -> trigger Archive
  -> assert world reaction
  -> seek until Gate opens
  -> trigger Gate
  -> replay
  -> compare semantic snapshots and fixed-view screenshots
```

The runner should output JSON plus screenshots under `output/playwright/`.
Assertions should prefer world semantics and physics positions over fragile
pixel-only comparisons. A small set of fixed camera screenshots remains useful
for rain, lighting, material, occlusion, and composition regressions.

Do not build an editor, ECS, or general quest framework as part of this slice.

This slice is now available as:

```bash
npm run journey:regression
```

It builds the production app with relative asset paths, launches an isolated
Chromium session over a port-free DevTools Pipe, fulfills the production files
through an in-process HTTP-origin route, drives the complete journey, and
writes its JSON report and fixed-stage screenshots to
`output/playwright/journey-regression/`.

## Reusable ecosystem assessment

### Adopt selectively

- [React Three Drei](https://github.com/pmndrs/drei) is already installed and
  should remain the first choice for cameras, loaders, helpers, controls, HTML
  anchoring, and staging rather than adding local wrappers.
- [react-three-rapier](https://pmndrs.github.io/react-three-rapier/) already
  provides collider debug rendering, sensors, collision events, groups, and
  physics snapshots. Use these before building physics instrumentation.
- [gltfjsx](https://github.com/pmndrs/gltfjsx) can turn reviewed GLBs into
  typed, reusable R3F components and can expose model structure for tests. Pilot
  it on one authored hero asset; keep the current glTF-Transform asset pipeline
  as the optimization and licensing authority.

### Bounded spike only

- [Triplex](https://github.com/pmndrs/triplex) is a visual workspace for React
  Three Fiber components. Test it on a disposable branch against one scenery
  component. Adopt only if it preserves schema-driven scene data and does not
  make the visual editor a runtime dependency.
- [Pascal Editor](https://github.com/pascalorg/editor) is a Phase 2 technical
  reference for the future Creator editor, especially its validated scene data,
  transaction/undo model, IndexedDB persistence, typed plugin registry, and
  shared visual/headless mutation layer. Do not add its packages, building
  schema, Next.js/WebGPU runtime, or asset catalog to the product by default. A
  future spike must use the canonical `MusicWorldProject` API and prove one
  disposable, narrow editing slice; every exported asset still requires normal
  provenance, license, budget, and perceptual validation.
- [ecctrl](https://github.com/pmndrs/ecctrl) offers a Rapier-backed character
  controller. It may reduce future work on slopes, stairs, moving platforms,
  and camera behavior, but replacing the current deterministic controller
  during the vertical-slice repair would be high-risk. Evaluate it only after
  the scripted collision route exists.
- [@pmndrs/detect-gpu](https://github.com/pmndrs/detect-gpu) can seed automatic
  quality tiers. Its maintainers note that the underlying benchmark source
  stopped updating in December 2025, so it must supplement rather than replace
  measured runtime FPS and target-device testing.

### Reusable asset sources

- [Kenney UI Pack](https://kenney.nl/assets/ui-pack) provides 430 CC0 UI files.
- [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds) provides
  100 CC0 interface sounds.
- [Quaternius Modular Platformer Pack](https://quaternius.com/packs/modularplatformer.html)
  provides 53 CC0 modular environment models.

Assets still enter through the repository asset manifest, provenance review,
conversion, budgets, and perceptual validation. A library's permissive license
does not authorize bypassing that pipeline.

## Decision

The highest-return current work is a thin inspection and regression layer
around the current R3F/Rapier runtime, not an engine migration. Triplex,
gltfjsx, ecctrl, and GPU tiering are candidates for bounded pilots after the
full journey smoke runner is stable. Pascal remains a Phase 2 architecture
reference, not a current dependency or pilot, until the versioned project
schema and Creator workflow are active work.
