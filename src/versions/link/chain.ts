// The chain as a position-based (verlet) simulation. Particles sit at the joints
// where two links hook through each other; link k spans joint a[k] to joint b[k].
// Nineteen links make the question mark, one loose link is the dot.

export const PITCH = 1; // joint to joint
export const WIRE = 0.125; // wire radius
export const BEND = 0.33; // end radius of the link's centreline
export const STRAIGHT = PITCH / 2 - BEND + WIRE; // half length of the straight sides
export const N = 19; // links in the chain
export const LINKS = N + 1; // plus the dot
export const H0 = (BEND + WIRE - WIRE) * Math.SQRT1_2 + WIRE; // joint height when a link lies tilted 45 degrees
const DOT_A = N + 1, DOT_B = N + 2, SPARE = N + 3, COUNT = N + 4;
const G = 46, STEP = 1 / 120, ITER = 10, NEAR = 0.6;

export type V3 = [number, number, number];

/* ─────────────── the question mark, laid out as joints on the floor ─────────────── */

function qPath(scale: number): [number, number][] {
  // In page units: x right, y up. A hook arc, a bend into the stem, then down.
  const pts: [number, number][] = [];
  const cx = 0, cy = 4.15, R = 2.65;
  const a0 = (205 * Math.PI) / 180, a1 = (-48 * Math.PI) / 180;
  for (let i = 0; i <= 160; i++) { const a = a0 + (a1 - a0) * (i / 160); pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
  const p0 = pts[pts.length - 1];
  const c1: [number, number] = [p0[0] - 1.05, p0[1] - 0.95], p2: [number, number] = [0, 0.55];
  for (let i = 1; i <= 60; i++) {
    const t = i / 60, u = 1 - t;
    pts.push([u * u * p0[0] + 2 * u * t * c1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * c1[1] + t * t * p2[1]]);
  }
  for (let i = 1; i <= 40; i++) pts.push([0, 0.55 - (i / 40) * 1.3]);
  return pts.map(([x, y]) => [x * scale, y * scale]);
}

/** Walk the path in chords of one pitch. */
function chordWalk(path: [number, number][], n: number) {
  const out: [number, number][] = [path[0]];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const [px, py] = out[out.length - 1];
    let found = false;
    for (; j < path.length - 1; j++) {
      const [x1, y1] = path[j + 1];
      if (Math.hypot(x1 - px, y1 - py) >= PITCH) {
        const [x0, y0] = path[j];
        // bisect between j and j+1
        let lo = 0, hi = 1;
        for (let s = 0; s < 24; s++) { const m = (lo + hi) / 2; const x = x0 + (x1 - x0) * m, y = y0 + (y1 - y0) * m; if (Math.hypot(x - px, y - py) < PITCH) lo = m; else hi = m; }
        out.push([x0 + (x1 - x0) * lo, y0 + (y1 - y0) * lo]);
        found = true; break;
      }
    }
    if (!found) return null;
  }
  return out;
}

