# Memory Journey Vertical Slice

> Status: experience contract for the first vertical slice
> Last updated: 2026-07-26

## Outcome

A first-time listener can enter one 3–5 minute music world, understand their
role without developer guidance, recover one memory, follow the world’s answer,
and leave through the departure gate. The experience has a readable beginning,
middle, ending, and replay.

This slice advances:

- Phase 0 readiness by defining the demo input and acceptance path;
- Phase 1 by choosing the **Memory** template and fixing the three meaningful
  interactions required for the first experience.

## Experience statement

> The listener arrives on a planet that has forgotten why it was singing. A
> guide asks them to carry one recovered memory to the departure gate. As the
> track develops, the world reveals the memory, draws a path through the storm,
> and opens the way out.

The player is a listener and witness, not a combatant. Movement, attention, and
three deliberate interactions are sufficient to finish.

## Asset roles

Asset names remain implementation details. In the experience they are presented
as:

| Runtime/asset role | Experience role |
|---|---|
| Guide astronaut / Guide NPC | The Listener Guide |
| Support terminal | Echo Terminal — controls, hints, and recovery |
| Product tower / hangar | Memory Archive |
| Docs portal / portal gate | Departure Gate |
| Memory Tree | The recovered memory made visible |
| Light Path | Non-interactive navigation response |

The Echo Terminal is support infrastructure and does not count as one of the
three required narrative interactions.

## Emotional arc

| Track position | Beat | World response | Listener intent |
|---:|---|---|---|
| 0.00–0.16 | Arrival | Quiet blue planet, sparse stars | Orient and meet the Guide |
| 0.16–0.34 | Recognition | Constellations gather | Understand that the world reacts to music |
| 0.34–0.52 | Tension | Rain and fog move in | Search for the Memory Archive |
| 0.52–0.68 | Recovery | Memory Tree appears | Receive the recovered memory |
| 0.68–0.84 | Answer | Light Path points outward | Follow the path to the gate |
| 0.84–0.96 | Departure | Gate opens, storm clears | Enter the Departure Gate |
| 0.96–1.00 | Afterglow | Warm color and final narration | Understand completion or choose replay |

Normalized positions describe authored timing, not automatic music analysis.
The legally distributable demo track must be selected before release.

## Required interaction 1 — Accept the journey

**Actor:** The Listener Guide

Availability:

- visible from arrival;
- prompt is discoverable from the spawn area;
- keyboard, pointer, and the declared touch strategy must expose the same action.

Action:

- explain movement and the listener’s role in one short exchange;
- provide captions for all spoken/narrated text;
- set `journey.started = true`;
- emit `interaction.action-completed` for the guide action.

Recovery:

- dismissing the panel does not trap the player;
- the Guide remains available;
- approaching the Memory Archive without starting produces a short direction
  back to the Guide, not a silent failure.

## Required interaction 2 — Recover the memory

**Actor:** Memory Archive, visually answered by the Memory Tree

Availability:

- discoverable before the 0.52 cue;
- collection becomes actionable when `journey.started = true`;
- the timeline may reveal the Memory Tree, but it must not silently mark the
  interaction complete.

Action:

- show one concise memory fragment;
- set `memory.received = true`;
- emit `interaction.action-completed` for the archive action;
- change the prompt and feedback on repeat interaction;
- do not duplicate completion events.

Blocked behavior:

- missing `journey.started` emits `interaction.blocked` with reason
  `conditions`;
- the UI explains the next action in plain language.

## Required interaction 3 — Leave through the gate

**Actor:** Departure Gate

Availability:

- the timeline controls visual opening at the 0.84 cue;
- completion requires both `memory.received = true` and the gate-open world
  state;
- arriving early gives a readable “the gate is still listening” response.

Action:

- set `journey.completed = true`;
- emit `interaction.action-completed` for departure;
- move to a stable ending state rather than immediately destroying the world;
- offer Replay and Stay.

Blocked behavior:

- if the gate is open but the memory was missed, point back along the Light
  Path to the Memory Archive;
- the listener may finish the missing interaction after the music naturally
  ends; completion must not require restarting the track.

## Echo Terminal support behavior

The Echo Terminal provides:

- controls reminder;
- independent music/effects volume and mute;
- subtitles toggle;
- reduced-effects setting;
- current objective;
- recovery hint if a required interaction is blocked.

It must not become a fourth required step or contain product-support language.

## State and lifecycle contract

### Timeline-derived state

Environment, camera, narration, landmark visibility, Light Path, and visual gate
opening are reconstructed from music time. Seeking backward or forward rebuilds
them deterministically.

### Session interaction state

These flags record deliberate listener actions:

```text
journey.started
memory.received
journey.completed
```

Rules:

- seeking within the same play session does not erase them;
- pause/resume does not erase them;
- natural music ending does not erase them;
- explicit Restart, Replay, track replacement, or world replacement resets them;
- resetting emits `interaction.runtime-reset` with the corresponding reason;
- replay begins from the same documented initial flag snapshot.

This separation prevents seeking from fabricating an interaction or erasing a
choice the listener already made.

## Initial state

```json
{
  "journey.started": false,
  "memory.received": false,
  "journey.completed": false
}
```

All condition checks fail closed when their data source or custom resolver is
missing.

## Accessibility and comfort

The slice requires:

- captions for narration and meaningful sound cues;
- independent music and effects volume or, at minimum, mute plus balanced mix;
- reduced-effects mode covering rain, bloom intensity, camera motion, and
  flashing/pulsing decoration;
- keyboard-visible focus for HTML controls;
- no interaction that depends only on color or sound;
- a documented touch path or an explicit desktop-only entry message.

Spatial audio improves direction but may not be the sole navigation method.

## Failure and recovery

| Failure | Required response |
|---|---|
| Demo audio unavailable | Explain the problem and allow retry or local upload |
| Local audio cannot decode | Keep the world stable and offer another file |
| WebGL/runtime cannot start | Show a non-Canvas recovery page |
| Asset fails to load | Preserve interaction proxy and label with a fallback visual |
| Required condition is false | Emit blocked event and show the next useful action |
| Listener misses a timed landmark | Keep the required interaction reachable after natural end |
| Replay requested | Reset session flags and reconstruct timeline from zero |

## Acceptance walkthrough

The vertical slice passes when a first-time user can:

1. enter with the demo track;
2. understand movement and interact with the Guide;
3. locate and recover the memory;
4. follow the Light Path;
5. enter the open Departure Gate;
6. recognize the ending;
7. replay and observe a clean initial state.

Additional lifecycle checks:

- seek backward after memory recovery: timeline visuals rewind, memory remains
  received;
- seek forward before memory recovery: gate may appear open but departure is
  blocked with guidance;
- natural end before completion: world stays explorable;
- replace track: interaction flags reset;
- missing model/audio: narrative path remains usable through fallbacks.

## Out of scope

- automated music analysis;
- multiple templates or branching endings;
- inventory UI beyond the memory flag;
- generated hero assets;
- accounts, cloud save, public publishing, or remix;
- complex dialog trees, quests, combat, or multiplayer.

## Integration boundary

The first implementation step is a pure, tested interaction runtime for
conditions, flags, reset semantics, and typed events. Wiring it into Zustand,
`InteractionDispatcher`, the scene schema, and the three actors is a separate
integration change after the concurrent asset/audio work stabilizes.
