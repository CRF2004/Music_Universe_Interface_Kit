# Version consolidation — 2026-10-18

## Outcome and scope

Owner requested reconciliation of local work with published branches, separate
commits, and integration into `main`. This is baseline/reliability work supporting
the accepted Phase 2 creator workflow and the existing Phase 3 local-analysis
slice. Product direction, runtime behavior and owner-acceptance boundaries remain
unchanged. Local-analysis product acceptance is still pending.

Integration pull request: [#16](https://github.com/CRF2004/Music_Universe_Interface_Kit/pull/16).

## Reconciliation

GitHub was read through the owner's localhost HTTP proxy on port 7895. Remote
`main` was `a67004f`; the active local branch and its published counterpart both
pointed to `b7f08b6`. The original workspace contained 42 modified files and 79
new files. A byte-for-byte backup and SHA-256 inventory of all 275 non-ignored
source files were saved to `output/version-backup-20261018/`. A local safety
commit on `codex/local-snapshot-2026-10-18` preserves that original working state.

| Published branch | Snapshot | Integration |
|---|---|---|
| `agent/external-assets-outline` | `b7f08b6` | Runtime baseline merge |
| `codex/creator-acceptance-2026-10-04` | `255a31b` | Earlier schema-v1 snapshot; creator behavior is included in the newer sphere release |
| `codex/spherical-acceptance-2026-10-05` | `6b722c0` | Creator workflow, v2 migration and spherical planet merge |
| `codex/camera-soft-2026-10-05` | `471aa25` | Camera merge |
| `codex/memory-feedback-2026-10-05` | `481fd01` | Memory feedback merge |
| `codex/music-analysis-2026-10-05` | `56f1dcd` | Waveform, RMS and editable-section merge |

The runtime merge reconciles earlier squash merges on `main`; the resulting tree
matches `b7f08b6` exactly at that checkpoint. The five release merges together
match the published `56f1dcd` tree. Overlaying the original local snapshot then
produced no differences in `src/`, schemas, or npm dependency manifests.

Remaining local work was committed separately as generation-task recovery
tooling/policy, and isolated BPM scripts/research plus delivery documentation.
Dataset audio, model weights, generated candidates, credentials, dependencies
and browser artifacts remain ignored. No generation calls were made.

Fresh validation exposed a recovery-harness navigation race: `document.body`
can be absent just after reload. Three polling expressions now wait safely for
the body. This script-only repair has its own commit. Other new edits correct
stale baseline/analysis documentation and record this integration.

The apparent invalid Codex references were caused by Windows long-path handling.
Enabling repository-local `core.longpaths` restored ordinary fetches without
removing checkpoint records. Repository-local GitHub proxy configuration records
the owner's port. Integration and validation used an independent checkout under
`output/version-integration-20261018/`.

## Fresh validation

Windows desktop, bundled Node 24.19.0, production preview, hardware-enabled
headless Chrome and Edge. Browser journeys use synthetic audio; the separate
analysis fixture is 60 seconds with a known energy boundary.

| Check | Result |
|---|---|
| `npm test` | 107 passed |
| `npm run lint` | Passed |
| `npm run build` | Passed; all 16 assets validated/built, 6.07 MB generated |
| JavaScript syntax checks | 21 changed scripts passed; recovery script rechecked after repair |
| Tripo text `--dry-run` | Passed; sanitized request only, no provider call |
| Chrome creator journey | 132 checks, 24 screenshots, zero findings/runtime errors |
| Edge creator journey | 132 checks, 24 screenshots, zero findings/runtime errors |
| Chrome recovery, after harness repair | 8 checks, 2 screenshots passed |
| Edge recovery | 8 checks, 2 screenshots passed |
| Chrome spherical-world checks | 23 checks, 6 screenshots passed |
| Edge spherical-world checks | 23 checks, 6 screenshots passed |
| Chrome local-analysis workflow | 26 checks, zero page errors; fixture analysis 343 ms |
| Edge local-analysis workflow | 26 checks, zero page errors; fixture analysis 512 ms |

Production gzip sizes: ExperienceRoot 32.02 kB, PhysicsWorld 20.71 kB, Three
189.77 kB, Rapier 838.12 kB. Analysis helper 0.93 kB gzip; worker 1.40 kB raw.
The first build hit the previously documented Windows esbuild temporary-file
permission failure; using a task-owned TEMP/TMP directory passed.

Screenshots inspected: analysis sections, journey arrival, recovered memory,
and authored environment preview. Browser coverage includes keyboard/focus,
800x600 layouts, reduced effects, save/import/reopen, seek/replay, replacement,
collision/dragging, cancellation and useful recovery paths.

Reports and screenshots are under the integration checkout's
`output/playwright/integration-*/` and `output/playwright/music-analysis-*/`.
An initial recovery failure is retained beside the successful retry. Historical
handoff/crew files contain pre-existing Markdown hard-break/trailing-blank-line
warnings in the full `main` diff; they were preserved without mechanical edits.

## Limits and follow-up

This consolidation adds no runtime assets, dependencies, or generation services.
Existing rights records and private local-audio handling remain in place.
Independent creator timing, calibrated target-device/network performance,
semantic section accuracy, BPM adoption and owner analysis acceptance remain
follow-ups. BPM research was archived without repeating model/dataset experiments.
Browser automation and screenshot review do not supply listening-quality or
new human-observation evidence.
