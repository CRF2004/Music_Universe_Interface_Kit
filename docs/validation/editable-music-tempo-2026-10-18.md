# Editable tempo validation — 2026-10-18

## Outcome

Implemented the [bounded Phase 3 tempo slice](../editable-music-tempo.md):
manual BPM or tap suggestions, half/double correction, first-beat offset,
in-editor song play/pause, explicit selected-cue beat alignment, clear,
undo/redo and local project persistence. Automatic BPM detectors remain isolated
research. No dependencies, runtime assets, paid calls or external requests were
added. Product listening/interaction acceptance remains pending.

## Evidence

- `npm test`: 112 passing. Coverage includes bounded/stable tap estimation,
  invalid values, first/last beat bounds and ties, strict project round-trip,
  stale edit rejection, tempo undo/redo/clear and replacement history isolation.
- `npm run lint`: passing.
- `npm run build`: passing with task-owned TEMP/TMP under
  `output/tempo-review-temp`. All 16 existing assets validate/build to 6.07 MB.
  ExperienceRoot is 116.10 kB raw / 34.08 kB gzip (previous 32.02 kB gzip,
  +2.06 kB). PhysicsWorld 20.71 kB gzip, Three 189.77 kB and Rapier 838.12 kB
  gzip remain unchanged. Analysis helper is 0.92 kB gzip; worker 1.40 kB raw.
- `node --check scripts/check-music-tempo-browser.js` and `git diff --check`: passing.
- Production Chrome and Edge tempo reports and desktop/800×600 screenshots:
  `output/playwright/music-tempo-{chrome,edge}/`.
  Final build: 34 checks pass per browser, zero page errors, including the final
  in-editor play/pause controls. Existing renderer/library deprecation warnings
  remain; they are not page errors.
- Both browsers verify save focus, unchanged playback after tempo editing,
  tempo confirmation, nearest-beat cue placement, undo/redo, half/double,
  unsaved-edit protection, clearing/restoring, tapping, first beat from playhead,
  analysis coexistence, invalid-import preservation, keyboard navigation,
  refresh without audio, same-song recovery, replacement and project isolation.
- Seeking before/after the aligned weather cue reconstructs the correct sky
  state, including repeated backward/forward seeks and playback from zero.
- The existing local-analysis browser workflow also passed all 26 checks in
  both browsers against the production build, with no page errors. These runs
  preceded the final in-editor play/pause addition.
- Desktop and compact screenshots were inspected for readable labels, input
  focus and contained controls. Tests use the synthetic 60-second local tone
  fixture; tap suggestions are exercised through real button clicks.

## Limits and follow-up

- One constant tempo per song; no automatic recognition or variable-tempo map.
- Tapping accuracy depends on the creator. Suggestions require explicit Save;
  no detector accuracy or musical listening-quality result is claimed.
- New controls add no timers or animation; existing reduced-effects settings
  and desktop-only input policy remain applicable. No weak-device calibration
  or dedicated reduced-effects browser scenario was run for this slice.
- The complete creator journey, natural-end replay and global recovery suites
  were not rerun. Targeted tests cover the affected seek/restart, persistence,
  invalid import and song replacement paths.
- Older strict v2 readers reject projects containing the new optional tempo
  field. Existing projects without it continue to validate.
- The previously untracked local-analysis review document was preserved.
  No unrelated working-tree changes were reset or removed.

## Try it

Open the local preview, load a song and open the project editor. Find
**音乐分析与分段 → 节奏与拍点**. Play the song in this panel, tap at least four
times, correct BPM and first-beat time, then Save. Select an existing timeline
cue above and align it to its nearest beat. Seek around the cue to judge the
result; undo remains available. Export and refresh to check recovery.
