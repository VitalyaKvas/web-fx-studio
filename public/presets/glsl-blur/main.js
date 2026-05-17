// GLSL Blur — fullscreen WebGL2 quad running a procedural radial gaussian blur.
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
    const log = gl.getShaderInfoLog(sh);
    throw new Error('Shader compile failed: ' + log);
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
const loc = gl.getAttribLocation(prog, 'a_pos');
gl.enableVertexAttribArray(loc);
gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

gl.useProgram(prog);
const uTime = gl.getUniformLocation(prog, 'uTime');
const uRes = gl.getUniformLocation(prog, 'uResolution');

function resize() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
  gl.viewport(0, 0, canvas.width, canvas.height);
}
addEventListener('resize', resize);
resize();

let frameCount = 0;
function frame(t) {
  gl.uniform1f(uTime, t * 0.001);
  gl.uniform2f(uRes, canvas.width, canvas.height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  frameCount++;
  requestAnimationFrame(frame);
}

console.log('GLSL Blur — linked program · 2 uniforms · 1 attribute');
requestAnimationFrame(frame);
