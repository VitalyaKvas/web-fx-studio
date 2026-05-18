// ApplyTexture — WebGL2 port of the legacy HLSL displacement-map shader.
// Source + displacement-map textures are generated procedurally so the preset
// has no external asset dependencies. Slider values are pushed to uniforms
// every frame; strength=0 yields a pass-through render.

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
  displace: gl.getUniformLocation(prog, 'uDisplacementMap'),
  tileSizeX: gl.getUniformLocation(prog, 'uTileSizeX'),
  tileSizeY: gl.getUniformLocation(prog, 'uTileSizeY'),
  offsetX: gl.getUniformLocation(prog, 'uOffsetX'),
  offsetY: gl.getUniformLocation(prog, 'uOffsetY'),
  strength: gl.getUniformLocation(prog, 'uStrength'),
};

// --- Procedural textures ---------------------------------------------------
//
// Source: vivid radial gradient + diagonal stripes so distortion is obvious.
// Displacement: smooth pseudo-noise lobes encoded into the R/G channels.
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
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  for (let i = -N; i < N * 2; i += 28) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + N, N);
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

function makeDisplacementTexture() {
  const N = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(N, N);
  const d = img.data;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const v = y / N;
      const r = 0.5 + 0.5 * Math.sin(u * 6.283 * 2.0) * Math.cos(v * 6.283 * 1.5);
      const g = 0.5 + 0.5 * Math.sin((u + v) * 6.283 * 2.5);
      const i = (y * N + x) * 4;
      d[i] = Math.round(r * 255);
      d[i + 1] = Math.round(g * 255);
      d[i + 2] = 128;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function uploadTexture(unit, image) {
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

uploadTexture(0, makeSourceTexture());
uploadTexture(1, makeDisplacementTexture());
gl.uniform1i(U.source, 0);
gl.uniform1i(U.displace, 1);

// --- Slider bindings -------------------------------------------------------
const params = { tileSizeX: 1, tileSizeY: 1, offsetX: 0, offsetY: 0, strength: 1 };
function bindSlider(key, fmt = (v) => v.toFixed(2)) {
  const input = document.getElementById(key);
  const out = document.getElementById(key + 'Value');
  const apply = () => {
    params[key] = parseFloat(input.value);
    out.textContent = fmt(params[key]);
  };
  input.addEventListener('input', apply);
  apply();
}
['tileSizeX', 'tileSizeY', 'offsetX', 'offsetY', 'strength'].forEach((k) => bindSlider(k));

// --- Panel: drag + collapse ------------------------------------------------
// Drag uses Pointer Events for mouse/touch/pen parity. We commit absolute
// left/top on first drag so the initial `right:12px` anchoring switches over
// cleanly. Collapse just toggles a class + aria-expanded.
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
  gl.uniform1f(U.tileSizeX, params.tileSizeX);
  gl.uniform1f(U.tileSizeY, params.tileSizeY);
  gl.uniform1f(U.offsetX, params.offsetX);
  gl.uniform1f(U.offsetY, params.offsetY);
  gl.uniform1f(U.strength, params.strength);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  requestAnimationFrame(frame);
}

console.log('ApplyTexture (GLSL) — program linked, 2 textures, 5 uniforms');
requestAnimationFrame(frame);
