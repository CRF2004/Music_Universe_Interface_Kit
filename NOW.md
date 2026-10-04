# NOW — Music Universe project schema and creator workflow

> Last updated: 2026-10-03
> Phase 0/1 acceptance baseline: `b7f08b6 feat: refine player proportions and gait`

## Current phase

Roadmap Phase 2: versioned project schema and creator workflow.

The project owner accepted the Phase 0 reliability baseline and Phase 1 Memory
Journey vertical slice on 2026-08-19. The next product outcome is a reproducible,
editable project that can be saved, reopened, changed, and exported without
editing TypeScript source. AI generation, creator publishing, and community
features remain later phases.

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
- An optional development-only Tripo CLI can stage reproducible text/image-to-3D
  candidates with generation receipts. Candidates still require rights,
  geometry, perceptual, collision, asset-pipeline, and performance review before
  entering the runtime manifest; creator-facing generation remains Phase 3.

## Baseline verification

Run on 2026-08-01:

```text
npm test       51 passing
npm run lint   passing
npm run build  passing; 16 assets, 6.07 MiB generated total
npm run journey:regression  passing; 22 checks, 5 screenshots, 0 browser errors
```

Current production split:

```text
ExperienceRoot app code  38.48 kB (12.17 kB gzip)
PhysicsWorld app code     48.30 kB (15.32 kB gzip)
Three runtime            732.43 kB (189.75 kB gzip)
Rapier runtime         2,260.70 kB (838.08 kB gzip)
```

The former application-chunk warnings are resolved through explicit cache
boundaries. Rapier remains the dominant compressed transfer. Hardware
target-device measurement is still required before public release.

Working-state verification on 2026-08-05:

```text
npm test       58 passing
npm run lint   passing
npm run build  passing; 16 assets, 6.07 MiB generated total
journey regression with synthetic audio  passing; 27 checks, 5 screenshots
journey regression with private local demo input  passing; 27 checks, 5 screenshots
```

Release-candidate verification on 2026-08-19 after introducing
`MusicWorldProject` v1 and the first local creator workflow:

```text
npm test       73 passing
npm run lint   passing
npm run build  passing; 16 assets, 6.07 MiB generated total
Chrome journey regression  passing; 77 checks, 13 screenshots
Edge journey regression    passing; 77 checks, 13 screenshots
Chrome recovery regression passing; 8 checks, 2 screenshots
Edge recovery regression   passing; 8 checks, 2 screenshots
```

The browser journey now covers library creation, duplicate, rename, open,
recoverable delete/restore, normalized cue editing, Archive position editing,
runtime and physics reconstruction, debounced IndexedDB autosave, export,
invalid-import preservation, refresh recovery, and valid re-import before
continuing through the full listener journey.

The first Chrome run exposed a fixed-time gait assertion and one-frame-stale
velocity telemetry. The runtime now reports the velocity applied in the current
frame and the regression waits within a bounded animation window; the complete
Chrome and Edge journeys then passed.

The black-box first-user agent also verified that the WebGL-unavailable page is
readable and stable across three reload attempts in a headed software-rendered
environment. That environment could not enter the world without the explicit
test-only software-renderer override, so it is recovery evidence rather than a
completed experience preflight or target-device result.

## Current priorities

### P0 — Versioned project boundary

Completed:

1. `MusicWorldProject` v1 is typed, JSON-described, and strictly validated.
2. The curated Memory Journey is the default project; scene and normalized
   timeline runtime behavior consume it.
3. Creator-facing JSON import/export reports actionable validation errors and
   preserves the active draft after invalid input.
4. IndexedDB creates, autosaves, and restores the active local draft.
5. The Project Editor moves the Memory Archive on X/Z and reconstructs both the
   rendered interaction and Rapier collision body from project data.
6. The local library creates, duplicates, renames, opens, soft-deletes, and
   restores named drafts while preserving one valid active project.
7. The first bounded timeline editor changes an existing cue's normalized
   position without changing its identity or typed actions.
8. Archive coordinates and cue positions share validated undo/redo transactions,
   with up to 100 session edits and isolated history when projects change.
9. The Memory Archive can be dragged on X/Z using the existing Drei controls.
   A complete drag commits one edit; Escape, window blur, and canceled pointer
   input restore the committed position. Coordinate inputs remain available.
10. Existing environment actions expose sky/ground hex colors, rain (0–1), and
    bloom (0–2). Apply, undo/redo, autosave and JSON round-trip use the validated
    project path; blank fields inherit previous cues or runtime defaults.
11. Successful local uploads bind the song's name, actual duration, byte size,
    SHA-256 identity and unverified private-preview rights record to the project.
12. Refresh/open/import request the saved original song, verify matching bytes
    and duration, and preserve the project after a wrong selection. Project
    switching cancels pending audio and clears playback; failed replacements
    preserve the previous song. Audio bytes stay on the user's computer.

Next:

1. Observe a human creator completing the saved-project workflow and record
   remaining usability issues; retain target-device performance calibration.
