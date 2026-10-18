# Dataset-leading method: Percival BPM evaluation

Decision: Percival improves this frozen corpus but fails the predeclared 90%
exact-tempo gate. Retain as an isolated reference; no application dependency,
schema, asset or deployment change. Scope: [accepted comparison](../research/percival-bpm-scope-2026-10-05.md).

## What the public comparison supports

The [FSLD authors' benchmark](https://aframires.github.io/freesound-loop-annotator/)
reports Percival14 as first on multiple-annotation **Either** Accuracy1 (85.24%)
and Mean Accuracy (84.98%). Percival14_essentia leads multiple-annotation **Same**
Accuracy1 (63.55%) and Mean Accuracy (65.75%). Single-annotation Accuracy1 is
led by Zapata14 (62.39%). Therefore there is no single winner across every
subset/metric. This is an author-reported 2020 comparison of seven methods;
it does not establish a current universal leaderboard.

Public Accuracy1 tolerates 4%; Accuracy2 allows factors 1/3, 1/2, 1, 2, 3.
Our unchanged main gate is 2%, with half/double separately reported. A 4% score
is also provided for metric context. Our 100 stratified samples (64 single,
36 agreeing multiple expert annotations) are not the full original benchmark.
Public Either results must not be treated as a promise of 85% on our sample.

The [original ARTBeaT study](https://audiolabs-erlangen.de/resources/MIR/2024-ARTBeaT)
compares online PLP and human tapping, with parameter variants and beat metrics.
No open competitive leaderboard was located. Its results do not identify a
best scalar BPM detector. We reuse its supplied reference CSV windows.

A search surfaced the recent [PEA-Tempo paper](https://www.mdpi.com/2076-3417/16/19/9828).
Indexed text describes contributor/pack splits and uploader BPM labels for FSL10K,
which differ from this expert-reference evaluation. The full publisher page/PDF
was inaccessible (429/403); no verifiable official runnable release/checkpoint
was located during this bounded search. Its ranking and reproduction were not
verified. It was not labelled the current winner or tested here.

## Implementation and fixed inputs

Tested official [Essentia.js](https://github.com/MTG/essentia.js) npm 0.1.3
`PercivalBpmEstimator`, based on Percival/Tzanetakis (2014) autocorrelation and
pulse-train evaluation. [Algorithm documentation](https://essentia.upf.edu/reference/std_PercivalBpmEstimator.html)
specifies frames 1024/2048, hops 128/128, 44.1 kHz, 50–210 BPM. Those defaults
are unchanged; a predeclared 50–300 range is the only sensitivity policy.
This tests Essentia's implementation, not the original author's implementation.

Npm integrity (verified against registry.npmjs.org, matching installed mirror):
`sha512-vVEPgeVMEBLRXbM5o5H5Rgu53EPHu25vyFKYg+flWLzI/nEoegJQez9FKRv8GR/KxIBwm+fXDEFL+MkQeoHaLw==`.
Pinned isolated directory: `output/tool-pilots/percival-bpm-2026-10-05/`.
Only dependency is node-wav 0.0.2 (MIT), unused in the browser path.

All source audio hashes are checked against the preceding frozen manifest
before the local server starts. Same 100 IDs/references and same 22 ARTBeaT
first/last-quarter windows, no result-based exclusions. Browser decode uses
44.1 kHz; stereo is averaged to mono. Complete input is sent to a dedicated
worker. A 15-second deadline terminates and recreates that worker; vectors
are released after every case. No network song upload, pretrained model or API.

Initial test harness attempts exposed that the `web.js` loader assumes a DOM,
and the bundled `umd.js` exports an initialized Module rather than a factory.
The final harness uses the unmodified UMD build with a worker-local export
shim and waits for `onRuntimeInitialized`. Initialization attempts were discarded;
reported algorithm scores come only from complete successful final runs.

## Measured results

Chrome 154 / Edge 154 on the current Windows desktop each ran 200 FSLD and
92 ARTBeaT cases. Every BPM, error and classification matches between browsers.
Final runs: zero page exceptions, decode failures or job timeouts.

| FSLD, 100 samples | Exact ≤2% | Exact ≤4% | Half | Double | Other wrong | Error |
|---|---:|---:|---:|---:|---:|---:|
| Percival default 50–210 | 52% | 54% | 22 | 5 | 21 | 0 |
| Percival wide 50–300 | 54% | 56% | 22 | 6 | 18 | 0 |
| Prior detector default, 44.1 kHz | 33% | — | 1 | 7 | 44 | 15 |
| Prior detector wide, 44.1 kHz | 16% | — | 19 | 2 | 48 | 15 |

The prior primary 12 kHz default was 31%; the same-rate prior sensitivity run
was 33%. Default-to-default improvement at the same sample rate is +19 points;
wide-to-wide improvement is +38 points. This is a system comparison: ranges,
mono mixing and algorithms differ. No controlled claim isolates one cause.

| Expert BPM bucket | Samples | Percival default exact | Wide exact |
|---|---:|---:|---:|
| <90 | 25 | 13 | 13 |
| 90–119 | 25 | 23 | 23 |
| 120–149 | 25 | 15 | 17 |
| ≥150 | 25 | 1 | 1 |

Single annotations: 30/64 exact under both policies (32/64 within 4%).
Multiple agreeing annotations: 22/36 default, 24/36 wide (same within 4%).
Fast loops remain a major weakness even after widening the range. Positive
output on every clip establishes coverage, not confidence or correct beats.

| ARTBeaT, 22 fixed reference windows | Exact ≤2% | Half | Double | Other wrong | Error |
|---|---:|---:|---:|---:|---:|
| Percival default | 16/22 (72.7%) | 3 | 2 | 1 | 0 |
| Percival wide | 16/22 (72.7%) | 3 | 2 | 1 | 0 |
| Prior default, 12 kHz | 5/22 (22.7%) | 1 | 10 | 6 | 0 |
| Prior wide, 12 kHz | 11/22 (50%) | 7 | 0 | 4 | 0 |

24 full clips also ran under both policies as diagnostics. No single global
correctness label is assigned to changing/ambiguous tempo audio. These window
results measure scalar estimates on already-selected segments; they do not
verify automatic boundary detection, tempo-map tracking or beat F-measure.
Piano case 18 remains excluded under the prior provenance review decision.

Maximum FSLD worker algorithm time: Chrome 1,962.5 ms; Edge 1,910.1 ms.
Maximum ARTBeaT window algorithm time: 108.2/104.9 ms. Decode maxima for
FSLD: 397.1/336.8 ms. Timings exclude worker startup and message transfer;
concurrent desktop browser measurements do not establish target-device speed.

## Payload and product decision

Worker-ready UMD backend: 2,562,470 bytes / 791,419 gzip; API: 43,155 bytes /
8,758 gzip. Total 2,605,625 bytes / 800,177 gzip, about 23.3 times the prior
detector's 34,411-byte gzip. This is the shipped full library; a reduced build
was not attempted. Payload file SHA256 values are recorded in local evidence.

The package is AGPL-3.0; [official licensing](https://essentia.upf.edu/licensing_information.html)
offers commercial licensing and describes separate dependency/model conditions.
No model is used here. Product adoption needs license compatibility review,
payload/performance budgeting and editable failure recovery as well as accuracy.
This task authorizes local evaluation only.

Next candidate: [Beat This! official implementation](https://github.com/CPJKU/beat_this),
with published checkpoints (main ~78 MB, small ~8.1 MB) and MIT code/weights.
The authors flag copyrighted/limited-license training material; inspect training
provenance and dataset overlap before testing/adoption. It is not verified as
first on FSLD or ARTBeaT. No weights or Python stack downloaded in this slice.
Test on the same frozen corpus after that review.
Fast-loop errors and half/double choices should remain explicit. Any product
BPM feature should retain editable candidates, manual tapping and user confirmation.

## Reproduction and validation

Install `essentia.js@0.1.3 --save-exact --ignore-scripts` in the isolated directory.
Use existing dataset files from [preceding evaluation](annotated-bpm-accuracy-2026-10-05.md).
Run `scripts/serve-percival-bpm.mjs`, open loopback port 4183 using Playwright CLI,
then run `scripts/check-percival-bpm-browser.js` in Chrome and Edge.
Repeat after navigating to `/?corpus=artbeat`. Run
`scripts/summarize-percival-bpm.mjs` to verify complete cases, reference matching,
classification correctness and cross-browser equality. Reports, lockfile, payload
hashes, logs and decision are local under the isolated directory.

Current checks: 107 tests passed, type check passed, production build passed
(16 existing assets, 6.07 MB generated). Measurement scripts passed syntax and
evidence assertions. Full game lifecycle/seek/replay and accessibility walkthrough
were skipped: no product behavior/UI changed. Existing unrelated modifications
remain intact. Root package and lockfile remain unchanged by this task.
