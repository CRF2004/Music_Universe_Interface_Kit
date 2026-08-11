# Memory Journey First-User Observation

> Status: active Phase 1 usability protocol
> Last updated: 2026-07-28

## Purpose

Observe whether a first-time listener can understand and complete the Memory
Journey without developer coaching. This is an observation guide, not a survey
of feature preferences.

## Participant and session

- Recruit 3–5 people who have not seen the implementation.
- Include at least two musicians or independent creators from the initial
  product audience.
- Use a supported desktop browser with headphones where possible.
- Do not explain movement, objectives, or the interaction order before the run.
- Ask the participant to think aloud, but do not rescue them unless they have
  been blocked for two minutes or request help.

## Starting state

1. Clear `music-universe.onboarding-seen` and
   `music-universe.experience-settings`.
2. Open the production build at 1280×720 or the participant's normal laptop
   resolution.
3. Provide the documented demo audio or ask the participant to choose a track.
4. Start recording time only after the first-entry dialog appears.

## GitHub Pages research deployment

The Pages workflow publishes automatically after a push to `main`. It can also
deploy a selected research branch manually:

1. open **Actions → Deploy GitHub Pages**;
2. choose **Run workflow**;
3. select the branch or tag containing the research version;
4. wait for the `github-pages` environment to report its URL;
5. open that HTTPS URL in a fresh private window before sharing it.

Only one Pages deployment is live at a time. A manual research deployment can
temporarily replace the `main` version, and the next push to `main` restores the
main build. Record the deployed commit in every observation session.

## Tasks and observable success

| Task | Success without coaching | Record |
|---|---|---|
| Enter the world | Dismisses onboarding and identifies movement/interact keys | time, hesitation |
| Begin the journey | Finds and speaks with the Listener Guide | time, route, missed prompt |
| Recover the memory | Locates the Memory Archive and completes it | time, blocked feedback seen |
| Reach departure | Understands the gate may wait for music and follows the path | time, early-gate behavior |
| Finish | Enters the open gate and recognizes completion | total time, confidence |
| Replay | Understands that Replay restarts interaction state | success, expectation mismatch |
| Comfort controls | Can mute music/effects and toggle subtitles/reduced effects | control found, label understood |

## Observer notes

Record facts before interpretation:

```text
Participant:
Device / browser:
Track and duration:
Completed without help:
Time to Guide:
Time to Archive:
Time to Gate:
Total completion time:
Blocked messages encountered:
Controls used:
Where the participant stopped or backtracked:
Verbatim confusion (short excerpt only):
Motion/audio comfort issue:
Keyboard/focus/accessibility issue:
```

After the run, ask only:

1. What did you think your goal was?
2. What changed because of the music?
3. What, if anything, felt unclear or uncomfortable?
4. Would you want to make one of these for your own track? Why?

## Decision thresholds

The Phase 1 walkthrough is understandable when:

- at least 4 of 5 participants finish without developer help;
- the median participant finds the Guide within 45 seconds;
- no participant is permanently trapped by a missed timed cue;
- at least 4 of 5 can describe the Guide → Archive → Gate arc;
- no repeated keyboard, focus, subtitle, volume, or motion-comfort blocker is
  observed.

Two participants failing at the same point creates a P0 usability issue. Do not
solve isolated preference comments by expanding the interaction system.

## Engineering proxy run — 2026-07-28

This run used a fresh browser profile and no stored onboarding/settings. It is
an engineering walkthrough, **not a substitute for human participants**.

Observed:

- first-entry dialog exposed movement and interaction keys;
- keyboard focus started inside the dialog and remained trapped within modals;
- the current objective progressed from Guide to Archive to Gate;
- visiting the Archive first produced a direction back to the Guide;
- visiting the Gate early produced a music-dependent waiting explanation;
- the journey remained completable after natural audio end;
- replay reset the objective to the Guide;
- independent music/effects mute and volume controls retained their settings;
- subtitles could be hidden without hiding blocked-condition guidance;
- reduced effects remained independently selectable.

Human observation status: pending recruitment of 3–5 first-time participants.

## Agent preflight

Before recruiting participants, run the read-only black-box protocol in
[`../crew/agents/first-user-experience.md`](../crew/agents/first-user-experience.md).
It uses the same first-run thresholds but may not inspect source, semantic
probes, or the scripted journey answer. Store its versioned JSON and Markdown
evidence under `crew/reports/`.

The agent preflight catches obvious discoverability, visual hierarchy, flow,
and recovery failures. It does not replace human evidence about emotion,
spatial understanding, motion comfort, or musical immersion. After each human
round, compare agent findings with participant findings before proposing a
change to the agent protocol; the agent may not rewrite its own thresholds.

### Built-in demo input

The standardized experience input is the built-in 4:38 Crywolf track
`ATHETOSIS [here's the lullaby you made me promise never to write]`. The project
owner explicitly authorized its use as a public built-in demo on 2026-08-05;
rights and provenance are recorded under
`LicenseRef-Project-Owner-Demo-Authorization` in the asset manifest.

The untouched root MP3 remains ignored as a local source fixture. The licensed
asset-pipeline copy may be exercised with:

```bash
npm run journey:demo-regression
```

Do not send the recording to external agent services. Replace or supplement the
repository authorization snapshot with the underlying signed agreement, email,
or rights-holder document before a production distribution audit.
