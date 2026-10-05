# Creator Workflow

> Product workflow target; capabilities are introduced by roadmap phase.
> Last updated: 2026-10-05

## Product goal

An independent musician or creator should be able to turn one track into a
coherent 3–5 minute interactive world without editing runtime source code.

The canonical output of every creation path will be a versioned
`MusicWorldProject`. Template editing, assisted generation, and remix must not
produce separate incompatible formats.

## Current capability

The first Phase 3 local analysis slice adds waveform peaks, relative RMS level,
and editable candidate sections in the Project Editor. Load a song, choose
Analyze, rename/adjust/split/merge sections, then explicitly place an existing
selected cue at a section start. Saved summaries/sections survive refresh and
JSON export; reattach the original song to audition. See
[local analysis scope](local-music-analysis.md). BPM and external metadata are
researched follow-ups in [tool selection](research/music-analysis-tools-2026-10-05.md).

The owner accepted and closed the current Memory Journey creator workflow on
2026-10-05. Scope, latest validation, release and deferred limits are recorded in
[the closeout decision](validation/creator-workflow-closeout-2026-10-05.md).

The accepted spherical-ground repair introduces MusicWorldProject v2. The Memory planet has a
60m radius. Archive X/Z coordinates describe surface distances from arrival;
Y describes height above the ground. Visuals and collision follow the same
projection and local orientation. v1 curved projects migrate on import/open,
preserving song identity and authored edits. See the current
[repair acceptance record](validation/spherical-planet-2026-10-04.md).

The repository now has a first versioned `MusicWorldProject` boundary for the
curated Memory Journey:

```text
Local audio file
  -> real duration
  -> validated MusicWorldProject v2 normalized timeline
  -> environment / camera / narration / landmarks
  -> explorable browser experience
```

The canonical project can be validated, serialized to JSON, imported, and used
to reconstruct the same scene and duration-relative timeline. The current
Project Editor can create, duplicate, rename, open, soft-delete, and restore
named local drafts. It can move the Memory Archive, change one existing cue's
normalized position, autosave the library to IndexedDB, restore it after
refresh, export the active project, and safely import without an invalid file
replacing current work. Archive X/Z, cue-position, and environment-action changes support undo/redo.
The Archive can also be dragged in a fixed overview using red/blue axis arrows;
releasing commits one edit, while Escape cancels the active drag. Coordinate
inputs remain available for keyboard and precise editing. There is not yet a
general scene/timeline editor, permanent trash cleanup, migration from a future schema version,
music analysis, publishing, or remix.

Edit history is session-local, capped at 100 edits, and resets when opening a
draft, importing, creating/duplicating, resetting, or deleting the active draft.
Renaming preserves spatial/timeline history. Refresh restores the saved project
with an empty history. Ctrl/Cmd+Z undoes and Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redoes
while the editor is open; text inputs retain their native editing shortcuts.

Dragging previews the visual without saving intermediate positions. Physics,
movement, pointer lock, and narrative interaction are suspended in drag mode;
the committed collider is rebuilt after release or undo/redo. Losing window
focus, pointer cancellation, closing the editor, or changing projects cancels an
unfinished drag. Music playback continues to drive the timeline.

Select an existing timeline cue, then its environment action. The inspector
edits sky/ground hex colors, rain (0–1), and bloom (0–2). Apply commits all four
fields as one undoable operation. Blank removes that cue's override, so the
earlier cue's value or runtime default applies. Fog, stars and other actions
remain intact. Multiple environment actions can be selected individually;
cues without one show a readable empty state. Close the editor and seek to the
event in the music player to preview it. Reduced effects suppress rain and bloom
while preserving the project's authored values.

## Target creation flow

Uploaded songs save their name, actual duration, file fingerprint and private
preview rights record with the project. After refresh, opening or importing,
choose **Restore original song** and select the original file. The browser
checks file contents and duration; a different file with the same name is rejected.
**Replace music** deliberately changes the song. Older local-file projects without
a fingerprint require this replacement step. Built-in tracks have a restore button.
JSON exports contain the project and song identity; keep the original audio file
alongside the export. Switching projects clears playback and pending loads.

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

## Phase 2 editor architecture reference

[Pascal Editor](https://github.com/pascalorg/editor) is tracked as a Phase 2
technical reference for the future Creator editor. It is not an adopted runtime
dependency or a replacement for `MusicWorldProject`.

Patterns worth carrying into the Creator design:

- a versioned, validated canonical project model with explicit migrations;
- one mutation/patch layer shared by inspector UI, undo/redo, automation, and
  future agent-facing tools;
- transaction boundaries that make multi-field edits atomic and reversible;
- IndexedDB-backed drafts, crash recovery, and explicit save/publish states;
- typed registries for editor panels, project nodes, renderers, and plugins;
- derived render state and dirty-node tracking kept outside canonical project
  data;
- headless validation and editing tools operating on the same data model as the
  visual editor, as demonstrated by Pascal's
  [MCP package](https://github.com/pascalorg/editor/blob/main/packages/mcp/README.md).

The project should not inherit Pascal's building-specific scene ontology,
editor/viewer runtime, Next.js monorepo, or WebGPU assumptions. Its built-in
asset catalog is not an approved asset source without per-item provenance and
license review under this repository's asset pipeline.

Any future evaluation must be a disposable, bounded spike after the first
versioned `MusicWorldProject` schema exists. The spike should prove one narrow
end-to-end capability—such as an undoable landmark transform persisted and
reloaded through the canonical project API—rather than create a parallel scene
model. Pascal's
[plugin architecture](https://github.com/pascalorg/editor/blob/main/wiki/architecture/plugin-authoring.md)
is useful reference material for that evaluation.

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
