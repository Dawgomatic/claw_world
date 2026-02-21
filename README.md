# claw_world

3D Agent Simulator — a browser-based front-end for watching AI agents live, work, and rest in a shared 3D world.

## Features

- **3D World** (Babylon.js) with 4 zones: Plaza, Workshop, Garden, Lab
- **Procedural avatars** — cute chibi characters generated from agent identity
- **Monitor dashboard** — agent list, activity feed, task board, agent details
- **OpenClaw Bridge Protocol** — generic interface any agent framework can implement
- **Mock adapter** — 5 simulated agents for development/demos
- **Xagent adapter** — connects to xagent gateway (`:18790`)

## Quick Start

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build

```bash
npm run build    # Production build in dist/
npm run preview  # Preview production build
```

## Architecture

```
src/
├── bridge/       # OpenClaw protocol + adapters (mock, xagent)
├── store/        # Zustand state (agents, UI)
├── world/        # Babylon.js 3D world
│   ├── scene/    # Scene setup, zones
│   ├── avatar/   # Procedural avatar builder
│   └── agents/   # Agent entities + navigation
├── monitor/      # Dashboard panels
└── ui/           # Shared UI components
```

## License

MIT
