import { spawn } from 'node:child_process';

const commands = [
  ['backend', 'cargo', ['run', '--manifest-path', 'backend/Cargo.toml']],
  ['frontend', 'npm', ['--prefix', 'frontend', 'run', 'dev', '--', '--port', '5200', '--strictPort']],
];

const children = commands.map(([name, command, args]) => {
  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });

  child.stdout.on('data', (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  child.on('exit', (code) => {
    if (code) process.exitCode = code;
  });

  return child;
});

function shutdown() {
  children.forEach((child) => child.kill());
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
