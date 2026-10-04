# MusicWorldProject v1

> Status: active Phase 2 project boundary
> Last updated: 2026-10-02

`MusicWorldProject` is the canonical editable and serializable input to the
Music Universe runtime. The TypeScript contract is in
`src/project/musicWorldProject.ts`; the portable JSON description is in
`schemas/music-world-project.schema.json`; runtime validation is implemented by
`src/project/validateMusicWorldProject.ts`.

## Version and time model

Version 1 uses the integer `schemaVersion: 1`. Import rejects every other
version. A migration registry is intentionally deferred until a second schema
version provides a real source and destination contract.

Timeline cues use `normalized-track-position` values from 0 through 1. At
runtime they compile against the decoded audio duration. Music time remains
authoritative, so seek and replay reconstruct the same state for the same
project, duration, and playback position.

## Required project data

- project metadata and authors;
- track identity, rights reference, and attribution;
- world bible;
- normalized narrative timeline;
- validated SpatialScene 0.1 data, including interactions and flags;
- referenced runtime assets and their license references;
- presentation and accessibility capabilities.

The curated project lives in `src/content/defaultMusicWorldProject.ts`. Both
the compiled scene and music runtime consume it. JSON import validates before
returning a project; JSON export validates before serialization. Invalid data
fails with path-based issues rather than silent defaults and never replaces the
active draft.

## Local project library

The Phase 2 creator workflow stores a versioned library envelope in IndexedDB
database `music-universe-projects`, object store `drafts`, key
`project-library-v2`. The envelope contains an active project ID and validated
project JSON records. Storage-only lifecycle fields remain outside exported
`MusicWorldProject` files.

On first launch the default Memory Journey becomes the initial named draft. A
legacy single-draft `active` record is migrated into the library on read. The
library supports creating from the default template, duplicating with a unique
ID, renaming, opening, and soft deletion. Delete records `deletedAt`; restore
clears it. Deleting the active project selects an available draft or creates a
safe default fallback, so the runtime never has a deleted active project.

The Project Editor exposes the Memory Archive X/Z position through coordinate
inputs or bounded axis dragging. Applying the edit recompiles the spatial scene, remounts the
affected Rapier interaction body when its transform changes, resets session
interaction state, and autosaves after a short debounce. In-memory work remains
available when local persistence fails and the UI reports the failure.

The first timeline edit selects an existing cue and changes only its normalized
position in the inclusive `[0, 1]` range. Cue identity and typed actions remain
unchanged. The runtime recompiles cue seconds against the current track duration
and reconstructs state from authoritative music time.

The bounded action inspector edits an existing `set-environment` action by cue
ID and action index. Editable fields are sky/ground colors, rain intensity and
bloom intensity. One Apply creates one transaction for these fields; other
environment fields and other actions remain intact. Empty inputs remove the
corresponding override and runtime replay inherits prior cues or defaults.

The environment payload now has field validation in both the portable JSON
schema and runtime import/export path: colors use three- or six-digit hex;
rain is 0–1, bloom is 0–2, fog density is 0–1, and stars are integers 0–1000.
Unknown fields and nonfinite/out-of-range values are rejected. Existing default
projects meet these constraints. Older files with previously unchecked invalid
environment payloads need correction before import; failed imports preserve the
active draft. Version 1's structure and action identities are unchanged.

## Edit transactions and drag preview

Archive, cue-position and environment-action edits share a validated transaction path. History
records only each edited field's before/after value, preserving unrelated
metadata such as a subsequent rename. Undo/redo updates the project, library,
revision, collision and timeline through the same runtime reconstruction path
and schedules normal autosave. No-op and invalid input do not add history or
clear the redo branch; a valid new edit does clear it.

The in-memory history is capped at 100 entries and isolated at draft open,
creation/duplication, active-draft deletion, import, reset and hydration. It is
excluded from MusicWorldProject and IndexedDB envelopes; refresh restores the
latest saved project with an empty undo stack. Save errors retain the in-memory
draft and history.

Drag mode uses a fixed overview camera and X/Z-only Drei PivotControls. The
preview lives outside canonical project data and never reaches exports or
autosave. Its visual moves while the committed collider stays fixed and physics
is paused. Release commits one transaction and reconstructs the collider;
Escape, blur, pointer cancellation, editor exit and project changes discard an
unfinished preview. The listener camera is restored on leaving drag mode.
World interaction and movement are blocked during editing, with pointer lock
blocked and physics paused during drag mode. Audio time continues to govern
the runtime. Coordinate inputs remain the accessible alternative.

Export downloads `<project-id>.musicworld.json`. Import validates the complete
document before replacing the active project. Unsupported versions, malformed
JSON, and invalid fields report path-based errors while preserving the current
draft.

## Current boundary

Successfully decoded local audio is bound to the active project with its actual
duration and optional v1 `track.file` identity: original name, byte size and
lowercase SHA-256 digest. New uploads record unverified user-provided rights
for private local preview. The project JSON contains identity data; audio bytes
stay on the user's computer.

Refresh, project opening and JSON import identify the saved song and ask for
its original file. Reattachment checks bytes, size and duration (0.25-second
tolerance); renamed identical bytes are accepted. A wrong file leaves the
project intact. Legacy local-file projects without a fingerprint require an
explicit replacement. Asset tracks load through their recorded asset reference.

Replacement decodes a candidate before committing playback and project metadata.
Failure preserves the previous song and project. Project switching stops playback,
releases media resources and cancels pending candidates. Song changes preserve
the authored spatial/timeline history; undoing a scene edit keeps the new song.

This delivered slice proves deterministic validation, JSON round-trip, a named
IndexedDB project library with recoverable deletion, creator-facing
import/export, undo/redo, one draggable spatial edit, a bounded environment-action inspector, one normalized cue-position
edit, scene and physics reconstruction, and duration-relative timeline reconstruction. It does
not yet provide arbitrary scene/timeline inspectors, permanent trash
cleanup, schema migrations, publishing, or generated content.
