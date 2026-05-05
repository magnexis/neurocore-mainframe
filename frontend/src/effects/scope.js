export function createScope(canvas, options = {}) {
  const ctx = canvas.getContext('2d');
  let frame = 0;
  let t = 0;
  let config = {
    amplitude: options.amplitude ?? 1,
    frequency: options.frequency ?? 1,
    noise: options.noise ?? 1,
    speed: options.speed ?? 1,
    color: options.color || '#FF2D55',
  };

  function draw() {
    const { width, height } = canvas;
    t += 0.045 * config.speed;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255,45,85,0.12)';
    ctx.lineWidth = 1;

    for (let y = 20; y < height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = config.color;
    ctx.shadowColor = config.color;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 3) {
      const wave =
        height / 2 +
        Math.sin(x * 0.045 * config.frequency + t) * 30 * config.amplitude +
        Math.sin(x * 0.017 * config.frequency + t * 1.8) * 16 * config.noise +
        Math.cos(x * 0.09 * config.frequency - t * 0.7) * 9 * config.noise;
      if (x === 0) ctx.moveTo(x, wave);
      else ctx.lineTo(x, wave);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    frame = window.requestAnimationFrame(draw);
  }

  return {
    start() {
      draw();
    },
    stop() {
      window.cancelAnimationFrame(frame);
    },
    configure(nextConfig) {
      config = { ...config, ...nextConfig };
    },
  };
}
