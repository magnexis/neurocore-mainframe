import { api } from '../services/api.js';

const templates = [
  'GHOST_ROUTE[{sector}] isolated at {value}% confidence',
  'MEMORY_PAGE 0x{hex} rewoven into {state} lattice',
  'SIGNAL_BLOOM detected on {channel} / phase drift {value}deg',
  'ARCHIVE_FRAGMENT {archive} re-indexed // clearance {state}',
  'PROCESS_SHADOW {process} forked into low-noise lane',
  'SONAR_CONTACT {sector} depth {value}m / return {state}',
  'DETECTION_SWEEP {room} profile returned {state}',
  'KEYSTREAM rotated // entropy delta {value}.{digit}',
  'NODE_HANDSHAKE {sector}::{channel} accepted in {digit}ms',
  'THERMAL_TRACE corridor-{digit} cooled to {value}K',
  'OPERATOR_ECHO sampled // signature {hex}',
  'CACHE_PRESSURE dropped {value}% after micro flush',
  'MIRROR_BUS reported {state} reflection',
  'NEURAL_LINK heartbeat {value} bpm // jitter {digit}ms',
  'BLACKBOX_WATCH sealed event chain {hex}',
  'PACKET_RAIN intensity shifted to {state}',
  'VAULT_DOOR virtual lock cycled // pin {hex}',
  'ANOMALY_INDEX recalculated at 0.{value}',
];

const sectors = ['NORTH', 'EAST', 'WEST', 'SOUTH', 'LUNA', 'VAULT', 'ORBIT', 'SPINE', 'WINDOW', 'CEILING'];
const states = ['STABLE', 'TRACE', 'CLEAN', 'HOT', 'QUIET', 'MIRRORED', 'SEALED', 'RISING', 'NOMINAL'];
const channels = ['ALPHA', 'DELTA', 'THETA', 'OMEGA'];
const rooms = ['OFFICE', 'APARTMENT', 'WAREHOUSE', 'CLEANROOM', 'SERVER BAY'];
const processes = ['neural-sync', 'ghost-cache', 'signal-probe', 'memory-weave', 'operator-shell'];

function stamp() {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function randomMessage() {
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template
    .replaceAll('{sector}', sectors[Math.floor(Math.random() * sectors.length)])
    .replaceAll('{state}', states[Math.floor(Math.random() * states.length)])
    .replaceAll('{channel}', channels[Math.floor(Math.random() * channels.length)])
    .replaceAll('{room}', rooms[Math.floor(Math.random() * rooms.length)])
    .replaceAll('{process}', processes[Math.floor(Math.random() * processes.length)])
    .replaceAll('{value}', String(Math.floor(12 + Math.random() * 87)))
    .replaceAll('{digit}', String(Math.floor(2 + Math.random() * 8)))
    .replaceAll('{archive}', `${String.fromCharCode(65 + Math.floor(Math.random() * 6))}-${Math.floor(10 + Math.random() * 890)}`)
    .replaceAll('{hex}', Math.floor(0x1000 + Math.random() * 0xefff).toString(16).toUpperCase());
}

export function createLiveLog({ compactTarget }) {
  const entries = [];
  const subscribers = new Set();
  let syncing = false;

  function push(message = randomMessage()) {
    const entry = {
      time: stamp(),
      message,
      level: Math.random() > 0.82 ? 'warn' : 'ok',
    };
    entries.unshift(entry);
    entries.splice(80);
    renderCompact();
    subscribers.forEach((subscriber) => subscriber(entries));
  }

  async function sync() {
    if (syncing) return;
    syncing = true;

    try {
      const payload = await api.logs();
      entries.splice(0, entries.length, ...payload.logs.slice(0, 80));
      renderCompact();
      subscribers.forEach((subscriber) => subscriber(entries));
    } catch {
      push();
    } finally {
      syncing = false;
    }
  }

  function renderCompact() {
    compactTarget.innerHTML = entries
      .slice(0, 9)
      .map((entry, index) => `<button type="button" class="${entry.level}" data-log-entry="${entry.time}-${index}-${entry.message}" data-tooltip="Select activity for verification"><span>${entry.time}</span>${entry.message}</button>`)
      .join('');
  }

  function subscribe(callback) {
    subscribers.add(callback);
    callback(entries);
    return () => subscribers.delete(callback);
  }

  return { entries, push, subscribe, sync };
}
