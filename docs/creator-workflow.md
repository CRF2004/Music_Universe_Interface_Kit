# Creator Workflow

> Product workflow target; capabilities are introduced by roadmap phase.
> Last updated: 2026-07-26

## Product goal

An independent musician or creator should be able to turn one track into a
coherent 3–5 minute interactive world without editing runtime source code.

The canonical output of every creation path will be a versioned
`MusicWorldProject`. Template editing, assisted generation, and remix must not
produce separate incompatible formats.

## Current capability

The repository currently supports a runtime demonstration:

```text
Local audio file
  -> real duration
  -> default normalized timeline
  -> environment / camera / narration / landmarks
  -> explorable browser experience
```

It does not yet analyze the music, save creator projects, publish experiences,
or remix existing worlds. These are roadmap goals, not current product claims.

## Target creation flow

### 1. Start

- choose the built-in demo;
- upload a track for a private local project;
- open a template or, later, remix a permitted published project.

The creator confirms that they have the rights required for the intended use.

### 2. Understand the track

The system extracts or lets the creator enter:

- duration and waveform;
- candidate sections, tempo, dynamics, and emotional arc;
- title, artist, artwork, lyrics/context, and creator intent.

Analysis is editable. Failure to analyze must fall back to manual section
markers and template editing.

### 3. Shape the world bible

The creator chooses or edits:

- experience template;
- narrative premise and listener role;
- visual language, palette, weather, and motion;
- landmarks, interaction goals, opening, climax, and ending;
- accessibility and intensity preferences.

The initial production template is Journey or Memory. Additional templates are
deferred until one complete experience is validated.

### 4. Build the timeline

The editor maps track positions to:

- environment changes;
- narration/subtitles;
- camera modes;
- landmark visibility;
- interaction availability and flags;
- portal/ending state.

Cues are normalized or section-relative so the project can be previewed,
seeked, replayed, and validated deterministically.

### 5. Select assets

Prefer this order:

1. reusable in-project assets and effects;
2. verified licensed asset libraries;
3. customized/generated hero landmarks.

Every asset stores author, provenance, license, build settings, and attribution
requirements. See
[`asset-library-index.zh-CN.md`](asset-library-index.zh-CN.md).

### 6. Preview and validate

The creator previews:

- first load and onboarding;
- the full musical arc;
- seek backward/forward;
- interactions and completion;
- natural end and replay;
- supported device quality and reduced-effects mode.

The project compiler reports invalid references, missing licenses, asset-budget
violations, unreachable interactions, and incomplete ending states.

### 7. Save and export

Before publishing exists, creation must support:

- local save/recovery;
- versioned project export/import;
- deterministic preview from the exported project.

These capabilities precede cloud accounts and public publishing.

### 8. Publish

Publishing is a later controlled workflow:

- choose private, unlisted, or public visibility;
- confirm music rights and required attribution;
- build an immutable published version;
- provide a share page;
- retain version history, unpublish, reporting, and takedown paths.

### 9. Remix

Remix is enabled only for projects whose creator permissions and component
licenses allow it. A remix retains:

- source project lineage;
- original creator attribution;
- inherited asset licenses;
- a record of changed music, timeline, narrative, and assets.

## Creation paths

| Path | Earliest roadmap phase | Role |
|---|---|---|
| Curated runtime experience | Phase 1 | Validate listener value |
| Template editing | Phase 2 | First complete creator workflow |
| Assisted AI generation | Phase 3 | Accelerate editable authoring |
| Controlled publishing | Phase 4 | Share safely and reproducibly |
| Remix existing worlds | Phase 5 | Expand creative diversity |

Full automation is not a separate product path. It is an optional acceleration
layer over the same editable project workflow.

## Planned generated 3D provider boundary

Tripo is available as an optional internal candidate-generation tool, not a
current creator capability. Its staged evaluation and official documentation
links are recorded in
[`tripo-asset-generation.md`](tripo-asset-generation.md).

When assisted asset generation reaches Phase 3, provider credentials and async
jobs belong behind a backend adapter. Creators must be able to compare, accept,
edit, replace, or reject candidates, and every accepted result must become a
normal validated `MusicWorldProject` asset with provenance, input-rights
declaration, cost, review status, and a non-generated fallback. No project may
depend on an expiring provider URL.
