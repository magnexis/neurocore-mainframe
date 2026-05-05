import { api } from '../services/api.js';

const stats = [
  ['Integrity', '98.7%', 98],
  ['Neural Load', '41.2%', 41],
  ['Entropy', '07.4%', 7],
  ['Uplink', '812 TB/s', 86],
];

export const coreModule = {
  id: 'core',
  label: 'CORE',
  code: '00',
  render() {
    return `
      <div class="module-grid core-layout">
        <article class="panel hero-panel span-2">
          <div>
            <p class="eyebrow">PRIMARY KERNEL</p>
            <h3>Consciousness Layer</h3>
            <p class="muted">A synthetic command surface for observing hidden system flow, signal pressure, process behavior, and archived memory.</p>
            <div class="action-bar">
              <button type="button" data-core-action="refresh">Refresh telemetry</button>
              <button type="button" data-core-action="diagnostic">Run diagnostic</button>
              <button type="button" data-core-action="stabilize">Stabilize core</button>
            </div>
            <p class="action-status" id="core-status">Kernel telemetry is nominal.</p>
          </div>
          <div class="integrity-ring" style="--value: 98">
            <span>98.7%</span>
            <small>INTEGRITY</small>
          </div>
        </article>
        ${stats
          .map(
            ([label, value, width], index) => `
              <article class="panel stat-panel" data-stat-index="${index}">
                <span>${label}</span>
                <strong>${value}</strong>
                <i><b style="width:${width}%"></b></i>
              </article>
            `,
          )
          .join('')}
        <article class="panel span-2">
          <h3>Subsystem Health</h3>
          <div class="subsystem-map">
            ${Array.from({ length: 28 }, (_, index) => `<button type="button" data-subsystem-cell="${index}" style="--delay:${index * 80}ms" aria-label="Subsystem node ${index + 1}"></button>`).join('')}
          </div>
        </article>
        <article class="panel">
          <h3>Access Vector</h3>
          <div class="vector-stack">
            <p><span>01</span> AUTH CHANNEL SEALED</p>
            <p><span>02</span> OBSERVER THREAD ACTIVE</p>
            <p><span>03</span> MAIN BUS COHERENT</p>
            <p><span>04</span> ANOMALY INDEX LOW</p>
          </div>
        </article>
      </div>
    `;
  },
  mount(root, state, log) {
    const controller = new AbortController();
    const status = root.querySelector('#core-status');
    const ring = root.querySelector('.integrity-ring');
    const ringValue = root.querySelector('.integrity-ring span');
    const statPanels = [...root.querySelectorAll('[data-stat-index]')];
    const subsystemCells = [...root.querySelectorAll('[data-subsystem-cell]')];

    async function refreshTelemetry() {
      try {
        const telemetry = await api.telemetry(state.realTelemetry);
        const uplinkLabel = telemetry.mode === 'real' ? `${telemetry.uplink.toFixed(1)}% MEM` : `${telemetry.uplink.toFixed(0)} TB/s`;
        const uplinkWidth = telemetry.mode === 'real' ? telemetry.uplink : Math.min(100, telemetry.uplink / 10);
        const values = [
          ['Integrity', `${telemetry.integrity.toFixed(1)}%`, telemetry.integrity],
          ['Neural Load', `${telemetry.neuralLoad.toFixed(1)}%`, telemetry.neuralLoad],
          ['Entropy', `${telemetry.entropy.toFixed(1)}%`, telemetry.entropy],
          ['Uplink', uplinkLabel, uplinkWidth],
        ];
        values.forEach(([, value, width], index) => {
          const panel = statPanels[index];
          panel.querySelector('strong').textContent = value;
          panel.querySelector('b').style.width = `${Math.max(5, Math.min(100, width))}%`;
        });
        ring.style.setProperty('--value', telemetry.integrity.toFixed(0));
        ringValue.textContent = `${telemetry.integrity.toFixed(1)}%`;
        status.textContent = telemetry.mode === 'real'
          ? 'Real local telemetry refreshed from Rust backend.'
          : 'Simulated telemetry refreshed from Rust backend.';
      } catch {
        status.textContent = 'Telemetry refresh failed. Local frame retained.';
      }
    }

    root.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-core-action]');
      if (!button) return;
      const action = button.dataset.coreAction;
      button.disabled = true;
      status.textContent = `Executing ${action}...`;
      if (action === 'refresh') await refreshTelemetry();
      const result = await api.action('core', action).catch(() => ({ message: `Local ${action} routine completed.` }));
      if (action !== 'refresh') status.textContent = result.message;
      log.push(result.message.toUpperCase());
      button.disabled = false;
    }, { signal: controller.signal });

    root.addEventListener('click', (event) => {
      const cell = event.target.closest('[data-subsystem-cell]');
      if (!cell) return;
      cell.classList.toggle('is-active');
      status.textContent = `Subsystem node ${Number(cell.dataset.subsystemCell) + 1} ${cell.classList.contains('is-active') ? 'armed' : 'released'}.`;
    }, { signal: controller.signal });

    function driftSubsystems() {
      subsystemCells.forEach((cell) => {
        if (Math.random() > 0.08) return;
        cell.classList.toggle('is-active', Math.random() > 0.58);
      });
      statPanels.forEach((panel) => {
        const bar = panel.querySelector('b');
        const current = Number.parseFloat(bar.style.width) || 40;
        const next = Math.max(6, Math.min(100, current + (Math.random() - 0.46) * 14));
        bar.style.width = `${next.toFixed(0)}%`;
      });
    }

    refreshTelemetry();
    const telemetryInterval = window.setInterval(refreshTelemetry, state.performance ? 9000 : 5200);
    const driftInterval = window.setInterval(driftSubsystems, state.performance ? 2600 : 1200);
    return () => {
      controller.abort();
      window.clearInterval(telemetryInterval);
      window.clearInterval(driftInterval);
    };
  },
};
