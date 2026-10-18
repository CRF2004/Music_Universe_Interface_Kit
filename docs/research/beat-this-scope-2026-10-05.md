# Beat This! fixed-corpus evaluation

- Outcome: owner requested Beat This! accuracy/runtime comparison for editable
  local tempo analysis; Phase 3 assistance and correctable output gate.
- Slice: official code/checkpoint/license and training-set review → isolated
  pinned Python inference → frozen 100 FSLD sounds plus 24 ARTBeaT clips and
  22 reference windows → complete evidence and adoption decision.
- Primary model: official `final0`, FP32 CPU, DBN disabled. No model selection
  on test results, fine-tuning, label-based ranges, half/double correction,
  track exclusions or product/backend integration. No paid services/uploads.
- BPM reduction fixed before inference: median consecutive predicted beat
  interval among 0.2–2 seconds (30–300 BPM); no valid interval is an error.
  ARTBeaT uses the same standalone first/last-quarter audio windows as Percival;
  full-clip beats are diagnostic for changing music, with no global truth BPM.
- Evidence: audio/model SHA256, package versions, training-source overlap audit,
  complete denominator, 2% exact gate ≥90%, 4% contextual score, half/double,
  wrong/errors, CPU latency and package/model download sizes. One CPU repeat on
  fixed first sample verifies stable output. CPU target ≤2 seconds per loop;
  per-job subprocess deadline 30 seconds, failures preserved.
- Rights: official MIT code/weights; authors flag copyrighted/limited-license
  training sources. Check named training corpora and file identities where
  available. No claim of legal clearance from MIT alone. Existing evaluation
  sounds remain ignored/local; piano ARTBeaT 18 stays excluded.
- Budget/fallback: one main checkpoint ~78 MB and isolated CPU dependencies;
  use existing Python runtime, no global installs or CUDA toolkit. Record
  package costs and browser portability limits. Manual product workflow retained.
- Acceptance: reproducible scripts/raw beat times, verified hashes and scoring,
  current project checks, explicit limits. This is native Python evidence;
  browser equivalence/lifecycle applies only after a separate browser integration.
