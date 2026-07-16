# Music Runtime Engine

The Music Runtime Engine connects a track timeline with spatial world changes.

## Architecture

```
Audio playback time
        |
        v
MusicClock
        |
        v
MusicTimelineExecutor
        |
        v
World mutations / interaction events
```

## Design

The runtime does not generate worlds. It orchestrates experiences created by world models and spatial schemas.

Examples:

- chorus starts -> change sky environment
- bridge section -> unlock memory zone
- climax -> cinematic camera transition
- outro -> open travel portal

## Future integration

The controller will connect to:

- Zustand world state
- camera controller
- interaction dispatcher
- world provider adapters
- audio analysis pipeline
