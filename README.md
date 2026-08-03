# Music Universe Interface Kit

An AI-native spatial application runtime for turning music into interactive worlds.

Built with React Three Fiber, Three.js, Rapier physics, and a declarative spatial schema layer.

The optional development asset stack also includes glTF Transform for
optimization and Tripo's API for review-only text/image-to-3D candidates. Tripo
is not a browser runtime dependency or a current creator-facing feature.

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

The project advances through gated phases:

1. runtime reliability;
2. one complete listener vertical slice;
3. a versioned, editable project schema and creator workflow;
4. assisted generation;
5. controlled publishing, then remix.

See [`docs/music-universe-roadmap.md`](docs/music-universe-roadmap.md) for
direction, [`NOW.md`](NOW.md) for current priorities, and
[`docs/development-workflow.md`](docs/development-workflow.md) for the delivery
process. Repository agents must also follow [`AGENTS.md`](AGENTS.md).

## Development

```bash
npm install
npm run dev
npm run build
```

## Asset Pipeline

Runtime assets are declared in `assets/asset-manifest.json` and generated with:

```bash
npm run assets:validate
npm run assets:build
```

See [`docs/asset-pipeline.md`](docs/asset-pipeline.md) for formats, budgets,
licensing requirements, and cache policy.

Optional generated hero-asset candidates use the local Tripo CLI:

```bash
npm run assets:tripo -- --help
```

See [`docs/tripo-asset-generation.md`](docs/tripo-asset-generation.md) for the
official tutorial URLs, credential setup, rights gates, commands, and staged
integration plan. Candidates remain outside the runtime manifest until review.

The verified free-source index and per-asset acceptance rules are documented in
[`docs/asset-library-index.zh-CN.md`](docs/asset-library-index.zh-CN.md).

## License

MIT
