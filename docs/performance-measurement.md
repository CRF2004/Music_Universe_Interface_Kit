# Production browser performance measurement

Use the in-world probe for repeatable release-candidate measurements. The
probe is inert during normal visits and publishes telemetry only when the URL
contains `?e2e=1`.

## Native Chrome run

1. Build and serve the production bundle:

   ```bash
   npm run build
   npm run preview -- --host 127.0.0.1
   ```

2. Launch a separate Chrome profile with remote debugging and open
   `http://127.0.0.1:4173/?e2e=1`.

   ```text
   chrome --remote-debugging-port=9223 --user-data-dir=<temporary-profile>
   ```

3. Leave the representative scene view active, then collect at least 300
   frames:

   ```bash
   npm run performance:collect
   ```

   Override the measurement viewport when needed:

   ```bash
   PERFORMANCE_VIEWPORT_WIDTH=1920 \
   PERFORMANCE_VIEWPORT_HEIGHT=1080 \
   PERFORMANCE_DEVICE_SCALE_FACTOR=1 \
   PERFORMANCE_SAMPLE_COUNT=600 \
   PERFORMANCE_SCENARIO=departure \
   npm run performance:collect
   ```

   `PERFORMANCE_SCENARIO=departure` loads the generated ambience as a
   deterministic short track, seeks to the open-gate phase, and positions the
   player so the Memory Tree, Light Path, Departure Portal, particles, shadows,
   and post-processing are represented in the sample.

The JSON output includes median and 1% low FPS, peak draw calls and visible
triangles, renderer identity, resource counts and transfer bytes, plus
lower-bound geometry, texture, framebuffer, and total GPU-memory estimates.
Record OS, browser version, viewport, pixel ratio, power state, and whether the
run was cold or warm alongside the JSON.

## Acceptance notes

- A renderer containing `SwiftShader`, `llvmpipe`, or `software` is functional
  coverage only. Do not use its FPS as a release measurement.
- The GPU-memory value is deliberately labeled a lower bound. Browser,
  compositor, driver, multisample, and post-processing allocations may add to
  it.
- Run the representative music journey, not an empty scene, before comparing
  results with `docs/browser-performance-budget.md`.
