// One fragment shader: the mark as a rounded extrusion of its 2D field,
// warped by heat, smooth-unioned into a puddle and beads, on black stone
// under one warm lamp. Everything is raymarched; nothing is a mesh.
export const vert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec3 uCam, uCX, uCY, uCZ;
uniform float uTan;
uniform vec2 uShift;
uniform float uBase, uOffX;
uniform float uMelt, uLean, uPool, uCool, uLamp, uHandK;
uniform vec2 uPoolC;
uniform vec3 uHand;
uniform vec4 uDent[6];
uniform vec4 uBA[10];
uniform vec4 uBB[10];
uniform vec3 uBg;
uniform float uEdge;

const float HALF = 0.105;
const float RR = 0.03;

float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }

float g2(vec2 p) {
  vec2 f = vec2(p.x * 1000.0 + uOffX, uBase - p.y * 1000.0);
  vec2 uv = (f - vec2(-560.0, -840.0)) / vec2(1120.0, 1680.0);
  vec2 c = clamp(uv, 0.002, 0.998);
  float d = texture2D(uTex, c).r;
  return d + length((uv - c) * vec2(1.12, 1.68));
}

// heat in, shape out: where the point at p would have been in the cold mark
vec3 warp(vec3 p, out float heat, out float rr) {
  float m = uMelt;
  float y = max(p.y, 0.0);
  vec3 q = p;
  float sp = exp(-y * 6.0);
  q.x = q.x / (1.0 + m * 1.3 * sp);
  q.z = q.z / (1.0 + m * 2.6 * sp);
  q.x -= uLean * y * y;
  q.z -= uLean * 0.55 * y * y;
  float m2 = m * m;
  q.y = y * (1.0 + 9.0 * m2 * m2 * m) + (1.0 * m2 + 14.0 * m2 * m2 * m2 * m) * y * y + min(p.y, 0.0);
  heat = m;
  rr = RR + m * 0.03;
  for (int i = 0; i < 6; i++) {
    vec4 d = uDent[i];
    if (d.w < 0.001) continue;
    vec2 dd = q.xy - d.xy;
    float f = exp(-dot(dd, dd) * 14.0);
    float below = smoothstep(0.45, -0.05, d.y - q.y);
    float a = d.w * f;
    q.y += a * 0.24 * below;
    q.x = d.x + (q.x - d.x) / (1.0 + a * 0.35);
    q.z /= 1.0 + a * 0.45;
    rr += a * 0.035;
    heat += a;
  }
  return q;
}

float wax(vec3 p, out float heat) {
  float rr;
  vec3 q = warp(p, heat, rr);
  float d2 = g2(q.xy) + rr;
  vec2 w = vec2(d2, abs(q.z) - HALF + rr);
  float d = min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - rr;
  for (int i = 0; i < 10; i++) {
    vec4 a = uBA[i]; vec4 b = uBB[i];
    if (b.w < 0.5) continue;
    vec3 pa = q - a.xyz; vec3 ba = b.xyz - a.xyz;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    float db = length(pa - ba * h) - a.w * mix(0.6, 1.0, h * h);
    d = smin(d, db, 0.03);
  }
  d *= 0.62;
  vec2 pc = p.xz - uPoolC;
  float ang = atan(pc.y, pc.x);
  float R = uPool * (1.0 + 0.07 * sin(3.0 * ang + 1.3) + 0.045 * sin(5.0 * ang + 4.1) + 0.02 * sin(9.0 * ang + 0.7));
  float t = 0.006 + uPool * 0.03;
  float dp = length(vec2(max(length(pc) - max(R - t, 0.0), 0.0), p.y)) - t;
  return smin(d, dp, 0.05 + 0.1 * uMelt);
}

float waxd(vec3 p) { float h; return wax(p, h); }

vec3 normal(vec3 p) {
  vec2 e = vec2(1.0, -1.0) * 0.0032;
  return normalize(e.xyy * waxd(p + e.xyy) + e.yyx * waxd(p + e.yyx) + e.yxy * waxd(p + e.yxy) + e.xxx * waxd(p + e.xxx));
}

