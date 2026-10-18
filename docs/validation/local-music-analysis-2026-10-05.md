# Local music analysis engineering acceptance

Scope: [first Phase 3 slice](../local-music-analysis.md). Owner acceptance pending.
Implemented local peak/RMS overview, neutral energy-change candidates, section
rename/start edits/split/merge, undo/redo, autosave/export/refresh, matching song
reattachment and explicit existing-cue placement. No new dependencies or assets.

Validation on 2026-10-05:

- 107 unit tests pass; type check and final production build pass.
- Existing creator journey passes in hardware Chrome and Edge: 132 checks,
  24 screenshots each, zero errors/findings; synthetic audio fixture.
- Focused analysis browser workflow covers synthetic 60-second amplitude change,
  section/cue editing, keyboard focus after save, malformed import preservation,
  refresh, reattachment, cancel, worker failure/retry and replacement.
- Authorized private local Crywolf MP3 (278.4437 seconds): 3,848 ms to analyze,
  512 bins, 12 candidates, 44,990-byte project export; seek and play/pause keep
  sections. Measured on this desktop only. This is processing evidence; semantic
  verse/chorus accuracy was not measured.
- Waveform/section screenshot inspected for readability; no animation added.
  Numeric inputs and named buttons work within existing keyboard dialog trap.

Production: ExperienceRoot 109.29 kB / 32.03 kB gzip (previous 99.59 / 28.55);
analysis decode helper lazy-loaded 1.93 / 0.95 kB gzip; worker 1.40 kB.
PhysicsWorld 67.65 / 20.71 kB gzip, Three/Rapier unchanged. Asset build validates
16 existing assets, 6.07 MB. Analysis does not run during normal playback; explicit
analysis allocates transient decoded PCM at 12 kHz. The 40 MiB / 600-second cap
limits typical usage; browser decoder transient allocation can vary.

Evidence under `output/playwright/music-analysis-*`, unit/lint/build logs under
`output/deployment/music-analysis-*`. One initial build failed cleaning an esbuild
temporary file with Windows Access denied. Retrying with a task-owned temporary
directory passed. Type checking now excludes ignored output artifacts, keeping
all source/tests included.

Limits: RMS/dBFS is unweighted signal energy, not integrated LUFS. Loudness
changes provide suggestions, not semantic structure. Mono/stereo only, up to
10 minutes and 40 MiB. One decode timeout plus one worker timeout are bounded at
15 seconds each; cancellation ignores late decoder results and terminates worker.
Song bytes remain local. BPM and metadata candidates are documented separately;
no tool/service has been adopted. Weak-device/network calibration and independent
creator timings remain follow-up checks. Owner product acceptance is pending.

The engineering result uses the existing project v2 plus optional analysis;
older strict-v2 applications reject this new field. Seek/replay, playback-time
authority, manual editing fallback and existing spatial/cue history are retained.
