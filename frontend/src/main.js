import './styles/base.css';
import './styles/layout.css';
import './styles/modules.css';
import { startMatrixRain } from './effects/matrixRain.js';
import { startCursorField } from './effects/cursorField.js';
import { createScope } from './effects/scope.js';
import { modules } from './modules/index.js';
import { createLiveLog } from './components/liveLog.js';
import { api } from './services/api.js';

const bootLines = [
  ['Initializing NeuroCore...', 22],
  ['Loading system modules...', 48],
  ['Establishing neural link...', 76],
  ['Mainframe access granted.', 100],
];

const state = {
  active: 'core',
  intensity: Number(localStorage.getItem('nc-intensity') || 72),
  performance: localStorage.getItem('nc-performance') === 'true',
  realTelemetry: localStorage.getItem('nc-real-telemetry') === 'true',
  audioMuted: localStorage.getItem('nc-audio-muted') !== 'false',
  soundEffects: localStorage.getItem('nc-sound-effects') !== 'false',
  theme: localStorage.getItem('nc-theme') || 'default',
  persistentStorage: localStorage.getItem('nc-persistent-storage') === 'true',
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};

const bootScreen = document.querySelector('#boot-screen');
const bootOutput = document.querySelector('#boot-output');
const bootBar = document.querySelector('#boot-bar');
const bootStatus = document.querySelector('#boot-status');
const staticBreak = document.querySelector('#static-break');
const app = document.querySelector('#app');
const ambientTrack = document.querySelector('#ambient-track');
const nav = document.querySelector('#module-nav');
const root = document.querySelector('#module-root');
const title = document.querySelector('#module-title');
const clock = document.querySelector('#clock');
const connection = document.querySelector('.connection');
const homeLink = document.querySelector('[data-home-link]');
const rebootBtn = document.querySelector('#reboot-btn');
const audioControl = document.querySelector('#audio-control');
const audioToggle = document.querySelector('#audio-toggle');
const audioVolume = document.querySelector('#audio-volume');
const miniLog = document.querySelector('#mini-log');
const commandForm = document.querySelector('#command-form');
const commandInput = document.querySelector('#command-input');
const commandResult = document.querySelector('#command-result');
let cleanupModule = null;
let themePacks = {};
let ambientAudio = null;
let sfxAudio = null;
let signalStep = 0;
const signalPattern = [4, 3, 1, 2];
let connectionTimer = null;
let staticTimer = null;
let staticScheduleTimer = null;
let lastStaticAt = 0;
let hasRenderedModule = false;

const log = createLiveLog({
  compactTarget: miniLog,
});

const matrix = startMatrixRain(document.querySelector('#matrix-canvas'), state);
const cursorField = startCursorField(document.querySelector('#cursor-field'), state);
const railScope = createScope(document.querySelector('#rail-scope'), {
  color: '#ff2d55',
  variant: 'rail',
});
const railKnobs = [...document.querySelectorAll('[data-rail-knob]')];

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function loadModuleRegistry() {
  try {
    const registry = await fetch('/config/modules.json').then((response) => response.json());
    const byId = new Map(modules.map((module) => [module.id, module]));
    registry.order?.forEach((id, index) => {
      const module = byId.get(id);
      if (!module) return;
      const config = registry.modules?.[id] || {};
      module.label = config.label || module.label;
      module.code = config.code || module.code;
      module.order = index;
    });
    modules.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  } catch {
    log.push('MODULE REGISTRY CONFIG UNAVAILABLE // USING LOCAL ORDER');
  }
}

async function loadThemePacks() {
  try {
    themePacks = await fetch('/config/themes.json').then((response) => response.json());
  } catch {
    themePacks = {};
    log.push('THEME PACK CONFIG UNAVAILABLE // USING DEFAULT PROFILE');
  }
}

function createAmbientAudio() {
  return {
    setVolume(value) {
      ambientTrack.volume = Math.max(0, Math.min(1, value));
    },
    async setMuted(muted) {
      ambientTrack.muted = muted;
      if (muted) {
        ambientTrack.pause();
        return;
      }
      await ambientTrack.play();
    },
    stop() {
      ambientTrack.pause();
    },
  };
}

