import { api } from '../services/api.js';

export const settingsModule = {
  id: 'settings',
  label: 'SETTINGS',
  code: '10',
  render(state) {
    return `
      <div class="module-grid">
        <article class="panel">
          <h3>Motion Control</h3>
          <label class="toggle-row">
            <span>Performance mode</span>
            <input type="checkbox" data-setting="performance" ${state.performance ? 'checked' : ''} />
          </label>
          <label class="toggle-row">
            <span>Real telemetry</span>
            <input type="checkbox" data-setting="realTelemetry" ${state.realTelemetry ? 'checked' : ''} />
          </label>
          <label class="toggle-row">
            <span>Ambient audio muted</span>
            <input type="checkbox" data-setting="audioMuted" ${state.audioMuted ? 'checked' : ''} />
          </label>
          <label class="toggle-row">
            <span>Interface SFX</span>
            <input type="checkbox" data-setting="soundEffects" ${state.soundEffects ? 'checked' : ''} />
          </label>
          <label class="toggle-row">
            <span>Persistent sessions</span>
            <input type="checkbox" data-setting="persistentStorage" ${state.persistentStorage ? 'checked' : ''} />
          </label>
          <label class="slider-row">
            <span>Theme pack</span>
            <select data-setting="theme">
              <option value="default" ${state.theme === 'default' ? 'selected' : ''}>Crimson Mainframe</option>
              <option value="matrix" ${state.theme === 'matrix' ? 'selected' : ''}>Green Matrix</option>
              <option value="violet" ${state.theme === 'violet' ? 'selected' : ''}>Violet Blacksite</option>
              <option value="amber" ${state.theme === 'amber' ? 'selected' : ''}>Amber Reactor</option>
              <option value="arctic" ${state.theme === 'arctic' ? 'selected' : ''}>Arctic Signal</option>
              <option value="whiteout" ${state.theme === 'whiteout' ? 'selected' : ''}>Whiteout Lab</option>
            </select>
          </label>
          <label class="slider-row">
            <span>Theme intensity</span>
            <input type="range" min="20" max="100" value="${state.intensity}" data-setting="intensity" data-range-unit="%" />
            <b class="range-value" data-range-output>${state.intensity}%</b>
          </label>
          <div class="action-bar">
            <button type="button" data-settings-action="intensity-low">Quiet</button>
            <button type="button" data-settings-action="intensity-max">Maximum</button>
            <button type="button" data-settings-action="reset">Reset</button>
            <button type="button" data-test-sfx>Test SFX</button>
          </div>
          <p class="action-status" id="settings-status">Preferences are stored locally.</p>
        </article>
        <article class="panel">
          <h3>Keyboard Shortcuts</h3>
          <div class="shortcut-list">
            <p><kbd>1-9</kbd><span>Open modules 00-08</span></p>
            <p><kbd>m</kbd><span>Open messages</span></p>
            <p><kbd>0</kbd><span>Open settings</span></p>
            <p><kbd>&grave;</kbd><span>Focus command line</span></p>
            <p><kbd>help</kbd><span>List hidden commands</span></p>
          </div>
        </article>
        <article class="panel span-2">
          <h3>Interface Profile</h3>
          <p class="muted">Settings persist locally by default. Optional persistent sessions sync sanitized operator preferences to the Rust backend.</p>
          <div class="detection-readout settings-readout">
            <p><span>AMBIENT LOAD</span><strong id="settings-load">72%</strong></p>
            <p><span>TRACE DRIFT</span><strong id="settings-drift">0.42</strong></p>
            <p><span>FRAME PULSE</span><strong id="settings-pulse">STABLE</strong></p>
            <p><span>DATA ADAPTERS</span><strong id="settings-adapters">LOCAL</strong></p>
          </div>
        </article>
      </div>
    `;
  },
  mount(root, state, log) {
    const controller = new AbortController();
    const status = root.querySelector('#settings-status');
    const load = root.querySelector('#settings-load');
    const drift = root.querySelector('#settings-drift');
    const pulse = root.querySelector('#settings-pulse');
    const adapters = root.querySelector('#settings-adapters');
    api.adapters()
      .then((payload) => {
        adapters.textContent = `${payload.adapters.filter((item) => item.status === 'trusted').length}/${payload.adapters.length} TRUSTED`;
      })
      .catch(() => {
        adapters.textContent = 'LOCAL';
      });
    root.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-settings-action]');
      if (!button) return;
      const action = button.dataset.settingsAction;
      const intensity = root.querySelector('[data-setting="intensity"]');
      const performance = root.querySelector('[data-setting="performance"]');
      if (action === 'intensity-low') {
        intensity.value = 35;
        intensity.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (action === 'intensity-max') {
        intensity.value = 100;
        intensity.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (action === 'reset') {
        performance.checked = false;
        root.querySelector('[data-setting="realTelemetry"]').checked = false;
        root.querySelector('[data-setting="audioMuted"]').checked = true;
        root.querySelector('[data-setting="soundEffects"]').checked = true;
        root.querySelector('[data-setting="persistentStorage"]').checked = false;
        root.querySelector('[data-setting="theme"]').value = 'default';
        intensity.value = 72;
        performance.dispatchEvent(new Event('change', { bubbles: true }));
        root.querySelector('[data-setting="realTelemetry"]').dispatchEvent(new Event('change', { bubbles: true }));
        root.querySelector('[data-setting="audioMuted"]').dispatchEvent(new Event('change', { bubbles: true }));
        root.querySelector('[data-setting="soundEffects"]').dispatchEvent(new Event('change', { bubbles: true }));
        root.querySelector('[data-setting="persistentStorage"]').dispatchEvent(new Event('change', { bubbles: true }));
        root.querySelector('[data-setting="theme"]').dispatchEvent(new Event('change', { bubbles: true }));
        intensity.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const result = await api.action('settings', action).catch(() => ({ message: `Settings ${action} completed locally.` }));
      status.textContent = result.message;
      log.push(result.message.toUpperCase());
    }, { signal: controller.signal });
    const profileInterval = window.setInterval(() => {
      load.textContent = `${Math.floor(28 + Math.random() * 68)}%`;
      drift.textContent = (0.12 + Math.random() * 0.88).toFixed(2);
      pulse.textContent = ['STABLE', 'RISING', 'QUIET', 'SYNCING'][Math.floor(Math.random() * 4)];
    }, state.performance ? 2600 : 1200);
    return () => {
      controller.abort();
      window.clearInterval(profileInterval);
    };
  },
};
