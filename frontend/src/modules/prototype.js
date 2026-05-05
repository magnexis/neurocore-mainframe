import { api } from '../services/api.js';

const contacts = [
  { id: 'S-14', type: 'HOLLOW', x: 58, y: 31, depth: 42, strength: 68 },
  { id: 'R-09', type: 'METAL', x: 34, y: 67, depth: 18, strength: 44 },
  { id: 'N-31', type: 'NOISE', x: 76, y: 72, depth: 63, strength: 28 },
  { id: 'P-02', type: 'PULSE', x: 49, y: 52, depth: 9, strength: 91 },
];

function renderContacts() {
  return contacts
    .map(
      (contact) => `
        <button type="button" class="sonar-contact" data-sonar-contact="${contact.id}" style="left:${contact.x}%;top:${contact.y}%;--strength:${contact.strength}">
          <span>${contact.id}</span>
        </button>
      `,
    )
    .join('');
}

function renderRows() {
  return contacts
    .map(
      (contact) => `
        <button type="button" class="sonar-row" data-sonar-row="${contact.id}">
          <span>${contact.id}</span>
          <b>${contact.type}</b>
          <strong>${contact.depth}m</strong>
        </button>
      `,
    )
    .join('');
}

export const prototypeModule = {
  id: 'prototype',
  label: 'PROTOTYPE',
  code: '08',
  render() {
    return `
      <div class="module-grid prototype-layout">
        <article class="panel span-2 prototype-panel">
          <h3>Prototype Sonar Detector</h3>
          <div class="action-bar">
            <button type="button" data-sonar-action="ping">Emit ping</button>
            <button type="button" data-sonar-action="sweep">Wide sweep</button>
            <button type="button" data-sonar-action="lock">Lock contact</button>
            <button type="button" data-sonar-action="clear">Clear ghost</button>
          </div>
          <p class="action-status" id="prototype-status">Prototype array is listening for reflected pulses.</p>
          <div class="sonar-scope" data-sonar-mode="idle">
            <div class="sonar-grid"></div>
            <div class="sonar-sweep"></div>
            <div class="sonar-origin"></div>
            <div id="sonar-contacts" class="sonar-contacts">${renderContacts()}</div>
          </div>
        </article>
        <article class="panel">
          <h3>Contact Data</h3>
          <div id="sonar-rows" class="sonar-rows">${renderRows()}</div>
        </article>
        <article class="panel">
          <h3>Array Controls</h3>
          <div class="knob-board prototype-knobs">
            <label><span>Range</span><input type="range" min="25" max="180" value="92" data-sonar-knob="range" data-range-unit="m" /><b class="range-value" data-range-output>92m</b></label>
            <label><span>Sensitivity</span><input type="range" min="10" max="220" value="118" data-sonar-knob="sensitivity" data-range-unit="%" /><b class="range-value" data-range-output>118%</b></label>
            <label><span>Decay</span><input type="range" min="20" max="180" value="74" data-sonar-knob="decay" data-range-unit="ms" /><b class="range-value" data-range-output>74ms</b></label>
          </div>
          <div class="detection-readout">
            <p><span>WATERLINE</span><strong id="sonar-waterline">SIM</strong></p>
            <p><span>RETURN GAIN</span><strong id="sonar-gain">1.18</strong></p>
            <p><span>ACTIVE CONTACT</span><strong id="sonar-active">NONE</strong></p>
            <p><span>CONFIDENCE</span><strong id="sonar-confidence">42%</strong></p>
          </div>
        </article>
      </div>
    `;
  },
  mount(root, state, log) {
    const controller = new AbortController();
    const scope = root.querySelector('.sonar-scope');
    const status = root.querySelector('#prototype-status');
    const contactTarget = root.querySelector('#sonar-contacts');
    const rowsTarget = root.querySelector('#sonar-rows');
    const gain = root.querySelector('#sonar-gain');
    const active = root.querySelector('#sonar-active');
    const confidence = root.querySelector('#sonar-confidence');
    const knobs = [...root.querySelectorAll('[data-sonar-knob]')];
    let selected = null;
    let tick = 0;

    function selectedContact() {
      return contacts.find((contact) => contact.id === selected);
    }

    function rerenderContacts() {
      contactTarget.innerHTML = renderContacts();
      rowsTarget.innerHTML = renderRows();
      root.querySelectorAll(`[data-sonar-contact="${selected}"], [data-sonar-row="${selected}"]`).forEach((item) => item.classList.add('is-active'));
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

    function normalize(value, min, max) {
      return (value - min) / (max - min);
    }

    function driftContacts() {
      tick += 1;
      contacts.forEach((contact, index) => {
        const decay = Number(root.querySelector('[data-sonar-knob="decay"]').value);
        const driftScale = 1.6 - normalize(decay, 20, 180) * 1.05;
        contact.x = Math.max(14, Math.min(86, contact.x + (Math.sin(tick / 2 + index) * 1.7 + (Math.random() - 0.5) * 1.6) * driftScale));
        contact.y = Math.max(14, Math.min(86, contact.y + (Math.cos(tick / 2.4 + index) * 1.5 + (Math.random() - 0.5) * 1.4) * driftScale));
        contact.depth = Math.max(2, Math.min(99, contact.depth + Math.round((Math.random() - 0.44) * 6)));
        contact.strength = Math.max(9, Math.min(99, contact.strength + Math.round((Math.random() - 0.48) * 12)));
      });
      const range = Number(root.querySelector('[data-sonar-knob="range"]').value);
      const sensitivity = Number(root.querySelector('[data-sonar-knob="sensitivity"]').value);
      const decay = Number(root.querySelector('[data-sonar-knob="decay"]').value);
      const visualRange = 24 + normalize(range, 25, 180) * 68;
      const contact = selectedContact();
      gain.textContent = (sensitivity / 100).toFixed(2);
      confidence.textContent = `${Math.min(99, Math.max(6, Math.round((contact?.strength || 34) * sensitivity / 135)))}%`;
      active.textContent = contact ? `${contact.id} ${contact.depth}m` : 'NONE';
      scope.style.setProperty('--sonar-range', `${visualRange}%`);
      scope.style.setProperty('--sonar-decay-speed', `${Math.max(0.72, 4.2 - normalize(decay, 20, 180) * 2.8).toFixed(2)}s`);
      updateKnobReadouts();
      rerenderContacts();
    }

    function selectContact(id) {
      selected = id;
      const contact = selectedContact();
      status.textContent = contact
        ? `${contact.id} selected. ${contact.type} return at ${contact.depth} meters with ${contact.strength}% strength.`
        : 'No active sonar contact.';
      active.textContent = contact ? `${contact.id} ${contact.depth}m` : 'NONE';
      rerenderContacts();
    }

    root.addEventListener('input', (event) => {
      if (!event.target.matches('[data-sonar-knob]')) return;
      driftContacts();
      status.textContent = `Array ${event.target.dataset.sonarKnob} tuned to ${event.target.value}.`;
    }, { signal: controller.signal });

    root.addEventListener('click', async (event) => {
      const contactButton = event.target.closest('[data-sonar-contact], [data-sonar-row]');
      if (contactButton) {
        selectContact(contactButton.dataset.sonarContact || contactButton.dataset.sonarRow);
        return;
      }

      const button = event.target.closest('[data-sonar-action]');
      if (!button) return;
      const action = button.dataset.sonarAction;
      scope.dataset.sonarMode = action;
      if (action === 'ping') status.textContent = 'Ping emitted. Listening for reflected pulse geometry.';
      if (action === 'sweep') status.textContent = 'Wide sweep active. Contacts are being reclassified.';
      if (action === 'lock') selectContact(selected || contacts[Math.floor(Math.random() * contacts.length)].id);
      if (action === 'clear') {
        selected = null;
        scope.dataset.sonarMode = 'idle';
        status.textContent = 'Ghost contact buffer cleared.';
        rerenderContacts();
      }
      const result = await api.action('prototype', action).catch(() => ({ message: `Prototype sonar ${action} completed locally.` }));
      log.push(result.message.toUpperCase());
    }, { signal: controller.signal });

    driftContacts();
    const interval = window.setInterval(driftContacts, state.performance ? 2600 : 1100);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  },
};
