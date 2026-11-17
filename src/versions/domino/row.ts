// The row: nine bone tiles, each half again as big as the one before.
// All the geometry of the fall lives here, in the plane of the row (y up, z toward the camera).
import { clamp, smooth, still } from '@/lib/utils';

export const N = 9;
export const RATIO = 1.5;
export const H0 = 0.42;
/** Proportions of one tile, as fractions of its height. */
export const PW = 0.52, PT = 0.16;
/** The space between one tile and the next, as a fraction of the smaller one's height. */
const GAP = 0.5;
/** Which tile is the drive: the one turned face down. */
export const FACE_DOWN = 6;
export const LAST = N - 1;

export const h = Array.from({ length: N }, (_, i) => H0 * Math.pow(RATIO, i));
export const t = h.map((x) => x * PT);
export const w = h.map((x) => x * PW);
/** z of each tile's back face, which is also its pivot when it falls away from us. */
export const zp: number[] = [0];
for (let i = 1; i < N; i++) zp[i] = zp[i - 1] - GAP * h[i - 1] - t[i];
/** z of each tile's middle. */
export const zc = zp.map((z, i) => z + t[i] / 2);

/**
 * The furthest tile i can fall while tile i+1 stands at angle phi.
 * Its top back edge must stay on our side of the next tile's front face.
 */
export function contact(i: number, phi: number) {
  if (i >= LAST) return Math.PI / 2;
  const D = zp[i] - zp[i + 1];
  const s = (D * Math.cos(phi) - t[i + 1]) / h[i];
  if (s >= 1) return Math.PI / 2;
  return Math.min(Math.PI / 2, phi + Math.asin(clamp(s, -1, 1)));
}

/** How far a tile has fallen after a fraction q of its fall: a quick shove, then gravity. */
const fallCurve = (q: number) => (Math.PI / 2) * (0.16 * q + 0.84 * q * q);
const dur = (i: number) => 0.34 * Math.sqrt(h[i] / H0);
const easeIO = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export type Chain = { k: number; t0: number; start: number[]; end: number; lift: number; done: number };

/** Plan a chain from tile k: when each tile starts to go, when the last one settles, when they stand again. */
export function planChain(k: number, t0: number): Chain {
  const start: number[] = [];
  start[k] = 0;
  for (let i = k; i < LAST; i++) {
    // The next tile goes when this one's top reaches it.
    const target = contact(i, 0);
    let lo = 0, hi = 1;
    for (let n = 0; n < 24; n++) { const m = (lo + hi) / 2; if (fallCurve(m) < target) lo = m; else hi = m; }
    start[i + 1] = start[i] + lo * dur(i);
  }
  const end = start[LAST] + dur(LAST) + 0.9;
  const lift = end + 2.2;
  const done = lift + (LAST - k) * 0.17 + 1.1;
  return { k, t0, start, end, lift, done };
}

/** The angle the chain asks of tile i at time now (before the row's contacts are applied). */
export function chainAngle(c: Chain, i: number, now: number) {
  if (i < c.k) return 0;
  const tt = now - c.t0;
  const s = c.start[i];
  if (tt < s) return 0;
  const d = dur(i);
  const q = (tt - s) / d;
  let a = q < 1 ? fallCurve(q) : Math.PI / 2;
  if (i === LAST && q >= 1) {
    // The slab lands, lifts a hair, lands again.
    const u = tt - s - d;
    a -= 0.055 * Math.exp(-5 * u) * Math.abs(Math.sin(11 * u));
  }
  const r = c.lift + (LAST - i) * 0.17;
  if (tt > r) a *= 1 - easeIO(clamp((tt - r) / 1.1));
  return a;
}

/** The angle the scroll asks of tile i, given where the camera is along the row (f). */
export function scrollAngle(i: number, f: number) {
  let a: number;
  if (still) a = i === LAST && f > 8.3 && f < 9.6 ? Math.PI / 2 : 0;
  else if (i === LAST) a = (Math.PI / 2) * Math.pow(clamp((f - 8.06) / 0.5), 1.8);
  else a = (Math.PI / 2) * Math.pow(clamp((f - i - 0.03) / 0.32), 2);
  // At the end of the page they stand up again, the last one first.
  if (!still && f > 9.45) a *= 1 - smooth(clamp((f - 9.45 - (LAST - i) * 0.045) / 0.14));
  return a;
}

/** Apply the row: from the far end back, each tile can only lean as far as the next one lets it. */
export function settle(raw: number[], out: number[]) {
  out[LAST] = Math.min(Math.PI / 2, raw[LAST]);
  for (let i = LAST - 1; i >= 0; i--) out[i] = Math.min(raw[i], contact(i, out[i + 1]));
  return out;
}

/** Shared between the page and the scene. Never read by React render. */
export const row = {
  /** Scroll positions where the camera reaches each stop: [scrollY, f]. */
  keys: [[0, 0], [1, 1]] as [number, number][],
  chain: null as Chain | null,
  hover: -1,
  angles: new Array(N).fill(0) as number[],
  push: (_i: number) => {},
  now: 0,
  f: 0,
};

/** Map a scroll position to f, the camera's place along the row. */
export function fOf(y: number) {
  const k = row.keys;
  if (y <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (y <= k[i][0]) { const [y0, f0] = k[i - 1], [y1, f1] = k[i]; return f0 + (f1 - f0) * ((y - y0) / Math.max(1, y1 - y0)); }
  }
  return k[k.length - 1][1];
}

/** Start a chain from tile i, or from the first standing tile after it. */
export function pushFrom(i: number) {
  if (still || row.chain) return false;
  let k = i;
  while (k < N && row.angles[k] > 0.08) k++;
  if (k >= N) return false;
  wakeSound();
  row.chain = planChain(k, row.now);
  return true;
}
row.push = (i) => { pushFrom(i); };

/** The knock of bone on bone, made only after someone pushes: small tiles click, the slab thuds. */
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
export function wakeSound() {
  if (still) return;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { ctx = null; }
}
export function knock(i: number, hard: number) {
  if (!ctx || !noise || ctx.state !== 'running') return;
  const t0 = ctx.currentTime, k = i / LAST;
  const src = ctx.createBufferSource(); src.buffer = noise;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200 * Math.pow(0.62, i); bp.Q.value = 2.2;
  const g = ctx.createGain(); const peak = Math.min(0.55, (0.05 + 0.5 * k * k) * clamp(hard, 0.4, 1.4));
  g.gain.setValueAtTime(peak, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05 + 0.32 * k);
  src.connect(bp).connect(g).connect(ctx.destination); src.start(t0); src.stop(t0 + 0.4);
  if (i >= 5) {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(120 - i * 7, t0); o.frequency.exponentialRampToValueAtTime(38, t0 + 0.35);
    const og = ctx.createGain(); og.gain.setValueAtTime(0.12 * k * k * (i === LAST ? 2.4 : 1), t0); og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
    o.connect(og).connect(ctx.destination); o.start(t0); o.stop(t0 + 0.55);
  }
}

if (import.meta.env.DEV) (window as unknown as { __domino: unknown }).__domino = row;
