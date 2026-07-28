# Music Universe Agent Guide

This file applies to the entire repository. More specific `AGENTS.md` files may
add local rules for a subdirectory, but must not override the product direction
or quality gates defined here.

## Mission

Build Music Universe into a system that turns one track into a coherent,
editable, performant, and eventually shareable 3–5 minute interactive world.

The product is not a generic 3D desktop, dashboard framework, game-engine
showcase, or world-model integration demo.

## Read before acting

Before planning or changing the repository, read:

1. `docs/music-universe-roadmap.md` — product direction and phase gates;
2. `NOW.md` — current priorities, known gaps, and “not now” list;
3. `docs/development-workflow.md` — task intake, implementation, validation,
   and documentation rules;
4. the relevant technical or asset document for the files being changed.

If these documents disagree, the roadmap controls product direction and
`NOW.md` controls current sequencing. Report and correct stale documentation
when it affects the task.

Historical handoffs and implementation plans provide context only. They are not
the active task queue unless `NOW.md` explicitly promotes the work.

## Direction gate

Normal feature work must advance an exit gate in the current roadmap phase.

Before implementation, identify:

```text
User or engineering outcome:
Current phase gate:
Smallest end-to-end slice:
Out of scope:
Acceptance evidence:
Performance / accessibility / rights impact:
```

Work outside the current phase is allowed only when it fixes:

- a production, CI, security, or data-loss failure;
- a licensing, accessibility, or critical performance risk;
- a small prerequisite for an accepted current-phase outcome.

Do not build speculative backends, editors, world-model adapters, community
features, multiplayer, WebGPU migrations, or monorepo infrastructure “for
later.” Record them as future work instead.

## Product invariants

- Music playback time is authoritative for synchronized world state.
- Seek, replay, track replacement, and natural ending must reconstruct a
  deterministic experience.
- Templates, manual editing, and AI generation must converge on one validated,
  versioned `MusicWorldProject` format.
- AI output must remain editable and have a non-AI/template fallback.
- Runtime features should consume typed, validated schema data rather than
  accumulating component-specific hard-coded branches.
- Interaction conditions, flags, events, and completion state require typed,
  testable semantics.
- Provider-specific generation belongs behind adapters.
- Web performance, accessibility, recovery behavior, and content rights are
  product requirements, not release polish.

## Change discipline

- Inspect `git status` before editing.
- Treat all existing modified or untracked files as user-owned unless the task
  clearly identifies them as disposable.
- Preserve unrelated work; never reset, overwrite, delete, or reformat it.
- Keep changes scoped to one accepted outcome.
- Separate behavior changes, mechanical refactors, asset additions, and
  infrastructure changes when they can be reviewed independently.
- Prefer existing repository patterns and dependencies.
- Add a dependency only when current-phase behavior requires it and its bundle,
  maintenance, and license costs are understood.
- Do not weaken types with `any`, unchecked casts, or silent fallbacks merely to
  make a build pass.
- Do not leave placeholder success paths, unconditional condition checks, or
  console-only event systems while claiming a feature is complete.

## Asset rules

Before adding or replacing an asset, read:

- `docs/asset-pipeline.md`;
- `docs/asset-library-index.zh-CN.md`;
- `assets/asset-manifest.schema.json`.

Every accepted external asset must:

- come from the original source page;
- allow the intended commercial use and modification;
- record author, provenance, license, and build settings;
- use `LicenseRef-*` for reviewed custom licenses rather than pretending they
  are SPDX licenses such as CC0;
- pass asset validation and build budgets;
- be checked visually or audibly after processing.

Do not add NC, ND, Editorial, unclear, or rights-encumbered assets. Do not infer
that a user-uploaded CC0 label clears trademarks, recognizable people, protected
characters, architecture, or other third-party rights.

## Validation

Use the validation matrix in `docs/development-workflow.md`.

Default checks for code changes:

```bash
npm test
npm run lint
npm run build
```

Additional requirements:

- asset changes: `npm run assets:validate` and `npm run assets:build`;
- audio/runtime changes: test seek/replay and affected real-browser lifecycle;
- visual/camera/world changes: inspect the relevant timeline states;
- performance changes: record production bundle sizes and target-device result;
- UI changes: check keyboard/focus, readable labels, responsive layout, and
  reduced-effects implications.

Automated checks do not replace perceptual validation of audio, camera,
animation, lighting, readability, motion comfort, or asset quality.

Never claim that a check passed unless it was run successfully in the current
working state. State skipped checks and the reason.

## Definition of done

A task is complete only when:

- the requested outcome works end to end;
- acceptance evidence exists;
- relevant tests and validation pass;
- loading, empty, failure, and recovery behavior were considered;
- performance, accessibility, and rights impacts are addressed or explicitly
  documented;
- active documentation is updated when behavior, schema, workflow, or current
  priorities changed;
- unrelated working-tree changes remain intact;
- known limitations and intentionally deferred follow-ups are reported.

Update `NOW.md` only when current priorities, baseline, or phase status actually
change. Do not add routine implementation notes to the roadmap.

## Communication

Lead with the outcome and evidence. Clearly distinguish:

- verified facts from assumptions;
- completed work from proposals;
- current-phase requirements from future ideas;
- repository changes made by the agent from pre-existing user changes.

When a requested action would materially change product direction, expand scope,
introduce a future-phase platform dependency, or risk user-owned work, stop and
request direction instead of silently deciding.
