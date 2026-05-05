import { api } from '../services/api.js';

const zones = ['NORTH WALL', 'DESK LINE', 'CEILING GRID', 'POWER BUS', 'WINDOW EDGE', 'DOOR FRAME'];
const presets = {
  passive: { rf: 'LOW', lens: 'NONE', mic: 'NONE', confidence: [0, 16], mode: 'sweep' },
  office: { rf: 'MEDIUM', lens: 'REFLECTIVE', mic: 'FLOOR', confidence: [22, 54], mode: 'sweep' },
  apartment: { rf: 'DENSE', lens: 'GLINT', mic: 'TRACE', confidence: [31, 68], mode: 'triangulate' },
  warehouse: { rf: 'ECHO', lens: 'NONE', mic: 'DISTANT', confidence: [18, 47], mode: 'sweep' },
  cleanroom: { rf: 'LOW', lens: 'NONE', mic: 'NONE', confidence: [3, 18], mode: 'jam' },
};

function renderZones(activeIndex = -1) {
  return zones
    .map(
      (zone, index) => `
        <button class="detection-zone ${index === activeIndex ? 'is-active' : ''}" type="button" data-detection-zone="${zone}">
          <span>${zone}</span>
          <b>${index === activeIndex ? 'TRACE' : 'CLEAR'}</b>
        </button>
      `,
    )
    .join('');
}

export const detectionModule = {
  id: 'detection',
  label: 'DETECTION',
  code: '06',
  render() {
    return `
      <div class="module-grid detection-layout">
        <article class="panel span-2 detection-panel">
          <h3>Area Bug Detection</h3>
          <p class="muted">Cinematic sensor simulation. This module does not perform real RF, camera, microphone, or device detection.</p>
          <div class="action-bar">
            <button type="button" data-detection-action="sweep">Run sweep</button>
            <button type="button" data-detection-action="triangulate">Triangulate trace</button>
            <button type="button" data-detection-action="jam">Mask signal</button>
          </div>
          <div class="preset-bar">
            <button type="button" data-room-profile="office">Office</button>
            <button type="button" data-room-profile="apartment">Apartment</button>
            <button type="button" data-room-profile="warehouse">Warehouse</button>
            <button type="button" data-room-profile="cleanroom">Clean room</button>
          </div>
          <p class="action-status" id="detection-status">Passive sweep is idle. No confirmed devices.</p>
          <div class="detector-scope">
            <div class="detector-radar">
              <div class="detector-ring"></div>
              <span class="blip blip-1"></span>
              <span class="blip blip-2"></span>
              <span class="blip blip-3"></span>
            </div>
          </div>
        </article>
        <article class="panel">
          <h3>Zone Matrix</h3>
          <div id="detection-zones" class="detection-zones">
            ${renderZones()}
          </div>
        </article>
        <article class="panel">
          <h3>Signal Classification</h3>
          <div class="detection-readout">
            <p><span>RF NOISE</span><strong id="rf-noise">LOW</strong></p>
            <p><span>LENS GLINT</span><strong id="lens-glint">NONE</strong></p>
            <p><span>MIC TRACE</span><strong id="mic-trace">NONE</strong></p>
            <p><span>ROOM PROFILE</span><strong id="room-profile">PASSIVE</strong></p>
            <p><span>CONFIDENCE</span><strong id="detect-confidence">0%</strong></p>
          </div>
        </article>
      </div>
    `;
  },
  mount(root, state, log) {
    const controller = new AbortController();
    const status = root.querySelector('#detection-status');
    const panel = root.querySelector('.detection-panel');
    const zonesTarget = root.querySelector('#detection-zones');
    const confidence = root.querySelector('#detect-confidence');
    const rf = root.querySelector('#rf-noise');
    const lens = root.querySelector('#lens-glint');
    const mic = root.querySelector('#mic-trace');
    const roomProfile = root.querySelector('#room-profile');
    let profile = 'passive';

    function updateSweep(mode) {
      const activeIndex = Math.floor(Math.random() * zones.length);
      const passiveTrace = Math.random() > 0.72;
      const preset = presets[profile] || presets.passive;
      const confidenceRange = mode === 'passive' ? presets.passive.confidence : preset.confidence;
      zonesTarget.innerHTML = renderZones(mode === 'sweep' || passiveTrace ? activeIndex : -1);
      confidence.textContent = mode === 'jam' ? '0%' : `${Math.floor(confidenceRange[0] + Math.random() * (confidenceRange[1] - confidenceRange[0]))}%`;
      rf.textContent = mode === 'jam' ? 'MASKED' : passiveTrace ? 'RISING' : preset.rf;
      lens.textContent = mode === 'triangulate' || passiveTrace && Math.random() > 0.62 ? 'TRACE' : preset.lens;
      mic.textContent = (mode === 'sweep' || passiveTrace) && Math.random() > 0.55 ? 'TRACE' : preset.mic;
      roomProfile.textContent = profile.toUpperCase();
      panel.dataset.mode = mode === 'passive' ? preset.mode : mode;
      panel.dataset.room = profile;
    }

    root.addEventListener('click', async (event) => {
      const actionButton = event.target.closest('[data-detection-action]');
      const zoneButton = event.target.closest('[data-detection-zone]');
      const roomButton = event.target.closest('[data-room-profile]');

      if (roomButton) {
        profile = roomButton.dataset.roomProfile;
        root.querySelectorAll('[data-room-profile]').forEach((item) => item.classList.toggle('is-active', item === roomButton));
        updateSweep(presets[profile]?.mode || 'sweep');
        status.textContent = `${profile.toUpperCase()} room profile loaded. Sweep model recalibrated.`;
        return;
      }

      if (actionButton) {
        const action = actionButton.dataset.detectionAction;
        updateSweep(action);
        const result = await api.action('detection', action).catch(() => ({ message: `Detection ${action} completed locally.` }));
        status.textContent = result.message;
        log.push(result.message.toUpperCase());
      }

      if (zoneButton) {
        status.textContent = `${zoneButton.dataset.detectionZone} selected for focused sweep.`;
      }
    }, { signal: controller.signal });
    const passiveInterval = window.setInterval(() => updateSweep('passive'), state.performance ? 3600 : 1700);
    return () => {
      controller.abort();
      window.clearInterval(passiveInterval);
    };
  },
};
