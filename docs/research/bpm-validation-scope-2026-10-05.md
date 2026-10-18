# BPM accuracy spike

Owner authorized 2026-10-05. Phase 3 analysis evidence; isolated tool evaluation.

- Outcome: decide whether web-audio-beat-detector is suitable for editable BPM
  suggestions alongside local music analysis.
- Gate: understandable/correctable recommendations within explicit cost/runtime
  bounds, retaining manual fallback.
- Slice: pinned isolated package → known synthetic audio → Chrome/Edge estimates
  and errors → real-song repeat/window stability → adoption decision.
- Scope exclusions: product dependency/schema/UI adoption, automatic beat grid,
  online song search, paid providers and new distributable audio assets.
- Acceptance: steady 60/75/90/100/120/128/150/180/200 BPM at 30 seconds, 12 kHz
  and 44.1 kHz; at least 90% within 2% exact-tempo error, with half/double cases
  counted separately. Test offset, percussion mix, syncopation, background tone,
  silence, sustained tone, variable tempo and short clips. Silence must fail
  usefully; record false tempo on beatless audio. Two browsers must agree on
  exact-tempo classifications. Repeat runs must give deterministic estimates.
- Timing/payload: ≤2 seconds per 30-second fixture and ≤10 seconds for the
  authorized 4:38 recording on the current desktop; isolated bundled size/gzip
  and dependencies recorded. Timings are warm algorithm runs, decode separate.
- Rights/accessibility: original synthetic fixtures plus authorized local demo;
  no audio upload or spending. No interface/world behavior changed.
- Limit: real song has no independently annotated BPM/beat reference, so it
  provides stability/runtime evidence only. This synthetic suite cannot establish
  genre-wide accuracy. A failed gate yields a documented limited-use/reject
  decision, without tuning acceptance thresholds to results.
- Time boundary: one bounded evaluation in this task; at most two tempo-range
  policies (package defaults versus explicit 50–220 BPM), no algorithm rewrite.
