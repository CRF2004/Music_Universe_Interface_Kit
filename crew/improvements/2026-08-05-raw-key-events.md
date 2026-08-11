# Hardware browser raw key events

## Evidence

Candidate screenshots before and after held `W` were visually identical even
though the agent inferred movement. CDP `keyDown` did not reach the application's
keyboard-control state as a native movement event.

## Change

The hardware driver now sends `rawKeyDown` plus Windows/native virtual key codes
and a matching `keyUp`.

## Acceptance

Before another black-box report is accepted, screenshots must visibly show the
avatar/camera position changing after held movement. Reports from the faulty
driver remain tool-calibration evidence, not product acceptance evidence.
