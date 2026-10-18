# Annotated audio BPM evaluation

Owner authorized FSLD 100-sample selection plus ARTBeaT difficult cases.
Phase 3 outcome: evaluate tempo suggestions against expert labels, retaining
manual correction. Isolated evidence only; no product dependency or audio assets.

- Slice: original archives/metadata → rights and expert-label filtering → frozen
  manifest → pinned 8.2.39 detector, default and 50–220 ranges → Chrome/Edge
  exact/half/double/other/error scores and runtime → adoption decision.
- Exclusions: product integration, online song search, paid APIs, model training,
  public audio redistribution and full beat-tracking score for a scalar detector.
- Fixed selection: FSLD finite positive expert BPM, agreement within 2% when
  multiple annotators, explicit CC0/CC BY audio license; deterministic ID-hash
  ordering and broad tempo buckets, 100 unique sounds, exclude unclear rights.
  No selection based on detector results. Preserve labels and license provenance.
- Gate: ≥90% exact estimates within 2%, half/double separately; two browsers
  agree; bounded 15-second job timeouts and ≤2-second algorithm target per loop.
- ARTBeaT: inspect supplied human taps/reference; separately report changing
  tempo material, avoid one global BPM correctness label for a changing track.
- Budgets: local ignored datasets only, selective archive reads if available;
  no 8.8 GB bulk fetch when targeted retrieval suffices. No spend or credentials.
- Rights/accessibility: per-sound licenses and exclusions documented, local-only
  evaluation; existing runtime/manual timeline editor unchanged.
- Evidence: frozen manifest/hashes, complete denominator including failures,
  raw browser reports and reproducible scripts. If source access/license prevents
  100 eligible samples, report the actual count and remaining blocker explicitly.
