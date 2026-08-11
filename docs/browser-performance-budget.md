# Browser Support and Performance Budget

> Status: provisional Phase 0 release gate; calibrate with measured devices
> Last updated: 2026-07-27

## Purpose

This document defines the first measurable browser and performance target for
the Memory Journey vertical slice. Values are initial engineering budgets, not
claims about the current build. Record measured results before changing a
budget or declaring the slice release-ready.

## Supported launch target

### Desktop

The first release targets current and previous major versions of:

- Chrome;
- Edge.

Firefox and Safari are compatibility follow-ups rather than Phase 0 release
blockers. They must not be described as supported until their full audio,
journey, and recovery lifecycle has equivalent evidence.

The runtime requires:

- WebGL 2 with hardware acceleration;
- Web Audio and `HTMLAudioElement`;
- ES modules and modern JavaScript;
- pointer and keyboard input.

### Mobile

The first release is explicitly desktop-only. Touch-only devices are stopped
before Canvas initialization with a readable explanation that keyboard and
pointer controls are required. Hybrid devices with a coarse pointer but hover
support may continue with their keyboard and pointer.

Mobile remains deferred until touch movement, interaction controls, layout,
audio unlock, and a target-device performance pass are complete.

CSS responsiveness alone is not mobile support.

## Reference device tiers

| Tier | Purpose | Provisional definition |
|---|---|---|
| Minimum | Release floor | 4 logical CPU cores, 8 GB RAM, integrated GPU with WebGL 2 |
| Reference | Primary tuning | Recent 6+ core laptop, 16 GB RAM, integrated or entry discrete GPU |
| High | Quality ceiling | Modern discrete GPU; must not hide minimum-tier regressions |

Record browser version, OS, viewport, device pixel ratio, power state, GPU, and
whether the run was cold or cached.

## Loading budgets

Measured on a clean profile, production build, 20 Mbps downlink, 40 ms RTT:

| Metric | Target | Hard ceiling |
|---|---:|---:|
| Visible loading/recovery UI | 1.0 s | 2.0 s |
| World usable with demo track | 5.0 s | 8.0 s |
| Initial shell JavaScript, gzip | 150 KiB | 200 KiB |
| Loaded 3D runtime JavaScript, gzip | 1.3 MiB | 1.5 MiB |
| Critical first-view asset transfer | 10 MiB | 15 MiB |
| Complete vertical-slice asset transfer | 30 MiB | 50 MiB |
| Critical requests before world is usable | 30 | 45 |
| Total first-journey requests | 80 | 120 |

The repository manifest’s 50 MiB total generated-asset limit remains a hard
build ceiling, not a target to consume.

The authorized built-in Crywolf demo adds 5.83 MiB of generated Ogg audio. The
complete generated asset set is 6.07 MiB, inside the vertical-slice transfer
target; cold-load measurement on minimum/reference hardware is still required.

## Runtime budgets

Measure at the release viewport and device pixel ratio:

| Metric | Minimum tier target | Hard floor |
|---|---:|---:|
| Exploration frame rate | 55 FPS median | 30 FPS sustained |
| 1% low frame rate | 40 FPS | 24 FPS |
| Main-thread long tasks during play | no repeated >100 ms tasks | no >500 ms task |
| Estimated GPU memory | <= 512 MiB | <= 768 MiB |
| Draw calls in normal view | <= 150 | <= 250 |
| Visible triangles in normal view | <= 500k | <= 1M |
| Music-to-runtime cue response | <= 50 ms | <= 100 ms |
| UI sound response after unlock | <= 100 ms | <= 200 ms |

The normal view must include representative rain, landmarks, interaction
visuals, portal, shadows, and post-processing. Do not benchmark an empty spawn.

## Quality tiers

The runtime should eventually expose deterministic quality levels:

| Feature | High | Balanced | Reduced |
|---|---|---|---|
| Device pixel ratio | up to 2.0 | up to 1.5 | 1.0 |
| Shadows | full | reduced map/range | off or blob only |
| Post-processing | full | reduced bloom/effects | minimal |
| Rain/stars | full count | reduced count | strongly reduced |
| Model LOD | normal thresholds | earlier LOD | earliest LOD |
| Spatial ambience | full | reduced voices | essential cues only |

Reduced-effects accessibility is separate from GPU quality. A fast device must
still honor reduced-effects preference.

## Measurement protocol

For every release candidate:

1. build from a clean production state;
2. record output chunk and generated-asset sizes;
3. load once with cache disabled and once warm;
4. complete the Memory Journey acceptance walkthrough;
5. sample arrival, storm, Memory Tree, Light Path, open gate, and afterglow;
6. capture median/1% low FPS, draw calls, triangles, estimated texture memory,
   request count, and transferred bytes;
7. repeat on minimum and reference tiers;
8. attach results and deterministic screenshots to the PR.

Asset preview screenshots do not replace runtime measurements.

## Estimation rules

