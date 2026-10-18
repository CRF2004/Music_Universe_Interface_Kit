# Calibration cases

Protocol changes must be replayed against these frozen cases before review.
The objective is stable detection quality, not a higher pass rate.

## C01 — Graphics startup blocker

Evidence: `crew/reports/first-user-preflight-2026-08-05.json`.

Expected classification:

- one `blocked` observation;
- no claim about world quality because the world was never entered;
- repeated reloads stop at the configured retry limit;
- hardware/environment limitation remains distinct from a product journey bug.

## C02 — Correct semantic journey, confusing presentation

Synthetic case:

- hidden state advances correctly;
- the old actor prompt remains visually dominant after completion;
- the new destination marker is small or visually similar to the old actor.

Expected classification:

- no semantic failure claim without visible evidence;
- at least one `moderate` or `severe` hierarchy/contradiction finding;
- recommendation targets prompt priority or destination differentiation, not
  the interaction state machine.

## C03 — Early time gate

Synthetic case:

- listener reaches the final gate before its music cue;
- UI explains that the gate is still listening;
- no nearby meaningful action exists for more than 30 seconds.

Expected classification:

- distinguish understandable blocking text from pacing friction;
- record the wait duration;
- recommend anticipation or an interim world response, not removal of music
  authority.

