# Local music analysis — Phase 3 first slice

Date: 2026-10-05. Owner authorized local waveform/loudness/editable sections.

- User outcome: understand changes in a loaded song, correct suggested sections,
  and place an existing world cue at a chosen section start.
- Phase gate: Phase 3 understandable, editable recommendations, valid projects,
  bounded processing cost and manual fallback.
- Smallest slice: loaded file → explicit local analysis → peak/RMS overview →
  rename, move boundaries, split/merge → autosave/undo/export/reopen → cue placement.
- Out of scope: semantic verse/chorus recognition, AI generation, network song
  lookup, streaming provider access, new assets and automatic cue replacement.
- Evidence: known amplitude/silence/stereo fixtures, malformed import preservation,
  history/replacement isolation, browser analysis/edit/save/seek/replay/recovery.
- Budget: at most 40 MiB input and 600 seconds; decode at 12 kHz, at most two
  channels; summary at most 512 bins and 32 sections; worker scanning and bounded
  timeout. Target ≤10 seconds for a 3–5 minute track on the current desktop.
  Browser decoder transient allocation is implementation-dependent.
- Accessibility/rights: numeric boundary inputs and named buttons, SVG text
  alternatives, no animation required; no song bytes or identifiers sent out.
- Fallback: analysis errors retain playback/project and manual timeline editing.

RMS is unweighted signal level in dBFS, floored at −96 dBFS. It is an aid for
comparing sections, not an integrated LUFS measurement. Channel energies and
absolute peaks are combined without stereo phase cancellation. Candidate cuts
come from sustained local energy changes with minimum eight-second spacing;
neutral labels require creator interpretation. Fixed-tempo and semantic structure
are not inferred from loudness alone.

Optional `track.analysis` is additive to schema v2. Old v2 projects remain valid;
older applications with strict validators will reject files containing the new
field. It records algorithm/version, actual duration, bounded arrays and ordered
section starts (normalized, beginning at zero). End times derive from the next
start or track end. Replacement removes old analysis; matching reattachment keeps
it. Analysis history is scoped to song identity.
