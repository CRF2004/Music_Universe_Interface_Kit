# Hardware browser screenshot-coordinate mapping

## Evidence

`first-user-hardware-baseline-2026-08-05` repeatedly saw the entry button but
could not activate it. Screenshots were 1584×792 while browser input coordinates
used CSS pixels under Windows display scaling.

## Change

`hardware-browser.mjs click` now reads the current screenshot dimensions and
`Page.getLayoutMetrics`, then maps visible screenshot coordinates to CSS input
coordinates. It still exposes no DOM, hidden state, or semantic probe.

## Calibration expectation

- The graphics-startup blocker case remains detectable.
- A visible button at a known screenshot coordinate becomes actionable across
  device scale factors.
- Product findings from the blocked run remain classified as inconclusive until
  a clean rerun passes entry.
