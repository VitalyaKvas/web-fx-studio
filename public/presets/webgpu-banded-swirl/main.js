// BandedSwirl — WebGPU port of the legacy HLSL alternating-swirl-bands shader.
// Procedural source texture, live slider-driven uniforms, clamp-to-edge
// sampling to match the original tex2D() boundary behaviour.

if (!navigator.gpu) {
  const msg = 'WebGPU is not available in this browser. Try Chrome 113+ or Edge.';
  const div = document.createElement('div');
  div.className = 'fallback';
  div.textContent = msg;
  document.body.appendChild(div);
  console.error(msg);
  throw new Error('WebGPU unavailable');
}

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) throw new Error('No GPUAdapter');
const device = await adapter.requestDevice();
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('webgpu');
const format = navigator.gpu.getPreferredCanvasFormat();
ctx.configure({ device, format, alphaMode: 'opaque' });

function resize() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
}
addEventListener('resize', resize);
resize();

const wgsl = await (await fetch('./shader.wgsl')).text();
const module = device.createShaderModule({ code: wgsl, label: 'banded-swirl-module' });

const info = await module.getCompilationInfo?.();
if (info && info.messages) {
  for (const m of info.messages) {
    const line = (m.lineNum ?? 0) + ':' + (m.linePos ?? 0);
    console[m.type === 'error' ? 'error' : 'warn'](
      'WGSL ' + m.type + ' at shader.wgsl:' + line + ' — ' + m.message,
    );
  }
}

const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: { module, entryPoint: 'vs_main' },
  fragment: { module, entryPoint: 'fs_main', targets: [{ format }] },
  primitive: { topology: 'triangle-strip' },
});

// --- Procedural source texture --------------------------------------------
function makeSourceCanvas() {
  const N = 512;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const ctx2d = c.getContext('2d');
  const grad = ctx2d.createRadialGradient(N / 2, N / 2, 8, N / 2, N / 2, N * 0.7);
  grad.addColorStop(0, '#ffd166');
  grad.addColorStop(0.45, '#ef476f');
  grad.addColorStop(1, '#073b4c');
  ctx2d.fillStyle = grad;
  ctx2d.fillRect(0, 0, N, N);
  ctx2d.globalAlpha = 0.22;
  ctx2d.strokeStyle = '#ffffff';
  ctx2d.lineWidth = 4;
  for (let i = 0; i < 12; i++) {
    ctx2d.beginPath();
    ctx2d.moveTo(N / 2, N / 2);
    const a = (i / 12) * Math.PI * 2;
    ctx2d.lineTo(N / 2 + Math.cos(a) * N, N / 2 + Math.sin(a) * N);
    ctx2d.stroke();
  }
  ctx2d.globalAlpha = 1;
  ctx2d.fillStyle = '#06b6d4';
  ctx2d.font = 'bold 96px ui-monospace, monospace';
  ctx2d.textAlign = 'center';
  ctx2d.textBaseline = 'middle';
  ctx2d.fillText('FX', N / 2, N / 2);
  return c;
}

async function uploadTexture(canvas2d) {
  const bitmap = await createImageBitmap(canvas2d);
  const tex = device.createTexture({
    size: { width: bitmap.width, height: bitmap.height },
    format: 'rgba8unorm',
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  device.queue.copyExternalImageToTexture(
    { source: bitmap },
    { texture: tex },
    { width: bitmap.width, height: bitmap.height },
  );
  return tex;
}

const sourceTex = await uploadTexture(makeSourceCanvas());
const sampler = device.createSampler({
  magFilter: 'linear',
  minFilter: 'linear',
  addressModeU: 'clamp-to-edge',
  addressModeV: 'clamp-to-edge',
});

// Params struct: 5 floats + 3 padding (32-byte UBO).
const paramsBuffer = device.createBuffer({
  size: 32,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const bindGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    { binding: 0, resource: sampler },
    { binding: 1, resource: sourceTex.createView() },
    { binding: 2, resource: { buffer: paramsBuffer } },
  ],
});

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

const paramsData = new Float32Array(8);
function frame() {
  paramsData[0] = params.centerX;
  paramsData[1] = params.centerY;
  paramsData[2] = params.bands;
  paramsData[3] = params.strength;
  paramsData[4] = params.aspectRatio;
  device.queue.writeBuffer(paramsBuffer, 0, paramsData.buffer);

  const enc = device.createCommandEncoder();
  const pass = enc.beginRenderPass({
    colorAttachments: [
      {
        view: ctx.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  });
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.draw(4);
  pass.end();
  device.queue.submit([enc.finish()]);
  requestAnimationFrame(frame);
}

console.log('BandedSwirl (WGSL) — pipeline ready · adapter: ' + (adapter.info?.vendor || 'unknown'));
requestAnimationFrame(frame);
