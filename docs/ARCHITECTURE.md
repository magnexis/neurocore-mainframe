# Architecture

NeuroCore // MAINFRAME is documented as a private prototype. This architecture guide is for local understanding and handoff only; it is not release documentation, contribution guidance, or a public maintenance plan.

NeuroCore // MAINFRAME is split into a Vite frontend and a Rust backend powered by Axum. The goal is a fast, inspectable interface where each UI module owns its own rendering, while the backend supplies simulated telemetry, logs, process data, archive records, and command responses.

## Runtime Flow

1. `npm run dev` from the root launches the backend and frontend together.
2. `frontend/index.html` mounts the boot screen, application shell, matrix canvas, and right-rail tools.
3. `frontend/src/main.js` initializes global state, starts ambient effects, runs the boot sequence, and routes module changes.
4. `frontend/src/modules/index.js` exports the ordered module registry used by the sidebar and keyboard shortcuts.
5. Frontend modules call `frontend/src/services/api.js` for backend-backed data when available.
6. `backend/src/main.rs` exposes `/api/*` endpoints and serves `frontend/dist` in production.
7. Backend services live in `backend/src/services`.

## API Surface

- `GET /api/health`
- `GET /api/telemetry`
- `GET /api/telemetry?real=true`
- `GET /api/processes`
- `GET /api/processes?real=true`
- `GET /api/logs`
- `GET /api/archive?q=signal`
- `POST /api/action`
- `POST /api/command`

## State

The frontend keeps minimal in-memory state:

- Active module
- Theme intensity
- Performance mode
- Reduced-motion preference

User-facing settings persist to `localStorage`.

The backend keeps ephemeral in-memory simulation state for logs and generated telemetry. When real telemetry is enabled, the Rust backend samples local CPU, memory, and process data with `sysinfo`. It does not store secrets or require a database.

## Performance

High-frequency visuals are canvas-based. CSS animations are subtle and mostly limited to transforms, opacity, gradients, and shadows. Performance mode lowers ambient intensity and pauses noncritical cell animations.
