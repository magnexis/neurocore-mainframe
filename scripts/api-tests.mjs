import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const port = process.env.TEST_API_PORT || '8799';
const baseUrl = `http://127.0.0.1:${port}`;
const backend = spawn(process.platform === 'win32' ? 'cargo.exe' : 'cargo', ['run', '--manifest-path', 'backend/Cargo.toml'], {
  env: { ...process.env, PORT: port, CARGO_TARGET_DIR: 'backend/target-api-tests' },
  stdio: ['ignore', 'pipe', 'pipe'],
});

backend.stdout.on('data', (chunk) => process.stdout.write(`[backend] ${chunk}`));
backend.stderr.on('data', (chunk) => process.stderr.write(`[backend] ${chunk}`));

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

async function requestStatus(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  return response.status;
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 180; attempt += 1) {
    try {
      return await request('/api/health');
    } catch {
      await delay(250);
    }
  }
  throw new Error('backend did not become healthy');
}

try {
  await waitForHealth();
  const telemetry = await request('/api/telemetry?real=false');
  const processes = await request('/api/processes?real=false');
  const logs = await request('/api/logs');
  const archive = await request('/api/archive?q=signal');
  const adapters = await request('/api/adapters');
  const command = await request('/api/command', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ command: 'prototype' }),
  });
  const action = await request('/api/action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ module: 'prototype', action: 'ping' }),
  });
  const session = await request('/api/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ enabled: true, test: 'api-tests', updatedAt: Date.now() }),
  });
  const invalidActionStatus = await requestStatus('/api/action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ module: 'unknown', action: 'breakout' }),
  });
  const oversizedCommandStatus = await requestStatus('/api/command', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ command: 'x'.repeat(120) }),
  });
  const healthHeaders = await fetch(`${baseUrl}/api/health`);

  const checks = [
    ['telemetry integrity', typeof telemetry.integrity === 'number'],
    ['process list', Array.isArray(processes.processes) && processes.processes.length > 0],
    ['logs list', Array.isArray(logs.logs)],
    ['archive records', Array.isArray(archive.records)],
    ['trusted adapters', Array.isArray(adapters.adapters) && adapters.adapters.length >= 3],
    ['prototype command route', command.route === 'prototype'],
    ['prototype action ok', action.ok === true],
    ['session persisted', session.enabled === true],
    ['session sanitized', !Object.hasOwn(session, 'payload')],
    ['invalid action rejected', invalidActionStatus === 400],
    ['oversized command rejected', oversizedCommandStatus === 400],
    ['nosniff header', healthHeaders.headers.get('x-content-type-options') === 'nosniff'],
    ['frame denied header', healthHeaders.headers.get('x-frame-options') === 'DENY'],
  ];

  const failed = checks.filter(([, ok]) => !ok);
  if (failed.length) {
    throw new Error(`API checks failed: ${failed.map(([name]) => name).join(', ')}`);
  }

  console.log('API tests passed');
} finally {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(backend.pid), '/t', '/f'], { stdio: 'ignore' });
  } else {
    backend.kill('SIGTERM');
  }
}
