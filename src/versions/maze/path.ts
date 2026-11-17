// The labyrinth, built from numbers. Seven rings and a centre, one path,
// no dead ends: in at ring 3, out to 2 and 1, in to 4 and 7, back out to
// 6 and 5, then down into the centre. All turns happen at the front, on
// either side of a short spine, so the hairpins nest like a classical maze.
// World units: the stone is a disc of radius 1, x to the right, z toward you.

export const HW = 0.04; // half the width of the groove
export const A0 = 0.06; // the connectors sit this far either side of the spine
export const A1 = 0.16; // the hairpins sit this far
export const RHO = 0.24; // the centre's radius
export const DEPTH = 0.06; // how deep the groove is cut
export const DROP = 0.032; // the centre sits this much lower again
export const BALL = 0.03;
export const RINGS = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];
const r = (k: number) => RINGS[k - 1];
const TAU = Math.PI * 2;

type P = { x: number; z: number };
const pts: P[] = [];
const ends: number[] = []; // index of the last point of each piece
const push = (p: P) => {
  const l = pts[pts.length - 1];
  if (l && Math.hypot(l.x - p.x, l.z - p.z) < 1e-6) return;
  pts.push(p);
};
/** Straight, parallel to the spine at x = a, from radius r0 to r1. */
function line(a: number, r0: number, r1: number) {
  const z0 = Math.sqrt(r0 * r0 - a * a), z1 = Math.sqrt(r1 * r1 - a * a);
  const n = Math.max(2, Math.ceil(Math.abs(z1 - z0) / 0.02));
  for (let i = 0; i <= n; i++) push({ x: a, z: z0 + ((z1 - z0) * i) / n });
  ends.push(pts.length - 1);
}
/** Round a ring at radius rr from angle t0 to t1 (0 is the front, toward the viewer). */
function arc(rr: number, t0: number, t1: number) {
  const n = Math.max(4, Math.ceil((Math.abs(t1 - t0) * rr) / 0.02));
  for (let i = 0; i <= n; i++) { const t = t0 + ((t1 - t0) * i) / n; push({ x: rr * Math.sin(t), z: rr * Math.cos(t) }); }
  ends.push(pts.length - 1);
}
const L = (a: number, k: number) => Math.asin(a / r(k));
const R = (a: number, k: number) => TAU - Math.asin(a / r(k));

line(A0, 0.925, r(3));          // the way in
arc(r(3), L(A0, 3), R(A1, 3));  // ring 3
line(-A1, r(3), r(2));
arc(r(2), R(A1, 2), L(A1, 2));  // ring 2
line(A1, r(2), r(1));
arc(r(1), L(A1, 1), R(A0, 1));  // ring 1, the edge
line(-A0, r(1), r(4));
arc(r(4), R(A0, 4), L(A0, 4));  // ring 4
line(A0, r(4), r(7));
arc(r(7), L(A0, 7), R(A1, 7));  // ring 7, nearest the middle
line(-A1, r(7), r(6));
arc(r(6), R(A1, 6), L(A1, 6));  // ring 6
line(A1, r(6), r(5));
arc(r(5), L(A1, 5), R(A0, 5));  // ring 5
line(-A0, r(5), RHO);           // into the centre
export const WALL_N = pts.length; // the walls are cut along the path up to here