2. Run the B1 same-image DMX Tripo P1 / Hyper3D (Rodin) / Meshy comparison.
   The owner authorized one generation per DMX provider, total at most CNY 10;
   published standard-image estimates total CNY 5.30. The first DMX token
   excluded both models; one Hyper3D submission returned HTTP 403 with no task.
   The replacement token has access and both candidates were generated,
   optimized and visually checked: Tripo 329,160 bytes / Rodin 405,776 bytes.
   Both need pedestal cleanup and remain isolated candidates. The owner's
   Meshy 6 Lite export was checked: 158,870 triangles / 1,408,048 optimized
   bytes; an 8,000-triangle variant is 526,516 bytes with visible quality loss.
   Rodin cleanup produced a 12-part, 5,142-triangle candidate (399,260 bytes),
   with rebuilt pedestal/energy surface and edit/export round-trip checks.
   Script-assisted repair and verification took 6.85 minutes. The owner accepted
   workflow validation as this pilot's endpoint; further finishing is deferred.
   Open seams and inner-edge remnants are recorded candidate limitations;
   rights and target-device review are prerequisites for future adoption. See
   [the cleanup evidence](docs/validation/hyper3d-cleanup-2026-10-03.md).
   Meshy 7.1 / Smart Topology and Tripo P2 remain
   a separate deferred comparison; do not label P1 results as P2 evidence.
3. The owner authorized one isolated Marble room pilot with zero cash spend.
   The owner's generated room was inspected in Marble: coherent room layout,
   stretched door detail and blurred pedestal surfaces; retain a visual room
   candidate. The owner confirmed export is unavailable and chose not to pay;
   stop this pilot at the free visual review. Collision and local-browser
   performance remain untested until export becomes available and the owner
   reopens the pilot. This pilot does not advance the
   formal product to Phase 3. See
   [the updated pilot record](docs/validation/3d-tool-pilots-2026-10-03.md).

The project owner accepted planning for reusable 3D tools on 2026-10-02.
The detailed sequence, experiment limits, acceptance evidence, and fallback
choices live in [the 3D tools adoption plan](docs/3d-tools-adoption-plan.zh-CN.md).
Undo/redo, Archive dragging and bounded environment-action editing are implemented;
complete editor engineering acceptance passes; tool pilots remain pending. Current evidence and browser
limitations are recorded in
[the drag editing validation record](docs/validation/archive-drag-editing-2026-10-02.md).
Environment-action validation and the current browser limitation are recorded in
[the cue editing validation record](docs/validation/cue-environment-editing-2026-10-02.md).
Full creator acceptance and its audio fixes were completed on 2026-10-02.
Current checks: 93 unit tests, lint and production build pass. Chrome and Edge
each pass 125 real-song creator checks and 8 recovery checks with zero runtime
errors. A4 engineering acceptance passes; human creator observation remains
part of overall Phase 2 acceptance. See
[the audio recovery acceptance record](docs/validation/project-audio-recovery-2026-10-02.md).
Define the first real schema migration only when v2 has an accepted need.

### Planned 3D tool evaluations — after the editor gate

After the creator workflow above passes, evaluate one authored landmark using
DMX Tripo P1, Hyper3D (Rodin) and Meshy 6 Lite (received free export), then one existing-journey animation or VFX
improvement using Quaternius / Wawa VFX. Each evaluation has a separate review
and the existing asset pipeline remains the acceptance boundary.

Marble + Spark and HY-World belong to a bounded Phase 3 scene pilot after
Phase 2 acceptance. Triplex, Asset Forge, and Spline are authoring candidates;
Theatre.js, ecctrl/BVHEcctrl, TRELLIS.2, ARDY, Atlas, WorldClaw, and Buffalo are
conditional evaluations or research references. Tool selection and dependency
adoption require the evidence specified in the plan.

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
- GitHub Pages builds automatically from `main` and supports manual deployment
  of a selected research branch with repository-safe asset paths.
- the first observation repair pass replaces synchronized rain with independent
  drop motion, stabilizes instanced-rock visibility, adds rock collision, and
  introduces a three-stage world-space trail and destination beacon;
- objective completion now produces explicit feedback and advances a visible
  three-step journey state;
- an instanced memory grove adds mid-ground depth and visibly reacts when the
  memory is recovered;
- research builds hide development controls by default and keep idle audio
  controls compact.
- built-in prop rendering and collision now share reviewed visual profiles;
- physics debug rendering and a machine-readable world inspection snapshot are
  available for agent/browser regression work.
- `npm run journey:regression` builds a relative-path production bundle and
  contains the full Guide -> Archive -> Gate -> Replay semantic, collision, and
  fixed-camera regression flow. The complete asset-build -> production-build ->
  Chromium path passes locally with 22 checks, five screenshots, and no browser
  runtime errors.
- the first release is explicitly desktop-only; touch-only devices receive a
  readable keyboard/pointer requirement before Canvas startup;
- audio decode/load errors expose an immediate replacement-file action, and a
  lost WebGL context moves to a reloadable non-Canvas recovery page;
