export function startCursorField(target, state) {
  let config = { ...state };
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let tx = x;
  let ty = y;
  let frame = 0;

  function move(event) {
    tx = event.clientX;
    ty = event.clientY;
  }

  function render() {
    x += (tx - x) * 0.12;
    y += (ty - y) * 0.12;
    const alpha = config.performance ? 0.16 : 0.28 * (config.intensity / 100);
    target.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,45,85,${alpha}), transparent 250px)`;
    frame = window.requestAnimationFrame(render);
  }

  window.addEventListener('pointermove', move, { passive: true });
  render();

  return {
    configure(nextState) {
      config = { ...config, ...nextState };
    },
    stop() {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', move);
    },
  };
}
