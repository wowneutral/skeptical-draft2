// The print: every pixel of the 3D frame is cut to bone or black through an
// 8x8 Bayer matrix. The cell can be coarse (the opening, the ending) and the
// sample snaps to the cell so big cells read as big pixels, not blur.
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing';
import { Uniform } from 'three';

const FRAG = /* glsl */ `
uniform float uCell; uniform float uFade; uniform float uGain;
vec3 lin(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
#define bayer4(a) (bayer2(0.5 * (a)) * 0.25 + bayer2(a))
#define bayer8(a) (bayer4(0.5 * (a)) * 0.25 + bayer2(a))
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 px = floor(uv * resolution / uCell);
  vec2 suv = (px + 0.5) * uCell / resolution;
  vec3 c = texture2D(inputBuffer, suv).rgb;
  float lum = pow(clamp(dot(c, vec3(0.2126, 0.7152, 0.0722)) * uGain, 0.0, 1.0), 1.0 / 2.2);
  lum = smoothstep(0.03, 0.92, lum);
  lum *= 1.0 - uFade;
  float th = bayer8(px);
  float on = step(th + 0.0025, lum);
  vec3 ink = lin(vec3(10.0) / 255.0);
  vec3 paper = lin(vec3(242.0, 239.0, 232.0) / 255.0);
  outputColor = vec4(mix(ink, paper, on), 1.0);
}`;

export class DitherFX extends Effect {
  constructor() {
    super('DitherFX', FRAG, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, Uniform>([['uCell', new Uniform(24)], ['uFade', new Uniform(0)], ['uGain', new Uniform(1)]]),
    });
  }
}
