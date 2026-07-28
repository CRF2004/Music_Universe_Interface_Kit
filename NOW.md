# NOW — Music Universe baseline and vertical slice

> Last updated: 2026-07-28
> Branch at audit: `agent/external-assets-outline`
> Baseline commit at audit: `d734b4d feat: add data-driven outlines to interaction models`

## Current phase

Roadmap Phase 0: baseline and reliability.

The next product outcome is one complete, understandable 3–5 minute vertical
slice. AI generation, creator publishing, and community features remain later
phases until the runtime baseline and experience loop pass their exit gates.

## Completed baseline

- The audited branch contains the runtime baseline through the external asset,
  spatial audio, performance telemetry, and data-driven outline work.
- Real audio duration drives normalized timeline compilation.
- Timeline state reconstructs deterministically on seek and replay.
- Environment, camera, narration, landmarks, light path, and departure portal
  react to runtime cues.
- Runtime assets use a licensed manifest, optimization pipeline, size budgets,
  hashed output, and LOD support.
- Memory Tree and Departure Portal have optimized GLB assets.
- Four CC0 interaction models and six CC0 audio sources are resolved through
  the runtime manifest, with fallback visuals for model failures.
- Spatial portal/wind loops, UI hover/confirm sounds, footsteps, performance
  telemetry, asset reports, and preview artifacts are integrated.
- Reactive scenery adds deterministic instanced rocks and sky ornaments.
- WebGL 2 probing and a runtime error boundary provide a reload path before a
  Canvas/startup failure leaves the screen unusable.
- The first supported-browser and performance budgets are documented in
  `docs/browser-performance-budget.md` pending target-device calibration.
- Unit coverage includes timeline, runtime store, player movement, asset
  resolution, LOD behavior, scenery layout, interaction conditions, scene
  condition validation, Store/Dispatcher flags and lifecycle reset, and WebGL
  startup probing.

## Baseline verification

Run on 2026-07-28:

```text
npm test       46 passing
npm run lint   passing
npm run build  passing; 15 assets, 240.60 kB generated total
```

Current production split:

```text
ExperienceRoot app code  37.39 kB (11.84 kB gzip)
PhysicsWorld app code     41.59 kB (13.43 kB gzip)
Three runtime            732.43 kB (189.75 kB gzip)
Rapier runtime         2,260.67 kB (838.07 kB gzip)
```

The former application-chunk warnings are resolved through explicit cache
boundaries. Rapier remains the dominant compressed transfer. Hardware
target-device measurement is still required before public release.

## Current priorities

### P0 — Must finish before feature expansion

1. Repeat the completed Chromium audio/interaction lifecycle on the supported
   hardware browser matrix.
2. Measure and calibrate the provisional hardware device, frame-rate, loading,
   request, GPU-memory, and bundle budgets in
   `docs/browser-performance-budget.md`.
3. Browser-verify the WebGL/runtime recovery page and add explicit recovery for
   any remaining audio or context-loss failure.
4. Decide the first-release touch strategy: implement controls or explicitly
   ship desktop-only.
5. Create a legally distributable built-in demonstration track or documented
   demo input.

### P1 — First vertical slice

Prepared:

- the Memory template is selected;
- the experience and lifecycle contract is documented in
  `docs/memory-journey-vertical-slice.md`;
- a pure, typed interaction condition/flag/event kernel is implemented and
  tested;
- the kernel is integrated with the Store and Dispatcher;
- `set-flag` and `clear-flag` actions are schema-validated;
- track load/replacement, clear, and ended-track replay reset session
  interaction state.

Implemented:

- Product World content is replaced by the Listener Guide, Echo Terminal,
  Memory Archive, and Departure Gate journey contract;
- the three narrative flags and timeline-derived gate-open condition control
  progression without seek fabricating deliberate actions;
- blocked interactions provide an assertive world-readable next-step message;
- first-entry guidance, keyboard prompts, modal focus management, visible focus,
  and a persisted reduced-effects mode are present;
- reduced effects cover rain, star density, shadows, pixel ratio, camera
  smoothing, and interface motion.
- independent persisted music/effects volume and mute controls are available;
- narration subtitles can be toggled without hiding interaction guidance;
- the first-user protocol and engineering proxy run are documented in
  `docs/first-user-observation.md`.

Next:

1. Recruit 3–5 first-time participants and record completion problems with the
   prepared observation protocol.
2. Complete integrated-GPU minimum/reference-tier departure measurements; the
   RTX 4050 high-tier run passes at 144.93 FPS median / 72.46 FPS 1% low.

## Known gaps

- every uploaded track currently uses the same default normalized timeline;
- non-flag condition sources need explicit adapter resolvers before use;
- no versioned `MusicWorldProject` exists yet;
- no creator save/import/export workflow exists;
- no public share page or publishing backend exists;
- keyboard is the only complete movement input;
- load and runtime performance do not yet have hardware target-device
  measurements;

## Not now

- world-model integrations;
- multiple experience templates;
- community publishing or remix;
- multiplayer;
- true spherical physics;
- monorepo migration;
- WebGPU migration.

## Definition of done for the current phase

- automated checks pass;
- real-browser audio lifecycle passes;
- target device and performance budgets are recorded;
- failure states provide a recovery action;
- touch/desktop-only decision is explicit;
- vertical-slice brief and legally usable demo audio are ready.

## Working-tree care

- `.playwright-cli/` is a local browser artifact and should not be committed
  without an explicit repository policy.
- `Music_Universe_PR7_Local_Agent_Handoff_2026-07-17.md` is historical PR
  handoff material; archive or remove it in a dedicated housekeeping change.
- Preserve unrelated local changes when implementing current priorities.
