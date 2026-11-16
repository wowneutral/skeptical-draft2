// The sheet: a verlet grid on the CPU. It hangs on spheres laid along the
// question mark, rests on the plinth box and pools on the floor.

export type Sphere = { x: number; y: number; z: number; r: number };
export type Box = { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number };

/** Shared, mutable, read from the frame loop. Never drives a React render per frame. */
export const veil = {
  want: null as null | 'unveil' | 'cover' | 'draught',
  covered: true,
  busy: false,
  light: 0,
  /** The house light: 1 open, lower while the sealed drive is read. */
  house: 1,
  onCovered: null as null | ((c: boolean) => void),
};

export class Cloth {
  n: number;
  size: number;
  pos: Float32Array;
  prev: Float32Array;
  pin: Float32Array; // 0 free, else pull weight toward tgt
  tgt: Float32Array;
  cons: Int32Array;
  rest: Float32Array;
  spheres: Sphere[] = [];
  sb = { x0: 0, x1: 0, y0: 0, y1: 0, z0: 0, z1: 0 };
  box: Box;
  lift: Float32Array; // per-particle tiny floor offset so the pooled layers do not flicker
  iters: number;
  sleep = 0;
  /** Grip of silk on the stone: high while it rests, low while it is being pulled. */
  fric = 0.85;

