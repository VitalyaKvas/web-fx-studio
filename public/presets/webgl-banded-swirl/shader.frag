#version 300 es
precision highp float;

// Port of the legacy WPF/HLSL "BandedSwirlEffect" pixel shader.
// Idea: distance from center is split into concentric rings (count = uBands).
// Within each ring, a piecewise factor flips between +1 / -1 with smooth
// transitions, producing alternating clockwise / counter-clockwise swirl bands.

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D uSource;       // was: inputSource (S0)
uniform vec2  uCenter;           // was: Center      (C0)  range 0..1
uniform float uBands;            // was: Bands       (C1)  range 0..20
uniform float uStrength;         // was: Strength    (C2)  range 0..1
uniform float uAspectRatio;      // was: AspectRatio (C3)  range 0.5..2

void main() {
  vec2 dir = v_uv - uCenter;
  // Un-stretch Y by aspect so the ring spacing is isotropic.
  dir.y /= uAspectRatio;

  float dist = length(dir);
  float angle = atan(dir.y, dir.x);

  // Piecewise smooth band factor: +1 plateau → ramp → -1 plateau → ramp.
  float remainder = fract(dist * uBands);
  float fac;
  if (remainder < 0.25) {
    fac = 1.0;
  } else if (remainder < 0.5) {
    fac = 1.0 - 8.0 * (remainder - 0.25);
  } else if (remainder < 0.75) {
    fac = -1.0;
  } else {
    fac = -(1.0 - 8.0 * (remainder - 0.75));
  }

  float newAngle = angle + fac * uStrength * dist;
  vec2 newDir = vec2(cos(newAngle), sin(newAngle));
  // Re-apply aspect to map back into UV space.
  newDir.y *= uAspectRatio;

  vec2 samplePoint = uCenter + dist * newDir;
  outColor = texture(uSource, samplePoint);
}
