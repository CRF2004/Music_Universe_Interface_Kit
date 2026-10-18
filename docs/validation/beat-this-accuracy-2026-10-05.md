# Beat This! fixed-corpus evaluation

Decision: official `final0` improves the ARTBeaT window test to 21/22 (95.5%)
but achieves 53/100 (53%) on frozen expert-labelled FSLD loops. The predeclared
automatic BPM gate (≥90% exact and ≤2 seconds per loop) fails. Retain as an
isolated beat-tracking candidate; no product integration, backend or deployment.
Scope: [owner-authorized evaluation](../research/beat-this-scope-2026-10-05.md).

## Source, model and training review

The [official implementation](https://github.com/CPJKU/beat_this) publishes
MIT code and model weights. Tested PyPI `beat-this==1.1.0`, official `final0`
checkpoint, FP32 CPU, DBN disabled. The original checkpoint came from the URL
in official `inference.py`:
`https://cloud.cp.jku.at/public.php/dav/files/7ik4RrBKTS273gp/final0.ckpt`.

81,058,141 bytes (77.3 MiB); original server SHA1
`e1506282faf66ca10e8ab50ee26bd542b7b9ff0a` verified. SHA256:
`8c328b45f59d8dd3dff219253ff6a8d6482be57d0133a29140e2febbf8eb8331`.
TLS verification remained enabled. Range retrieval assembled exact ordered
parts, then verified the complete official checksum before inference.
Checkpoint loading uses the package's local `torch.load(weights_only=True)`
path; no arbitrary untrusted checkpoint or remote model load was used.

Reviewed [training annotation repository](https://github.com/CPJKU/beat_this_annotations)
tree `fd9fcc0896cb78730bae735102c8753ef3a3badd`. It names asap, ballroom, beatles,
candombe, filosax, groove_midi, gtzan, guitarset, hainsworth, harmonix, hjdb,
jaah, rwc, simac, smc and tapcorrect. The official model description excludes
GTZAN from final0 training. No FSLD/Freesound/ARTBeaT named corpus or path was
found. This is a named-source audit, not audio-fingerprint proof of no overlap.
The authors flag copyrighted or limited-license training audio; MIT weights
alone do not establish clearance of training material for product use.

## Fixed scoring and complete cases

Same 100 FSLD IDs, expert references and audio hashes as the prior comparison;
no new selection, fine-tuning, range tuning or half/double correction.
All audio hashes are verified before model loading. SoundFile reads original
float32 samples, stereo channels are averaged, and the official Audio2Beats
path performs its own 22,050 Hz resampling/log-mel analysis.

The BPM reduction was fixed before execution: median consecutive predicted
beat interval among 0.2–2 seconds, then 60/interval (30–300 BPM). A missing
valid interval is an error in the full denominator. This tests the complete
model plus reduction policy; it does not evaluate every possible BPM reducer.
Raw predicted beats/downbeats are retained. The model uses 50 FPS output;
quantized intervals and short-clip context are possible limitations, without
establishing them as the cause of any particular error.

ARTBeaT uses 24 complete diagnostic clips and the same 22 standalone
first/last-quarter windows as Percival. Case 18 piano performance remains
excluded under the existing provenance review. Reference window BPM uses
median adjacent supplied CSV beat intervals. Whole variable-tempo clips have
no single correctness label. No automatic segment discovery, tempo-map accuracy,
downbeat accuracy or beat F-measure is claimed.

## Results

| 100 FSLD loops, ≤2% error | Exact | Half | Double | Other wrong | Error |
|---|---:|---:|---:|---:|---:|
| Beat This! final0 CPU | 53 | 4 | 5 | 33 | 5 |
| Percival default | 52 | 22 | 5 | 21 | 0 |
| Percival wide | 54 | 22 | 6 | 18 | 0 |
| First Web Audio tool default, 44.1 kHz | 33 | 1 | 7 | 44 | 15 |

Beat This! within 4%: 57/100. Five failures have no valid consecutive beat
interval, IDs 246079, 119565, 271146, 13638 and 246087. No decoder exception,
model exception or timeout occurred. A repeat on the frozen first sound
107170 reproduced every beat and BPM exactly (including its incorrect tempo).

| Expert BPM bucket | Samples | Beat This! exact | Percival wide exact |
|---|---:|---:|---:|
| <90 | 25 | 11 | 13 |
| 90–119 | 25 | 20 | 23 |
| 120–149 | 25 | 10 | 17 |
| ≥150 | 25 | 12 | 1 |

Beat This! substantially improves the fast-loop bucket but performs worse in
other buckets. The same mixed 100-loop score therefore stays near Percival.
The stratified corpus is a diagnostic sample, not a population-weighted
accuracy estimate for full songs.

| 22 ARTBeaT reference windows | Exact ≤2% | Half | Other wrong/errors |
|---|---:|---:|---:|
| Beat This! | 21/22 (95.5%) | 1 | 0 |
| Percival | 16/22 (72.7%) | 3 | 3 |
| First tool, best range | 11/22 (50%) | 7 | 4 |

The one wrong Beat This! window is case 14 first quarter: reference 240.125 BPM,
prediction 120 BPM. Continuous-change full-clip scalar estimates still collapse
the track into one tempo: cases 05/06 produce 75, 19 about 81.08 and 20 about
88.24. Strong window scores alone do not prove automatic full-song tempo maps.

## Runtime, installation and applicability

Windows desktop: Intel Core i5-13500H (12 cores / 16 logical), CPU FP32,
4 intra-op threads and 1 inter-op thread. Model initialization 913 ms.
FSLD inference/resampling/postprocessing median 504 ms, P95 5,162 ms,
maximum 10,377 ms; 10/100 loops exceed two seconds. ARTBeaT reference windows:
median 316 ms, maximum 422 ms. All 146 inference cases total 153.7 seconds.
Timing excludes file decode and IPC; complete job maxima are in raw evidence.
Desktop activity included project checks/build during the run; results are
observations of this machine, not calibrated isolated or target-device budgets.

GPU hardware is present but CUDA inference was not tested; no GPU toolkit was
installed. This is native Python evidence. Browser deployment, ONNX conversion,
browser workers, runtime loading/cancellation and memory budgets are untested.

Isolated installed dependency tree: 1,361,769,170 bytes (~1.36 GB), plus the
81 MB checkpoint. This includes CPU PyTorch/torchaudio, NumPy and dependencies;
it is a local installation cost, not a measured browser bundle. Core pins:
torch/torchaudio 2.5.1+cpu, NumPy 2.2.6, einops 0.8.1,
rotary-embedding-torch 0.8.6, soxr 0.5.0.post1, SoundFile 0.13.1.
SoundFile also used bundled-runtime CFFI 2.1.1 and pycparser 3.0.

The model is promising for a later beat/tempo-map investigation. The current
short-loop gate and CPU speed gate fail. Product adoption also requires model
training-rights review and a concrete local/browser execution plan. Retain
manual editing/tapping and half/double controls when designing BPM suggestions.

## Reproduction and verification

Existing dataset manifests and files remain under ignored
`output/tool-pilots/annotated-bpm-2026-10-05/`. Python packages, official model,
source/license snapshots, training tree, frozen environment, logs and raw
`report.json`/`decision.json` are under `output/tool-pilots/beat-this-2026-10-05/`.
The [compact result record](../research/beat-this-evidence-2026-10-05.json)
preserves scoring, model hash, runtime and the complete environment.

Use a Python 3.12 runtime and an isolated target `deps` directory. Install CPU
torch/torchaudio 2.5.1 from the official PyTorch CPU index, and the remaining
listed pins from PyPI; do not install into the application's dependencies.
Download the official checkpoint to that directory, then run
`scripts/evaluate-beat-this.py` and `scripts/summarize-beat-this.py`.
Each job has a 30-second process deadline and model loading a 90-second
deadline. Failed cases remain recorded; partial reports permit inspection.
The summarizer verifies case completeness, references, beat-derived BPM,
classifications, checkpoint hash and repeat determinism.

Current working-state checks: `npm test` 107 passed, `npm run lint` passed,
`npm run build` passed (16 existing assets, 6.07 MB generated). Evidence
assertions passed. Browser/world/seek/replay/UI regression was skipped because
this isolated native measurement changes no product behavior. Root npm
dependencies and unrelated existing modifications remain intact.
