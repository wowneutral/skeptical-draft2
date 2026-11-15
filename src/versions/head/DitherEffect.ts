// The dither as a real post-processing pass. Everything with depth (the head)
// is cut to two tones through an ordered Bayer matrix in screen space; the
// background passes through untouched. A trail texture lets the pointer wipe
// the dither off and show the clean chrome underneath for a moment.
import { Effect, EffectAttribute } from 'postprocessing';
import { Uniform, type Texture } from 'three';

const FRAG = /* glsl */ `
uniform float uCell; uniform float uReveal; uniform float uTrailOn; uniform sampler2D uTrail;
float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
#define bayer4(a) (bayer2(0.5 * (a)) * 0.25 + bayer2(a))
#define bayer8(a) (bayer4(0.5 * (a)) * 0.25 + bayer2(a))
void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  if (depth > 0.99999) { outputColor = inputColor; return; }
  vec3 ink = pow(vec3(5.0) / 255.0, vec3(2.2)), paper = pow(vec3(240.0, 240.0, 236.0) / 255.0, vec3(2.2));
  float lum = pow(clamp(dot(inputColor.rgb, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0), 1.0 / 2.2);
  lum = smoothstep(0.02, 0.95, lum) * 0.92 + 0.04 * step(0.001, lum);
  float th = bayer8(uv * resolution / uCell);
  float on = step(th + 0.004, lum * uReveal - (1.0 - uReveal) * 0.35);
  vec3 dithered = mix(ink, paper, on);
  // The clean image, in the same two colours, where the pointer has just been.
  vec3 clean = mix(ink, paper, pow(lum, 2.2) * uReveal);
  float m = smoothstep(0.12, 0.7, texture2D(uTrail, uv).r) * uTrailOn;
  outputColor = vec4(mix(dithered, clean, m), 1.0);
}`;

export class DitherEffect extends Effect {
  constructor(trail: Texture) {
    super('DitherEffect', FRAG, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, Uniform>([
        ['uCell', new Uniform(2)], ['uReveal', new Uniform(0)], ['uTrailOn', new Uniform(1)], ['uTrail', new Uniform(trail)],
      ]),
    });
  }
}
