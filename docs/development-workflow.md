# Music Universe Development Workflow

> Status: active engineering process
> Last updated: 2026-07-26

This workflow keeps implementation aligned with the product direction while
allowing small, reversible experiments.

## 1. Planning hierarchy

Use the documents in this order:

1. [`music-universe-roadmap.md`](music-universe-roadmap.md) defines the product
   direction, phase order, exit gates, and explicit deferrals.
2. [`../NOW.md`](../NOW.md) defines the current phase, priorities, known gaps,
   and definition of done.
3. A task or PR defines one bounded outcome and its acceptance evidence.
4. Implementation plans explain how to deliver a complex task; they do not
   redefine product priorities.

When documents disagree, the roadmap wins on direction and `NOW.md` wins on
current sequencing. Update the stale document in the same change when practical.

## 2. Before starting a task

Every feature task must answer:

```text
User outcome:
Current roadmap phase and exit gate:
Smallest end-to-end slice:
Out of scope:
Acceptance checks:
Performance / accessibility / rights impact:
Rollback or fallback:
```

Do not start normal feature work if it cannot name a current-phase exit gate.
Exceptions are:

- a production or CI failure;
- security, data-loss, licensing, or accessibility risk;
- a small enabling refactor required by an accepted current-phase task.

Place valuable but premature ideas in a future backlog. Do not partially build
future platform layers inside current runtime code.

## 3. Shape work as vertical slices

Prefer a user-visible path with its tests and failure states over completing one
technical layer across the whole product.

Good:

```text
Demo track
  -> load
  -> timeline
  -> one narrative interaction
  -> ending
  -> replay
  -> browser acceptance evidence
```

Avoid:

```text
all analysis APIs
  -> all generation adapters
  -> all publishing tables
  -> no complete listener experience
```

Keep a task small enough to review and revert. Separate behavior changes,
mechanical refactors, asset additions, and infrastructure work unless they are
inseparable for the accepted outcome.

## 4. Definition of ready

A task is ready when:

- its user or engineering outcome is concrete;
- it maps to the current roadmap phase;
- acceptance behavior is observable;
- dependencies and affected schemas are known;
- external assets/services have an authorization and licensing plan;
- meaningful scope exclusions are written down;
- unknowns that could invalidate the approach are handled by a bounded spike.

A spike must have a question, time/effort boundary, disposable implementation,
and decision output. A spike is not permission to merge an unfinished subsystem.

## 5. Implementation rules

### Product boundary

- Runtime features consume validated project/schema data where possible.
- Music time remains authoritative for time-synchronized world state.
- Seek and replay behavior must reconstruct state deterministically.
- AI or external services must produce editable, validated data and have a
  non-AI fallback path.
- Provider-specific world generation must stay behind adapters.

### Interaction boundary

- Do not add new interaction conditions as hard-coded component branches.
- Conditions, flags, events, and completion state must have typed semantics.
- Interactions should remain testable without rendering the full Canvas.

### Asset boundary

- Follow [`asset-pipeline.md`](asset-pipeline.md).
- Select sources using
  [`asset-library-index.zh-CN.md`](asset-library-index.zh-CN.md).
- Every accepted external asset records author, original page, license, and
  build settings in `assets/asset-manifest.json`.
- Do not bypass runtime manifest resolution with ad hoc public paths.

### Dependency boundary

Add a dependency only when:

- current-phase behavior needs it;
- existing stack or a small local implementation is insufficient;
- bundle and maintenance cost are understood;
- its license is compatible with the project.

Do not add a world model, backend, state machine, editor framework, or renderer
solely to anticipate a later phase.

## 6. Validation matrix

Run validation in proportion to the change:

| Change | Minimum evidence |
|---|---|
| Pure logic/schema | focused automated tests + `npm run lint` |
| UI behavior | automated logic/component coverage where practical + keyboard/focus check |
| Audio timeline/runtime | unit tests for seek/replay + real-browser lifecycle for affected path |
| Camera/world rendering | production build + visual check at relevant cues |
| Movement/physics | movement tests + browser control/collision check |
| Asset addition | `npm run assets:validate` + `npm run assets:build` + visual/audio quality check |
| Performance-sensitive | production build sizes + target-device loading/frame-rate measurement |
| Release candidate | full test, lint, build, supported-browser journey, failure/recovery check |

Default repository checks:

```bash
npm test
npm run lint
npm run build
```

Passing automated checks is necessary but does not replace perceptual validation
for audio, camera, animation, lighting, readability, or motion comfort.

## 7. Required quality checks

For user-facing work, explicitly consider:

- loading and empty states;
- invalid input and recovery;
- pause, seek, replay, replacement, and navigation lifecycle;
- keyboard/focus and screen-readable labels;
- captions, audio control, and reduced visual effects;
- touch behavior or a clear unsupported-device message;
- low-performance quality fallback;
- object URL, audio element, Three.js geometry/material, and event cleanup;
- third-party rights, attribution, and provenance.

If a check does not apply, no implementation is required. If it applies and is
deferred, record the consequence rather than silently omitting it.

## 8. Pull request scope and handoff

Each change should communicate:

```text
Outcome:
Roadmap gate advanced:
Behavior changed:
Validation run:
Manual evidence:
Known limitations:
Follow-up intentionally deferred:
```

Before declaring a task complete:

1. inspect the working tree and preserve unrelated changes;
2. run the agreed checks;
3. update tests with behavior changes;
4. update active docs when current state, schema, workflow, or phase changes;
5. update `NOW.md` only when a current priority is completed, added, or reordered;
6. do not mark later-phase infrastructure as complete because a prototype exists.

## 9. Document ownership

| Document | Purpose | Update trigger |
|---|---|---|
| `docs/music-universe-roadmap.md` | Product direction and phase gates | Product goal, phase order, or gate changes |
| `NOW.md` | Current baseline and next priorities | Merge or decision changes current work |
| `docs/development-workflow.md` | Engineering execution rules | Repeated process failure or agreed policy change |
| `docs/creator-workflow.md` | Creator-facing product flow | Actual creator capability changes |
| Schema/runtime docs | Technical contracts | Contract or lifecycle changes |
| Historical plans/handoffs | Context only | Add status banner; do not use as task queue |

Avoid duplicating current priorities across several documents.

## 10. Direction check for new proposals

Use this quick test:

- Does it improve the listener’s complete journey?
- Does it make a world reproducible and editable?
- Does it reduce creator effort without removing control?
- Does it protect performance, accessibility, reliability, or rights?
- Is it required by the current phase?

If the first four answers are mostly “no,” reject the proposal. If only the last
answer is “no,” preserve the idea for its proper roadmap phase.
