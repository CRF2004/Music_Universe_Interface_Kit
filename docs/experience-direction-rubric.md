# Memory Journey Experience Direction Rubric

> Status: active design review contract
> Last reviewed: 2026-07-30

## Ownership

The agent owns proposing and implementing a coherent art, pacing, and
interaction direction for the vertical slice. User feedback is evidence and
taste input, not a requirement for the user to specify exact assets, colors,
effects, camera values, or game mechanics.

Before asking for subjective feedback, the agent should provide a designed
candidate that passes the repository checks below and explain the intended
feeling in plain language.

## Experience thesis

Memory Journey should feel like crossing a quiet, forgotten listening station
that gradually remembers how to sing.

The emotional progression is:

```text
curiosity
  -> orientation
  -> discovery
  -> visible awakening
  -> musical release
  -> calm closure
```

Every major visual, sound, landmark, and interaction should reinforce one of
these beats. Elements that add visual density without strengthening the arc are
not automatically improvements.

## Agent review lenses

### Readability

- The current destination is identifiable without reading a long panel.
- Walkable ground, obstacles, decoration, and interactable objects look
  materially different.
- Foreground, middle ground, landmark, and sky remain separable at the fixed
  review cameras.
- Particles read as intentional weather, sky, or guidance rather than frozen
  debris.

### Coherence

- Models share a deliberate palette, roughness range, outline treatment, scale,
  and orientation.
- Lighting has one motivated key direction and landmarks have controlled accent
  light.
- UI uses the same naming and emotional tone as the world.
- Asset-library additions are recolored or staged into the world rather than
  appearing as unrelated pack samples.

### Interaction reward

Each required interaction must change at least two channels:

```text
world state / landmark
visual motion or light
sound
narration or text
navigation
```

A panel plus a flag with no perceptible world response is not a complete
interaction.

### Pacing and agency

- A first action is available within 30 seconds.
- Travel between required interactions contains at least one anticipatory cue
  or environmental response.
- The player makes three understandable choices/actions rather than only
  waiting for the timeline.
- The strongest audiovisual change occurs near the final music section.
- The ending holds long enough to understand completion and offers a clear
  replay choice.

### Comfort and performance

- Camera occlusion, collision, precipitation, bloom, and motion do not obscure
  navigation.
- Reduced-effects mode preserves all required information.
- Visual enrichment stays inside the target-device budget.

## Evidence the agent should generate

For every meaningful scene pass:

1. run `npm run journey:regression`;
2. inspect its five fixed-stage screenshots as a sequence, not independently;
3. record semantic and performance regressions;
4. describe the intended emotional change and whether the screenshots support
   it;
5. run a short first-person browser pass for camera, collision, weather, sound,
   and timing;
6. document remaining taste risks before asking for user feedback.

Automated screenshots cannot judge delight by themselves. The agent must still
make and defend a design judgment, then use user observation to challenge that
judgment.

## Next authored art pass

The next scene pass should prioritize:

- a recognizable arrival composition around the Listener Guide;
- a readable route from Guide to Archive that avoids the hangar collider;
- a visible Archive awakening across lighting, memory shards, and audio;
- environmental anticipation leading toward the Departure Gate;
- a distinctive gate-opening climax and calmer afterglow.

Do not begin with more asset volume. Begin with composition, contrast, motion,
and state change using the assets already in the repository.
