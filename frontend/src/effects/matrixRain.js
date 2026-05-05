const glyphs = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ[]{}<>/\\_+-=NEUROCOREMAINFRAME';

export function startMatrixRain(canvas, state) {
  const ctx = canvas.getContext('2d', { alpha: true });
  let width = 0;
  let height = 0;
  let columns = [];
  let animationFrame = 0;
  let config = { ...state };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const columnCount = Math.floor(width / 18);
    columns = Array.from({ length: columnCount }, (_, index) => ({
      x: index * 18,
      y: Math.random() * height,
      speed: 0.45 + Math.random() * 1.4,
      alpha: 0.15 + Math.random() * 0.35,
    }));
  }

  function draw() {
    const intensity = Math.max(0.18, config.intensity / 100);
    ctx.fillStyle = `rgba(0, 0, 0, ${config.performance ? 0.18 : 0.09})`;
    ctx.fillRect(0, 0, width, height);
    ctx.font = '14px "IBM Plex Mono", monospace';

    columns.forEach((drop) => {
      const char = glyphs[Math.floor(Math.random() * glyphs.length)];
      ctx.fillStyle = `rgba(255, 45, 85, ${drop.alpha * intensity})`;
      ctx.fillText(char, drop.x, drop.y);
      drop.y += drop.speed * (config.performance ? 0.55 : 1);
      if (drop.y > height + 40) {
        drop.y = -20;
        drop.speed = 0.45 + Math.random() * 1.4;
      }
    });

    animationFrame = window.requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener('resize', resize);

  return {
    configure(nextState) {
      config = { ...config, ...nextState };
    },
    stop() {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
    },
  };
}