function createSoundEffects() {
  let context = null;
  const volume = 0.9;
  const sounds = {
    click: new Audio('/assets/sounds/sfx-click-cling.wav'),
    highClick: new Audio('/assets/sounds/sfx-red-cling.wav'),
    greenRing: new Audio('/assets/sounds/sfx-green-ring.wav'),
    type: [
      new Audio('/assets/sounds/sfx-typewriter-key-1.wav'),
      new Audio('/assets/sounds/sfx-typewriter-key-2.wav'),
      new Audio('/assets/sounds/sfx-typewriter-key-3.wav'),
      new Audio('/assets/sounds/sfx-typewriter-key-4.wav'),
    ],
    verify: new Audio('/assets/sounds/sfx-verify-cling.wav'),
  };

  Object.values(sounds).flat().forEach((sound) => {
    sound.preload = 'auto';
    sound.volume = volume;
  });

  function ensure() {
    context ||= new AudioContext();
    if (context.state === 'suspended') context.resume().catch(() => null);
    return context;
  }

  function playFile(name, fallback) {
    if (!state.soundEffects) return;
    const bucket = sounds[name];
    const source = Array.isArray(bucket) ? bucket[Math.floor(Math.random() * bucket.length)] : bucket;
    if (!source) return fallback?.();
    const sound = source.cloneNode(true);
    sound.volume = Math.min(1, volume * (0.86 + Math.random() * 0.22));
    sound.playbackRate = 0.94 + Math.random() * 0.13;
    sound.play().catch(() => fallback?.());
  }

  function cling({ frequency = 760, duration = 0.16, gainValue = 0.035, spread = 1.52 } = {}) {
    if (!state.soundEffects) return;
    const ctx = ensure();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 420;
    master.gain.setValueAtTime(gainValue, now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    filter.connect(master).connect(ctx.destination);

    [frequency, frequency * spread].forEach((tone, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = index === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(tone + Math.random() * 18, now);
      gain.gain.setValueAtTime(index === 0 ? 0.75 : 0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration * (index === 0 ? 0.85 : 1));
      osc.connect(gain).connect(filter);
      osc.start(now + 0.004 * index);
      osc.stop(now + duration);
    });
  }

  function tick({ frequency = 1160, duration = 0.045, gainValue = 0.018 } = {}) {
    if (!state.soundEffects) return;
    const ctx = ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = frequency + Math.random() * 46;
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function staticNoise({ duration = 3, gainValue = 0.24 } = {}) {
    if (!state.soundEffects) return;
    const ctx = ensure();
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let index = 0; index < frameCount; index += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.72 + white * 0.28;
      data[index] = white * 0.58 + last * 0.42;
    }

    const source = ctx.createBufferSource();
    const highpass = ctx.createBiquadFilter();
    const notch = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    highpass.type = 'highpass';
    highpass.frequency.value = 900 + Math.random() * 360;
    notch.type = 'notch';
    notch.frequency.value = 1800 + Math.random() * 1200;
    notch.Q.value = 1.6;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(gainValue * 0.92, ctx.currentTime + duration - 0.16);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    source.buffer = buffer;
    source.connect(highpass).connect(notch).connect(gain).connect(ctx.destination);
    source.start();
    source.stop(ctx.currentTime + duration);
  }

  return {
    arm() {
      ensure();
      Object.values(sounds).flat().forEach((sound) => sound.load());
    },
    click() {
      playFile('click', () => cling({ frequency: 620, duration: 0.2, gainValue: 0.22, spread: 1.66 }));
    },
    highClick() {
      playFile('highClick', () => cling({ frequency: 1120, duration: 0.18, gainValue: 0.24, spread: 1.42 }));
    },
    greenRing() {
      playFile('greenRing', () => cling({ frequency: 280, duration: 0.34, gainValue: 0.26, spread: 1.5 }));
    },
    type() {
      playFile('type', () => tick({ frequency: 1180, duration: 0.055, gainValue: 0.14 }));
    },
    verify(ok) {
      playFile('verify', () => cling({ frequency: ok ? 840 : 260, duration: ok ? 0.28 : 0.32, gainValue: 0.26, spread: ok ? 1.5 : 1.22 }));
    },
    staticBurst() {
      staticNoise();
    },
  };
}

function ensureSoundEffects() {
  sfxAudio ||= createSoundEffects();
  sfxAudio.arm();
  return sfxAudio;
}

async function runBootSequence() {
  app.classList.add('is-locked');
  bootScreen.classList.remove('is-complete');
  bootOutput.innerHTML = '';
  bootBar.style.width = '0%';

  for (const [line, progress] of bootLines) {
    await typeLine(line);
    bootBar.style.width = `${progress}%`;
    bootStatus.textContent = progress < 100 ? `SYS_PROGRESS ${progress}%` : 'UNLOCKING INTERFACE';
    log.push(line.toUpperCase().replaceAll('.', ''));
    await sleep(state.reducedMotion ? 60 : 150);
  }

  await sleep(state.reducedMotion ? 90 : 420);
  bootScreen.classList.add('is-complete');
  app.classList.remove('is-locked');
  root.focus({ preventScroll: true });
}

async function typeLine(text) {
  const row = document.createElement('p');
  row.innerHTML = '<span class="prompt">&gt;</span> ';
  bootOutput.append(row);

  for (const char of text) {
    row.append(char);
    await sleep(state.reducedMotion ? 1 : 10 + Math.random() * 12);
  }
}

function renderNav() {
  nav.innerHTML = modules
    .map(
      (module) => `
        <button class="nav-item ${module.id === state.active ? 'is-active' : ''}" type="button" data-module="${module.id}">
          <span>${module.label}</span>
          <small>${module.code}</small>
        </button>
      `,
    )
    .join('');
  nav.querySelectorAll('.nav-item').forEach((button) => {
    button.dataset.tooltip = `Open ${button.querySelector('span').textContent} module`;
  });
}

function installPanelControls() {
  let drag = null;

  root.addEventListener('click', (event) => {
    const panel = event.target.closest('.panel');
    if (!panel) return;
    root.querySelectorAll('.panel.is-selected-panel').forEach((item) => item.classList.remove('is-selected-panel'));
    panel.classList.add('is-selected-panel');
  });

  root.addEventListener('dblclick', (event) => {
    const panel = event.target.closest('.panel');
    if (!panel) return;
    panel.style.transform = '';
    panel.style.zIndex = '';
    panel.dataset.x = '0';
    panel.dataset.y = '0';
  });

  root.addEventListener('pointerdown', (event) => {
    const handle = event.target.closest('.panel.is-selected-panel h3');
    if (!handle) return;
    const panel = handle.closest('.panel');
    drag = {
      panel,
      startX: event.clientX,
      startY: event.clientY,
      x: Number(panel.dataset.x || 0),
      y: Number(panel.dataset.y || 0),
    };
    panel.classList.add('is-dragging');
    panel.setPointerCapture?.(event.pointerId);
  });

  root.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const x = drag.x + event.clientX - drag.startX;
    const y = drag.y + event.clientY - drag.startY;
    drag.panel.dataset.x = String(x);
    drag.panel.dataset.y = String(y);
    drag.panel.style.zIndex = '5';
    drag.panel.style.transform = `translate(${x}px, ${y}px)`;
  });

  root.addEventListener('pointerup', () => {
    drag?.panel.classList.remove('is-dragging');
    drag = null;
  });
}

