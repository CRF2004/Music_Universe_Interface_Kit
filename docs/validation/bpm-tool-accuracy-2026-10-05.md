# BPM tool accuracy evaluation

Decision: the evaluated detector fails the predeclared automatic BPM accuracy
gate. Keep it out of the product dependency and beat-grid path. A future slice
may compare another detector on annotated audio or offer explicitly editable,
user-confirmed tempo candidates with half/double controls and manual tapping.

Scope: [bounded Phase 3 spike](../research/bpm-validation-scope-2026-10-05.md).
Owner requested accuracy validation, not product integration. Tested package
[`web-audio-beat-detector`](https://github.com/chrisguttandin/web-audio-beat-detector)
8.2.39 in an ignored isolated npm directory. Root package/lock, project format,
runtime and deployed application remain unchanged by this task.

## Measured results

Chrome and Edge each ran 71 analysis cases. All estimates/errors/classifications
matched between browsers. Repeated synthetic/full-song estimates were identical.
The accuracy denominator is 18 steady fixtures: nine known pulse rates at two
sample rates (12 kHz and 44.1 kHz). Each is 30 seconds, with a 0.25-second onset.
Acceptance was ≥90% within 2% exact pulse-rate error, fixed before the run.
Half/double tempo ambiguity is reported separately from exact correctness.

| Tempo policy | Exact within 2% | Half tempo | Double tempo | Other wrong | Gate |
|---|---:|---:|---:|---:|---|
| Default 90–180 | 10/18 (55.6%) | 4/18 | 4/18 | 0 | Failed |
| Explicit 50–220 | 6/18 (33.3%) | 10/18 | 0 | 2/18 | Failed |

Both sample rates produced the same tempo results:

| Known pulse rate | Default result | Wide-range result |
|---:|---:|---:|
| 60 | 120 | 60 |
| 75 | 150 | 75 |
| 90 | 90 | 90 |
| 100 | 100 | 50 |
| 120 | 120 | 60 |
| 128 | 128 | 64 |
| 150 | 150 | 75 |
| 180 | 90 | 90 |
| 200 | 100 | 66.67 |

Default exact success within its stated 90–180 range was 10/12 (83.3%);
the 180 boundary resolved to 90. Range expansion improved slow cases and
introduced lower-tempo choices for common pulse rates. These are synthetic
quarter-pulse references: perceptual meter in real music can be ambiguous.
This result does not establish a general genre-wide percentage.

Additional cases: offset 128, alternating accents at 75, tone/percussion mix at
120, off-beat hats at 100, a three-second 120 clip, silence, sustained 440 Hz tone,
and a 120→150 tempo change. Default handled the offset, mix, hats and short clip
at exact tempo; 75 accents doubled. Wider range again produced half tempos on
several cases. Silence and sustained tone returned a useful no-detectable-beats
error in both policies/browsers. The changing-tempo case produced one scalar
120 (default) or 60 (wide); it does not describe the second-half tempo change.

The offset result is phase modulo a beat period; it should not be treated as an
absolute first-onset timestamp or a downbeat/measure marker. An independently
verified 128 fixture starting at 1.17 seconds returned phase 0.2373 seconds with
the default policy, consistent with modulo-beat phase plus filter delay.

## Authorized real song

The existing local Crywolf ATHETOSIS MP3 decoded to stereo 12 kHz, 278.4437
seconds. No song data left the local server/browser. No independent BPM or beat
annotation exists for this recording in the test, so these are stability/runtime
results and are excluded from the accuracy score.

Full track repeated three times per policy and browser:

- default: 96.1532 BPM (rounded 96), identical repeats;
- wide range: 65.0003 BPM (rounded 65), identical repeats.

Thirty-second windows at 0/60/120/180/240 seconds:

- default: 130 / 119 / 110 / 130 / 118 BPM;
- wide: 65 / 119 / 90 / 65 / 59 BPM.

This spread prevents deriving a trustworthy song-wide grid directly from the
scalar output. It could reflect detection error, musical ambiguity or changing
material; the test provides no annotated truth to choose between them.

## Cost and reliability

- Steady-fixture algorithm time: maximum 50.1 ms Chrome / 46.9 ms Edge.
- Full-song algorithm time: maximum 153.8 ms Chrome / 158.3 ms Edge.
- Full-song decode: 791 ms Chrome / 893.6 ms Edge (local desktop runs).
- Isolated esbuild ESM bundle: 118,758 bytes, 34,411 bytes gzip. Includes the
  tool's embedded worker; this is an isolated size measurement, not the change
  in a shared production bundle. The tool is not in the product build.
- Direct dependencies: Babel runtime, tslib, detector broker and detector worker.
  Ten installed packages including the tool; recorded package licenses are MIT,
  except tslib (0BSD). Isolated lock/integrities are retained with raw evidence.
- Zero uncaught page errors. One initial favicon 404 per browser was harmless
  local harness noise; it is recorded separately from algorithm exceptions.

No user UI, focus, motion, playback, seek/replay or recovery behavior changed.
The package's public scalar result provides no confidence score; the evaluation
does not invent one from repeat agreement. Deterministic output can be wrong.
Worker cancellation/disposal and low-end devices remain untested prerequisites
for any future adoption. No paid or quota-limited service was called.

## Evidence and reproduction

Original synthetic fixtures: `scripts/bpm-validation-fixtures.mjs`. Ground-truth
pulse spacing was independently recovered from PCM threshold crossings for all
18 steady fixtures, within 0.1% error, before scoring detector results.

1. Install `web-audio-beat-detector@8.2.39` with `--ignore-scripts --no-audit
   --no-fund --prefix output/tool-pilots/bpm-2026-10-05`.
2. Start `node scripts/serve-bpm-validation.mjs` (loopback-only port 4182).
3. In Playwright CLI, open `http://127.0.0.1:4182` in Chrome and Edge, then use
   `run-code --filename scripts/check-bpm-tool-browser.js` in each session.
4. Run `node scripts/summarize-bpm-validation.mjs`. It validates fixture timing,
   browser agreement, repeat determinism and silence/tone failure, and writes the
   gate decision without treating an accuracy failure as experiment failure.

Raw Chrome/Edge reports, isolated package-lock, bundle sizes and machine-readable
decision: `output/tool-pilots/bpm-2026-10-05/`. Accuracy scope remains frozen;
thresholds were not lowered and no third tempo-range policy was tried.

Default repository unit tests: 107 pass. Type-check and production build pass;
16 existing assets validate/build at 6.07 MB. Results are recorded
alongside the spike evidence. A full product journey was skipped because this
task adds isolated evaluation scripts/docs and changes no runtime source.