  constructor(n: number, size: number, box: Box, iters = 6) {
    this.n = n; this.size = size; this.box = box; this.iters = iters;
    const N = n * n;
    this.pos = new Float32Array(N * 3);
    this.prev = new Float32Array(N * 3);
    this.pin = new Float32Array(N);
    this.tgt = new Float32Array(N * 3);
    this.lift = new Float32Array(N);
    for (let i = 0; i < N; i++) this.lift[i] = 0.004 + ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * 0.012;
    const c: number[] = [], r: number[] = [];
    const s = size / (n - 1);
    const add = (a: number, b: number, l: number) => { c.push(a, b); r.push(l); };
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const k = j * n + i;
      if (i < n - 1) add(k, k + 1, s);
      if (j < n - 1) add(k, k + n, s);
      if (i < n - 1 && j < n - 1) { add(k, k + n + 1, s * Math.SQRT2); add(k + 1, k + n, s * Math.SQRT2); }
      if (i < n - 2) add(k, k + 2, s * 2);
      if (j < n - 2) add(k, k + 2 * n, s * 2);
    }
    this.cons = new Int32Array(c);
    this.rest = new Float32Array(r);
  }

  setSpheres(sp: Sphere[]) {
    this.spheres = sp;
    const b = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, z0: Infinity, z1: -Infinity };
    for (const s of sp) {
      b.x0 = Math.min(b.x0, s.x - s.r); b.x1 = Math.max(b.x1, s.x + s.r);
      b.y0 = Math.min(b.y0, s.y - s.r); b.y1 = Math.max(b.y1, s.y + s.r);
      b.z0 = Math.min(b.z0, s.z - s.r); b.z1 = Math.max(b.z1, s.z + s.r);
    }
    this.sb = b;
    // Bucket the spheres on a coarse x/y grid so each particle checks only its neighbours.
    const C = 0.2;
    this.gx = Math.ceil((b.x1 - b.x0) / C) + 1; this.gy = Math.ceil((b.y1 - b.y0) / C) + 1;
    this.cells = Array.from({ length: this.gx * this.gy }, () => [] as number[]);
    sp.forEach((s, q) => {
      const cx = Math.floor((s.x - b.x0) / C), cy = Math.floor((s.y - b.y0) / C);
      for (let j = cy - 1; j <= cy + 1; j++) for (let i = cx - 1; i <= cx + 1; i++) {
        if (i >= 0 && j >= 0 && i < this.gx && j < this.gy) this.cells[j * this.gx + i].push(q);
      }
    });
  }
  gx = 0; gy = 0;
  cells: number[][] = [];

  /** Lay the sheet flat, centred at (cx, y, cz), turned by yaw. */
  layFlat(cx: number, y: number, cz: number, yaw: number) {
    const { n, size, pos, prev } = this;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const k = (j * n + i) * 3;
      const u = (i / (n - 1) - 0.5) * size, v = (j / (n - 1) - 0.5) * size;
      pos[k] = cx + u * cy - v * sy;
      pos[k + 1] = y + Math.sin(i * 0.7 + j * 0.3) * 0.004;
      pos[k + 2] = cz + u * sy + v * cy;
    }
    prev.set(pos);
    this.sleep = 0;
  }

  /** Where particle (i, j) would be in a flat sheet: used by the draught. */
  flatTarget(out: Float32Array, cx: number, y: number, cz: number, yaw: number, billow: number, t: number) {
    const { n, size } = this;
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const k = (j * n + i) * 3;
      const a = i / (n - 1), b = j / (n - 1);
      const u = (a - 0.5) * size * 0.94, v = (b - 0.5) * size * 0.94;
      out[k] = cx + u * cy - v * sy;
      out[k + 1] = y + billow * Math.sin(a * Math.PI) * Math.sin(b * Math.PI) + 0.06 * Math.sin(a * 6 + t * 5) * Math.sin(b * 5 - t * 3);
      out[k + 2] = cz + u * sy + v * cy;
    }
  }

  energy() {
    const { pos, prev } = this;
    let e = 0;
    for (let k = 0; k < pos.length; k++) { const d = pos[k] - prev[k]; e += d * d; }
    return e / (pos.length / 3);
  }

  step(dt: number) {
    const { pos, prev, pin, tgt, cons, rest } = this;
    const N = pos.length / 3;
    const g = -9.8 * dt * dt;
    const damp = 0.988;
    // Integrate.
    for (let p = 0; p < N; p++) {
      const k = p * 3;
      const x = pos[k], y = pos[k + 1], z = pos[k + 2];
      let vx = (x - prev[k]) * damp, vy = (y - prev[k + 1]) * damp, vz = (z - prev[k + 2]) * damp;
      // Air: the sheet is light, it drifts as it falls.
      vy = Math.max(vy, -0.11);
      prev[k] = x; prev[k + 1] = y; prev[k + 2] = z;
      pos[k] = x + vx; pos[k + 1] = y + vy + g; pos[k + 2] = z + vz;
      const w = pin[p];
      if (w > 0) {
        pos[k] += (tgt[k] - pos[k]) * w;
        pos[k + 1] += (tgt[k + 1] - pos[k + 1]) * w;
        pos[k + 2] += (tgt[k + 2] - pos[k + 2]) * w;
      }
    }
    // Satisfy lengths; collide twice along the way.
    const it = this.iters;
    for (let s = 0; s < it; s++) {
      for (let c = 0, m = rest.length; c < m; c++) {
        const a = cons[c * 2] * 3, b = cons[c * 2 + 1] * 3;
        const dx = pos[b] - pos[a], dy = pos[b + 1] - pos[a + 1], dz = pos[b + 2] - pos[a + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        const r = rest[c];
        // Silk barely stretches and barely resists compression (it folds instead).
        let f = (d - r) / d;
        if (f < 0) f *= 0.35;
        f *= 0.5;
        const wa = pin[a / 3] > 0.5 ? 0.15 : 1, wb = pin[b / 3] > 0.5 ? 0.15 : 1;
        const sa = (f * wa * 2) / (wa + wb), sb = (f * wb * 2) / (wa + wb);
        pos[a] += dx * sa; pos[a + 1] += dy * sa; pos[a + 2] += dz * sa;
        pos[b] -= dx * sb; pos[b + 1] -= dy * sb; pos[b + 2] -= dz * sb;
      }
      if (s === 1 || s === (it >> 1) + 1 || s === it - 1) this.collide();
    }
  }

  collide() {
    const { pos, prev, spheres, sb, box, lift } = this;
    const N = pos.length / 3;
    const m = 0.035;
    const fr = this.fric;
    for (let p = 0; p < N; p++) {
      const k = p * 3;
      let x = pos[k], y = pos[k + 1], z = pos[k + 2];
      // The stone: spheres along the mark.
      if (x > sb.x0 - m && x < sb.x1 + m && y > sb.y0 - m && y < sb.y1 + m && z > sb.z0 - m && z < sb.z1 + m) {
        const ci = Math.min(this.gx - 1, Math.max(0, Math.floor((x - sb.x0) / 0.2))), cj = Math.min(this.gy - 1, Math.max(0, Math.floor((y - sb.y0) / 0.2)));
        const cell = this.cells[cj * this.gx + ci];
        for (let h = 0; h < cell.length; h++) {
          const s = spheres[cell[h]];
          const dx = x - s.x, dy = y - s.y, dz = z - s.z;
          const rr = s.r + m;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < rr * rr) {
            const d = Math.sqrt(d2) || 1e-6;
            const push = (rr - d) / d;
            x += dx * push; y += dy * push; z += dz * push;
            // Grip: take back part of the slide along the surface since the last step.
            const nx = dx / d, ny = dy / d, nz = dz / d;
            const ux = x - prev[k], uy = y - prev[k + 1], uz = z - prev[k + 2];
            const un = ux * nx + uy * ny + uz * nz;
            x -= (ux - un * nx) * fr; y -= (uy - un * ny) * fr; z -= (uz - un * nz) * fr;
          }
        }
      }
      // The plinth.
      if (x > box.x0 - m && x < box.x1 + m && z > box.z0 - m && z < box.z1 + m && y < box.y1 + m && y > box.y0) {
        const dl = x - (box.x0 - m), dr = box.x1 + m - x, db = z - (box.z0 - m), df = box.z1 + m - z, dt = box.y1 + m - y;
        const mn = Math.min(dl, dr, db, df, dt);
        if (mn === dt) { y = box.y1 + m; prev[k] += (x - prev[k]) * 0.3; prev[k + 2] += (z - prev[k + 2]) * 0.3; }
        else if (mn === dl) x = box.x0 - m;
        else if (mn === dr) x = box.x1 + m;
        else if (mn === db) z = box.z0 - m;
        else z = box.z1 + m;
      }
      // The floor: silk pools and holds.
      const fy = lift[p];
      if (y < fy) { y = fy; prev[k] += (x - prev[k]) * 0.55; prev[k + 2] += (z - prev[k + 2]) * 0.55; prev[k + 1] = y; }
      pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
    }
  }

  /** How much of the sheet is up off the floor around the stone. */
  coverage(top: number) {
    const { pos } = this;
    const N = pos.length / 3;
    let up = 0;
    for (let p = 0; p < N; p += 3) {
      const k = p * 3;
      if (pos[k + 1] > top * 0.45 && Math.abs(pos[k]) < 1.4 && Math.abs(pos[k + 2]) < 1.4) up++;
    }
    return up / Math.ceil(N / 3);
  }
}
