# Ranked-method BPM comparison

- Outcome: owner requested a different detector informed by dataset-leading
  methods; use the author-reported FSLD benchmark rather than popularity.
- Current gate: Phase 3 local music analysis accuracy and editable fallback.
- Slice: original benchmark/source/license inspection → pinned Essentia.js
  Percival implementation → frozen FSLD 100 sounds and ARTBeaT 22 windows →
  Chrome/Edge measurements and comparison. No product integration or deployment.
- Selection: Percival14 leads FSLD multiple-annotation Either Acc1 (85.24%,
  4% tolerance), and Essentia variant leads Same Acc1 (63.55%). These are
  author-reported 2020 comparisons, not a verified current universal leaderboard.
  ARTBeaT source is a PLP/human study; no competitive leaderboard located.
- Freeze: reuse exact audio hashes, expert reference and windows. Default
  documented Percival range 50–210; 50–300 is a declared sensitivity policy.
  Decode 44.1 kHz and average stereo channels to mono. No label-informed range,
  per-case parameter tuning, training, cropping or sample exclusion.
- Evidence: 2% exact gate ≥90%, 4% exact for metric context, half/double,
  other wrong, full error denominator, runtime, payload, cross-browser agreement.
  ARTBeaT separate, no global tempo correctness for changing-tempo audio.
- Cost/rights: isolated ignored npm directory and local dataset only, no paid
  calls, no song upload, no new runtime dependencies or assets. Essentia AGPL-3.0
  and separately licensed dependencies require a product licensing decision;
  local evaluation does not authorize deployment. Record pinned package/source.
- Bound: test one leading-method implementation with two range policies.
  Retain manual workflow. No speculative backend, model training or large model
  download. Record inaccessible recent papers/code as evidence limits.
