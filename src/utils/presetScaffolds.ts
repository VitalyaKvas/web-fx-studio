import type { FileItem, PresetType } from '@/types'
import { inferLanguage } from './slug'

function file(name: string, content: string): FileItem {
  return {
    name,
    content,
    language: inferLanguage(name),
    isDirty: false,
  }
}

function toMap(items: FileItem[]): Record<string, FileItem> {
  return Object.fromEntries(items.map((f) => [f.name, f]))
}

const WEBGL_SCAFFOLD = (): Record<string, FileItem> =>
  toMap([
    file(
      'index.html',
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>WebGL Scaffold</title>
    <style>html,body{margin:0;height:100%;background:#000}canvas{display:block;width:100vw;height:100vh}</style>
  </head>
  <body>
    <canvas id="stage"></canvas>
    <script type="module" src="./main.js"></script>
  </body>
</html>
`,
    ),
    file(
      'main.js',
      `const canvas = document.getElementById('stage');
const gl = canvas.getContext('webgl2');
if (!gl) {
  console.error('WebGL2 unavailable');
  throw new Error('WebGL2 unavailable');
}

const fragSrc = await (await fetch('./shader.frag')).text();
const vertSrc = \`#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main(){ v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }\`;

function compile(type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error('Shader compile error: ' + gl.getShaderInfoLog(sh));
  }
  return sh;
}

const prog = gl.createProgram();
gl.attachShader(prog, compile(gl.VERTEX_SHADER, vertSrc));
gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fragSrc));
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
  throw new Error('Link error: ' + gl.getProgramInfoLog(prog));
}

const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
const loc = gl.getAttribLocation(prog, 'a_pos');
gl.enableVertexAttribArray(loc);
gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

gl.useProgram(prog);
const uTime = gl.getUniformLocation(prog, 'uTime');
const uRes = gl.getUniformLocation(prog, 'uResolution');

function frame(t) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.uniform1f(uTime, t * 0.001);
  gl.uniform2f(uRes, canvas.width, canvas.height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  requestAnimationFrame(frame);
}
console.log('WebGL2 program linked — running');
requestAnimationFrame(frame);
`,
    ),
    file(
      'shader.frag',
      `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 outColor;
uniform float uTime;
uniform vec2 uResolution;

void main() {
  vec2 uv = v_uv;
  float d = distance(uv, vec2(0.5));
  vec3 col = mix(vec3(0.07, 0.49, 1.0), vec3(0.06, 0.06, 0.08), smoothstep(0.0, 0.6, d));
  col += 0.06 * sin(uTime + uv.x * 20.0);
  outColor = vec4(col, 1.0);
}
`,
    ),
  ])

const WEBGPU_SCAFFOLD = (): Record<string, FileItem> =>
  toMap([
    file(
      'index.html',
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>WebGPU Scaffold</title>
    <style>html,body{margin:0;height:100%;background:#000}canvas{display:block;width:100vw;height:100vh}</style>
  </head>
  <body>
    <canvas id="stage"></canvas>
    <script type="module" src="./main.js"></script>
  </body>
</html>
`,
    ),
    file(
      'main.js',
      `if (!navigator.gpu) {
  console.error('WebGPU unavailable in this browser');
  throw new Error('WebGPU unavailable');
}
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('webgpu');
const format = navigator.gpu.getPreferredCanvasFormat();
ctx.configure({ device, format, alphaMode: 'opaque' });

const code = await (await fetch('./shader.wgsl')).text();
const module = device.createShaderModule({ code });
const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: { module, entryPoint: 'vs_main' },
  fragment: { module, entryPoint: 'fs_main', targets: [{ format }] },
  primitive: { topology: 'triangle-strip' },
});

function frame() {
  const enc = device.createCommandEncoder();
  const pass = enc.beginRenderPass({
    colorAttachments: [{
      view: ctx.getCurrentTexture().createView(),
      clearValue: { r: 0, g: 0, b: 0, a: 1 },
      loadOp: 'clear',
      storeOp: 'store',
    }],
  });
  pass.setPipeline(pipeline);
  pass.draw(4);
  pass.end();
  device.queue.submit([enc.finish()]);
  requestAnimationFrame(frame);
}
console.log('WebGPU adapter ready — running');
requestAnimationFrame(frame);
`,
    ),
    file(
      'shader.wgsl',
      `@vertex
fn vs_main(@builtin(vertex_index) i : u32) -> @builtin(position) vec4<f32> {
  var p = array<vec2<f32>, 4>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0,  1.0)
  );
  return vec4<f32>(p[i], 0.0, 1.0);
}

@fragment
fn fs_main(@builtin(position) pos : vec4<f32>) -> @location(0) vec4<f32> {
  let uv = pos.xy / vec2<f32>(800.0, 600.0);
  let c = vec3<f32>(0.07, 0.49, 1.0) * (0.5 + 0.5 * sin(uv.x * 12.0));
  return vec4<f32>(c, 1.0);
}
`,
    ),
  ])

const HOUDINI_SCAFFOLD = (): Record<string, FileItem> =>
  toMap([
    file(
      'index.html',
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Houdini Scaffold</title>
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <div class="stage"></div>
    <script>
      // Worklet loaders bypass window.fetch overrides, so we materialise the
      // worklet source as a Blob URL before handing it to addModule().
      if ('paintWorklet' in CSS) {
        fetch('./worklet.js')
          .then(function (r) { return r.text(); })
          .then(function (src) {
            var blob = new Blob([src], { type: 'application/javascript' });
            return CSS.paintWorklet.addModule(URL.createObjectURL(blob));
          })
          .then(function () { console.log('Paint Worklet registered'); })
          .catch(function (e) { console.error('Worklet registration failed: ' + (e && e.message ? e.message : e)); });
      } else {
        console.warn('CSS Paint Worklet unavailable in this browser');
      }
    </script>
  </body>
</html>
`,
    ),
    file(
      'worklet.js',
      `registerPaint('grid', class {
  static get inputProperties() { return ['--grid-density', '--grid-color']; }
  paint(ctx, size, props) {
    const density = parseInt(props.get('--grid-density').toString()) || 24;
    const color = props.get('--grid-color').toString().trim() || '#217eff';
    const cell = size.width / density;
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= density; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, size.height); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cell); ctx.lineTo(size.width, i * cell); ctx.stroke();
    }
  }
});
`,
    ),
    file(
      'style.css',
      `html, body { margin: 0; height: 100%; background: #0a0a12; }
.stage {
  width: 100vw;
  height: 100vh;
  --grid-density: 28;
  --grid-color: #217eff;
  background-image: paint(grid);
}
`,
    ),
  ])