- Texture GPU memory must include mipmaps and uncompressed runtime format, not
  only compressed file size.
- Audio transfer size and decoded memory are reported separately.
- Shared/cached assets are counted once in transfer totals.
- Development-mode React, source maps, browser extensions, and open devtools
  may distort timings; use a production preview and note tooling overhead.
- Report regressions even when the hard ceiling still passes.

## Release decision

The vertical slice is ready only when:

- supported browsers complete the audio and journey lifecycle;
- minimum-tier measurements stay above hard floors;
- normal targets pass or an approved issue explains the exception;
- WebGL/runtime/audio failures provide a recovery action;
- unsupported mobile users are not dropped into an unusable world.

Change a budget only with measurements and a product tradeoff, not to silence a
warning.

## Browser reliability run — 2026-08-11

Production black-box regression on Windows verified:

- Chrome loaded, sought, replaced, and completed the authorized Crywolf demo
  with 46 checks and no application runtime errors;
- Edge completed the deterministic WAV lifecycle, including natural end,
  replay reconstruction, interactions, and context-loss recovery, with 47
  checks and no application runtime errors;
- forced WebGL 2 unavailability remained readable across three reloads;
- a forced runtime render failure reached the reloadable error boundary, and
  removing the E2E-only fault restored normal world startup.

The E2E fault parameters are ignored unless `e2e=1` is also present. The
headless software-audio environment decodes and seeks the authorized MP3 but
does not advance its media clock reliably, so natural-end evidence comes from
the deterministic WAV fixture. A headed hardware-browser pass remains required
for the demo track's audible natural end. The first-release supported-browser
matrix is Chrome and Edge.

## Measurement record — 2026-07-27 container baseline

This run is useful for correctness and resource-count baselining, but it is
**not a target-device GPU pass**. The available Chromium instance reported
ANGLE SwiftShader; headed Chromium could not create WebGL 2 and correctly
displayed the recovery page.

Production build, Chromium, 1280×720, device pixel ratio 1, reduced effects:

| Metric | Result | Interpretation |
|---|---:|---|
| Median / 1% low | 9.23 / 4.01 FPS | Invalid for hardware release gating; software renderer |
| Draw calls | 51 | Within normal-view target |
| Visible triangles | 32,266 | Within normal-view target |
| Lower-bound GPU allocation estimate | 14.65 MB | Geometry, textures, and framebuffers only |
| Requests / encoded transfer | 26 / 1.49 MB | Warm local production preview |
| Spatial loops after input unlock | 2 | Portal and wind loops active |
| Web Audio context | running | Unlock succeeded |
| Footstep events during held movement | 9 | Alternating footstep lifecycle active |

The same browser completed local audio load, play, natural end, replay,
interaction-state reset, and replacement-oriented UI flow with zero console
errors. A hardware-accelerated minimum-tier and reference-tier run remains
required before release.

### Production JavaScript split

The 3D application is now split into stable cache boundaries rather than
placing renderer and physics dependencies in `ExperienceRoot` and
`PhysicsWorld`:

| Chunk | Raw | Gzip |
|---|---:|---:|
| ExperienceRoot | 37.39 kB | 11.84 kB |
| PhysicsWorld application code | 41.59 kB | 13.43 kB |
| Three runtime | 732.43 kB | 189.75 kB |
| React Three integration | 256.40 kB | 81.37 kB |
| Rapier physics runtime | 2,260.67 kB | 838.07 kB |
| Motion runtime | 129.03 kB | 42.41 kB |

Rapier remains a large raw module, but the measured compressed runtime remains
inside the provisional 1.3 MiB 3D JavaScript target. The build warning limit is
set to 2.5 MB raw specifically for this known dependency; compressed transfer
and target-device execution remain the release gates.

## Hardware run — 2026-07-28

Production preview measured in Windows Chrome 150 at 1280×720 on:

```text
ASUS TUF Gaming F15 FX507VU
Intel Core i5-13500H, 12 cores / 16 logical processors
16 GB RAM
NVIDIA GeForce RTX 4050 Laptop GPU
ANGLE Direct3D 11, hardware acceleration confirmed
```

Warm arrival-state result:

| Metric | Result | Budget result |
|---|---:|---|
| Median FPS | 144.93 | pass |
| 1% low FPS | 72.46 | pass |
| Draw calls | 34 | pass |
| Visible triangles | 24,818 | pass |
| Lower-bound GPU allocation estimate | 14.15 MB | pass |
| Requests | 23 | pass |
| Encoded transfer | 1.39 MB | pass |

This is a valid high-tier hardware result. It does not replace the required
integrated-GPU minimum/reference-tier run. The first short cold sample included
startup compilation and produced a misleading 6.55 FPS 1% low; the recorded
result uses the settled 600-frame sample required by the protocol.

The departure automation now creates a deterministic local WAV fixture and
records setup diagnostics. A stable post-reload departure sample is still
required on the integrated-GPU tier; arrival hardware acceleration and the
high-tier performance floor are verified.
