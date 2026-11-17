// The bowl, and how it breaks. One lathed porcelain wall with real thickness,
// cut into pieces along a warped Voronoi pattern. The same warp and seeds are
// used by the shader that draws the gold, so the seams land on the cracks.
import * as THREE from 'three';

export const SEEDS = 13;
export const MAXF = 8;
export const RIM_Y = 1.14;

// Outer and inner profiles, (radius, height), from the centre of the base to the rim.
const OUT: [number, number][] = [[0, 0.03], [0.2, 0.03], [0.3, 0.024], [0.345, 0.004], [0.36, 0], [0.43, 0], [0.455, 0.05], [0.56, 0.15], [0.72, 0.33], [0.86, 0.56], [0.95, 0.8], [0.99, 1.0], [1.0, 1.14]];
const INN: [number, number][] = [[0, 0.13], [0.2, 0.135], [0.38, 0.17], [0.55, 0.27], [0.7, 0.43], [0.83, 0.64], [0.915, 0.86], [0.952, 1.02], [0.958, 1.14]];

const N = 700;
function lut(pts: [number, number][]) {
  const c = new THREE.CatmullRomCurve3(pts.map(([r, y]) => new THREE.Vector3(r, y, 0)), false, 'centripetal');
  const sp = c.getSpacedPoints(N - 1);
  const r = new Float32Array(N), y = new Float32Array(N), nr = new Float32Array(N), ny = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    r[i] = sp[i].x; y[i] = sp[i].y;
    const a = sp[Math.max(0, i - 1)], b = sp[Math.min(N - 1, i + 1)];
    const dr = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dr, dy) || 1;
    nr[i] = dy / l; ny[i] = -dr / l;
  }
  r[0] = 0;
  return { r, y, nr, ny };
}
const LO = lut(OUT), LI = lut(INN);

type V = [number, number, number];
function prof(L: ReturnType<typeof lut>, w: number) {
  const f = Math.min(N - 1.0001, Math.max(0, w * (N - 1))), i = Math.floor(f), t = f - i;
  return [L.r[i] + (L.r[i + 1] - L.r[i]) * t, L.y[i] + (L.y[i + 1] - L.y[i]) * t, L.nr[i] + (L.nr[i + 1] - L.nr[i]) * t, L.ny[i] + (L.ny[i + 1] - L.ny[i]) * t];
}
/** A point on the outer (side 0) or inner (side 1) glaze, with its normal. */
function surf(th: number, w: number, side: 0 | 1): [V, V] {
  const [r, y, nr, ny] = prof(side ? LI : LO, w);
  const c = Math.cos(th), s = Math.sin(th);
  const k = side ? -1 : 1;
  return [[r * c, y, r * s], [k * nr * c, k * ny, k * nr * s]];
}
/** The middle of the wall: the coordinate both the cut and the gold are measured in. */
export function mid(th: number, w: number): V {
  const o = prof(LO, w), i = prof(LI, w), r = (o[0] + i[0]) / 2, y = (o[1] + i[1]) / 2;
  return [r * Math.cos(th), y, r * Math.sin(th)];
}

/** The crack's wander. Mirrored exactly in the shader (see Bowl.tsx). */
export function warp(p: V, k: number): V {
  const [x, y, z] = p;
  return [
    x + 0.075 * Math.sin(y * 5.1 + z * 3.3 + k * 1.3) + 0.02 * Math.sin(y * 23.0 + z * 17.0 + k) + 0.007 * Math.sin(y * 71.0 + z * 53.0 + k * 3.1),
    y + 0.075 * Math.sin(z * 4.7 + x * 5.9 + k * 2.1) + 0.02 * Math.sin(z * 21.0 + x * 19.0 + k * 1.9) + 0.007 * Math.sin(z * 67.0 + x * 59.0 + k * 2.3),
    z + 0.075 * Math.sin(x * 4.3 + y * 6.1 + k * 0.7) + 0.02 * Math.sin(x * 25.0 + y * 15.0 + k * 2.7) + 0.007 * Math.sin(x * 73.0 + y * 61.0 + k * 1.7),
  ];
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Seeds for fracture k: spread over the visible wall, a few close to the rim so it chips. */
export function seedsFor(k: number): V[] {
  const R = rng(9137 + k * 7919);
  const out: V[] = [];
  let tries = 0;
  while (out.length < SEEDS && tries < 4000) {
    tries++;
    const th = R() * Math.PI * 2, w = 0.12 + Math.pow(R(), 0.7) * 0.9;
    const p = warp(mid(th, Math.min(1, w)), k);
    const minD = tries > 2500 ? 0.2 : 0.42;
    if (out.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) > minD)) out.push(p);
  }
  return out;
}

export type Shard = { geo: THREE.BufferGeometry; c: THREE.Vector3; area: number };

const NT = 168, NW = 84;