const SVG_SCAFFOLD = (): Record<string, FileItem> =>
  toMap([
    file(
      'index.html',
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>SVG Scaffold</title>
    <style>html,body{margin:0;height:100%;background:#08080a;display:grid;place-items:center}</style>
  </head>
  <body>
    <svg viewBox="0 0 320 320" width="80vmin" height="80vmin" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="turb">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="1" />
          <feDisplacementMap in="SourceGraphic" scale="18" />
        </filter>
      </defs>
      <rect x="20" y="20" width="280" height="280" rx="32" fill="#217eff" filter="url(#turb)" />
    </svg>
  </body>
</html>
`,
    ),
    file(
      'filter.svg',
      `<svg xmlns="http://www.w3.org/2000/svg">
  <filter id="turb-strong">
    <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" />
    <feDisplacementMap in="SourceGraphic" scale="36" />
  </filter>
</svg>
`,
    ),
  ])

const THREEJS_SCAFFOLD = (): Record<string, FileItem> =>
  toMap([
    file(
      'index.html',
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Three.js Scaffold</title>
    <style>html,body{margin:0;height:100%;background:#06070a}canvas{display:block}</style>
    <script type="importmap">
    {
      "imports": {
        "three": "https://unpkg.com/three@0.171.0/build/three.module.js"
      }
    }
    </script>
  </head>
  <body>
    <script type="module" src="./scene.js"></script>
  </body>
</html>
`,
    ),
    file(
      'scene.js',
      `import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
document.body.appendChild(renderer.domElement);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1.2, 1.2, 1.2),
  new THREE.MeshStandardMaterial({ color: 0x217eff, roughness: 0.4, metalness: 0.6 }),
);
scene.add(cube);
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(2, 3, 4);
scene.add(key);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function frame(t) {
  cube.rotation.x = t * 0.0006;
  cube.rotation.y = t * 0.0009;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
console.log('three.js scene ready');
requestAnimationFrame(frame);
`,
    ),
  ])

const PIXI_SCAFFOLD = (): Record<string, FileItem> =>
  toMap([
    file(
      'index.html',
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>PixiJS Scaffold</title>
    <style>html,body{margin:0;height:100%;background:#06070a}canvas{display:block}</style>
    <script type="importmap">
    {
      "imports": {
        "pixi.js": "https://unpkg.com/pixi.js@8.6.6/dist/pixi.min.mjs"
      }
    }
    </script>
  </head>
  <body>
    <script type="module" src="./app.js"></script>
  </body>
</html>
`,
    ),
    file(
      'app.js',
      `import * as PIXI from 'pixi.js';

const app = new PIXI.Application();
await app.init({ width: innerWidth, height: innerHeight, background: '#06070a', antialias: true });
document.body.appendChild(app.canvas);

const g = new PIXI.Graphics();
g.circle(0, 0, 60).fill({ color: 0x217eff });
g.x = innerWidth / 2;
g.y = innerHeight / 2;
app.stage.addChild(g);

app.ticker.add((ticker) => {
  g.x = innerWidth / 2 + Math.sin(ticker.lastTime * 0.001) * 80;
  g.y = innerHeight / 2 + Math.cos(ticker.lastTime * 0.0013) * 60;
});

console.log('pixi.js application ready');
`,
    ),
  ])

const SCAFFOLDS: Record<PresetType, () => Record<string, FileItem>> = {
  webgl: WEBGL_SCAFFOLD,
  webgpu: WEBGPU_SCAFFOLD,
  houdini: HOUDINI_SCAFFOLD,
  svg: SVG_SCAFFOLD,
  threejs: THREEJS_SCAFFOLD,
  pixi: PIXI_SCAFFOLD,
}

export function scaffoldForTech(type: PresetType): Record<string, FileItem> {
  return SCAFFOLDS[type]()
}

export function defaultActiveFile(files: Record<string, FileItem>): string {
  const names = Object.keys(files)
  const last = names[names.length - 1]
  return last ?? 'index.html'
}