/** The two sides of the groove, mitred at the corners, closed into one outline. */
export function outline(): P[] {
  const n = WALL_N, plus: P[] = [], minus: P[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[Math.min(n - 1, i + 1)];
    const d1 = norm(b.x - a.x, b.z - a.z) ?? norm(c.x - b.x, c.z - b.z)!;
    const d2 = norm(c.x - b.x, c.z - b.z) ?? d1;
    const n1 = { x: -d1.z, z: d1.x }, n2 = { x: -d2.z, z: d2.x };
    const m = norm(n1.x + n2.x, n1.z + n2.z) ?? n1;
    const k = HW / Math.max(0.35, m.x * n1.x + m.z * n1.z);
    plus.push({ x: b.x + m.x * k, z: b.z + m.z * k });
    minus.push({ x: b.x - m.x * k, z: b.z - m.z * k });
  }
  untangle(plus); untangle(minus);
  // The groove opens into the round centre: trim both sides at its edge and run round it the long way.
  const cut = (side: P[], x: number) => { while (side.length && Math.hypot(side[side.length - 1].x, side[side.length - 1].z) < RHO + 0.002) side.pop(); side.push({ x, z: Math.sqrt(RHO * RHO - x * x) }); };
  const end = pts[n - 1];
  cut(plus, plus[plus.length - 1].x); cut(minus, minus[minus.length - 1].x);
  const ap = Math.atan2(plus[plus.length - 1].x, plus[plus.length - 1].z), am = Math.atan2(minus[minus.length - 1].x, minus[minus.length - 1].z);
  let d = am - ap; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
  const long = d - Math.sign(d) * TAU, steps = 96, round: P[] = [];
  for (let i = 1; i < steps; i++) { const t = ap + (long * i) / steps; round.push({ x: RHO * Math.sin(t), z: RHO * Math.cos(t) }); }
  void end;
  return [...plus, ...round, ...minus.reverse()];
}
/** On the inside of a sharp turn the offset line doubles back on itself; cut those little loops out. */
function untangle(a: P[]) {
  for (let i = 0; i < a.length - 3; i++) {
    for (let j = Math.min(a.length - 2, i + 14); j >= i + 2; j--) {
      const x = cross(a[i], a[i + 1], a[j], a[j + 1]);
      if (x) { a.splice(i + 1, j - i, x); break; }
    }
  }
}
function cross(p: P, q: P, r: P, s: P): P | null {
  const d = (q.x - p.x) * (s.z - r.z) - (q.z - p.z) * (s.x - r.x);
  if (Math.abs(d) < 1e-12) return null;
  const t = ((r.x - p.x) * (s.z - r.z) - (r.z - p.z) * (s.x - r.x)) / d, u = ((r.x - p.x) * (q.z - p.z) - (r.z - p.z) * (q.x - p.x)) / d;
  return t > 0 && t < 1 && u > 0 && u < 1 ? { x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t } : null;
}
function norm(x: number, z: number) { const l = Math.hypot(x, z); return l < 1e-9 ? null : { x: x / l, z: z / l }; }

// ---- The ball's road: the centre line, measured, plus the last roll to the dot.
let DOT = { x: -0.02, z: 0.12 };
export function setDot(x: number, z: number) { DOT = { x, z }; build(); }
export const road = { xs: new Float32Array(0), zs: new Float32Array(0), s: new Float32Array(0), len: 0, sCentre: 0, corners: [] as number[], sGate: 0, gate: { x: 0, z: -r(7) } };
function build() {
  const all = [...pts.slice(0, WALL_N)];
  const e = all[all.length - 1];
  const n = Math.ceil(Math.hypot(DOT.x - e.x, DOT.z - e.z) / 0.02);
  for (let i = 1; i <= n; i++) all.push({ x: e.x + ((DOT.x - e.x) * i) / n, z: e.z + ((DOT.z - e.z) * i) / n });
  const N = all.length, xs = new Float32Array(N), zs = new Float32Array(N), s = new Float32Array(N);
  for (let i = 0; i < N; i++) { xs[i] = all[i].x; zs[i] = all[i].z; s[i] = i ? s[i - 1] + Math.hypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1]) : 0; }
  road.xs = xs; road.zs = zs; road.s = s; road.len = s[N - 1];
  road.sCentre = s[WALL_N - 1];
  road.corners = ends.slice(0, -1).map((i) => s[i]);
  // The gate stands across ring 7 at the back of the stone.
  const i7 = ends[8], j7 = ends[9];
  let best = i7, bz = 9;
  for (let i = i7; i <= j7; i++) if (Math.abs(xs[i]) < bz && zs[i] < 0) { bz = Math.abs(xs[i]); best = i; }
  road.sGate = s[best]; road.gate = { x: xs[best], z: zs[best] };
}
build();

/** Where on the stone a distance along the road is, and which way the road runs there. */
export function at(sv: number) {
  const { xs, zs, s } = road; const N = s.length;
  sv = Math.min(road.len, Math.max(0, sv));
  let lo = 0, hi = N - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s[m] <= sv) lo = m; else hi = m; }
  const seg = s[hi] - s[lo] || 1, t = (sv - s[lo]) / seg;
  const tx = (xs[hi] - xs[lo]) / seg, tz = (zs[hi] - zs[lo]) / seg;
  return { x: xs[lo] + (xs[hi] - xs[lo]) * t, z: zs[lo] + (zs[hi] - zs[lo]) * t, tx, tz };
}

/** Where the ball should come to rest for each part of the page. */
export function stops() {
  const s = road.s, back = 0.06;
  return [
    BALL + 0.012,                 // the way in
    s[ends[3]] - back,            // round ring 3, back along ring 2
    s[ends[5]] - back,            // out along ring 1, at the rim
    road.sGate - BALL - 0.012,    // in to ring 7, up against the gate
    s[ends[13]] - back,           // through the gate and back out to ring 5
    road.len,                     // down into the centre, the dot
  ];
}
