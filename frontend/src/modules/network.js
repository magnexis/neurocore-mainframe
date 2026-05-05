import { api } from '../services/api.js';
import { createNetworkDepth } from '../effects/webglDepth.js';

const networkNodes = ['CORE', 'NYC-7', 'TYO-2', 'BER-4', 'LUNA', 'VAULT', 'ORBIT', 'RELAY', 'GHOST', 'MIRROR', 'SPINE'];

export const networkModule = {
  id: 'network',
  label: 'NETWORK',
  code: '02',
  render() {
    return `
      <div class="module-grid">
        <article class="panel span-2 network-panel">
          <h3>Connection Map</h3>
          <div class="action-bar">
            <button type="button" data-network-action="scan">Scan mesh</button>
            <button type="button" data-network-action="isolate">Isolate ghost route</button>
            <button type="button" data-network-action="boost">Boost spine</button>
          </div>
          <p class="action-status" id="network-status">Mesh traffic is balanced.</p>
          <div class="node-map" aria-label="Animated network map">
            <canvas class="network-depth" aria-hidden="true"></canvas>
            <i class="link link-0"></i>
            <i class="link link-1"></i>
            <i class="link link-2"></i>
            <i class="link link-3"></i>
            <i class="link link-4"></i>
            <i class="link link-5"></i>
            <i class="link link-6"></i>
            <i class="link link-7"></i>
            <i class="link link-8"></i>
            <i class="link link-9"></i>
            <i class="link link-10"></i>
            ${networkNodes.map((label, index) => `<span class="node node-${index}" data-node-label="${label}" data-node-load="${Math.floor(22 + Math.random() * 66)}"></span>`).join('')}
          </div>
        </article>
        <article class="panel">
          <h3>Transfer Stream</h3>
          <div class="stream-list">
            <p><span>NYC-7</span><b>1.8 PB</b></p>
            <p><span>TYO-2</span><b>842 TB</b></p>
            <p><span>BER-4</span><b>397 TB</b></p>
            <p><span>LUNA</span><b>19 TB</b></p>
          </div>
        </article>
        <article class="panel">
          <h3>Handshake Quality</h3>
          <div class="quality-meter"><b style="height:88%"></b><b style="height:71%"></b><b style="height:96%"></b><b style="height:64%"></b></div>
        </article>
      </div>
    `;
  },
  mount(root, state, log) {
    const controller = new AbortController();
    const status = root.querySelector('#network-status');
    const map = root.querySelector('.node-map');
    const depth = createNetworkDepth(root.querySelector('.network-depth'), state);
    const streamRows = [...root.querySelectorAll('.stream-list p')];
    const qualityBars = [...root.querySelectorAll('.quality-meter b')];
    const nodes = [...root.querySelectorAll('.node')];
    let tick = 0;

    function driftNetwork() {
      tick += 1;
      streamRows.forEach((row, index) => {
        const value = 120 + Math.abs(Math.sin(tick / 3 + index)) * 980 + Math.random() * 90;
        row.querySelector('b').textContent = value > 1000 ? `${(value / 1000).toFixed(1)} PB` : `${value.toFixed(0)} TB`;
      });
      qualityBars.forEach((bar, index) => {
        const next = 48 + Math.abs(Math.sin(tick / 2.1 + index * 0.9)) * 49;
        bar.style.height = `${next.toFixed(0)}%`;
      });
      nodes.forEach((node, index) => {
        const load = Math.max(4, Math.min(99, Number(node.dataset.nodeLoad || 50) + Math.round((Math.random() - 0.45) * 16)));
        node.dataset.nodeLoad = String(load);
        node.dataset.tooltip = `${node.dataset.nodeLabel} route: ${load}% load / ${Math.floor(2 + Math.random() * 9)}ms jitter`;
        node.style.setProperty('--node-scale', String(0.82 + load / 170));
      });
    }

    root.addEventListener('click', async (event) => {
      const node = event.target.closest('.node');
      if (node) {
        root.querySelectorAll('.node').forEach((item) => item.classList.remove('is-selected'));
        node.classList.add('is-selected');
        status.textContent = `${node.dataset.nodeLabel || 'NODE'} selected. Load ${node.dataset.nodeLoad || '--'}%. Transfer route highlighted.`;
        return;
      }

      const button = event.target.closest('[data-network-action]');
      if (!button) return;
      const action = button.dataset.networkAction;
      map.dataset.mode = action;
      const result = await api.action('network', action).catch(() => ({ message: `Network ${action} routine completed.` }));
      status.textContent = result.message;
      log.push(result.message.toUpperCase());
    }, { signal: controller.signal });
    depth.start();
    driftNetwork();
    const interval = window.setInterval(driftNetwork, state.performance ? 2200 : 1100);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      depth.stop();
    };
  },
};
