# Governed agent improvement

Agent knowledge, prompts, scenarios, schemas, and tools improve through review:

1. A completed run produces an evidence-backed limitation or missed finding.
2. Create a proposal describing the exact knowledge/tool change and failure it
   addresses.
3. Replay all frozen calibration cases and attach before/after results.
4. Reject changes that reveal the product's intended route to the black-box
   agent, weaken thresholds, or optimize only for a higher pass rate.
5. A human reviewer approves the version increment.

Agents never change these files during the same run they evaluate.

