export function createNetworkDepth(canvas, state) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true });
  if (!gl) return { start() {}, stop() {}, configure() {} };

  const vertex = `
    attribute vec2 position;
    uniform float time;
    uniform float intensity;
    void main() {
      float z = sin(time + position.x * 4.0 + position.y * 3.0) * 0.04 * intensity;
      gl_Position = vec4(position.x + z, position.y - z, 0.0, 1.0);
      gl_PointSize = 3.0 + intensity * 2.0;
    }
  `;
  const fragment = `
    precision mediump float;
    uniform vec4 color;
    void main() {
      gl_FragColor = color;
    }
  `;

  function shader(type, source) {
    const compiled = gl.createShader(type);
    gl.shaderSource(compiled, source);
    gl.compileShader(compiled);
    return compiled;
  }

  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  gl.useProgram(program);

  const points = new Float32Array([
    0, 0, -0.64, 0.56, -0.42, -0.54, 0.36, 0.6, 0.68, -0.24, -0.68, -0.1, -0.06, 0.74, 0.26, -0.7, 0.64, 0.28, -0.32, 0.12, 0.12, -0.28,
  ]);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);

  const position = gl.getAttribLocation(program, 'position');
  const timeLocation = gl.getUniformLocation(program, 'time');
  const intensityLocation = gl.getUniformLocation(program, 'intensity');
  const colorLocation = gl.getUniformLocation(program, 'color');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

  let frame = 0;
  let start = performance.now();
  let currentState = state;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * scale));
    canvas.height = Math.max(1, Math.floor(rect.height * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function draw(now) {
    resize();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(timeLocation, (now - start) / 1000);
    gl.uniform1f(intensityLocation, (currentState.intensity || 72) / 100);
    gl.uniform4f(colorLocation, 0.0, 1.0, 0.53, 0.42);
    gl.drawArrays(gl.POINTS, 0, points.length / 2);
    gl.uniform4f(colorLocation, 1.0, 0.18, 0.33, 0.24);
    gl.drawArrays(gl.LINE_STRIP, 0, points.length / 2);
    frame = window.requestAnimationFrame(draw);
  }

  return {
    start() {
      start = performance.now();
      frame = window.requestAnimationFrame(draw);
    },
    stop() {
      window.cancelAnimationFrame(frame);
    },
    configure(nextState) {
      currentState = nextState;
    },
  };
}
