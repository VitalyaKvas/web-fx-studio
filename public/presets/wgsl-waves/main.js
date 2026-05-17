// WGSL Waves — concentric radial waves rendered via a WebGPU fragment pipeline.
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

const wgsl = await (await fetch('./waves.wgsl')).text();
const module = device.createShaderModule({ code: wgsl, label: 'waves-module' });

// Surface compile diagnostics so errors land in the host console.
const info = await module.getCompilationInfo?.();
if (info && info.messages) {
  for (const m of info.messages) {
    const line = (m.lineNum ?? 0) + ':' + (m.linePos ?? 0);
    const tag = m.type === 'error' ? 'console.error' : 'console.warn';
    console[m.type === 'error' ? 'error' : 'warn'](
      'WGSL ' + m.type + ' at waves.wgsl:' + line + ' — ' + m.message,
    );
  }
}

const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: { module, entryPoint: 'vs_main' },
  fragment: { module, entryPoint: 'fs_main', targets: [{ format }] },
  primitive: { topology: 'triangle-strip' },
});

// Uniforms: time + aspect ratio.
const ubuf = device.createBuffer({
  size: 16,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
const bind = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [{ binding: 0, resource: { buffer: ubuf } }],
});

const start = performance.now();
function frame() {
  const t = (performance.now() - start) / 1000;
  const data = new Float32Array([t, canvas.width / canvas.height, 0, 0]);
  device.queue.writeBuffer(ubuf, 0, data.buffer, data.byteOffset, data.byteLength);

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
  pass.setBindGroup(0, bind);
  pass.draw(4);
  pass.end();
  device.queue.submit([enc.finish()]);
  requestAnimationFrame(frame);
}

console.log('WGSL Waves — WebGPU pipeline ready · adapter: ' + (adapter.info?.vendor || 'unknown'));
requestAnimationFrame(frame);
