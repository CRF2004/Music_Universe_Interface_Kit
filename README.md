# Product World Interface Kit

A high-tension, 3D spatial interface kit built with React Three Fiber, Rapier physics, and a custom curved-world shader. Designed for building spatial dashboards, AI agent environments, and product discovery worlds.

## Features

- **Curved World Engine**: Stylized "Route A" visual curvature shader that keeps the physical interaction layer stable
- **Tension Camera Rig**: 5 dynamic camera presets (Explore, Interaction, Inspection, Cinematic, UI-Safe) with orientation slerping and shoulder offsets
- **Interaction Dispatcher**: Unified system for proximity, click, and hotkey-based interactions with condition support and cooldown logic
- **Extensible Registry**: Decoupled visual components and UI panels via a registration system
- **Comic-Panel UI**: Clean, high-contrast aesthetic with custom Tailwind v4 theme tokens
- **Adaptive Architecture**: Easily swap core world adapters to connect different product data sources
- **Post-Processing**: Vignette, noise, bloom, and halftone dot-screen effects
- **Dev Tools**: Integrated Leva debug panel for real-time parameter tuning

## Tech Stack

- **React 19 + Vite 6**
- **Three.js / @react-three/fiber 9**
- **Rapier Physics / @react-three/rapier**
- **Ecctrl**: Robust character controller
- **Zustand**: Lightweight state management
- **Tailwind CSS v4**: Theme-driven styling
- **@react-three/postprocessing**: Post-processing pipeline
- **motion**: Interaction animations
- **lucide-react**: Icon library

## Getting Started

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # Production build
```

### Controls

1. **Move**: WASD
2. **Jump**: Space
3. **Interact**: Approach objects and press **E** or **Click**
4. **Inspect**: Click on product towers to enter inspection mode
5. **Sprint**: Hold Shift

## Architecture

```
src/
├── world/           # World scene, terrain, and curved shader
├── interaction/     # Interaction registry, dispatcher, and visual components
├── player/          # Character controller (Ecctrl)
├── camera/          # Camera rig with 5 presets
├── adapters/        # Bridge between app logic and spatial interactions
├── content/         # Demo world and interaction definitions
├── ui/              # HTML overlay system (panels, prompts, dock)
└── state/           # Zustand state management stores
```

## Camera Presets

| Mode          | FOV  | Distance | Height | Use Case            |
|---------------|------|----------|--------|---------------------|
| Explore       | 82°  | 5.5      | 2.3    | General movement    |
| Interaction   | 68°  | 3.6      | 1.8    | Object/NPC focus    |
| Inspection    | 45°  | 3.0      | 1.5    | Close examination   |
| Cinematic     | 35°  | 10       | 4.0    | Scripted moments    |
| UI-Safe       | 56°  | 6.2      | 2.6    | Text reading        |

## Extension

- **New interactions**: Add entries to an `InteractionPointDefinition[]` array
- **New UI panels**: Use `registerPanel(id, component)` from `src/ui/panelRegistry.tsx`
- **Custom adapters**: Implement the `AppAdapter` interface from `src/adapters/appAdapterTypes.ts`
- **New visuals**: Use `registerVisual(type, component)` from `src/interaction/visualRegistry.tsx`

## Env Variables

```env
APP_URL="https://your-app-url.com"
```

## License

MIT
