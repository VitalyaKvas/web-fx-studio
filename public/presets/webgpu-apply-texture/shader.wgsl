// ApplyTexture — WGSL port of the legacy WPF/HLSL displacement-map shader.
// Original used HLSL register slots (s0/s2, c0/c1/c3/c4/c5) and PascalCase names;
// renamed to descriptive WGSL bindings + struct fields below.

struct Params {
  tileSizeX : f32,    // was: HorizontalSize (c0)   range 1..5
  tileSizeY : f32,    // was: VerticalSize   (c3)   range 1..5
  offsetX   : f32,    // was: horizontalOffset (c4) range 0..1
  offsetY   : f32,    // was: verticalOffset   (c1) range 0..1
  strength  : f32,    // was: strength       (c5)   range 0..5
  _pad0     : f32,
  _pad1     : f32,
  _pad2     : f32,
};

@group(0) @binding(0) var samp             : sampler;
@group(0) @binding(1) var sourceTex        : texture_2d<f32>;  // was: Texture1 (s0)
@group(0) @binding(2) var displacementTex  : texture_2d<f32>;  // was: TextureMap (s2)
@group(0) @binding(3) var<uniform> params  : Params;

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
  // Map clip-space [-1,1] → uv [0,1]; flip Y so the source image isn't upside-down.
  var uv = p[i] * vec2<f32>(0.5, -0.5) + vec2<f32>(0.5);
  out.uv = uv;
  return out;
}

@fragment
fn fs_main(in : VsOut) -> @location(0) vec4<f32> {
  let uv = in.uv;

  let mapUV = fract(vec2<f32>(
    uv.x / params.tileSizeX + min(1.0, params.offsetX),
    uv.y / params.tileSizeY + min(1.0, params.offsetY)
  ));

  // Bias-centred offset: [0,1] map sample → [-s/8, +7s/8] displacement.
  let offset =
    textureSample(displacementTex, samp, mapUV).xy * params.strength
    - vec2<f32>(params.strength / 8.0);

  return textureSample(sourceTex, samp, fract(uv + offset));
}
