# First-user preflight — 2026-08-05

## Outcome

**FAILED (blocked).** At 1280×720 in a fresh headed Chromium session, the production URL displayed `Graphics unavailable — This world needs WebGL 2`. The only visible recovery action, `Reload world`, returned to the same alert on all three permitted attempts.

The run stopped under the scenario's repeated-blocker rule. The local audio file was never selectable and was not uploaded anywhere. No movement or interaction controls, first objective, journey ending, or replay action became available.

## Acceptance result

- First objective within 45 seconds: **Fail** — no objective appeared (`null`).
- Complete without an external hint: **Fail** — entry was blocked.
- Unknown blocker at most 30 seconds: **Fail** — the blocker persisted through the final retry.
- Replay discovered: **Fail** — replay was unreachable.
- Blocker severity allowed: **Fail** — a blocked finding occurred.

## Evidence

- [Entry blocker](../../output/playwright/first-user-preflight/01-entry.png)
- [Reload attempt 1](../../output/playwright/first-user-preflight/02-reload-1.png)
- [Reload attempt 2](../../output/playwright/first-user-preflight/03-reload-2.png)
- [Reload attempt 3 / stop state](../../output/playwright/first-user-preflight/04-reload-3.png)

## Finding

The visible graphics compatibility error is a complete first-run blocker in this evaluation environment. A supported path or usable fallback is required before the end-to-end memory journey can be assessed; rerun this scenario after that path is available.

Machine-readable action log and categorized findings: [first-user-preflight-2026-08-05.json](./first-user-preflight-2026-08-05.json).