/** Home positions (world x, z) for all particles, centred on the origin. */
export function layout() {
  let lo = 0.8, hi = 2;
  let best = chordWalk(qPath(hi), N)!;
  for (let s = 0; s < 30; s++) {
    const m = (lo + hi) / 2, w = chordWalk(qPath(m), N);
    if (w) { best = w; hi = m; } else lo = m;
  }
  const scale = hi;
  const pts = best.map(([x, y]) => [x, -y] as [number, number]);
  const end = pts[N];
  const dotZ = end[1] + 1.75 * scale * 0.82;
  pts.push([-PITCH / 2, dotZ], [PITCH / 2, dotZ]);
  // Centre the whole mark.
  let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  for (const [x, z] of pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  const ox = (minX + maxX) / 2, oz = (minZ + maxZ) / 2;
  const home = pts.map(([x, z]) => [x - ox, z - oz] as [number, number]);
  return { home, w: maxX - minX + 1.1, h: maxZ - minZ + 1.1, dot: [-ox, dotZ - oz] as [number, number] };
}

export const LAY = layout();

/* ─────────────── the simulation ─────────────── */

export class Chain {
  x = new Float32Array(COUNT * 3);
  p = new Float32Array(COUNT * 3);
  w = new Float32Array(COUNT); // inverse mass
  a = new Int16Array(LINKS);
  b = new Int16Array(LINKS);
  opened = -1; // the link that is open, or -1
  heap: { x: number; z: number; t: number } | null = null;
  openT = 0;
  rejoin = false;
  hook: V3 | null = null; // target for joint 0
  hookAt: V3 = [0, 0, 0];
  drag: { i: number; t: V3 } | null = null;
  homeK = 0; // pull toward the question mark, on the paper only
  wallZ = -9;
  acc = 0;
  t = 0;

  constructor() {
    for (let k = 0; k < N; k++) { this.a[k] = k; this.b[k] = k + 1; }
    this.a[N] = DOT_A; this.b[N] = DOT_B;
    this.reset();
  }

  reset() {
    for (let i = 0; i < COUNT; i++) {
      const h = LAY.home[Math.min(i, LAY.home.length - 1)];
      this.set(i, h[0], H0, h[1]);
      this.w[i] = 1;
    }
    this.set(SPARE, 0, -50, 0); this.w[SPARE] = 0;
    this.opened = -1; this.rejoin = false;
    for (let k = 0; k < N; k++) this.b[k] = k + 1;
  }

  set(i: number, x: number, y: number, z: number) {
    this.x[i * 3] = this.p[i * 3] = x; this.x[i * 3 + 1] = this.p[i * 3 + 1] = y; this.x[i * 3 + 2] = this.p[i * 3 + 2] = z;
  }
  get(i: number, o: V3 = [0, 0, 0]): V3 { o[0] = this.x[i * 3]; o[1] = this.x[i * 3 + 1]; o[2] = this.x[i * 3 + 2]; return o; }

  /** Drop the dot from above, for the opening. */
  dropDot(h: number) {
    for (const i of [DOT_A, DOT_B]) { this.x[i * 3 + 1] = this.p[i * 3 + 1] = H0 + h; }
  }

  /** Open link k: whatever hangs after it is let go. */
  open(k: number) {
    if (this.opened >= 0 || k < 0) return false;
    if (k >= N) {
      // The dot has nothing after it. It hops.
      for (const i of [DOT_A, DOT_B]) this.p[i * 3 + 1] = this.x[i * 3 + 1] - 0.09;
      return false;
    }
    const j = k + 1;
    this.set(SPARE, this.x[j * 3], this.x[j * 3 + 1], this.x[j * 3 + 2]);
    this.w[SPARE] = 1;
    this.b[k] = SPARE;
    this.opened = k; this.openT = 0; this.rejoin = false;
    // On the paper, the freed part jumps and heaps; in the air, it simply falls.
    let cx = 0, cz = 0, n = 0;
    for (let i = j; i <= N; i++) { cx += this.x[i * 3]; cz += this.x[i * 3 + 2]; n++; }
    cx /= n; cz /= n;
    const grounded = this.x[j * 3 + 1] < H0 + 0.3;
    this.heap = grounded ? { x: cx * 0.6 + this.x[j * 3] * 0.4, z: cz * 0.6 + this.x[j * 3 + 2] * 0.4, t: 0.9 } : null;
    for (let i = j; i <= N; i++) {
      const low = this.x[i * 3 + 1] < H0 + 0.2;
      const r = Math.sin(i * 12.9898) * 0.5 + 0.5;
      const kick = low ? 0.05 + r * 0.06 : 0.0;
      this.p[i * 3 + 1] = this.x[i * 3 + 1] - kick;
      this.p[i * 3] = this.x[i * 3] - (cx - this.x[i * 3]) * (low ? 0.018 : 0);
      this.p[i * 3 + 2] = this.x[i * 3 + 2] - (cz - this.x[i * 3 + 2]) * (low ? 0.018 : 0);
    }
    return true;
  }

  update(dt: number) {
    this.acc = Math.min(this.acc + dt, STEP * 14);
    while (this.acc >= STEP) { this.step(); this.acc -= STEP; }
  }

  step() {
    const { x, p, w } = this;
    this.t += STEP;
    if (this.opened >= 0) {
      this.openT += STEP;
      if (this.openT > 2.4) this.rejoin = true;
    }
    // a freed tail on the paper gathers into a heap
    if (this.heap && this.opened >= 0) {
      const hp = this.heap;
      hp.t -= STEP;
      if (hp.t <= 0) this.heap = null;
      else for (let i = this.opened + 1; i <= N; i++) {
        const o = i * 3, r = 0.5 + 0.5 * Math.sin(i * 4.1);
        x[o] += (hp.x - x[o]) * 0.035 * r; x[o + 2] += (hp.z - x[o + 2]) * 0.035 * r;
        if (x[o + 1] < H0 + 0.05 && Math.sin(i * 7.3 + this.t * 9) > 0.6) x[o + 1] += 0.05;
      }
    }
    // integrate
    for (let i = 0; i < COUNT; i++) {
      if (!w[i]) continue;
      const o = i * 3;
      const grounded = x[o + 1] <= H0 + 0.02;
      const damp = grounded ? 0.86 : 0.995;
      for (let c = 0; c < 3; c++) {
        const v = (x[o + c] - p[o + c]) * (c === 1 ? 0.995 : damp);
        p[o + c] = x[o + c];
        x[o + c] += v + (c === 1 ? -G * STEP * STEP : 0);
      }
    }
    // the hook takes joint 0
    if (this.hook) {
      const h = this.hookAt;
      let dx = this.hook[0] - h[0], dy = this.hook[1] - h[1], dz = this.hook[2] - h[2];
      const d = Math.hypot(dx, dy, dz), cap = 0.1;
      if (d > cap) { dx *= cap / d; dy *= cap / d; dz *= cap / d; }
      h[0] += dx * 0.5; h[1] += dy * 0.5; h[2] += dz * 0.5;
      x[0] = h[0]; x[1] = h[1]; x[2] = h[2];
    } else {
      this.hookAt[0] = x[0]; this.hookAt[1] = x[1]; this.hookAt[2] = x[2];
    }
    // the rejoin: the freed joint is drawn back up to the open link's end
    const ok = this.opened;
    if (ok >= 0 && this.rejoin) {
      const j = ok + 1;
      let d = 0;
      for (let c = 0; c < 3; c++) { const e = x[SPARE * 3 + c] - x[j * 3 + c]; x[j * 3 + c] += e * 0.07; d += e * e; }
      if (Math.sqrt(d) < 0.04) {
        this.b[ok] = j; this.w[SPARE] = 0; this.set(SPARE, 0, -50, 0); this.opened = -1; this.rejoin = false;
      }
    }
    for (let it = 0; it < ITER; it++) {
      // drag: a soft hand on one joint
      if (this.drag) {
        const o = this.drag.i * 3, t = this.drag.t;
        for (let c = 0; c < 3; c++) x[o + c] += (t[c] - x[o + c]) * 0.22;
      }
      // links keep their length
      for (let k = 0; k < LINKS; k++) {
        const i = this.a[k], j = this.b[k];
        this.dist(i, j, PITCH, 1);
      }
      if (ok >= 0 && this.rejoin) { /* the joint is being carried */ }
      // links do not pass through each other (roughly: joints keep apart)
      for (let i = 0; i < COUNT; i++) {
        if (i === SPARE && !w[SPARE]) continue;
        for (let j = i + 2; j < COUNT; j++) {
          if (j === SPARE && !w[SPARE]) continue;
          if (j === i + 1) continue;
          if ((i === DOT_A && j === DOT_B)) continue;
          if (j === SPARE && (i === ok || i === ok + 1)) continue;
          const dx = x[j * 3] - x[i * 3], dy = x[j * 3 + 1] - x[i * 3 + 1], dz = x[j * 3 + 2] - x[i * 3 + 2];
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < NEAR * NEAR && d2 > 1e-8) this.dist(i, j, NEAR, 0.5);
        }
      }
      // pins
      if (this.hook) { x[0] = this.hookAt[0]; x[1] = this.hookAt[1]; x[2] = this.hookAt[2]; }
      // paper: floor with friction, and the sweep behind
      for (let i = 0; i < COUNT; i++) {
        if (!w[i]) continue;
        const o = i * 3;
        if (x[o + 1] < H0) {
          x[o + 1] = H0;
          // friction: the joint drags on the paper
          p[o] += (x[o] - p[o]) * 0.5; p[o + 2] += (x[o + 2] - p[o + 2]) * 0.5;
        }
        if (x[o + 2] < this.wallZ) x[o + 2] = this.wallZ;
      }
    }
    // the paper keeps the shape: grounded joints creep home
    if (this.homeK > 0) {
      const k = this.homeK;
      for (let i = 0; i < COUNT; i++) {
        if (!w[i] || i === SPARE) continue;
        if (this.drag && this.drag.i === i) continue;
        const o = i * 3;
        if (x[o + 1] > H0 + 0.5) continue;
        const h = LAY.home[i];
        x[o] += (h[0] - x[o]) * k; x[o + 2] += (h[1] - x[o + 2]) * k;
        p[o] += (h[0] - p[o]) * k; p[o + 2] += (h[1] - p[o + 2]) * k;
      }
    }
  }

  dist(i: number, j: number, L: number, mode: 0 | 0.5 | 1) {
    const { x, w } = this;
    let wi = w[i], wj = w[j];
    if (this.hook && i === 0) wi = 0;
    if (this.drag) { if (this.drag.i === i) wi *= 0.25; if (this.drag.i === j) wj *= 0.25; }
    if (this.rejoin && this.opened >= 0 && (i === this.opened + 1)) wi = 0;
    const sum = wi + wj;
    if (!sum) return;
    const dx = x[j * 3] - x[i * 3], dy = x[j * 3 + 1] - x[i * 3 + 1], dz = x[j * 3 + 2] - x[i * 3 + 2];
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
    if (mode === 0.5 && d >= L) return;
    const f = ((d - L) / d) * (mode === 0.5 ? 0.6 : 1);
    const ci = (wi / sum) * f, cj = (wj / sum) * f;
    x[i * 3] += dx * ci; x[i * 3 + 1] += dy * ci; x[i * 3 + 2] += dz * ci;
    x[j * 3] -= dx * cj; x[j * 3 + 1] -= dy * cj; x[j * 3 + 2] -= dz * cj;
  }

  /** Where the hook is for a lift amount u in 0..1 (0 lying, 1 hanging at the anchor). */
  static hookFor(u: number, anchor: V3): V3 {
    const s1 = 0.78;
    if (u <= s1) {
      const h = (u / s1) * (N + 1.2);
      const k = Math.min(h, N), i = Math.floor(k), f = k - i;
      const a = LAY.home[i], b = LAY.home[Math.min(i + 1, N)];
      return [a[0] + (b[0] - a[0]) * f, H0 + h, a[1] + (b[1] - a[1]) * f];
    }
    const t = (u - s1) / (1 - s1), e = t * t * (3 - 2 * t);
    const from = LAY.home[N], y0 = H0 + N + 1.2;
    return [from[0] + (anchor[0] - from[0]) * e, y0 + (anchor[1] - y0) * e, from[1] + (anchor[2] - from[1]) * e];
  }
}

export const IDX = { DOT_A, DOT_B, SPARE, COUNT };
