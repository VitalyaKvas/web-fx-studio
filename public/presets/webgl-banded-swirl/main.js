// BandedSwirl — WebGL2 port of the legacy HLSL alternating-swirl-bands shader.
// Source texture is generated procedurally so the preset has no external assets.
// Sliders push to uniforms every frame; clamp-to-edge sampling matches the
// original tex2D() behaviour at the source boundaries.

const canvas = document.getElementById('stage');
const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false });
if (!gl) {
  console.error('WebGL2 is not available in this browser.');
  throw new Error('WebGL2 unavailable');
}

const vertSrc = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main(){
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;
const fragSrc = await (await fetch('./shader.frag')).text();

function compile(type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error('Shader compile failed: ' + gl.getShaderInfoLog(sh));
  }
  return sh;
}

const prog = gl.createProgram();
gl.attachShader(prog, compile(gl.VERTEX_SHADER, vertSrc));
gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragSrc));
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
  throw new Error('Program link failed: ' + gl.getProgramInfoLog(prog));
}

const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
const aPos = gl.getAttribLocation(prog, 'a_pos');
gl.enableVertexAttribArray(aPos);
gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

gl.useProgram(prog);
const U = {
  source: gl.getUniformLocation(prog, 'uSource'),
  center: gl.getUniformLocation(prog, 'uCenter'),
  bands: gl.getUniformLocation(prog, 'uBands'),
  strength: gl.getUniformLocation(prog, 'uStrength'),
  aspectRatio: gl.getUniformLocation(prog, 'uAspectRatio'),
};

// --- Procedural source texture --------------------------------------------
function makeSourceTexture() {
  const N = 512;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(N / 2, N / 2, 8, N / 2, N / 2, N * 0.7);
  grad.addColorStop(0, '#ffd166');
  grad.addColorStop(0.45, '#ef476f');
  grad.addColorStop(1, '#073b4c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, N, N);
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.moveTo(N / 2, N / 2);
    const a = (i / 12) * Math.PI * 2;
    ctx.lineTo(N / 2 + Math.cos(a) * N, N / 2 + Math.sin(a) * N);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#06b6d4';
  ctx.font = 'bold 96px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FX', N / 2, N / 2);
  return c;
}

function uploadTexture(unit, image) {
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

uploadTexture(0, makeSourceTexture());
gl.uniform1i(U.source, 0);

// --- Slider bindings -------------------------------------------------------
const params = { centerX: 0.5, centerY: 0.5, bands: 10, strength: 0.5, aspectRatio: 1 };
function bindSlider(key) {
  const input = document.getElementById(key);
  const out = document.getElementById(key + 'Value');
  const apply = () => {
    params[key] = parseFloat(input.value);
    out.textContent = params[key].toFixed(2);
  };
  input.addEventListener('input', apply);
  apply();
}
['centerX', 'centerY', 'bands', 'strength', 'aspectRatio'].forEach((k) => bindSlider(k));

// --- Panel: drag + collapse ------------------------------------------------
function initPanel() {
  const panel = document.getElementById('panel');
  const head = document.getElementById('panelHead');
  const toggle = document.getElementById('panelToggle');
  if (!panel || !head || !toggle) return;

  let dragging = false;
  let pointerId = null;
  let dx = 0;
  let dy = 0;

  function onPointerDown(ev) {
    if (ev.target.closest('.panel__toggle')) return;
    dragging = true;
    pointerId = ev.pointerId;
    const rect = panel.getBoundingClientRect();
    dx = ev.clientX - rect.left;
    dy = ev.clientY - rect.top;
    panel.style.left = rect.left + 'px';
    panel.style.top = rect.top + 'px';
    panel.style.right = 'auto';
    panel.classList.add('is-dragging');
    head.setPointerCapture(pointerId);
    ev.preventDefault();
  }

  function onPointerMove(ev) {
    if (!dragging || ev.pointerId !== pointerId) return;
    const maxX = innerWidth - panel.offsetWidth;
    const maxY = innerHeight - panel.offsetHeight;
    const nx = Math.max(0, Math.min(maxX, ev.clientX - dx));
    const ny = Math.max(0, Math.min(maxY, ev.clientY - dy));
    panel.style.left = nx + 'px';
    panel.style.top = ny + 'px';
  }

  function endDrag(ev) {
    if (!dragging || (ev && ev.pointerId !== pointerId)) return;
    dragging = false;
    panel.classList.remove('is-dragging');
    if (pointerId !== null) {
      try { head.releasePointerCapture(pointerId); } catch {}
    }
    pointerId = null;
  }

  head.addEventListener('pointerdown', onPointerDown);
  head.addEventListener('pointermove', onPointerMove);
  head.addEventListener('pointerup', endDrag);
  head.addEventListener('pointercancel', endDrag);

  toggle.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('is-collapsed');
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Expand panel' : 'Collapse panel');
    toggle.textContent = collapsed ? '+' : '−';
  });
}
initPanel();

function resize() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
  gl.viewport(0, 0, canvas.width, canvas.height);
}
addEventListener('resize', resize);
resize();

function frame() {
  gl.uniform2f(U.center, params.centerX, params.centerY);
  gl.uniform1f(U.bands, params.bands);
  gl.uniform1f(U.strength, params.strength);
  gl.uniform1f(U.aspectRatio, params.aspectRatio);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  requestAnimationFrame(frame);
}

console.log('BandedSwirl (GLSL) — program linked, 1 texture, 4 uniforms');
requestAnimationFrame(frame);
