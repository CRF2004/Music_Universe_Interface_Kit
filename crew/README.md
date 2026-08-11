# Music Universe Crew

This directory contains bounded review agents that improve current product
evidence. It is not a general autonomous-agent runtime.

## Current crew

- [`agents/first-user-experience.md`](agents/first-user-experience.md) defines a
  read-only, black-box desktop experience reviewer for the Memory Journey.
- [`scenarios/memory-journey-first-run.json`](scenarios/memory-journey-first-run.json)
  fixes its task, limits, and acceptance thresholds.
- [`schemas/experience-report.schema.json`](schemas/experience-report.schema.json)
  defines the evidence it must return.
- [`knowledge/first-user-heuristics.md`](knowledge/first-user-heuristics.md)
  provides versioned professional heuristics without revealing the journey answer.
- [`tools/`](tools/) contains deterministic report validation and comparison utilities.
- [`improvements/`](improvements/) defines the reviewed calibration workflow for
  improving knowledge, prompts, and tools.

The experience agent is a preflight check before human observation, not a
replacement for it. It must not read source code, semantic probes, the journey
regression implementation, or the intended Guide → Archive → Gate answer until
its black-box run is over.

## Governance

- Review agents observe and report; they do not edit product files in the same
  run.
- Every run records the commit, browser, viewport, limits, actions, and evidence.
- Reports distinguish observations, inferences, and recommendations.
- Prompts, schemas, thresholds, and governance require human-reviewed changes.
- An agent may propose improvements to its protocol, but may not rewrite or
  relax its own evaluation contract.
- Three repetitions of the same blocker end the run and preserve evidence.
- Provider routing, persistent memory, agent-generated agents, automatic
  commits, and autonomous deployment are deferred until a demonstrated product
  need advances a roadmap gate.

This adopts the useful evidence and autonomy boundaries described by
`oh-my-cli` without introducing a new orchestration dependency during Phase 0.
