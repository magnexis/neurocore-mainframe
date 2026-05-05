import { api } from '../services/api.js';

const records = [
  { id: 'A-001', title: 'First contact with hidden process layer', status: 'Recovered' },
  { id: 'A-047', title: 'Operator imprint calibration', status: 'Encrypted' },
  { id: 'B-122', title: 'Signal bloom above threshold', status: 'Recovered' },
  { id: 'C-304', title: 'Mirror node accepted handshake', status: 'Sealed' },
  { id: 'D-909', title: 'Memory lattice self-repair event', status: 'Recovered' },
  { id: 'X-000', title: 'Unknown entity observed behind bus', status: 'Restricted' },
];

function renderRecords(items) {
  return items
    .map(
      ({ id, title, status }) => `
        <p>
          <span>${id}</span>
          <strong>${title}</strong>
          <em>${status}</em>
        </p>
      `,
    )
    .join('');
}

export const archiveModule = {
  id: 'archive',
  label: 'ARCHIVE',
  code: '05',
  render() {
    return `
      <div class="module-stack">
        <article class="panel">
          <h3>Archive Search</h3>
          <div class="archive-search">
            <input id="archive-query" placeholder="Search classified fragments" />
            <button type="button" data-archive-search>SCAN</button>
          </div>
          <div class="action-bar">
            <button type="button" data-archive-action="decrypt">Decrypt recoverable</button>
            <button type="button" data-archive-action="export">Prepare manifest</button>
            <button type="button" data-archive-action="clear">Clear query</button>
          </div>
          <p class="action-status" id="archive-status">Archive index is ready.</p>
          <div id="archive-results" class="archive-results"></div>
        </article>
      </div>
    `;
  },
  mount(root, state, log) {
    const controller = new AbortController();
    const results = root.querySelector('#archive-results');
    const input = root.querySelector('#archive-query');
    const button = root.querySelector('[data-archive-search]');
    const status = root.querySelector('#archive-status');
    let active = true;
    const driftStates = ['Recovered', 'Encrypted', 'Sealed', 'Mirrored', 'Re-indexing', 'Restricted'];
    const render = async (query = '') => {
      try {
        const payload = await api.archive(query);
        if (active) results.innerHTML = renderRecords(payload.records);
        status.textContent = `${payload.records.length} archive fragments matched.`;
      } catch {
        const normalized = query.toLowerCase();
        const filtered = records.filter((record) => Object.values(record).join(' ').toLowerCase().includes(normalized));
        results.innerHTML = renderRecords(filtered);
        status.textContent = `${filtered.length} local archive fragments matched.`;
      }
    };
    const scan = () => render(input.value);
    button.addEventListener('click', scan, { signal: controller.signal });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') scan();
    }, { signal: controller.signal });
    root.addEventListener('click', async (event) => {
      const actionButton = event.target.closest('[data-archive-action]');
      if (!actionButton) return;
      const action = actionButton.dataset.archiveAction;
      if (action === 'clear') {
        input.value = '';
        await render();
      }
      if (action === 'decrypt') {
        results.classList.add('is-decrypted');
      }
      if (action === 'export') {
        const text = [...results.querySelectorAll('p')]
          .map((row) => row.innerText.replaceAll('\n', ' / '))
          .join(' // ');
        await navigator.clipboard?.writeText(text).catch(() => {});
      }
      const result = await api.action('archive', action).catch(() => ({ message: `Archive ${action} completed locally.` }));
      status.textContent = result.message;
    }, { signal: controller.signal });
    results.addEventListener('click', (event) => {
      const row = event.target.closest('p');
      if (!row) return;
      results.querySelectorAll('p').forEach((item) => item.classList.remove('is-selected'));
      row.classList.add('is-selected');
      status.textContent = `${row.querySelector('span')?.textContent || 'Record'} selected for operator review.`;
      if (state.persistentStorage) {
        api.session({
          enabled: true,
          archiveSelection: row.querySelector('span')?.textContent || 'UNKNOWN',
          selectedAt: Date.now(),
        }).catch(() => log?.push('SESSION PERSISTENCE WRITE FAILED'));
      }
    }, { signal: controller.signal });
    render();
    const driftInterval = window.setInterval(() => {
      const rows = [...results.querySelectorAll('p')];
      if (!rows.length) return;
      const row = rows[Math.floor(Math.random() * rows.length)];
      const state = driftStates[Math.floor(Math.random() * driftStates.length)];
      row.querySelector('em').textContent = state;
      status.textContent = `Archive fragment ${row.querySelector('span')?.textContent || 'UNKNOWN'} shifted to ${state.toUpperCase()}.`;
    }, 2400);
    return () => {
      controller.abort();
      active = false;
      window.clearInterval(driftInterval);
    };
  },
};