- `crew/agents/first-user-experience.md` defines a bounded, read-only black-box
  agent preflight before human observation, with a versioned scenario and
  report schema. It cannot inspect semantic probes or replace human testing.
- the project owner authorized Crywolf’s 4:38 `ATHETOSIS` recording as the
  public built-in demo. It is available as a one-click start, processed through
  the licensed asset pipeline, and recorded as
  `LicenseRef-Project-Owner-Demo-Authorization`; the underlying written
  permission should supplement the repository snapshot before distribution audit;
- the first-user crew now has versioned professional heuristics, frozen
  calibration cases, a governed improvement protocol, deterministic report
  validation/comparison tools, and a hardware Chrome black-box driver that
  exposes only screenshots and visible keyboard/pointer input;
- hardware black-box testing found and repaired stale local-coordinate
  proximity detection, focused-button suppression of the `E` key, world-label
  click interception, subtitle/feedback overlap, and three driver calibration
  failures. Native Chrome visual evidence now shows the Guide proximity prompt
  followed by panel opening and Step 2 progression.
- headed hardware Chrome and Edge regressions now complete the authorized demo
  track's load, play, seek, natural-end, replay, interaction, accessibility,
  and context-loss lifecycle with 48 checks and six screenshots per browser;
  both browsers also pass the forced WebGL/runtime recovery suite.

Accepted on 2026-08-19:

- the project owner reports that first-time user observation is complete and
  found no material blocker; participant-level timings were not supplied to the
  repository, so no unaudited threshold metrics are claimed;
- the first release does not promise integrated-GPU support. Supported launch
  hardware is a desktop system with a hardware-accelerated discrete GPU;
- the RTX 4050 supported-tier run passes at 144.93 FPS median / 72.46 FPS 1% low.

## First observation findings

The first external observation reported:

- rough visuals and insufficient environmental variety;
- intermittent missing rocks, collision clipping, and apparently frozen rain;
- unclear task purpose and weak interaction feedback;
- low moment-to-moment engagement.

The immediate priority is therefore experience comprehension and spatial
reliability, not feature expansion. The next observation round is the
acceptance evidence for this repair pass.

The second observation round additionally found that the character camera did
not match established third-person controls, timeline-driven weather and color
changes cut abruptly, the Memory Tree overlapped the solid Archive, and the
star field still read as a regular point grid. The immediate repair adds a
click-to-lock mouse orbit camera with camera-relative movement, smooths the
environment/rain response, separates the Tree from the Archive footprint, and
uses a deterministic irregular sky distribution. Higher-fidelity authored
models remain a focused art-direction follow-up rather than an undirected asset
expansion.

## Known gaps

- every uploaded track currently uses the same default normalized timeline;
- uploaded audio bytes stay on the user's computer; refresh/open/import require
  selecting the matching original file. Legacy projects without fingerprints
  require explicit replacement; JSON alone cannot carry the audio;
- non-flag condition sources need explicit adapter resolvers before use;
- `MusicWorldProject` v1 covers the current Memory Journey, but no migration
  path exists until a second schema version creates a real migration case;
- named local drafts exist, but there is no permanent trash cleanup, storage
  quota UI, or cloud synchronization;
- edits cover Memory Archive X/Z, existing Cue positions, and four environment
  action fields; general scene editing and other action types remain deferred;
- no public share page or publishing backend exists;
- keyboard is the only complete movement input;
- the launch is intentionally desktop-only; mobile/touch controls are deferred
  until the desktop product is mature;
- integrated-GPU performance is best effort and explicitly outside the first
  release support promise;

## Not now

- world-model integrations;
- creator-facing Tripo/API generation; the internal candidate CLI does not
  promote this work ahead of the versioned project and editor;
- multiple experience templates;
- community publishing or remix;
- multiplayer;
- true spherical physics;
- monorepo migration;
- WebGPU migration.

## Definition of done for the current Phase 2 slice

- `MusicWorldProject` v1 is typed, strictly validated, and documented;
- the default Memory Journey round-trips through JSON and reconstructs the same
  scene and duration-relative timeline;
- runtime scene and timeline behavior consume the default project;
- a creator can edit the Archive position, autosave, refresh, export, re-import,
  and recover from invalid input without editing TypeScript;
- automated checks and supported-browser journey/recovery regressions pass;
- Archive dragging and undo/redo use the validated project mutation path;
  local save/recovery and a bounded environment-action inspector are implemented;
- the expanded editor retains keyboard inputs, preserves drafts after invalid
  input or canceled edits, and reconstructs collision and timeline state after
  undo/redo, refresh, export, and re-import.

## Working-tree care

- `.playwright-cli/` is a local browser artifact and should not be committed
  without an explicit repository policy.
- `Music_Universe_PR7_Local_Agent_Handoff_2026-07-17.md` is historical PR
  handoff material; archive or remove it in a dedicated housekeeping change.
- Preserve unrelated local changes when implementing current priorities.
