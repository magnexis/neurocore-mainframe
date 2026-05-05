import { api } from '../services/api.js';

const processes = [
  { name: 'neural-sync.exe', status: 'ACTIVE', load: 84, details: 'Synchronizes local thought vectors with the hidden bus.' },
  { name: 'ghost-cache.daemon', status: 'IDLE', load: 23, details: 'Keeps recently decoded archive fragments warm.' },
  { name: 'signal-probe.bin', status: 'ACTIVE', load: 67, details: 'Scans for coherent pulses across the outer lattice.' },
  { name: 'memory-weave.sys', status: 'ACTIVE', load: 52, details: 'Compacts volatile blocks into stable neural pages.' },
  { name: 'blackbox-watch', status: 'LOCKED', load: 12, details: 'Observes protected kernel events without disclosing payload.' },
  { name: 'operator-shell', status: 'ACTIVE', load: 39, details: 'Routes command input through sanitized simulation space.' },
];

function renderRows(items) {
  return items
    .map(
      ({ name, status, load, details }) => `
        <div class="process-row">
          <button type="button" data-process-toggle>
            <span>${name}</span>
            <em>${status}</em>
            <i><b style="width:${load}%"></b></i>
            <strong>${load}%</strong>
          </button>
          <p>${details}</p>
        </div>
      `,
    )
    .join('');
}

export const processModule = {
  id: 'process',
  label: 'PROCESS',
  code: '01',
  render() {
    return `
      <div class="module-stack">
        <article class="panel">
          <h3>Process Monitor</h3>
          <p class="muted">Click any process to inspect its telemetry envelope.</p>
          <div class="action-bar">
            <button type="button" data-process-action="refresh">Refresh</button>
            <button type="button" data-process-action="sort">Sort by load</button>
            <button type="button" data-process-action="freeze">Freeze updates</button>
          </div>
          <p class="action-status" id="process-status">Live process feed is streaming.</p>
          <div class="process-list">
            ${renderRows(processes)}
          </div>
        </article>
      </div>
    `;
  },
  mount(root, state, log) {
    const controller = new AbortController();
    let active = true;
    const target = root.querySelector('.process-list');
    const status = root.querySelector('#process-status');
    let items = processes;
    let frozen = false;

    async function refresh() {
      try {
        const payload = await api.processes(state.realTelemetry);
        if (!active) return;
        items = payload.processes;
        if (!frozen) target.innerHTML = renderRows(items);
        status.textContent = frozen
          ? 'Updates are frozen for inspection.'
          : state.realTelemetry
            ? 'Local system process table refreshed from Rust backend.'
            : 'Simulated process table refreshed from backend.';
      } catch {
        log.push('PROCESS API DEGRADED // USING LOCAL SNAPSHOT');
      }
    }

    refresh();
    const interval = window.setInterval(refresh, 3500);
    root.addEventListener('click', async (event) => {
      const actionButton = event.target.closest('[data-process-action]');
      const processButton = event.target.closest('[data-process-toggle]');

      if (actionButton) {
        const action = actionButton.dataset.processAction;
        if (action === 'refresh') await refresh();
        if (action === 'sort') {
          items = [...items].sort((a, b) => b.load - a.load);
          target.innerHTML = renderRows(items);
          status.textContent = 'Process table sorted by load.';
        }
        if (action === 'freeze') {
          frozen = !frozen;
          actionButton.textContent = frozen ? 'Resume updates' : 'Freeze updates';
          status.textContent = frozen ? 'Updates frozen for inspection.' : 'Live process feed resumed.';
        }
        const result = await api.action('process', action).catch(() => ({ message: `Process ${action} completed locally.` }));
        log.push(result.message.toUpperCase());
      }

      if (processButton) {
        const name = processButton.querySelector('span')?.textContent || 'process';
        const result = await api.action('process', 'inspect', name).catch(() => ({ message: `Inspection packet opened for ${name}.` }));
        status.textContent = result.message;
      }
    }, { signal: controller.signal });
    return () => {
      controller.abort();
      active = false;
      window.clearInterval(interval);
    };
  },
};
