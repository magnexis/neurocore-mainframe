import { createScope } from '../effects/scope.js';
import { api } from '../services/api.js';

const channels = [
  { id: 'ALPHA', state: 'LOCKED', base: 142.8, phase: 12, noise: 4, color: '#ff2d55' },
  { id: 'DELTA', state: 'OPEN', base: 81.4, phase: 44, noise: 9, color: '#00ff88' },
  { id: 'THETA', state: 'NOISE', base: 33.7, phase: 71, noise: 22, color: '#ffd84d', className: 'theta-channel' },
  { id: 'OMEGA', state: 'TRACE', base: 219.2, phase: 128, noise: 15, color: '#a070ff' },
];

function renderChannels() {
  return channels
    .map(
      (channel) => `
        <button type="button" data-channel="${channel.id}" class="signal-node ${channel.className || ''}" style="--channel-color:${channel.color}">
          <span>${channel.id}</span>
          <b>${channel.state}</b>
          <small><i data-channel-metric="frequency">${channel.base.toFixed(1)}Hz</i><i data-channel-metric="phase">${channel.phase}deg</i><i data-channel-metric="noise">${channel.noise}%</i></small>
        </button>
      `,
    )
    .join('');
}

export const signalModule = {
  id: 'signal',
  label: 'SIGNAL',
  code: '04',
  render() {
    return `
      <div class="module-grid">
        <article class="panel span-2 signal-panel">
          <h3>Frequency Scope</h3>
          <div class="action-bar">
            <button type="button" data-signal-action="scan">Wide scan</button>
            <button type="button" data-signal-action="tune">Tune carrier</button>
            <button type="button" data-signal-action="invert">Invert phase</button>
          </div>
          <p class="action-status" id="signal-status">Carrier phase is stable.</p>
          <canvas id="signal-scope" width="860" height="330"></canvas>
          <div class="knob-board">
            <label><span>Height</span><input type="range" min="20" max="260" value="100" data-signal-knob="amplitude" data-range-unit="%" /><b class="range-value" data-range-output>100%</b></label>
            <label><span>Frequency</span><input type="range" min="25" max="260" value="100" data-signal-knob="frequency" data-range-unit="%" /><b class="range-value" data-range-output>100%</b></label>
            <label><span>Shape</span><input type="range" min="0" max="280" value="100" data-signal-knob="noise" data-range-unit="%" /><b class="range-value" data-range-output>100%</b></label>
            <label><span>Speed</span><input type="range" min="20" max="260" value="100" data-signal-knob="speed" data-range-unit="%" /><b class="range-value" data-range-output>100%</b></label>
          </div>
        </article>
        <article class="panel scanner-panel">
          <h3>Scan Aperture</h3>
          <div class="scanner"></div>
        </article>
        <article class="panel">
          <h3>Channels</h3>
          <div class="channel-list">
            ${renderChannels()}
          </div>
        </article>
      </div>
    `;
  },
  mount(root, state, log) {
    const controller = new AbortController();
    const scope = createScope(root.querySelector('#signal-scope'), { color: '#00ff88' });
    const status = root.querySelector('#signal-status');
    const scanner = root.querySelector('.scanner');
    const knobs = [...root.querySelectorAll('[data-signal-knob]')];
    const channelButtons = [...root.querySelectorAll('[data-channel]')];
    let activeColor = '#00ff88';
    let driftTick = 0;
    scope.start();

    function clampToInput(input, value) {
      return Math.max(Number(input.min), Math.min(Number(input.max), Math.round(value)));
    }

    function updateKnobReadouts() {
      knobs.forEach((knob) => {
        const min = Number(knob.min || 0);
        const max = Number(knob.max || 100);
        const progress = max === min ? 0 : ((Number(knob.value) - min) / (max - min)) * 100;
        knob.style.setProperty('--range-progress', `${Math.max(0, Math.min(100, progress))}%`);
        const output = knob.closest('label')?.querySelector('[data-range-output]');
        if (output) output.textContent = `${knob.value}${knob.dataset.rangeUnit || ''}`;
      });
    }

    function setKnob(name, value) {
      const knob = root.querySelector(`[data-signal-knob="${name}"]`);
      if (!knob) return;
      knob.value = clampToInput(knob, value);
    }

    function updateScope() {
      const values = {
        amplitude: Number(root.querySelector('[data-signal-knob="amplitude"]').value) / 62,
        frequency: Number(root.querySelector('[data-signal-knob="frequency"]').value) / 58,
        noise: Number(root.querySelector('[data-signal-knob="noise"]').value) / 48,
        speed: Number(root.querySelector('[data-signal-knob="speed"]').value) / 62,
        color: activeColor,
      };
      scope.configure(values);
      updateKnobReadouts();
      status.textContent = `Waveform adjusted: height ${(values.amplitude * 100).toFixed(0)} / frequency ${(values.frequency * 100).toFixed(0)} / shape ${(values.noise * 100).toFixed(0)}.`;
    }

    root.addEventListener('input', (event) => {
      if (event.target.matches('[data-signal-knob]')) updateScope();
    }, { signal: controller.signal });

    root.addEventListener('click', async (event) => {
      const channel = event.target.closest('[data-channel]');
      if (channel) {
        root.querySelectorAll('[data-channel]').forEach((item) => item.classList.remove('is-active'));
        channel.classList.add('is-active');
        const channelData = channels.find((item) => item.id === channel.dataset.channel);
        activeColor = channelData?.color || '#ff2d55';
        setKnob('amplitude', (channelData?.id === 'THETA' ? 2.7 : channelData?.id === 'OMEGA' ? 2.1 : 1.8) * 62);
        setKnob('frequency', (channelData?.id === 'DELTA' ? 1.35 : channelData?.id === 'OMEGA' ? 2.25 : 1.1) * 58);
        setKnob('noise', (channelData?.noise ? channelData.noise / 18 : 0.7) * 48);
        setKnob('speed', channelData?.id === 'OMEGA' ? 170 : channelData?.id === 'THETA' ? 82 : 118);
        updateScope();
        status.textContent = `${channel.dataset.channel} channel selected. Carrier ${channel.querySelector('[data-channel-metric="frequency"]')?.textContent || 'locked'}.`;
        return;
      }

      const button = event.target.closest('[data-signal-action]');
      if (!button) return;
      const action = button.dataset.signalAction;
      scanner.dataset.mode = action;
      const result = await api.action('signal', action).catch(() => ({ message: `Signal ${action} completed locally.` }));
      status.textContent = result.message;
      log.push(result.message.toUpperCase());
    }, { signal: controller.signal });

    function updateChannelData() {
      driftTick += 1;
      channelButtons.forEach((button, index) => {
        const channel = channels[index];
        const frequency = channel.base + Math.sin((driftTick + index * 2.2) / 2.3) * (3 + index * 1.4) + (Math.random() - 0.5) * 1.8;
        const phase = (channel.phase + driftTick * (7 + index * 3) + Math.floor(Math.random() * 6)) % 360;
        const noise = Math.max(0, Math.min(99, channel.noise + Math.round(Math.sin(driftTick / 1.7 + index) * 8 + Math.random() * 6)));
        button.querySelector('[data-channel-metric="frequency"]').textContent = `${frequency.toFixed(1)}Hz`;
        button.querySelector('[data-channel-metric="phase"]').textContent = `${phase}deg`;
        button.querySelector('[data-channel-metric="noise"]').textContent = `${noise}%`;
        button.dataset.tooltip = `${channel.id}: ${frequency.toFixed(1)}Hz / phase ${phase}deg / noise ${noise}%`;
      });
    }

    updateChannelData();
    updateScope();
    const driftInterval = window.setInterval(updateChannelData, state.performance ? 1800 : 850);
    return () => {
      controller.abort();
      window.clearInterval(driftInterval);
      scope.stop();
    };
  },
};