float shadow(vec3 ro, vec3 rd, float k) {
  float res = 1.0, t = 0.015;
  for (int i = 0; i < 30; i++) {
    float h = waxd(ro + rd * t);
    res = min(res, k * h / t);
    t += clamp(h, 0.012, 0.18);
    if (res < 0.003 || t > 3.0) break;
  }
  return clamp(res, 0.0, 1.0);
}

float occ(vec3 p, vec3 n) {
  float o = 0.0, s = 1.0;
  for (int i = 1; i <= 5; i++) {
    float h = 0.025 * float(i * i) * 0.6;
    o += (h - waxd(p + n * h)) * s;
    s *= 0.62;
  }
  return clamp(1.0 - 2.4 * o, 0.0, 1.0);
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { return noise(p) * 0.5 + noise(p * 2.13 + 7.1) * 0.27 + noise(p * 4.7 + 1.3) * 0.15 + noise(p * 11.0) * 0.08; }

vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

void main() {
  vec2 frag = gl_FragCoord.xy / uRes;
  vec2 ndc = frag * 2.0 - 1.0 + uShift;
  float asp = uRes.x / uRes.y;
  vec3 ro = uCam;
  vec3 rd = normalize(uCZ + ndc.x * uTan * asp * uCX + ndc.y * uTan * uCY);

  // the lamp: warm, high, front left; at Join it cools
  vec3 LP = vec3(-3.1, 3.3, 1.5);
  vec3 spotDir = normalize(vec3(0.05, 0.45, 0.0) - LP);
  vec3 keyCol = mix(vec3(1.0, 0.79, 0.57), vec3(0.82, 0.88, 1.0), uCool) * mix(3.2, 2.7, uCool) * uLamp;
  vec3 rimCol = vec3(0.32, 0.42, 0.62) * 0.55 * uLamp;
  vec3 RD = normalize(vec3(2.4, 1.5, -2.6));
  vec3 handCol = vec3(1.0, 0.55, 0.26) * uHandK * 0.9;

  // floor and box
  float tf = rd.y < 0.0 ? -ro.y / rd.y : 1e9;
  vec3 bmin = vec3(-1.6, -0.05, -1.6), bmax = vec3(1.6, 1.95, 1.6);
  vec3 ia = (bmin - ro) / rd, ib = (bmax - ro) / rd;
  vec3 tmin3 = min(ia, ib), tmax3 = max(ia, ib);
  float t0 = max(max(tmin3.x, tmin3.y), tmin3.z), t1 = min(min(tmax3.x, tmax3.y), tmax3.z);
  float hit = -1.0;
  if (t1 > max(t0, 0.0)) {
    float t = max(t0, 0.0);
    float tend = min(t1, tf + 0.02);
    for (int i = 0; i < 110; i++) {
      float h = waxd(ro + rd * t);
      if (h < 0.0006 * t) { hit = t; break; }
      t += h;
      if (t > tend) break;
    }
  }

  vec3 col = vec3(0.0);
  float vis = 0.0;
  if (hit > 0.0) {
    vec3 p = ro + rd * hit;
    float heat; wax(p, heat);
    vec3 n = normal(p);
    vec3 v = -rd;
    vec3 l = normalize(LP - p);
    vec3 lv = LP - p;
    float spot = smoothstep(0.84, 0.97, dot(-l, spotDir)) * 20.0 / dot(lv, lv);
    float sh = shadow(p + n * 0.006, l, 7.0);
    float ao = occ(p, n);
    float hh = clamp(heat * 1.2, 0.0, 1.0);
    vec3 alb = vec3(0.80, 0.76, 0.67) * mix(0.8, 1.0, hh);
    // wax lets light wrap past the terminator, red furthest
    float ndl = dot(n, l);
    vec3 wrapW = vec3(0.48, 0.30, 0.2);
    vec3 diff = clamp((vec3(ndl) + wrapW) / (1.0 + wrapW), 0.0, 1.0);
    diff *= mix(vec3(1.0), vec3(sh), vec3(0.78, 0.86, 0.9));
    // thin edges glow warm
    float d1 = -waxd(p - n * 0.045), d2 = -waxd(p - n * 0.11);
    float thin = clamp(1.0 - (d1 / 0.045 * 0.5 + d2 / 0.11 * 0.5), 0.0, 1.0);
    float back = pow(clamp(dot(v, -l) * 0.6 + 0.55, 0.0, 1.0), 2.0);
    vec3 sss = vec3(1.0, 0.5, 0.2) * thin * (0.4 + 1.1 * back) * mix(0.6, 1.0, sh);
    // satin: a broad soft highlight that tightens where the wax is warm
    vec3 hv = normalize(l + v);
    float spec = pow(max(dot(n, hv), 0.0), mix(14.0, 70.0, hh)) * mix(0.07, 0.4, hh) * sh;
    float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
    vec3 rim = rimCol * max(dot(n, RD), 0.0) * (0.35 + 1.4 * fres);
    vec3 hl = uHand - p; float hd = length(hl); hl /= hd;
    vec3 hand = handCol * alb * (clamp((dot(n, hl) + 0.5) / 1.5, 0.0, 1.0) + thin * 0.6) / (1.0 + hd * hd * 9.0);
    vec3 amb = alb * (vec3(0.035, 0.032, 0.03) + keyCol * 0.018 * clamp(0.5 - n.y * 0.5, 0.0, 1.0)) * ao;
    col = keyCol * (alb * diff * spot + sss * alb * spot + vec3(spec) * spot) * mix(0.55, 1.0, ao) + rim * ao + hand + amb + fres * 0.03 * keyCol * ao * spot;
    vis = 1.0;
  } else if (tf < 30.0) {
    vec3 p = ro + rd * tf;
    vec3 n = vec3(0.0, 1.0, 0.0);
    vec3 v = -rd;
    vec3 l = normalize(LP - p);
    float spot = smoothstep(0.925, 0.99, dot(-l, spotDir));
    float near = length(p.xz - vec2(0.0, 0.0));
    float sh = near < 2.4 ? shadow(p + n * 0.003, l, 5.0) : 1.0;
    float ao = near < 1.9 ? occ(p, n) : 1.0;
    float grain = fbm(p.xz * 3.2);
    float vein = smoothstep(0.62, 0.75, fbm(p.xz * 1.1 + vec2(grain * 1.6, 0.0)));
    vec3 alb = vec3(0.016, 0.015, 0.014) * (0.7 + 0.6 * grain) + vec3(0.012) * vein;
    float ndl = max(dot(n, l), 0.0);
    vec3 r = reflect(-v, n);
    float gl = pow(max(dot(r, l), 0.0), 40.0) * 0.05 * (0.6 + 0.8 * grain);
    vec3 hl = uHand - p; float hd = length(hl);
    vec3 hand = handCol * alb * 6.0 * max(hl.y / hd, 0.0) / (1.0 + hd * hd * 9.0);
    col = keyCol * (alb * ndl * 1.8 + vec3(gl)) * spot * sh * ao + hand + alb * 0.08 * ao;
    float fade = exp(-max(tf - 7.0, 0.0) * 0.45);
    vis = fade * smoothstep(2.1, 0.45, length(p.xz - vec2(0.15, 0.1)));
  }

  col = aces(col * 1.05);
  col = pow(col, vec3(1.0 / 2.2));
  // light added onto the page colour, fading out at the canvas edges
  vec2 e = smoothstep(vec2(0.0), vec2(uEdge), frag) * smoothstep(vec2(0.0), vec2(uEdge), 1.0 - frag);
  vis *= mix(1.0, e.x * e.y, 1.0);
  col = 1.0 - (1.0 - uBg) * (1.0 - col * vis);
  gl_FragColor = vec4(col, 1.0);
}
`;
