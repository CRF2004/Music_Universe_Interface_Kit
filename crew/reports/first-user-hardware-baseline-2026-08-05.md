# First-user hardware baseline — 2026-08-05

Outcome: **blocked at entry**. The first objective was immediately readable, but the visible **Enter the world** action produced no visible change after the scenario's repeated-blocker limit. The built-in Crywolf demo, journey ending, and replay could therefore not be assessed.

## Highest-severity findings

1. **Blocked — entry activation produced no visible response.** The overlay remained identical across repeated pointer attempts: [entry](../../output/playwright/first-user-hardware/baseline/00-entry.png), [first attempt](../../output/playwright/first-user-hardware/baseline/01-entered.png), [scaled attempt](../../output/playwright/first-user-hardware/baseline/02-entered-pointer-scaled.png), [offset attempt](../../output/playwright/first-user-hardware/baseline/03-entered-pointer-offset.png), and [final attempt](../../output/playwright/first-user-hardware/baseline/05-entered-screen-offset.png).
2. **Blocked caveat — this is not a definitive product hit-target diagnosis.** The hardware screenshots were 1584x792 rather than the scenario's required 1280x720, and the allowed controller did not provide a usable Tab/Enter activation path. A control-coordinate mismatch remains a plausible explanation.
3. **Moderate — competing next-step information appears before entry.** The modal's entry CTA, the dimmed Journey step 1 objective, and the Crywolf demo launcher are all simultaneously visible in the [entry evidence](../../output/playwright/first-user-hardware/baseline/00-entry.png).

## Think-aloud summary

I read the introduction as a clear overview and expected the blue button to dismiss it. When the first click made no visible change, I suspected that the capture and input coordinate spaces differed because the screenshot dimensions did not match the stated viewport. I tried scaled and window-offset points, but the state never changed and no error or focus feedback appeared. I stopped at the repeated-blocker contract instead of inspecting hidden state.

Recommendation: verify the native Chrome window at 1280x720 and the hardware controller's visible coordinate mapping (plus ordinary keyboard activation), then rerun from a fresh profile. Until then, this report should be treated as a blocked baseline rather than a product comparison result.
