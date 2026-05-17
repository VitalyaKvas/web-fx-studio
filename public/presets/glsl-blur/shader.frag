#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform float uTime;
uniform vec2 uResolution;

// Procedural source: a moving 3-color gradient field with sharp bands.
vec3 source(vec2 uv) {
  float t = uTime * 0.4;
  vec3 a = vec3(0.07, 0.49, 1.0);
  vec3 b = vec3(0.96, 0.18, 0.34);
  vec3 c = vec3(0.18, 0.92, 0.62);
  float k1 = 0.5 + 0.5 * sin(uv.x * 6.0 + t);
  float k2 = 0.5 + 0.5 * sin(uv.y * 8.0 - t * 1.2);
  float k3 = 0.5 + 0.5 * sin((uv.x + uv.y) * 9.0 + t * 0.7);
  return mix(mix(a, b, k1), c, k2 * k3);
}

// Radial gaussian blur — 16 taps along a rotating offset ring.
vec3 blur(vec2 uv, float radius) {
  vec3 acc = vec3(0.0);
  float w = 0.0;
  for (int i = 0; i < 16; i++) {
    float a = float(i) * 0.392699;
    vec2 o = vec2(cos(a), sin(a)) * radius;
    float weight = 1.0 - float(i) / 16.0;
    acc += source(uv + o) * weight;
    w += weight;
  }
  return acc / w;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  // Vary blur radius outward from center for a vignette feel.
  float d = distance(uv, vec2(0.5));
  float r = mix(0.002, 0.045, smoothstep(0.0, 0.7, d));
  vec3 col = blur(uv, r);
  // Subtle scanline / film texture.
  col *= 0.92 + 0.08 * sin(uv.y * uResolution.y * 0.8);
  outColor = vec4(col, 1.0);
}
