// The sixteen figures. Each is one stroke: a centreline grown upward from the
// foot of the stem by integrating a curvature profile. At bend 0 the curvature is
// zero (a straight upright bar, the exclamation mark); at bend 1 it is the
// question mark's (the stem leans into the lobe, the lobe rolls over the top and
// drops into the hook). Same length at every step, so the mark really bends.

export const N = 16;
export const STEP = (Math.PI * 2) / N;
/** One cycle round the ring: straight, curling to a full question at 8, straightening again. */
export const bendOf = (k: number) => (1 - Math.cos((2 * Math.PI * k) / N)) / 2;

export const LEN = 1.9;
export const DOT = { y: -0.3, r: 0.11 };

const ss = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const bump = (s: number, a: number, b: number, ramp = 0.07) => ss(a - ramp, a + ramp, s) * (1 - ss(b - ramp, b + ramp, s));

/** Curvature of the question mark at arc length s from the foot of the stem. */
function kappa(s: number) {
  return -2.9 * bump(s, 0.42, 0.68) + 3.75 * bump(s, 0.8, 1.84, 0.1) + 0.9 * bump(s, 1.72, 1.9, 0.05);
}

/** Stroke half-width along the stroke, for an exclamation (bend 0) and a question (bend 1). */
function width(s: number, b: number) {
  const u = s / LEN;
  const ex = 0.042 + 0.07 * Math.pow(u, 1.35);
  // Bodoni contrast: a firm stem, a fat lobe on the way down the right side, a hairline over the top, a ball at the end.
  const q = 0.05 + 0.03 * bump(s, 0.62, 1.05, 0.18) - 0.016 * bump(s, 1.28, 1.62, 0.12) + 0.055 * ss(1.66, 1.9, s);
  return ex + (q - ex) * b;
}

export type Line = { x: number; y: number; tx: number; ty: number; r: number }[];

/** The centreline with its half-width, sampled evenly. Foot of the stem at (0,0). */
export function centreline(b: number, n = 120): Line {
  const out: Line = [];
  let x = 0, y = 0, a = Math.PI / 2;
  const ds = LEN / n;
  for (let i = 0; i <= n; i++) {
    const s = i * ds;
    out.push({ x, y, tx: Math.cos(a), ty: Math.sin(a), r: width(s, b) });
    // midpoint integration keeps the curve honest
    const am = a + kappa(s + ds / 2) * b * (ds / 2);
    x += Math.cos(am) * ds; y += Math.sin(am) * ds;
    a += kappa(s + ds / 2) * b * ds;
  }
  // Lean the whole stroke so the hook sits over the dot like a cut letter.
  return out;
}

/** The filled outline of the stroke as an SVG path (y up), plus round ends. */
export function outline(b: number) {
  const L = centreline(b, 90);
  const left: string[] = [], right: string[] = [];
  for (const p of L) {
    const nx = -p.ty, ny = p.tx;
    left.push(`${(p.x + nx * p.r).toFixed(4)},${(-(p.y + ny * p.r)).toFixed(4)}`);
    right.push(`${(p.x - nx * p.r).toFixed(4)},${(-(p.y - ny * p.r)).toFixed(4)}`);
  }
  const e = L[L.length - 1], s0 = L[0];
  return `M${left.join(' L')} A${e.r.toFixed(4)},${e.r.toFixed(4)} 0 0 1 ${right[right.length - 1]} L${right.reverse().join(' L')} A${s0.r.toFixed(4)},${s0.r.toFixed(4)} 0 0 1 ${left[0]} Z`;
}

/** Bounding box of a figure, for laying out the contact sheet. */
export function bounds(b: number) {
  const L = centreline(b, 60);
  let x0 = -DOT.r, x1 = DOT.r, y0 = DOT.y - DOT.r, y1 = 0;
  for (const p of L) { x0 = Math.min(x0, p.x - p.r); x1 = Math.max(x1, p.x + p.r); y1 = Math.max(y1, p.y + p.r); }
  return { x0, x1, y0, y1 };
}
