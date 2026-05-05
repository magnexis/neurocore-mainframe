# Security Policy

## Project Status

NeuroCore // MAINFRAME is not a public release, hosted service, or community-maintained project. It is a local creative prototype. No public security response program, bounty process, or support SLA is offered.

## Supported Versions

There are no supported release versions. The current local working copy is the only maintained artifact.

## Reporting a Vulnerability

External vulnerability reports are not expected. If this project is forked or adapted, the fork owner is responsible for reviewing, securing, and maintaining their own version.

## Security Notes

This project is a front-end simulation. It does not connect to real infrastructure, store secrets, or execute user-provided system commands.

## Product Hardening

- The Rust backend applies baseline browser security headers, including CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and a restrictive permissions policy.
- API request bodies are size-limited before handlers run.
- Commands, action targets, and module/action pairs are validated before logging or processing.
- Local session persistence stores only sanitized operator state, not arbitrary submitted payloads.
- The generated `.neurocore-session.json` file is ignored by git.
- The Vite dev server mirrors the production security headers where practical.

## Real Telemetry Mode

Real telemetry mode samples local CPU, memory, and process metadata from the Rust backend process. It does not expose environment variables, file contents, command output, or network credentials. Keep this mode disabled before sharing the app on an untrusted network.