function installActivityVerification() {
  let selectedEntry = null;
  let verifier = null;

  miniLog?.addEventListener?.('click', (event) => {
    const entry = event.target.closest('[data-log-entry]');
    const verify = event.target.closest('[data-verify-activity]');

    if (entry) {
      selectedEntry = entry.dataset.logEntry;
      miniLog.querySelectorAll('[data-log-entry]').forEach((item) => item.classList.toggle('is-selected', item === entry));
      if (!verifier) {
        verifier = document.createElement('div');
        verifier.className = 'activity-verifier';
        verifier.innerHTML = '<button type="button" data-verify-activity>Verify activity</button><span>Awaiting verification.</span>';
        miniLog.after(verifier);
      }
      verifier.querySelector('span').textContent = 'Activity selected.';
    }

    if (verify && selectedEntry) {
      const verified = Math.abs([...selectedEntry].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 3 !== 0;
      const message = verified ? 'VERIFIED // SIGNATURE MATCH' : 'UNVERIFIED // DRIFT DETECTED';
      verifier.querySelector('span').textContent = message;
      sfxAudio?.verify(verified);
      log.push(`ACTIVITY ${message}`);
    }
  });

  miniLog?.parentElement?.addEventListener?.('click', (event) => {
    const verify = event.target.closest('[data-verify-activity]');
    if (!verify || !selectedEntry || !verifier) return;
    const verified = Math.abs([...selectedEntry].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 3 !== 0;
    const message = verified ? 'VERIFIED // SIGNATURE MATCH' : 'UNVERIFIED // DRIFT DETECTED';
    verifier.querySelector('span').textContent = message;
    sfxAudio?.verify(verified);
    log.push(`ACTIVITY ${message}`);
  });
}

function installTooltips() {
  const tooltip = document.createElement('div');
  tooltip.className = 'system-tooltip';
  document.body.append(tooltip);
  let activeTarget = null;

  function labelFor(target) {
    if (target.dataset.tooltip) return target.dataset.tooltip;
    if (target.getAttribute('aria-label')) return target.getAttribute('aria-label');
    if (target.placeholder) return target.placeholder;
    const text = target.innerText || target.value || target.tagName.toLowerCase();
    const clean = text.trim().replace(/\s+/g, ' ');
    if (target.matches('button')) return `Execute ${clean.toLowerCase()} action`;
    if (target.matches('kbd')) return `Keyboard shortcut: ${clean}`;
    return `Control: ${clean}`;
  }

  function show(target) {
    activeTarget = target;
    tooltip.textContent = labelFor(target);
    tooltip.classList.add('is-visible');
    position(target);
  }

  function hide() {
    activeTarget = null;
    tooltip.classList.remove('is-visible');
  }

  function position(target) {
    const rect = target.getBoundingClientRect();
    const left = Math.min(window.innerWidth - 24, Math.max(16, rect.left + rect.width / 2));
    const top = Math.max(16, rect.top - 12);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  document.addEventListener('pointerover', (event) => {
    const target = event.target.closest('button, input, [data-tooltip], kbd');
    if (target) show(target);
  });
  document.addEventListener('pointerout', (event) => {
    if (activeTarget && !event.relatedTarget?.closest?.('button, input, [data-tooltip], kbd')) hide();
  });
  document.addEventListener('focusin', (event) => {
    const target = event.target.closest('button, input, [data-tooltip], kbd');
    if (target) show(target);
  });
  document.addEventListener('focusout', hide);
  document.addEventListener('pointermove', () => {
    if (activeTarget) position(activeTarget);
  });
}

function setActiveModule(id) {
  const module = modules.find((item) => item.id === id);
  if (!module) return;
  const shouldInterrupt = hasRenderedModule && id !== state.active && !app.classList.contains('is-locked');
  if (shouldInterrupt) scheduleStaticBreak();

  cleanupModule?.();
  cleanupModule = null;
  state.active = id;
  title.textContent = module.label;
  title.dataset.text = module.label;
  document.body.dataset.module = id;
  root.classList.remove('is-switching');
  window.requestAnimationFrame(() => root.classList.add('is-switching'));
  root.innerHTML = module.render(state, log);
  cleanupModule = module.mount?.(root, state, log) || null;
  syncRangeReadouts(root);
  renderNav();
  log.push(`${module.label} MODULE HANDSHAKE COMPLETE`);
  hasRenderedModule = true;
}

function scheduleStaticBreak() {
  if (!staticBreak || state.reducedMotion) return;
  const now = Date.now();
  const cooldown = 2800;
  const shouldBurst = Math.random() < 0.78;
  window.clearTimeout(staticScheduleTimer);
  if (!shouldBurst || now - lastStaticAt < cooldown) return;
  staticScheduleTimer = window.setTimeout(triggerStaticBreak, 160 + Math.random() * 1100);
}

function triggerStaticBreak() {
  if (!staticBreak || state.reducedMotion) return;
  lastStaticAt = Date.now();
  const variants = ['hard', 'thin', 'roll'];
  staticBreak.dataset.staticVariant = variants[Math.floor(Math.random() * variants.length)];
  staticBreak.style.setProperty('--static-x', `${18 + Math.random() * 64}%`);
  staticBreak.style.setProperty('--static-y', `${16 + Math.random() * 68}%`);
  staticBreak.classList.remove('is-active');
  void staticBreak.offsetWidth;
  staticBreak.classList.add('is-active');
  ensureSoundEffects().staticBurst();
  window.clearTimeout(staticTimer);
  staticTimer = window.setTimeout(() => {
    staticBreak.classList.remove('is-active');
  }, 3000);
}

function updateClock() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function updateConnectionBars() {
  const level = signalPattern[signalStep % signalPattern.length];
  signalStep += 1;
  connection.dataset.level = String(level);
  connection.querySelectorAll('b').forEach((bar, index) => {
    bar.classList.toggle('is-dim', index >= level);
  });
}

function scheduleConnectionBars() {
  updateConnectionBars();
  const delay = 60_000 + Math.random() * 60_000;
  connectionTimer = window.setTimeout(scheduleConnectionBars, delay);
}

function applyCommandAction(result) {
  if (result.action === 'route' && result.route) {
    setActiveModule(result.route);
  }

  if (result.action === 'quiet') {
    state.performance = true;
    state.intensity = 35;
    applySettings();
  }

  if (result.action === 'pulse') {
    document.body.classList.add('manual-pulse');
    window.setTimeout(() => document.body.classList.remove('manual-pulse'), 700);
  }
}

function handleCommandFallback(command) {
  const normalized = command.trim().toLowerCase();
  const commandMap = {
    help: 'Commands: core, process, network, memory, signal, archive, detection, log, prototype, messages, settings, unlock, pulse, quiet',
    unlock: 'Access already granted. Neural link remains active.',
    pulse: 'Manual pulse injected into signal lattice.',
    quiet: 'Performance mode enabled. Ambient intensity reduced.',
  };

  if (modules.some((module) => module.id === normalized)) {
    setActiveModule(normalized);
    return `Routing to ${normalized.toUpperCase()} module.`;
  }

  if (normalized === 'log') {
    setActiveModule('system-log');
    return 'Opening SYSTEM LOG.';
  }

  if (normalized === 'messages' || normalized === 'mail') {
    setActiveModule('messages');
    return 'Opening MESSAGES simulator.';
  }

  if (normalized === 'quiet') {
    state.performance = true;
    state.intensity = 35;
    applySettings();
  }

  if (normalized === 'pulse') {
    document.body.classList.add('manual-pulse');
    window.setTimeout(() => document.body.classList.remove('manual-pulse'), 700);
  }

  return commandMap[normalized] || 'Unknown command. Type HELP for available commands.';
}

async function handleCommand(command) {
  try {
    const result = await api.command(command);
    applyCommandAction(result);
    return result.message;
  } catch {
    return handleCommandFallback(command);
  }
}

function applySettings() {
  const theme = themePacks[state.theme] || themePacks.default;
  Object.entries(theme?.vars || {}).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
  document.documentElement.style.setProperty('--intensity', `${state.intensity / 100}`);
  document.body.classList.toggle('performance-mode', state.performance);
  document.body.dataset.theme = state.theme;
  localStorage.setItem('nc-intensity', String(state.intensity));
  localStorage.setItem('nc-performance', String(state.performance));
  localStorage.setItem('nc-real-telemetry', String(state.realTelemetry));
  localStorage.setItem('nc-audio-muted', String(state.audioMuted));
  localStorage.setItem('nc-sound-effects', String(state.soundEffects));
  localStorage.setItem('nc-theme', state.theme);
  localStorage.setItem('nc-persistent-storage', String(state.persistentStorage));
  matrix.configure(state);
  cursorField.configure(state);
  audioToggle.textContent = state.audioMuted ? 'MUTED' : 'AUDIO';
  audioControl.classList.toggle('is-live', !state.audioMuted);
  audioToggle.classList.toggle('is-live', !state.audioMuted);
  ambientAudio ||= createAmbientAudio();
  ambientAudio.setVolume(Number(audioVolume.value) / 100);
  if (!state.audioMuted) {
    ambientAudio.setMuted(false).catch(() => null);
    ensureSoundEffects();
  } else {
    ambientAudio.setMuted(true).catch(() => null);
  }
}

function updateRailScope() {
  const values = Object.fromEntries(railKnobs.map((knob) => [knob.dataset.railKnob, Number(knob.value)]));
  railScope.configure({
    amplitude: (values.amplitude || 100) / 78,
    frequency: (values.frequency || 100) / 72,
    noise: (values.noise || 75) / 68,
    speed: 0.95 + ((values.frequency || 100) / 260),
  });
  syncRangeReadouts(document);
}

function syncRangeReadouts(scope = document) {
  scope.querySelectorAll('input[type="range"]').forEach((input) => {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const value = Number(input.value || 0);
    const progress = max === min ? 0 : ((value - min) / (max - min)) * 100;
    input.style.setProperty('--range-progress', `${Math.max(0, Math.min(100, progress))}%`);
    input.setAttribute('aria-valuetext', `${input.value}${input.dataset.rangeUnit || ''}`);
    const output = input.closest('label')?.querySelector('[data-range-output]');
    if (output) output.textContent = `${input.value}${input.dataset.rangeUnit || ''}`;
  });
}

nav.addEventListener('click', (event) => {
  const button = event.target.closest('[data-module]');
  if (button) setActiveModule(button.dataset.module);
});

homeLink.addEventListener('click', (event) => {
  event.preventDefault();
  setActiveModule('core');
  root.scrollTo({ top: 0, behavior: state.reducedMotion ? 'auto' : 'smooth' });
  log.push('HOME VECTOR RESTORED');
});

document.addEventListener('click', (event) => {
  if (event.target.closest('button, .nav-item, [data-log-entry]')) {
    const button = event.target.closest('button');
    const isRedButton = button?.matches('.audio-toggle, [data-verify-activity], [data-detection-action], [data-sonar-action], [data-log-action], [data-settings-action]');
    const isGreenButton = button?.matches('.nav-item, [data-command], [data-core-action], [data-network-action], [data-memory-action], [data-signal-action], [data-archive-action], .archive-search button, .command-panel button');
    if (isRedButton) ensureSoundEffects().greenRing();
    else if (isGreenButton) ensureSoundEffects().highClick();
    else ensureSoundEffects().click();
  }

  const command = event.target.closest('[data-command]');
  if (command) {
    event.preventDefault();
    setActiveModule(command.dataset.command);
  }
});

document.addEventListener('pointerdown', (event) => {
  if (!event.target.closest('button, input, .nav-item, [data-log-entry]')) return;
  ensureSoundEffects();
}, { capture: true });

document.addEventListener('change', (event) => {
  if (event.target.matches('input[type="range"]')) {
    syncRangeReadouts(event.target.closest('label') || document);
  }

  if (event.target.matches('[data-setting="performance"]')) {
    state.performance = event.target.checked;
    applySettings();
    log.push(`PERFORMANCE MODE ${state.performance ? 'ENABLED' : 'DISABLED'}`);
  }

  if (event.target.matches('[data-setting="intensity"]')) {
    state.intensity = Number(event.target.value);
    applySettings();
    log.push(`THEME INTENSITY SET TO ${state.intensity}`);
  }

  if (event.target.matches('[data-setting="realTelemetry"]')) {
    state.realTelemetry = event.target.checked;
    applySettings();
    log.push(`REAL TELEMETRY ${state.realTelemetry ? 'ENABLED' : 'DISABLED'}`);
    api.action('settings', 'real-telemetry', state.realTelemetry ? 'enabled' : 'disabled').catch(() => null);
  }

  if (event.target.matches('[data-setting="audioMuted"]')) {
    state.audioMuted = event.target.checked;
    applySettings();
    log.push(`AMBIENT AUDIO ${state.audioMuted ? 'MUTED' : 'LIVE'}`);
  }

  if (event.target.matches('[data-setting="soundEffects"]')) {
    state.soundEffects = event.target.checked;
    ensureSoundEffects();
    applySettings();
    log.push(`SOUND EFFECTS ${state.soundEffects ? 'ENABLED' : 'DISABLED'}`);
  }

  if (event.target.matches('[data-setting="persistentStorage"]')) {
    state.persistentStorage = event.target.checked;
    applySettings();
    log.push(`PERSISTENT STORAGE ${state.persistentStorage ? 'ENABLED' : 'DISABLED'}`);
    api.session({ enabled: state.persistentStorage, updatedAt: Date.now() }).catch(() => null);
  }

  if (event.target.matches('[data-setting="theme"]')) {
    state.theme = event.target.value;
    applySettings();
    log.push(`THEME PACK LOADED: ${state.theme.toUpperCase()}`);
  }
});

document.addEventListener('input', (event) => {
  if (!event.target.matches('input[type="range"]')) return;
  syncRangeReadouts(event.target.closest('label') || document);

  if (event.target.matches('[data-setting="intensity"]')) {
    state.intensity = Number(event.target.value);
    applySettings();
  }
});

document.addEventListener('click', (event) => {
  const processToggle = event.target.closest('[data-process-toggle]');
  if (processToggle) {
    const item = processToggle.closest('.process-row');
    item?.classList.toggle('is-open');
  }

});

document.addEventListener('click', (event) => {
  const testButton = event.target.closest('[data-test-sfx]');
  if (!testButton) return;
  state.soundEffects = true;
  localStorage.setItem('nc-sound-effects', 'true');
  const toggle = document.querySelector('[data-setting="soundEffects"]');
  if (toggle) toggle.checked = true;
  ensureSoundEffects().highClick();
  window.setTimeout(() => ensureSoundEffects().greenRing(), 130);
  window.setTimeout(() => ensureSoundEffects().type(), 280);
  window.setTimeout(() => ensureSoundEffects().verify(true), 420);
  log.push('SOUND EFFECT TEST FIRED');
});

commandForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const value = commandInput.value;
  commandInput.value = '';
  commandResult.textContent = 'Routing command through backend...';
  commandResult.textContent = await handleCommand(value);
  log.push(`OPERATOR COMMAND: ${value || 'NULL'}`);
});

rebootBtn.addEventListener('click', runBootSequence);
audioToggle.addEventListener('click', () => {
  state.audioMuted = !state.audioMuted;
  ensureSoundEffects();
  applySettings();
  log.push(`AMBIENT AUDIO ${state.audioMuted ? 'MUTED' : 'LIVE'}`);
});

audioVolume.addEventListener('input', () => {
  ambientAudio ||= createAmbientAudio();
  ambientAudio.setVolume(Number(audioVolume.value) / 100);
  syncRangeReadouts(audioControl);
});

railKnobs.forEach((knob) => {
  knob.addEventListener('input', updateRailScope);
});

document.addEventListener('keydown', (event) => {
  if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1) {
    ensureSoundEffects().type();
  }

  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const keyIndex = Number(event.key) - 1;
  if (keyIndex >= 0 && keyIndex < modules.length) {
    setActiveModule(modules[keyIndex].id);
  }
  if (event.key === '0') {
    setActiveModule('settings');
  }
  if (event.key.toLowerCase() === 'm') {
    setActiveModule('messages');
  }
  if (event.key === '`') {
    event.preventDefault();
    commandInput.focus();
  }
});

window.setInterval(updateClock, 1000);
window.setInterval(() => {
  log.sync();
}, 2200);

async function init() {
  await Promise.all([loadModuleRegistry(), loadThemePacks()]);
  applySettings();
  updateRailScope();
  syncRangeReadouts(document);
  installTooltips();
  installActivityVerification();
  installPanelControls();
  renderNav();
  setActiveModule(state.active);
  updateClock();
  window.clearTimeout(connectionTimer);
  scheduleConnectionBars();
  railScope.start();
  api.health().then(() => log.push('BACKEND LINK ESTABLISHED')).catch(() => log.push('BACKEND LINK DEGRADED // LOCAL FALLBACK'));
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(() => log.push('OFFLINE CACHE SERVICE ARMED')).catch(() => null);
  }
  runBootSequence();
}

init();
