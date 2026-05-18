#version 300 es
precision highp float;

// Port of the legacy WPF/HLSL "ApplyTexture" pixel shader.
// Original used register slots (c0, c3, c5...) and PascalCase HLSL names;
// renamed to descriptive GLSL uniforms below.
//
// Idea: sample a displacement map at a re-tiled UV, decode its RG channels into
// a (-strength/8 .. +7*strength/8) offset, then look up the source texture at
// (uv + offset). When `uStrength = 0` the source passes through untouched.

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D uSource;            // was: Texture1 (s0)
uniform sampler2D uDisplacementMap;   // was: TextureMap (s2)

uniform float uTileSizeX;             // was: HorizontalSize (c0)   range 1..5
uniform float uTileSizeY;             // was: VerticalSize   (c3)   range 1..5
uniform float uOffsetX;               // was: horizontalOffset (c4) range 0..1
uniform float uOffsetY;               // was: verticalOffset   (c1) range 0..1
uniform float uStrength;              // was: strength       (c5)   range 0..5

void main() {
  vec2 uv = v_uv;

  // Re-tile the displacement-map UV. `min(1.0, offset)` preserves the original
  // HLSL clamp behaviour even though sliders now stay in [0,1].
  vec2 mapUV = fract(vec2(
    uv.x / uTileSizeX + min(1.0, uOffsetX),
    uv.y / uTileSizeY + min(1.0, uOffsetY)
  ));

  // Bias-centred offset: [0,1] map sample → [-s/8, +7s/8] displacement.
  vec2 offset = texture(uDisplacementMap, mapUV).xy * uStrength - (uStrength / 8.0);

  outColor = texture(uSource, fract(uv + offset));
}
