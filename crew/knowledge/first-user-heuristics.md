---
id: first-user-heuristics
version: 1
reviewedAt: 2026-08-05
owner: Music Universe experience review
---

# First-user experience knowledge

This is reviewed domain knowledge for the black-box experience agent. It may be
read before a run because it describes professional observation methods, not
the Memory Journey's intended answer.

## Discoverability

- Identify what receives attention in the first 5, 15, and 30 seconds.
- A visible instruction is not necessarily understood; confirm the next action
  a new listener would infer from hierarchy, wording, and placement.
- Count competing calls to action. Treat equally prominent, unrelated actions
  as decision friction.
- Record when a target is named but not visually distinguishable from scenery.

## Navigation and interaction

- Test whether movement, camera direction, interact range, prompt timing, and
  collision agree with the listener's expectation.
- A route is readable when its next segment remains visible during movement,
  not merely from a fixed review camera.
- A world destination ring or beacon indicates where to travel; it is not proof
  that the avatar is inside interaction range. Require the dedicated visible
  interaction prompt before judging an interaction input as accepted or broken.
- For browser-tool runs, confirm that held movement visibly changes the
  player/world composition. Do not infer movement merely because a key command
  returned successfully.
- Interaction feedback should change at least two perceptible channels: world
  state, motion/light, sound, narration/text, or navigation.
- Repeated prompts for an already completed object are likely to contradict the
  current objective even if the underlying state is correct.

## Pacing and music

- Separate active confusion from intentional waiting.
- Record whether the world acknowledges musical transitions and whether the
  strongest response aligns with the final section.
- A listener who reaches a time-gated destination early needs a useful activity
  or an intelligible reason to wait.
- Natural ending must not silently remove the ability to finish.

## Accessibility and comfort

- Check keyboard-only operation, visible focus, readable labels, subtitles,
  independent volume controls, and reduced-effects behavior.
- Record camera occlusion, collision jitter, flashing, excessive bloom,
  precipitation obstruction, and motion discomfort as observable risks.
- Do not claim to experience nausea or emotional immersion. Flag visual motion
  patterns for human validation instead.

## Evidence and severity

- `blocked`: cannot continue within the retry/time contract.
- `severe`: completes only after substantial confusion or a hidden/non-obvious
  workaround.
- `moderate`: clear friction that does not prevent independent completion.
- `minor`: localized polish or wording issue.
- Observations describe visible facts. Inferences explain likely meaning.
  Recommendations propose changes and must cite observations.