/** Cut the bowl into pieces for fracture k. */
export function buildShards(k: number): Shard[] {
  const seeds = seedsFor(k);
  const nv = (NT + 1) * (NW + 1);
  const th = new Float32Array(nv), ww = new Float32Array(nv), lab = new Int16Array(nv), wp: V[] = new Array(nv);
  for (let j = 0; j <= NW; j++) for (let i = 0; i <= NT; i++) {
    const id = j * (NT + 1) + i, t = (i / NT) * Math.PI * 2, w = j / NW;
    th[id] = t; ww[id] = w;
    const q = warp(mid(t, w), k); wp[id] = q;
    let best = 1e9, bi = 0;
    for (let s = 0; s < seeds.length; s++) { const d = (q[0] - seeds[s][0]) ** 2 + (q[1] - seeds[s][1]) ** 2 + (q[2] - seeds[s][2]) ** 2; if (d < best) { best = d; bi = s; } }
    lab[id] = bi;
  }
  const dist = (q: V, s: number) => Math.hypot(q[0] - seeds[s][0], q[1] - seeds[s][1], q[2] - seeds[s][2]);
  type P = { t: number; w: number };
  const crossing = (a: number, b: number): P => {
    const lo = Math.min(a, b), hi = Math.max(a, b);
    const A = lab[lo], B = lab[hi];
    const ga = dist(wp[lo], A) - dist(wp[lo], B), gb = dist(wp[hi], A) - dist(wp[hi], B);
    const t = Math.min(1, Math.max(0, ga / (ga - gb || 1e-9)));
    // Keep theta continuous across the wrap column.
    let tl = th[lo], th2 = th[hi];
    if (Math.abs(th2 - tl) > Math.PI) { if (th2 < tl) th2 += Math.PI * 2; else tl += Math.PI * 2; }
    return { t: tl + (th2 - tl) * t, w: ww[lo] + (ww[hi] - ww[lo]) * t };
  };
  const pt = (id: number): P => ({ t: th[id], w: ww[id] });

  const buf = seeds.map(() => ({ p: [] as number[], n: [] as number[], m: [] as number[], s: [] as number[] }));
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Vector3();
  const tri = (L: number, a: [V, V], b: [V, V], c: [V, V], mA: V, mB: V, mC: V, side: number) => {
    tmpA.set(b[0][0] - a[0][0], b[0][1] - a[0][1], b[0][2] - a[0][2]);
    tmpB.set(c[0][0] - a[0][0], c[0][1] - a[0][1], c[0][2] - a[0][2]);
    tmpC.crossVectors(tmpA, tmpB);
    const nx = a[1][0] + b[1][0] + c[1][0], ny = a[1][1] + b[1][1] + c[1][1], nz = a[1][2] + b[1][2] + c[1][2];
    if (tmpC.x * nx + tmpC.y * ny + tmpC.z * nz < 0) { [b, c] = [c, b]; [mB, mC] = [mC, mB]; }
    const B = buf[L];
    for (const [v, m] of [[a, mA], [b, mB], [c, mC]] as [[V, V], V][]) { B.p.push(...v[0]); B.n.push(...v[1]); B.m.push(...m); B.s.push(side); }
  };
  const flatQuad = (L: number, p0: V, p1: V, p2: V, p3: V, out: V, m0: V, m1: V, side: number) => {
    tmpA.set(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
    tmpB.set(p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]);
    tmpC.crossVectors(tmpA, tmpB).normalize();
    if (tmpC.x * out[0] + tmpC.y * out[1] + tmpC.z * out[2] < 0) tmpC.negate();
    const n: V = [tmpC.x, tmpC.y, tmpC.z];
    tri(L, [p0, n], [p1, n], [p2, n], m0, m1, m1, side);
    tri(L, [p0, n], [p2, n], [p3, n], m0, m1, m0, side);
  };
  const T2 = (p: P) => p.t;

  const emitPoly = (L: number, poly: P[]) => {
    const O = poly.map((p) => surf(p.t, p.w, 0)), I = poly.map((p) => surf(p.t, p.w, 1)), M = poly.map((p) => mid(p.t, p.w));
    for (let q = 1; q < poly.length - 1; q++) {
      tri(L, O[0], O[q], O[q + 1], M[0], M[q], M[q + 1], 0);
      tri(L, I[0], I[q], I[q + 1], M[0], M[q], M[q + 1], 0);
    }
    // The rim: a rounded lip over any edge that runs along the top.
    for (let q = 0; q < poly.length; q++) {
      const a = poly[q], b = poly[(q + 1) % poly.length];
      if (a.w > 0.9999 && b.w > 0.9999) rim(L, a, b);
    }
  };
  const SEG = 6;
  const lip = (p: P, a: number): [V, V] => {
    const o = surf(p.t, 1, 0)[0], i = surf(p.t, 1, 1)[0];
    const mx = (o[0] + i[0]) / 2, my = (o[1] + i[1]) / 2, mz = (o[2] + i[2]) / 2;
    const hx = (o[0] - i[0]) / 2, hz = (o[2] - i[2]) / 2, hl = Math.hypot(hx, hz) || 1;
    const c = -Math.cos(a), s = Math.sin(a), up = hl * 1.05;
    return [[mx + hx * c, my + up * s, mz + hz * c], [(hx / hl) * c, s, (hz / hl) * c]];
  };
  const rim = (L: number, a: P, b: P) => {
    const ma = mid(a.t, 1), mb = mid(b.t, 1);
    for (let s = 0; s < SEG; s++) {
      const a0 = (s / SEG) * Math.PI, a1 = ((s + 1) / SEG) * Math.PI;
      const A0 = lip(a, a0), A1 = lip(a, a1), B0 = lip(b, a0), B1 = lip(b, a1);
      tri(L, A0, B0, B1, ma, mb, mb, 0);
      tri(L, A0, B1, A1, ma, mb, ma, 0);
    }
  };
  const wall = (L: number, p: P, q: P, inside: P) => {
    const o1 = surf(p.t, p.w, 0)[0], o2 = surf(q.t, q.w, 0)[0], i1 = surf(p.t, p.w, 1)[0], i2 = surf(q.t, q.w, 1)[0];
    const mt = (p.t + q.t) / 2, mw = (p.w + q.w) / 2;
    const a = mid(mt, mw), b = mid(mt + (mt - inside.t) * 0.1, Math.min(1, Math.max(0, mw + (mw - inside.w) * 0.1)));
    const out: V = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    flatQuad(L, o1, o2, i2, i1, out, mid(p.t, p.w), mid(q.t, q.w), 1);
  };

  const triangle = (ids: [number, number, number]) => {
    const L = ids.map((x) => lab[x]);
    if (L[0] === L[1] && L[1] === L[2]) { emitPoly(L[0], ids.map(pt)); return; }
    const three = L[0] !== L[1] && L[1] !== L[2] && L[0] !== L[2];
    const P3 = ids.map(pt);
    // Unwrap theta inside this triangle.
    const base = P3[0].t;
    for (const p of P3) if (Math.abs(p.t - base) > Math.PI) p.t += p.t < base ? Math.PI * 2 : -Math.PI * 2;
    const cr = (x: number, y: number) => { const c = crossing(ids[x], ids[y]); while (c.t - base > Math.PI) c.t -= Math.PI * 2; while (base - c.t > Math.PI) c.t += Math.PI * 2; return c; };
    const E = [cr(0, 1), cr(1, 2), cr(2, 0)];
    if (three) {
      const m: P = { t: (P3[0].t + P3[1].t + P3[2].t) / 3, w: (P3[0].w + P3[1].w + P3[2].w) / 3 };
      for (let v = 0; v < 3; v++) {
        const prev = (v + 2) % 3;
        emitPoly(L[v], [P3[v], E[v], m, E[prev]]);
        wall(L[v], E[v], m, P3[v]); wall(L[v], m, E[prev], P3[v]);
      }
      return;
    }
    const used = new Set<number>();
    for (let v = 0; v < 3; v++) {
      const me = L[v]; if (used.has(me)) continue; used.add(me);
      const poly: P[] = []; const cut: P[] = [];
      for (let e = 0; e < 3; e++) {
        const a = e, b = (e + 1) % 3;
        if (L[a] === me) poly.push(P3[a]);
        if (L[a] !== L[b] && (L[a] === me || L[b] === me)) { poly.push(E[e]); cut.push(E[e]); }
      }
      emitPoly(me, poly);
      if (cut.length === 2) wall(me, cut[0], cut[1], P3[v]);
    }
  };

  for (let j = 0; j < NW; j++) for (let i = 0; i < NT; i++) {
    const a = j * (NT + 1) + i, b = a + 1, c = a + NT + 2, d = a + NT + 1;
    triangle([a, b, c]); triangle([a, c, d]);
  }
  void T2;

  const shards: Shard[] = [];
  buf.forEach((B) => {
    if (B.p.length < 9) return;
    const pos = new Float32Array(B.p), m = new Float32Array(B.m);
    const c = new THREE.Vector3(); let n = 0;
    for (let i = 0; i < m.length; i += 3) { c.x += m[i]; c.y += m[i + 1]; c.z += m[i + 2]; n++; }
    c.divideScalar(n);
    for (let i = 0; i < pos.length; i += 3) { pos[i] -= c.x; pos[i + 1] -= c.y; pos[i + 2] -= c.z; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(B.n), 3));
    g.setAttribute('aMid', new THREE.BufferAttribute(m, 3));
    g.setAttribute('aSide', new THREE.BufferAttribute(new Float32Array(B.s), 1));
    g.computeBoundingSphere();
    shards.push({ geo: g, c, area: n });
  });
  return shards;
}
