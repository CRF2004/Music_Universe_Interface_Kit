# First-user hardware candidate — 2026-08-05

Outcome: **blocked at Journey step 1 / 3** on Chrome 150, Windows 10, 1280×720. The built-in demo loaded and played, the first objective was visible immediately, and Play at the natural ending restarted the track. The journey itself did not complete.

## Highest-severity findings

- **Blocked:** The displayed first-objective route did not advance after three ordinary approaches: `E`, clicking the visible Guide/marker, and focusing/moving in the world before retrying. [E attempt](../../output/playwright/first-user-hardware/candidate/05-guide-interaction.png), [contradictory Archive response](../../output/playwright/first-user-hardware/candidate/06-guide-click.png), [objective still present in Echo Terminal](../../output/playwright/first-user-hardware/candidate/12-after-help-e.png).
- **Severe:** Clicking around the visually marked destination produced an Archive warning and an Echo Terminal overlay, both of which repeated that the listener must speak to the Guide without showing a usable recovery cue. [Archive warning](../../output/playwright/first-user-hardware/candidate/06-guide-click.png), [Echo Terminal](../../output/playwright/first-user-hardware/candidate/11-guide-marker-click.png).
- **Severe:** At 278 / 278s, the world said “Only the afterglow remains,” but step 1 remained active and the interface did not explain whether completion was still possible. [Natural ending](../../output/playwright/first-user-hardware/candidate/13-near-end.png).

## Entry / Guide blocker verdict

The **entry presentation is visibly improved/clear**: a single primary Enter button, concise controls, the three-part journey summary, a pulsing trail, and a prominent Listener Guide marker are all present at first entry. [Entry](../../output/playwright/first-user-hardware/candidate/01-entry.png), [world after entry](../../output/playwright/first-user-hardware/candidate/02-after-enter.png).

The **Guide blocker is not visibly resolved end to end**. The listener can see what to do, but the displayed interaction methods did not advance the objective within the retry contract.

## Replay

No distinct Replay label appeared, but the ended transport showed Play; clicking it restarted playback at the opening state. Replay was therefore discovered and used. [Ended transport](../../output/playwright/first-user-hardware/candidate/13-near-end.png), [restarted state](../../output/playwright/first-user-hardware/candidate/14-replay-attempt.png).

Recommendation: make the Guide reliably interactable from the presented starting route, show an unmistakable in-range prompt and two-channel success feedback, and prevent the Guide marker click from resolving to unrelated objects or help.
