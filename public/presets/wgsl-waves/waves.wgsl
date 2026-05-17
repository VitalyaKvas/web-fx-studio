struct Uniforms {
  time   : f32,
  aspect : f32,
}

@group(0) @binding(0) var<uniform> U : Uniforms;

struct VsOut {
  @builtin(position) pos : vec4<f32>,
  @location(0) uv  : vec2<f32>,
}

@vertex
fn vs_main(@builtin(vertex_index) i : u32) -> VsOut {
  var p = array<vec2<f32>, 4>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0,  1.0)
  );
  var out: VsOut;
  out.pos = vec4<f32>(p[i], 0.0, 1.0);
  out.uv  = p[i] * 0.5 + vec2<f32>(0.5);
  return out;
}

@fragment
fn fs_main(in: VsOut) -> @location(0) vec4<f32> {
  let p = (in.uv - vec2<f32>(0.5)) * vec2<f32>(U.aspect, 1.0);
  let r = length(p);
  let wave = sin(r * 32.0 - U.time * 2.4);
  let bg = vec3<f32>(0.04, 0.04, 0.08);
  let accent = vec3<f32>(0.07, 0.49, 1.0);
  let c = mix(bg, accent, wave * 0.5 + 0.5);
  return vec4<f32>(c, 1.0);
}
