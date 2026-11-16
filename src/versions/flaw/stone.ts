// The face of the stone, drawn on three canvases: colour (veins, fracture dust),
// normal (each crack is a tiny V groove, so it reads in the reflection) and
// roughness (a fracture is matte where the polish has broken).
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

/** Face coordinates are authored on a 2048 by 1024 sheet; the canvas may be smaller. */
export const FW = 2048, FH = 1024;

type Seg = { ax: number; ay: number; bx: number; by: number; w: number };
type Run = { segs: Seg[]; cum: number[]; len: number; pos: number; painted: number; speed: number; branches: { at: number; run: Run }[]; live: boolean; authored?: boolean };

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

function makeRun(pts: { x: number; y: number; w: number }[], speed: number): Run {
  const segs: Seg[] = [], cum: number[] = [];
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    segs.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, w: (a.w + b.w) / 2 });
    L += Math.hypot(b.x - a.x, b.y - a.y);
    cum.push(L);
  }
  return { segs, cum, len: L, pos: 0, painted: 0, speed, branches: [], live: true };
}

/** A wandering fracture from (x, y): short straight steps, each turned a little. */
function walk(r: () => number, x: number, y: number, ang: number, len: number, w0: number, w1: number, wob = 0.42) {
  const pts = [{ x, y, w: w0 }];
  let d = 0, bias = (r() - 0.5) * 0.05;
  while (d < len) {
    const step = 6 + r() * 7;
    ang += (r() - 0.5) * wob + bias;
    x += Math.cos(ang) * step; y += Math.sin(ang) * step; d += step;
    if (x < 14 || x > FW - 14 || y < 14 || y > FH - 14) break;
    pts.push({ x, y, w: w0 + (w1 - w0) * Math.min(1, d / len) });
  }
  return pts;
}

