# Crew tool library

Tools are deterministic support utilities, separate from agent judgment.

- `validate-experience-report.mjs` checks report shape and referential evidence
  before a finding is accepted.
- `compare-experience-reports.mjs` compares two runs using observable metrics;
  it deliberately produces no aggregate quality score.
- `hardware-browser.mjs` gives an isolated black-box agent only visible-browser
  actions: screenshots, coordinate clicks, ordinary keys, and bounded waits.
  It intentionally exposes no DOM, JavaScript evaluation, semantic probe, or
  test ID command. Run it with Windows `node.exe` when controlling the native
  hardware-accelerated Chrome profile. `click` accepts coordinates from the
  captured screenshot and maps them to the CSS viewport, including Windows
  display scaling.

Tools may be improved through reviewed changes with fixtures. Agents may
propose a tool change but may not edit or replace tools during an observation
run.
