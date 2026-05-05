import { api } from '../services/api.js';

export const memoryModule = {
  id: 'memory',
  label: 'MEMORY',
  code: '03',
  render() {
    return `
      <div class="module-grid">
        <article class="panel span-2">
          <h3>Memory Grid</h3>
          <div class="action-bar">
            <button type="button" data-memory-action="compact">Compact</button>
            <button type="button" data-memory-action="flush">Flush cache</button>
            <button type="button" data-memory-action="seal">Seal blocks</button>
          </div>
          <p class="action-status" id="memory-status">Memory lattice is warm and writable.</p>
          <div class="memory-grid">
            ${Array.from({ length: 96 }, (_, index) => `<button type="button" data-memory-cell="${index}" style="--seed:${index % 13}" aria-label="Memory block ${index.toString(16).toUpperCase().padStart(2, '0')}"></button>`).join('')}
          </div>
        </article>
        <article class="panel">
          <h3>Allocation</h3>
          <div class="donut-list">
            <p><b style="--v:72"></b><span>Core heap</span><strong>72%</strong></p>
            <p><b style="--v:48"></b><span>Archive cache</span><strong>48%</strong></p>
            <p><b style="--v:31"></b><span>Signal buffer</span><strong>31%</strong></p>
          </div>
        </article>
        <article class="panel">
          <h3>Volatile Blocks</h3>
          <p class="terminal-readout" id="memory-readout">0x7F3A:WARM<br>0x812C:HOT<br>0x04AE:SEALED<br>0xBB90:FLUSHING</p>
        </article>
      </div>
    `;
  },
  mount(root, state, log) {
    const controller = new AbortController();
    const status = root.querySelector('#memory-status');
    const cells = [...root.querySelectorAll('.memory-grid [data-memory-cell]')];
    const readout = root.querySelector('#memory-readout');
    const allocation = [...root.querySelectorAll('.donut-list strong')];
    const allocationRings = [...root.querySelectorAll('.donut-list b')];

    function updateMemoryReadout(index) {
      const activeCount = cells.filter((cell) => cell.classList.contains('is-active')).length;
      status.textContent = `Block 0x${Number(index).toString(16).toUpperCase().padStart(2, '0')} toggled. ${activeCount} active blocks.`;
      readout.innerHTML = `0x${Number(index).toString(16).toUpperCase().padStart(2, '0')}:ACTIVE<br>0x${(0x7f3a + Number(index)).toString(16).toUpperCase()}:WARM<br>${activeCount} BLOCKS:LIT<br>LATTICE:INTERACTIVE`;
      allocation[0].textContent = `${Math.min(99, 42 + activeCount)}%`;
    }

    function driftMemory() {
      const target = cells[Math.floor(Math.random() * cells.length)];
      if (target && Math.random() > 0.34) {
        target.classList.toggle('is-active', Math.random() > 0.54);
      }
      allocation.forEach((item, index) => {
        const next = Math.max(12, Math.min(96, Number.parseInt(item.textContent, 10) + Math.round((Math.random() - 0.45) * 11)));
        item.textContent = `${next}%`;
        allocationRings[index]?.style.setProperty('--v', next);
      });
      const address = Math.floor(0x1000 + Math.random() * 0xefff).toString(16).toUpperCase();
      const states = ['WARM', 'HOT', 'SEALED', 'SHIFTING', 'OPEN', 'MIRRORED'];
      readout.innerHTML = `0x${address}:${states[Math.floor(Math.random() * states.length)]}<br>0x${Math.floor(0x1000 + Math.random() * 0xefff).toString(16).toUpperCase()}:PULSE<br>${cells.filter((cell) => cell.classList.contains('is-active')).length} BLOCKS:LIT<br>LATTICE:REWRITING`;
    }

    root.addEventListener('click', async (event) => {
      const cell = event.target.closest('[data-memory-cell]');
      if (cell) {
        cell.classList.toggle('is-active');
        updateMemoryReadout(cell.dataset.memoryCell);
        log.push(`MEMORY BLOCK ${cell.dataset.memoryCell} ${cell.classList.contains('is-active') ? 'LIT' : 'CLEARED'}`);
        return;
      }

      const button = event.target.closest('[data-memory-action]');
      if (!button) return;
      const action = button.dataset.memoryAction;
      cells.forEach((cell, index) => {
        cell.classList.toggle('is-sealed', action === 'seal' && index % 4 === 0);
        cell.classList.toggle('is-flushed', action === 'flush' && index % 3 === 0);
        cell.classList.toggle('is-compacted', action === 'compact' && index % 2 === 0);
      });
      const result = await api.action('memory', action).catch(() => ({ message: `Memory ${action} completed locally.` }));
      status.textContent = result.message;
      log.push(result.message.toUpperCase());
    }, { signal: controller.signal });
    const driftInterval = window.setInterval(driftMemory, state.performance ? 2100 : 950);
    return () => {
      controller.abort();
      window.clearInterval(driftInterval);
    };
  },
};