/** The authored crack: a question mark as a fracture line, with a few spurs off it. */
function authoredPath(): { pts: { x: number; y: number; w: number }[]; spurs: { at: number; ang: number; len: number }[] } {
  const C = [[812, 418], [826, 300], [900, 214], [1010, 176], [1126, 196], [1206, 262], [1222, 352], [1180, 438], [1100, 500], [1040, 560], [1018, 640], [1020, 728]];
  // Catmull-Rom through the control points, sampled every few pixels.
  const raw: { x: number; y: number }[] = [];
  for (let i = 0; i < C.length - 1; i++) {
    const p0 = C[Math.max(0, i - 1)], p1 = C[i], p2 = C[i + 1], p3 = C[Math.min(C.length - 1, i + 2)];
    const n = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 9);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      raw.push({ x: f(p0[0], p1[0], p2[0], p3[0]), y: f(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  raw.push({ x: C[C.length - 1][0], y: C[C.length - 1][1] });
  const nz = createNoise2D(rng(51));
  const r = rng(7);
  const pts = raw.map((p, i) => {
    const a = raw[Math.max(0, i - 1)], b = raw[Math.min(raw.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    const off = nz(i * 0.09, 0) * 9 + nz(i * 0.45, 3) * 3.2 + (r() - 0.5) * 2.2;
    const t = i / (raw.length - 1);
    return { x: p.x - (dy / l) * off, y: p.y + (dx / l) * off, w: 4.6 - t * 0.9 };
  });
  const spurs = [0.06, 0.19, 0.33, 0.47, 0.6, 0.74, 0.88].map((t, i) => ({ at: t, ang: (i % 2 ? 1 : -1) * (0.55 + r() * 0.5), len: 34 + r() * 80 }));
  return { pts, spurs };
}

export const DOT = { x: 1024, y: 850, r: 56 };

export class Stone {
  S: number;
  color: HTMLCanvasElement; normal: HTMLCanvasElement; rough: HTMLCanvasElement;
  cc: CanvasRenderingContext2D; nc: CanvasRenderingContext2D; rc: CanvasRenderingContext2D;
  tColor: THREE.CanvasTexture; tNormal: THREE.CanvasTexture; tRough: THREE.CanvasTexture;
  runs: Run[] = [];
  mark: Run;
  chipped = false;
  dirty = false;
  seed = 1;
  onChip: (() => void) | null = null;

  constructor(width: number) {
    this.S = width / FW;
    const mk = () => { const c = document.createElement('canvas'); c.width = width; c.height = Math.round(width / 2); return c; };
    this.color = mk(); this.normal = mk(); this.rough = mk();
    this.cc = this.color.getContext('2d')!; this.nc = this.normal.getContext('2d')!; this.rc = this.rough.getContext('2d')!;
    for (const c of [this.cc, this.nc, this.rc]) c.setTransform(this.S, 0, 0, this.S, 0, 0);
    this.ground();
    this.tColor = new THREE.CanvasTexture(this.color); this.tColor.colorSpace = THREE.SRGBColorSpace;
    this.tNormal = new THREE.CanvasTexture(this.normal);
    this.tRough = new THREE.CanvasTexture(this.rough);
    for (const t of [this.tColor, this.tNormal, this.tRough]) { t.anisotropy = 8; t.generateMipmaps = true; }
    const a = authoredPath();
    this.mark = makeRun(a.pts, 900);
    this.mark.authored = true;
    const r = rng(23);
    for (const s of a.spurs) {
      const i = Math.floor(s.at * (a.pts.length - 2)), p = a.pts[i], q = a.pts[i + 1];
      const base = Math.atan2(q.y - p.y, q.x - p.x);
      const run = makeRun(walk(r, p.x, p.y, base + s.ang, s.len, 2.2, 0.5, 0.5), 1300);
      this.mark.branches.push({ at: this.mark.cum[Math.max(0, i - 1)] ?? 0, run });
    }
  }

  /** Polished black stone: near-black, with very fine grey veins. */
  ground() {
    const { cc, nc, rc } = this;
    cc.fillStyle = '#0b0b0c'; cc.fillRect(0, 0, FW, FH);
    nc.fillStyle = 'rgb(128,128,255)'; nc.fillRect(0, 0, FW, FH);
    rc.fillStyle = 'rgb(9,9,9)'; rc.fillRect(0, 0, FW, FH);
    const r = rng(1729), nz = createNoise2D(rng(3));
    // Faint mottling in the polish, so the reflection is not a perfect mirror.
    for (let i = 0; i < 2600; i++) {
      const x = r() * FW, y = r() * FH, v = 7 + Math.floor(r() * 8);
      rc.fillStyle = `rgb(${v},${v},${v})`; rc.fillRect(x, y, 2 + r() * 6, 1 + r() * 3);
    }
    cc.lineCap = 'round'; rc.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      let x = r() * FW, y = r() * FH, ang = -0.35 + (r() - 0.5) * 0.9;
      const len = 500 + r() * 1700, a = 0.035 + r() * 0.09, w = 0.5 + r() * 1.1;
      cc.strokeStyle = `rgba(178,176,170,${a})`; cc.lineWidth = w;
      rc.strokeStyle = 'rgba(40,40,40,0.5)'; rc.lineWidth = w + 1;
      cc.beginPath(); cc.moveTo(x, y); rc.beginPath(); rc.moveTo(x, y);
      for (let d = 0; d < len; d += 8) {
        ang += nz(x * 0.003 + i, y * 0.003) * 0.16;
        x += Math.cos(ang) * 8; y += Math.sin(ang) * 8;
        cc.lineTo(x, y); rc.lineTo(x, y);
        if (r() < 0.006) { cc.stroke(); cc.lineWidth = Math.max(0.35, cc.lineWidth * 0.7); cc.beginPath(); cc.moveTo(x, y); }
      }
      cc.stroke(); rc.stroke();
    }
    cc.lineCap = 'round'; nc.lineCap = 'round'; rc.lineCap = 'round';
  }

  /** One segment of fracture: a lit wall and a shadowed wall, matte at the bottom. */
  paint(s: Seg, deep: number) {
    const { cc, nc, rc } = this;
    const dx = s.bx - s.ax, dy = s.by - s.ay, l = Math.hypot(dx, dy) || 1;
    const px = -dy / l, py = dx / l; // across the crack, in canvas space
    const tx = px, ty = -py;          // the same, in the normal map's space (v runs up)
    const k = Math.min(0.9, 0.62 + deep * 0.08), z = Math.round(128 + 127 * Math.sqrt(1 - k * k));
    const o = s.w * 0.36;
    const wall = (sgn: number) => {
      nc.strokeStyle = `rgb(${Math.round(128 - 127 * k * tx * sgn)},${Math.round(128 - 127 * k * ty * sgn)},${z})`;
      nc.lineWidth = s.w * 0.62;
      nc.beginPath(); nc.moveTo(s.ax + px * o * sgn, s.ay + py * o * sgn); nc.lineTo(s.bx + px * o * sgn, s.by + py * o * sgn); nc.stroke();
    };
    wall(1); wall(-1);
    rc.strokeStyle = 'rgb(150,150,150)'; rc.lineWidth = s.w * 1.25;
    rc.beginPath(); rc.moveTo(s.ax, s.ay); rc.lineTo(s.bx, s.by); rc.stroke();
    cc.strokeStyle = `rgba(150,146,138,${0.32 + deep * 0.1})`; cc.lineWidth = Math.max(0.6, s.w * 0.32);
    cc.beginPath(); cc.moveTo(s.ax, s.ay); cc.lineTo(s.bx, s.by); cc.stroke();
  }

  advance(run: Run, dt: number) {
    if (!run.authored) run.pos = Math.min(run.len, run.pos + run.speed * dt);
    while (run.painted < run.segs.length && run.cum[run.painted] <= run.pos + 0.01) {
      this.paint(run.segs[run.painted], run.authored ? 1 : 0); run.painted++; this.dirty = true;
    }
    for (const b of run.branches) if (run.pos >= b.at) this.advance(b.run, dt);
    if (run.painted >= run.segs.length && run.branches.every((b) => !b.run.live)) run.live = false;
  }

  /** Press the face at (u, v): a hairline runs from there, branches once or twice, and stops. */
  strike(u: number, v: number, instant = false) {
    const x = u * FW, y = (1 - v) * FH;
    const r = rng(++this.seed * 7919 + Math.floor(x * 13 + y));
    const ang = r() * Math.PI * 2, len = 150 + r() * 260;
    const main = makeRun(walk(r, x, y, ang, len, 3.0, 0.7), 1500 + r() * 600);
    const back = makeRun(walk(r, x, y, ang + Math.PI + (r() - 0.5) * 0.8, len * (0.25 + r() * 0.3), 2.4, 0.6), 1200);
    const nb = 1 + Math.floor(r() * 2);
    for (let i = 0; i < nb; i++) {
      const t = 0.25 + r() * 0.45, j = Math.max(1, Math.floor(t * (main.segs.length - 1)));
      const s = main.segs[j]; if (!s) continue;
      const base = Math.atan2(s.by - s.ay, s.bx - s.ax) + (r() < 0.5 ? -1 : 1) * (0.45 + r() * 0.5);
      main.branches.push({ at: main.cum[j - 1], run: makeRun(walk(r, s.ax, s.ay, base, len * (0.28 + r() * 0.3), s.w * 0.8, 0.5), 1300) });
    }
    // The point of impact: a few very short ticks.
    for (let i = 0; i < 4; i++) {
      const a = r() * Math.PI * 2, l = 5 + r() * 9;
      this.paint({ ax: x, ay: y, bx: x + Math.cos(a) * l, by: y + Math.sin(a) * l, w: 1.4 }, 0);
    }
    this.dirty = true;
    for (const run of [main, back]) {
      if (instant) { run.pos = run.len; this.finish(run); } else this.runs.push(run);
    }
  }

  finish(run: Run) {
    run.pos = run.len;
    this.advance(run, 0);
    for (const b of run.branches) { if (b.run.authored) continue; b.run.pos = b.run.len; this.finish(b.run); }
  }

  /** How far the authored crack should have run, 0 to 1. It never heals. */
  setMark(goal: number, chip: boolean, dt: number, instant = false) {
    const m = this.mark, target = Math.min(1, goal) * m.len;
    if (target > m.pos) m.pos = instant ? target : Math.min(target, m.pos + Math.max(260, (target - m.pos) * 4) * dt);
    this.advance(m, dt);
    if (instant) for (const b of m.branches) if (m.pos >= b.at) this.finish(b.run);
    if (chip && !this.chipped && m.pos >= m.len - 0.5) this.chip();
  }

  /** The dot: a shallow conchoidal chip with a rough, matte floor. */
  chip() {
    this.chipped = true;
    const S = this.S, cx = DOT.x * S, cy = DOT.y * S, R = DOT.r * S;
    const r = rng(99), nz = createNoise2D(rng(5));
    const rim: number[] = []; for (let i = 0; i < 24; i++) rim.push(0.78 + r() * 0.3);
    const rr = (a: number) => { const t = ((a / (Math.PI * 2)) % 1 + 1) % 1 * 24, i = Math.floor(t), f = t - i; return rim[i % 24] * (1 - f) + rim[(i + 1) % 24] * f; };
    const x0 = Math.floor(cx - R * 1.2), y0 = Math.floor(cy - R * 1.2), n = Math.ceil(R * 2.4);
    const N = this.nc.getImageData(x0, y0, n, n), Cc = this.cc.getImageData(x0, y0, n, n), Rg = this.rc.getImageData(x0, y0, n, n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const dx = x0 + i - cx, dy = y0 + j - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx), s = d / (R * rr(a));
      if (s > 1) continue;
      const o = (j * n + i) * 4;
      // Slopes down toward the middle, steeper at the rim, faceted by noise.
      const k = Math.min(0.85, 0.25 + 0.6 * Math.pow(s, 2.2)) ;
      let nx = -(dx / (d || 1)) * k + nz(i * 0.09 / S, j * 0.09 / S) * 0.22, ny = (dy / (d || 1)) * k + nz(j * 0.09 / S + 9, i * 0.09 / S) * 0.22;
      const nzv = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny)); const l = Math.hypot(nx, ny, nzv); nx /= l; ny /= l;
      N.data[o] = 128 + 127 * nx; N.data[o + 1] = 128 + 127 * ny; N.data[o + 2] = 128 + 127 * (nzv / l);
      const g = 46 + nz(i * 0.3 / S, j * 0.3 / S) * 10 + r() * 14;
      Cc.data[o] = g; Cc.data[o + 1] = g - 1; Cc.data[o + 2] = g - 4;
      const ro = 170 + r() * 50; Rg.data[o] = Rg.data[o + 1] = Rg.data[o + 2] = ro;
    }
    this.nc.putImageData(N, x0, y0); this.cc.putImageData(Cc, x0, y0); this.rc.putImageData(Rg, x0, y0);
    // Hairlines from the rim.
    for (let i = 0; i < 5; i++) {
      const a = r() * Math.PI * 2, R0 = DOT.r * rr(a);
      const run = makeRun(walk(r, DOT.x + Math.cos(a) * R0, DOT.y + Math.sin(a) * R0, a, 18 + r() * 40, 1.8, 0.5, 0.6), 900);
      this.runs.push(run);
    }
    this.dirty = true;
    this.onChip?.();
  }

  tick(dt: number) {
    for (const run of this.runs) if (run.live) this.advance(run, dt);
    this.runs = this.runs.filter((r) => r.live);
    if (this.dirty) {
      this.dirty = false;
      this.tColor.needsUpdate = true; this.tNormal.needsUpdate = true; this.tRough.needsUpdate = true;
      return true;
    }
    return false;
  }
}
