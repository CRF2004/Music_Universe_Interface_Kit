# First world-assembly slice — 2026-10-18

## Outcome and boundary

Implements the owner's selected [world-assembly workflow](../world-assembly-workflow.zh-CN.md):
one complete Memory Journey template, a named new world, a bounded approved
asset catalog, optional gate model preview and two compatible gate choices.
The Guide, terminal and Archive each retain their one approved model. A
cancelable preflight verifies template license references and the four selected
main model binaries before creating an independent saved draft.

The optional `scene.objects[].appearance.assetId` is typed and validated against
the catalog and the project's licensed model references. Compilation carries it
to the runtime. Visuals and collision use the same reviewed profile. Existing
projects without this field continue to use their established defaults.
New world/asset identities remount model boundaries so old failure state cannot
silently persist into a newly created world.

No new assets, dependencies, generator calls or deployment were added. This is
a local template-assembly workflow; arbitrary imports, free scene assembly,
multiple story templates, generated candidate adoption and standalone asset
bundles remain outside this slice. Additional timeline landmarks still use
existing component-owned placement. Product acceptance remains pending.

## Validation

- `npm test`: 116 passing in the final source state. Tests cover both gate
  choices, default journey semantics, JSON reconstruction, incompatible choices,
  license/reference validation, invalid-draft preservation, separate drafts and
  preflight missing/corrupt model rejection.
- `npm run lint`: passing.
- `npm run build`: passing; 16 existing assets validate/build to 6.07 MB.
  Final production bundle gzip sizes: ExperienceRoot 36.80 kB (tempo baseline
  34.08), PhysicsWorld 20.09 kB (20.71), shared visual profiles 1.59 kB,
  demand-loaded model preview 0.85 kB, Three React 95.32 kB (90.92), Three
  189.78 kB and Rapier 838.12 kB. The preview adds OrbitControls code to the
  existing shared Three React chunk even though its UI is loaded on demand.
- Final production Chrome and Edge each pass all 27 targeted browser checks,
  with zero unhandled page errors. Reports identify the actual browser user
  agent. Both completed the journey with the selected ring gate; final Edge
  completion screenshot was inspected after the overlay repair.
- `node --check scripts/check-world-builder-browser.js` and `git diff --check`
  pass. Console output includes expected missing-model HTTP failures from the
  injected recovery scenario and existing renderer deprecation warnings.
- Browser driver: `scripts/check-world-builder-browser.js`, using the existing
  Playwright CLI workflow and a synthetic local 60-second tone fixture.
- Reports/screenshots: `output/playwright/world-builder-{chrome,edge}/`.
  The directories are ignored artifacts and may be overwritten by later runs.
- Browser coverage includes actual selected-model loading, model preview,
  missing-model blocking, cancellation/retry, independent drafts, invalid import
  preservation, refresh, valid reimport with all models loaded, keyboard focus,
  800×600 layout, reduced effects, Guide → Archive → Gate completion and playback
  restart. The inspector distinguishes requested asset IDs from loaded URLs.

Visual inspection found the initial new builder shared a sibling key with the
music editor and could duplicate after project replacement. Its key now has a
distinct prefix; a browser assertion checks that only one builder remains.
Inspection also found that the existing player covered part of the completion
dialog at 800×600. The interaction overlay now sits above the player; a direct
hit-test checks the dialog's lower-left region, in addition to screenshots.

An early production build overlapped a source-file edit and read a truncated
file; it failed rather than producing an accepted artifact. Builds were rerun
after source edits finished, using task-owned TEMP/TMP under
`output/world-builder-temp`. An initial production-browser attempt also ran
before the preview server was available. The server was started and the check
was rerun. A polling expression was then guarded against the inspection probe
being briefly absent during world replacement. These initial attempts supply
no passing evidence.

## Limits and follow-up

- Main model preflight verifies bytes/size/hash and approved license references.
  It does not download every audio/landmark binary or establish new rights.
  Those resources retain existing loading, error and fallback behavior.
- Preview is demand-rendered, with one extra WebGL context only while open;
  it has no autoplay animation. Target-device FPS, GPU memory, network budgets
  and independent human observation were not recalibrated.
- The targeted journey uses semantic browser probes to place the player and
  execute interactions; it does not replace first-user observation. Natural-end
  replay, the full legacy creator regression and global context-loss suites
  were not rerun for this slice.
- Older app versions may ignore the new optional model reference. Reopen these
  exports with the current app to reproduce asset selection; forward reading by
  old versions is not guaranteed.
- The working tree already contained the prior music-tempo implementation and
  planning documents. They were preserved; no resets, deletions or commits were
  used to hide or replace that work.

## Try it

Open the local preview and choose the edit icon. At the top, use
**搭建一个音乐世界**: name the world, select a gate, inspect its model if desired,
then choose **创建世界并进入**. Start the included demo or load a song. Old drafts
remain in the local library. Export, refresh and reopen to check the same gate.
