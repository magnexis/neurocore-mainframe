# Support

NeuroCore // MAINFRAME is not a released product and does not provide public support channels.

This document only covers local self-checks for the private prototype. External support requests, troubleshooting obligations, issue triage, and feature requests are not accepted.

For local development issues, start with:

```bash
npm install
npm run dev
```

The frontend runs at `http://127.0.0.1:5200` and proxies API calls to the Rust backend at `http://127.0.0.1:8787`.

## Common Checks

- If Vite reports `ECONNREFUSED 127.0.0.1:8787`, restart the backend with `npm run dev` from the repository root.
- If audio does not play, click the topbar audio control and verify **Interface SFX** is enabled in Settings.
- If real telemetry does not update, verify the Rust backend is running and open Settings to enable **Real telemetry**.
- If visuals look stale, hard refresh the browser or unregister the service worker during development.

## Security

Because this is not a public service or release product, there is no public vulnerability response program. Security notes are documented in [SECURITY.md](SECURITY.md) for local evaluation.
