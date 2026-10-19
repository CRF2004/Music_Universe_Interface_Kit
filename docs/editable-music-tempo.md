# Editable music tempo — Phase 3 bounded slice

Authorized by the owner on 2026-10-18 following the local-analysis review.

- User outcome: confirm a fixed song tempo, then explicitly align an existing world cue to the nearest beat.
- Phase gate: understandable, editable music-to-world recommendations with manual fallback.
- Smallest slice: known song duration → BPM input or local tap suggestion → creator saves BPM/first-beat offset → selected existing cue snaps → undo/autosave/export/reopen.
- Out of scope: automatic audio BPM detection, beat/tempo maps, time signatures, metronome playback, automatic cue replacement, external services and new dependencies/assets.
- Acceptance: bounded tap estimation, strict import validation, deterministic boundary-aware alignment, undo/redo, no playback reset on tempo edits, track replacement isolation, saved-project restoration, keyboard/focus and compact-screen review.
- Performance/accessibility/rights: at most nine local tap timestamps; no audio processing, timers, added animation, upload or service calls. Named controls and numeric inputs support keyboard editing. Existing desktop-only policy applies.
- Fallback: leave tempo unset and use section/timeline editing. Invalid input retains the previous valid project. Clearing tempo is undoable and preserves cue positions.

## Data contract

Optional `track.tempo` adds `{ bpm, offsetSeconds, source }` to project v2.
`bpm` is finite, 30–300. `offsetSeconds` is finite, nonnegative and strictly
before the known `track.expectedDurationSeconds`. `source` is `manual` or `tap`,
describing how the creator obtained the saved value; every stored tempo is
creator-confirmed. Unknown fields and absent song duration are rejected.
Existing projects without tempo remain valid. Older strict validators reject
this optional field; no future-version migration is claimed.

Tempo and waveform analysis are independent. Reanalysis preserves tempo.
Both are excluded from song identity so editing them does not clear playback
or invalidate an in-flight waveform job. Replacing a song removes its tempo
and tempo edit history. Restoring the same song retains authored tempo.

## Editing and alignment

The panel includes song play/pause controls so tapping is possible inside the
keyboard-focused project dialog.
Tap at least four times with a consistent pulse. The bounded last-nine-tap
window uses median intervals and rejects intervals differing by more than 20%.
A pause over two seconds starts a new window. Suggestions fill an unsaved BPM
input. Half/double and manual corrections are available before Save.
Tap timestamps estimate BPM only; the creator sets the first-beat offset
separately, using a numeric input or the current audio playhead.

The saved grid is `offsetSeconds + n * 60 / bpm`, with integer `n >= 0`.
Explicit alignment rounds the selected cue to the nearest in-song grid point,
choosing the later beat on ties and never placing it after track end. The cue
continues to store a normalized song position and uses the existing timeline
runtime. Unsaved tempo changes disable alignment. Changing tempo alone never
moves cues. Music playback time remains authoritative after seek and replay.

Variable-tempo tracks can use manual cue/section editing; this slice stores
one constant tempo and makes no automatic beat-accuracy claim.
