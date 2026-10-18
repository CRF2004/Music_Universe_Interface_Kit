# First-user hardware rerun — 2026-08-05

## Outcome

Blocked at Journey step 1/3. The first objective was immediately identifiable, the built-in Crywolf demo loaded and played, and the pulsing trail led directly to the Listener Guide. Once visibly inside the Guide's interaction ring, neither two ordinary `E` presses nor a direct click advanced the objective. The run stopped at the scenario limit of three repetitions of the same blocker.

- Browser: Chrome 150.0.7871.187 on Windows 10
- Viewport: 1280×720
- Commit: `c10ccbd34d11863697714f44bfae53f5ae675c84`
- Completed: no
- Replay discovered: no; unreachable because the journey did not pass step 1

## Highest-severity finding

**Blocked — the visibly prompted Guide interaction does not produce objective progress.** The introduction teaches “Interact: E or click.” At the marked Guide, while the avatar is centered inside the blue ring, both taught methods leave “Journey step 1/3” unchanged. This prevents independent completion and makes replay unreachable.

Evidence: [first in-range attempt](../../output/playwright/first-user-hardware/rerun/guide-approach.png), [second E attempt](../../output/playwright/first-user-hardware/rerun/guide-blocker-2.png), [final click attempt](../../output/playwright/first-user-hardware/rerun/guide-blocker-3.png).

## Additional friction

An ambient narration banner overlaps the Guide marker and changes while interaction attempts produce no journey transition. That creates ambiguous feedback: the listener can see that *something* changed, but not whether the interaction was accepted.

Recommendation: make interaction reliably advance step 1 from within the displayed ring and add immediate, distinct accepted-interaction feedback in at least two perceptible channels.

## Evidence set

- [Entry instructions](../../output/playwright/first-user-hardware/rerun/entry.png)
- [World after entry](../../output/playwright/first-user-hardware/rerun/after-enter.png)
- [Built-in demo ready](../../output/playwright/first-user-hardware/rerun/demo-started.png)
- [Guide approach and first attempt](../../output/playwright/first-user-hardware/rerun/guide-approach.png)
- [Unchanged objective after first attempt](../../output/playwright/first-user-hardware/rerun/objective-2.png)
- [Unchanged objective after second attempt](../../output/playwright/first-user-hardware/rerun/guide-blocker-2.png)
- [Unchanged objective after click and stop](../../output/playwright/first-user-hardware/rerun/guide-blocker-3.png)
