# Music Universe Interface Kit

An AI-native spatial application runtime for turning music into interactive worlds.

Built with React Three Fiber, Three.js, Rapier physics, and a declarative spatial schema layer.

The project explores a new interface paradigm:

> Turn music into worlds people can enter.

## Concept

A user uploads a track. AI analyzes the music, creates a world bible and interactive narrative, then compiles the experience into an explorable small planet.

```
Music
  -> AI understanding
  -> World Bible
  -> Interactive Narrative
  -> Spatial Application Schema
  -> 3D World Runtime
  -> Interactive Experience
```

## Architecture

```
World Models
(Marble / HY-World / other generators)
          |
          v
Music World Schema
          |
          v
Spatial Scene Schema
          |
          v
Runtime
 - World
 - Interaction
 - Camera
 - State
 - UI
          |
          v
Web Experience
```

## Core Capabilities

- AI-friendly spatial scene definitions
- Music timeline driven world changes
- Interactive narrative runtime
- Camera and cinematic controls
- Physics-based exploration
- Spatial UI and command registry
- Adapter architecture for different world providers

## Repository Structure

```
src/
├── music/          # Music world experience schema and timeline system
├── schema/         # AI-friendly spatial schema
├── world/          # 3D runtime and curved world engine
├── interaction/    # Interaction dispatcher and registry
├── camera/         # Camera system
├── player/         # Character controller
├── adapters/       # External application integrations
├── ui/             # Spatial UI system
└── state/          # Runtime state
```

## Roadmap

1. Music experience runtime
2. World model adapters
3. Creator workflow
4. Public music world database
5. Remixable interactive music universe

See `docs/music-universe-roadmap.md`.

## Development

```bash
npm install
npm run dev
npm run build
```

## License

MIT
