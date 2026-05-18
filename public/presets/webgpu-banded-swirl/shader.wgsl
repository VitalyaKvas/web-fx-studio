// BandedSwirl — WGSL port of the legacy WPF/HLSL alternating-swirl-bands shader.
// HLSL register slots (s0, c0..c3) and PascalCase names replaced with
// descriptive WGSL bindings + struct fields below.

struct Params {
  centerX     : f32,    // was: Center.x      (c0)  range 0..1
  centerY     : f32,    // was: Center.y      (c0)  range 0..1
  bands       : f32,    // was: Bands         (c1)  range 0..20
  strength    : f32,    // was: Strength      (c2)  range 0..1
  aspectRatio : f32,    // was: AspectRatio   (c3)  range 0.5..2
  _pad0       : f32,
  _pad1       : f32,
  _pad2       : f32,
};

@group(0) @binding(0) var samp            : sampler;
@group(0) @binding(1) var sourceTex       : texture_2d<f32>;   // was: inputSource (s0)
@group(0) @binding(2) var<uniform> params : Params;

struct VsOut {
  @builtin(position) pos : vec4<f32>,
  @location(0) uv : vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) i : u32) -> VsOut {
  var p = array<vec2<f32>, 4>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0,  1.0)
  );
  var out : VsOut;
  out.pos = vec4<f32>(p[i], 0.0, 1.0);
  // Flip Y so the image isn't upside-down in WebGPU's NDC orientation.
  out.uv = p[i] * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5);
  return out;
}

@fragment
fn fs_main(in : VsOut) -> @location(0) vec4<f32> {
  let center = vec2<f32>(params.centerX, params.centerY);
  var dir = in.uv - center;
  dir.y = dir.y / params.aspectRatio;

  let dist = length(dir);
  let angle = atan2(dir.y, dir.x);

  // Piecewise smooth band factor: +1 plateau → ramp → -1 plateau → ramp.
  let remainder = fract(dist * params.bands);
  var fac : f32;
  if (remainder < 0.25) {
    fac = 1.0;
  } else if (remainder < 0.5) {
    fac = 1.0 - 8.0 * (remainder - 0.25);
  } else if (remainder < 0.75) {
    fac = -1.0;
  } else {
    fac = -(1.0 - 8.0 * (remainder - 0.75));
  }

  let newAngle = angle + fac * params.strength * dist;
  var newDir = vec2<f32>(cos(newAngle), sin(newAngle));
  newDir.y = newDir.y * params.aspectRatio;

  let samplePoint = center + dist * newDir;
  return textureSample(sourceTex, samp, samplePoint);
}
