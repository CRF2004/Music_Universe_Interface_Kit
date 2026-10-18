# Expert-labelled BPM evaluation

Decision: keep `web-audio-beat-detector` 8.2.39 outside automatic product BPM.
The fixed 100-loop expert-labelled corpus yields 31% exact at 12 kHz under the
default policy and 17% with a 50–220 BPM range. The predeclared gate was 90%.
Chrome and Edge agree on every estimate, classification and error.

Scope: [accepted bounded evaluation](../research/annotated-bpm-scope-2026-10-05.md).
No product code, dependency, schema, audio asset or deployment change.

## Fixed corpus and rights

Source: [original FSLD release](https://zenodo.org/records/3967852), expert
`annotations.zip` (MD5 `3920ee437802cf047a990b2968fa066c`) and archive
`metadata.json`. The author/user filename BPM is not the evaluation truth.
Positive, defined expert BPM is used; discarded/deferred labels are excluded.
Multiple annotators must agree within 2%, and the median is the reference.
36 of the 100 samples have multiple annotators; 64 have one expert annotation.

3,036 unique annotated sound IDs reduced to 1,532 eligible candidates. Exclusions:
846 uncertain, 56 invalid BPM, 36 disagreements, 347 license, 44 vocal and 75
description-based provenance review cases. Only explicit CC0 and CC BY versions
are eligible. This screening supports local evaluation; it does not approve
these sounds as product assets or establish third-party rights from metadata.

SHA256(`fsld-v1-` + ID) ordering and round-robin selection across four tempo
buckets froze 25 samples each: <90, 90–119, 120–149 and ≥150 BPM. No detector
results affected selection. The [fixed manifest](../research/annotated-bpm-samples-2026-10-05.json)
records IDs, expert references, annotators, original pages, authors, licenses and
audio hashes. Files remain local in ignored `output/`; no audio redistribution.
The selected licenses are 58 CC0 and 42 CC BY 3.0. Expert BPM spans 60–250;
12 loops are shorter than two seconds. Selected audio totals 109,718,220 bytes.
Selective ZIP range retrieval used 102 requests rather than downloading 8.8 GB.
ZIP decompression validates member CRC; every downloaded sound has SHA256.

## Results

Exact means relative BPM error ≤2%. Half and double are separately counted with
the same relative tolerance. Every failure remains in the 100-sample denominator.

| 12 kHz policy | Exact | Half | Double | Other wrong | No beats detected |
|---|---:|---:|---:|---:|---:|
| Default 90–180 | 31 | 1 | 8 | 45 | 15 |
| Wide 50–220 | 17 | 20 | 1 | 47 | 15 |

| Expert BPM bucket | Samples | Default exact | Wide exact |
|---|---:|---:|---:|
| <90 | 25 | 0 | 6 |
| 90–119 | 25 | 15 | 11 |
| 120–149 | 25 | 10 | 0 |
| ≥150 | 25 | 6 | 0 |

All files decoded successfully. All 15 errors came from the algorithm reporting
no detectable beats, including some short/non-percussive material. No timeout
or page exception occurred. Duration range: 0.574–103.140 seconds. Maximum
algorithm time: Chrome 66.9 ms, Edge 69.7 ms; maximum decode 306.6/301.0 ms.
These desktop results are not target-device calibration.

A further Chrome sensitivity run decoded the same frozen corpus at 44.1 kHz:
default exact 33, half 1, double 7, other wrong 44, errors 15; wide exact 16,
half 19, double 2, other wrong 48, errors 15. Maximum algorithm time 147.7 ms.
Higher sampling rate changes some estimates and still fails the acceptance gate.
This additional run is a sampling-rate check; two-browser equivalence above
applies to the primary 12 kHz evaluation.

The fixed stratified loop sample is diagnostic, not a population-weighted
full-song accuracy estimate. The default range cannot represent expert tempos
outside its bounds. Short clips and non-percussive loops remain deliberately
included. Scores must not be advertised as an accuracy percentage for all music.
The tool provides a scalar tempo and phase, without confidence or a tempo map.

## ARTBeaT changing-tempo supplement

The [original ARTBeaT archive](https://audiolabs-erlangen.de/resources/MIR/2024-ARTBeaT)
by Rico Rosenbusch supplies CSV reference beat timestamps and CC BY 4.0 licensing.
The associated study uses human tapping; this benchmark uses the supplied
`gt_csv` reference, and does not claim to reproduce raw individual participant
taps or the study's beat-tracking F-measure. Original ZIP CRC passed, SHA256:
`55d29f0ea5c42c5babfaad6eb30e8b41d5deda9efe8b92694d8bba86a6b7edc3`.
Local download used Git's trusted CA bundle after the system trust store could
not validate the site's HARICA chain; TLS verification remained enabled.

24 clips ran in both browsers; piano performance case 18 is excluded pending
separate provenance review. Each full clip ran both tempo policies as diagnostics.
For abrupt-change cases 05–15, the first and last quarter were separately analyzed.
Their references are 60 divided by the median adjacent CSV beat interval within
that exact window (at least three reference beats). Window locations were fixed
before detector execution. The [supplement manifest](../research/artbeat-bpm-samples-2026-10-05.json)
records audio/reference hashes and all 22 windows.

| 22 reference windows | Exact ≤2% | Half | Double | Other wrong | Error |
|---|---:|---:|---:|---:|---:|
| Default | 5 (22.7%) | 1 | 10 | 6 | 0 |
| Wide | 11 (50.0%) | 7 | 0 | 4 | 0 |

All 92 cases per browser agree, including full-clip estimates and errors.
Full calibration clip 01 reported no detectable beats under both policies.
Maximum algorithm time across both browsers was 22 ms.
Example: the 75→150 and 150→75 full clips both return approximately 100 BPM
by default, or 75 in the wide range. Neither scalar reconstructs both tempos.
Continuous changes, metric ambiguity and syncopation are diagnostic cases;
there is no global correctness score for a changing-tempo clip. Window accuracy
is kept separate from the FSLD main score and from actual tempo-map tracking.

## Reproduction and validation

1. Use the pinned isolated detector and bundle from the preceding
   [tool evaluation](bpm-tool-accuracy-2026-10-05.md).
2. Run `scripts/prepare-annotated-bpm.py`, then the same script with `--select`.
   It requires Python standard library only and original source network access.
   Reusing a frozen directory rejects ID changes; existing files are hashed.
3. Download the linked original `ARTBeaT_Dataset.zip` into the ignored evaluation
   directory, then run `scripts/prepare-artbeat-bpm.py`. Standard HTTPS clients
   may require a current CA trust store; never disable TLS verification.
4. Run `node scripts/serve-annotated-bpm.mjs` and open its loopback URL in
   Chrome/Edge through Playwright CLI. Run
   `scripts/check-annotated-bpm-browser.js` in each browser; `?rate=44100`
   selects the optional sampling-rate check. `/artbeat` selects the supplement.
   Reload after changing experiment.
5. Run `node scripts/summarize-annotated-bpm.mjs`. It asserts unique/complete
   cases, labels, hashes, classifications and exact cross-browser equivalence.

Local raw evidence: `output/tool-pilots/annotated-bpm-2026-10-05/` contains
original annotations/metadata, frozen manifest, audio, Chrome/Edge reports,
Chrome 44.1 kHz report and `decision.json`.

Current-state checks: `npm test` 107 passed; `npm run lint` passed;
`npm run build` passed (16 assets, 6.07 MB generated). No new product assets
were accepted. Full world seek/replay and creator journey were skipped because
the isolated measurement scripts change no application behavior.

Recommended follow-up: evaluate another detector against this same frozen
corpus, then consider editable tempo candidates with manual tapping and
half/double controls. Adoption requires a separately accepted product slice.
