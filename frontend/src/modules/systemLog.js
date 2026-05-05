import { api } from '../services/api.js';

export const systemLogModule = {
  id: 'system-log',
  label: 'SYSTEM LOG',
  code: '07',
  render() {
    return `
      <div class="module-stack">
        <article class="panel">
          <h3>Real-Time System Log</h3>
          <div class="action-bar">
            <button type="button" data-log-action="pause">Pause stream</button>
            <button type="button" data-log-action="marker">Insert marker</button>
            <button type="button" data-log-action="clear">Clear view</button>
          </div>
          <p class="action-status" id="log-status">Log stream is live.</p>
          <div id="full-log" class="full-log"></div>
        </article>
      </div>
    `;
  },
  mount(root, state, log) {
    const controller = new AbortController();
    const target = root.querySelector('#full-log');
    const status = root.querySelector('#log-status');
    let paused = false;
    const unsubscribe = log.subscribe((entries) => {
      if (paused) return;
      target.innerHTML = entries
        .map((entry) => `<p class="${entry.level}"><span>${entry.time}</span><strong>${entry.level}</strong>${entry.message}</p>`)
        .join('');
    });
    root.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-log-action]');
      if (!button) return;
      const action = button.dataset.logAction;
      if (action === 'pause') {
        paused = !paused;
        button.textContent = paused ? 'Resume stream' : 'Pause stream';
        status.textContent = paused ? 'Log stream paused on current frame.' : 'Log stream resumed.';
      }
      if (action === 'marker') {
        log.push('OPERATOR MARKER // MANUAL EVENT');
        status.textContent = 'Manual marker inserted.';
      }
      if (action === 'clear') {
        target.innerHTML = '';
        status.textContent = 'Visible log buffer cleared.';
      }
      await api.action('system-log', action).catch(() => null);
    }, { signal: controller.signal });
    return () => {
      controller.abort();
      unsubscribe();
    };
  },
};
