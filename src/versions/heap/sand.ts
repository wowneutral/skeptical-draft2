// The heap as a heightfield you can dig into, the grains that sit on it,
// and the textures that make it read as sand under a macro lens.
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

/** A tiny seeded random, so the heap is the same heap every visit. */
export function rng(seed = 7) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const N = 128;           // cells along each side
export const SIZE = 6.4;        // local units across
export const R = 2.5;           // radius of the base
export const H = 1.5;           // height: about 31 degrees, the angle sand rests at
const CELL = SIZE / (N - 1);
const REPOSE = Math.tan((35 * Math.PI) / 180) * CELL;

/** The perfect cone, with a soft tip and a soft toe. */
function cone(r: number) {
  const k = H / R, rt = 0.22;
  if (r < rt) return H - k * (rt / 2 + (r * r) / (2 * rt));
  if (r < R - rt) return H * (1 - r / R);
  if (r < R + rt) { const d = R + rt - r; return (k * d * d) / (4 * rt); }
  return 0;
}

export type Grain = { x: number; z: number; vx: number; vz: number; s: number; slide: number; rx: number; ry: number; rz: number; c: number };

export class Heap {
  h = new Float32Array(N * N);
  grains: Grain[] = [];
  /** frames left in which the sand is still moving */
  live = 0;
  /** bumped whenever the surface changes, so the mesh knows to rebuild */
  rev = 0;

  constructor(count: number) {
    const noise = createNoise2D(rng(11));
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = -SIZE / 2 + i * CELL, z = -SIZE / 2 + j * CELL, r = Math.hypot(x, z);
      const base = cone(r);
      const lump = base > 0 ? noise(x * 0.9, z * 0.9) * 0.035 * Math.min(1, base * 3) + noise(x * 3.1, z * 3.1) * 0.008 * Math.min(1, base * 6) : 0;
      this.h[j * N + i] = Math.max(0, base + lump);
    }
    const rand = rng(5);
    for (let n = 0; n < count; n++) {
      // Most grains on the slope, a few strays at the toe.
      const stray = rand() < 0.08;
      const r = stray ? R * (0.96 + rand() * 0.28) : R * Math.sqrt(rand()) * 0.99;
      const a = rand() * Math.PI * 2;
      const big = rand();
      this.grains.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, vx: 0, vz: 0, s: 0.008 + big * big * 0.016, slide: 0, rx: rand() * 6.28, ry: rand() * 6.28, rz: rand() * 6.28, c: rand() });
    }
  }

  at(x: number, z: number) {
    const fx = (x + SIZE / 2) / CELL, fz = (z + SIZE / 2) / CELL;
    const i = Math.max(0, Math.min(N - 2, Math.floor(fx))), j = Math.max(0, Math.min(N - 2, Math.floor(fz)));
    const u = Math.max(0, Math.min(1, fx - i)), v = Math.max(0, Math.min(1, fz - j));
    const a = this.h[j * N + i], b = this.h[j * N + i + 1], c = this.h[(j + 1) * N + i], d = this.h[(j + 1) * N + i + 1];
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  }

  grad(x: number, z: number, out: { x: number; z: number }) {
    const e = CELL;
    out.x = (this.at(x + e, z) - this.at(x - e, z)) / (2 * e);
    out.z = (this.at(x, z + e) - this.at(x, z - e)) / (2 * e);
    return out;
  }

  /** Brush the sand at (x, z) moving in direction (dx, dz): it comes off the slope, runs down and settles at the toe. */
  dig(x: number, z: number, dx: number, dz: number, amount = 1) {
    const rad = 0.26, ci = Math.round((x + SIZE / 2) / CELL), cj = Math.round((z + SIZE / 2) / CELL), span = Math.ceil((rad * 2) / CELL);
    let took = 0;
    for (let j = cj - span; j <= cj + span; j++) for (let i = ci - span; i <= ci + span; i++) {
      if (i < 1 || j < 1 || i > N - 2 || j > N - 2) continue;
      const px = -SIZE / 2 + i * CELL - x, pz = -SIZE / 2 + j * CELL - z, d2 = (px * px + pz * pz) / (rad * rad);
      if (d2 > 4) continue;
      const k = j * N + i, cut = Math.min(this.h[k], 0.05 * amount * Math.exp(-d2 * 1.6));
      this.h[k] -= cut; took += cut;
    }
    if (took <= 0) return;
    // Where does it end up? Follow the slope down (nudged by the brush) until the sand runs out.
    const g = { x: 0, z: 0 };
    let qx = x, qz = z;
    for (let s = 0; s < 80; s++) {
      this.grad(qx, qz, g);
      let mx = -g.x + dx * 0.6, mz = -g.z + dz * 0.6; const m = Math.hypot(mx, mz) || 1; mx /= m; mz /= m;
      qx += mx * 0.06; qz += mz * 0.06;
      if (this.at(qx, qz) < 0.05 || Math.hypot(qx, qz) > SIZE / 2 - 0.3) break;
    }
    const drad = 0.3, di = Math.round((qx + SIZE / 2) / CELL), dj = Math.round((qz + SIZE / 2) / CELL), dspan = Math.ceil((drad * 2) / CELL);
    let w = 0; const ws: number[] = [];
    for (let j = dj - dspan; j <= dj + dspan; j++) for (let i = di - dspan; i <= di + dspan; i++) {
      const px = -SIZE / 2 + i * CELL - qx, pz = -SIZE / 2 + j * CELL - qz; const v = Math.exp(-((px * px + pz * pz) / (drad * drad)) * 2); ws.push(v); w += v;
    }
    let n = 0;
    for (let j = dj - dspan; j <= dj + dspan; j++) for (let i = di - dspan; i <= di + dspan; i++) {
      const v = ws[n++]; if (i < 1 || j < 1 || i > N - 2 || j > N - 2) continue;
      this.h[j * N + i] += (took * 0.92 * v) / w; // a little is lost to the wind
    }
    // Grains under the brush let go.
    for (const gr of this.grains) {
      const ex = gr.x - x, ez = gr.z - z;
      if (ex * ex + ez * ez < rad * rad * 2.2) { gr.slide = 1; gr.vx += dx * 1.6 + ex * 2; gr.vz += dz * 1.6 + ez * 2; }
    }
    this.live = 140; this.rev++;
  }

  /** Steeper than sand can stand? It slides. A few sweeps a frame is an avalanche. */
  relax(sweeps = 3) {
    const h = this.h; let moved = 0;
    for (let s = 0; s < sweeps; s++) {
      for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
        const k = j * N + i;
        moved += this.pair(h, k, k + 1, REPOSE) + this.pair(h, k, k + N, REPOSE) + this.pair(h, k, k + N + 1, REPOSE * 1.414) + this.pair(h, k, k + N - 1, REPOSE * 1.414);
      }
    }
    if (moved > 1e-5) this.rev++;
    return moved;
  }

  private pair(h: Float32Array, a: number, b: number, m: number) {
    const d = h[a] - h[b];
    if (d > m) { const t = (d - m) * 0.25; h[a] -= t; h[b] += t; return t; }
    if (-d > m) { const t = (-d - m) * 0.25; h[b] -= t; h[a] += t; return t; }
    return 0;
  }

  /** Move the loose grains. Returns whether anything is still moving. */
  step(dt: number) {
    const g = { x: 0, z: 0 }; let any = false;
    for (const gr of this.grains) {
      if (!gr.slide) continue;
      any = true;
      this.grad(gr.x, gr.z, g);
      gr.vx += -g.x * 7 * dt; gr.vz += -g.z * 7 * dt;
      const f = Math.exp(-3.2 * dt); gr.vx *= f; gr.vz *= f;
      const sp = Math.hypot(gr.vx, gr.vz);
      if (sp > 2.4) { gr.vx *= 2.4 / sp; gr.vz *= 2.4 / sp; }
      gr.x += gr.vx * dt; gr.z += gr.vz * dt;
      const lim = SIZE / 2 - 0.05; gr.x = Math.max(-lim, Math.min(lim, gr.x)); gr.z = Math.max(-lim, Math.min(lim, gr.z));
      gr.rx += gr.vz * dt / gr.s * 0.5; gr.rz -= gr.vx * dt / gr.s * 0.5;
      if (sp < 0.12 && Math.hypot(g.x, g.z) < 0.5) { gr.slide = 0; gr.vx = gr.vz = 0; }
    }
    return any;
  }
}

/** Sand under a macro lens: thousands of tiny domes, each its own colour and finish. Returns colour, normal and roughness maps. */
export function sandMaps(size = 512, seed = 3) {
  const rand = rng(seed);
  const hgt = new Float32Array(size * size), col = new Float32Array(size * size * 3), rough = new Float32Array(size * size).fill(0.92);
  for (let i = 0; i < size * size; i++) { col[i * 3] = 0.74; col[i * 3 + 1] = 0.69; col[i * 3 + 2] = 0.6; }
  const count = Math.round(size * size * 0.05);
  for (let n = 0; n < count; n++) {
    const cx = rand() * size, cy = rand() * size, r = 1.1 + rand() * rand() * 3.2;
    const tone = rand();
    // Mostly bone quartz; some warm, some grey, a few dark grains.
    let c: [number, number, number] = [0.93, 0.9, 0.83];
    if (tone > 0.72) c = [0.95, 0.85, 0.7]; if (tone > 0.88) c = [0.72, 0.7, 0.66]; if (tone > 0.965) c = [0.28, 0.25, 0.22];
    const shade = 0.82 + rand() * 0.22, glint = rand() < 0.12 ? 0.32 : 0.6 + rand() * 0.3, top = r * (0.6 + rand() * 0.5);
    const R2 = Math.ceil(r);
    for (let y = -R2; y <= R2; y++) for (let x = -R2; x <= R2; x++) {
      const d = (x * x + y * y) / (r * r); if (d > 1) continue;
      const px = ((Math.floor(cx) + x) % size + size) % size, py = ((Math.floor(cy) + y) % size + size) % size, k = py * size + px;
      const z = top * Math.sqrt(1 - d);
      if (z >= hgt[k]) { hgt[k] = z; col[k * 3] = c[0] * shade; col[k * 3 + 1] = c[1] * shade; col[k * 3 + 2] = c[2] * shade; rough[k] = glint; }
    }
  }
  const mk = () => { const cv = document.createElement('canvas'); cv.width = cv.height = size; return cv; };
  const cC = mk(), cN = mk(), cR = mk();
  const dC = cC.getContext('2d')!.createImageData(size, size), dN = cN.getContext('2d')!.createImageData(size, size), dR = cR.getContext('2d')!.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const k = y * size + x, o = k * 4;
    const l = hgt[y * size + ((x - 1 + size) % size)], r = hgt[y * size + ((x + 1) % size)], u = hgt[((y - 1 + size) % size) * size + x], d = hgt[((y + 1) % size) * size + x];
    let nx = (l - r) * 0.9, ny = (u - d) * 0.9, nz = 1; const m = Math.hypot(nx, ny, nz); nx /= m; ny /= m; nz /= m;
    // Crevices between grains are darker.
    const ao = Math.min(1, 0.72 + hgt[k] * 0.2);
    dC.data[o] = Math.min(255, col[k * 3] * ao * 255); dC.data[o + 1] = Math.min(255, col[k * 3 + 1] * ao * 255); dC.data[o + 2] = Math.min(255, col[k * 3 + 2] * ao * 255); dC.data[o + 3] = 255;
    dN.data[o] = (nx * 0.5 + 0.5) * 255; dN.data[o + 1] = (ny * 0.5 + 0.5) * 255; dN.data[o + 2] = (nz * 0.5 + 0.5) * 255; dN.data[o + 3] = 255;
    const rv = rough[k] * 255; dR.data[o] = rv; dR.data[o + 1] = rv; dR.data[o + 2] = rv; dR.data[o + 3] = 255;
  }
  cC.getContext('2d')!.putImageData(dC, 0, 0); cN.getContext('2d')!.putImageData(dN, 0, 0); cR.getContext('2d')!.putImageData(dR, 0, 0);
  const tex = (cv: HTMLCanvasElement, srgb: boolean) => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return { map: tex(cC, true), normal: tex(cN, false), rough: tex(cR, false) };
}

/** Black stone: a slow mottle and faint veins in the roughness, so the low light slides across it. */
export function stoneMaps(size = 512) {
  const noise = createNoise2D(rng(21));
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const cr = document.createElement('canvas'); cr.width = cr.height = size;
  const d = cv.getContext('2d')!.createImageData(size, size), r = cr.getContext('2d')!.createImageData(size, size);
  const rand = rng(4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size, TAU = Math.PI * 2;
    // tileable noise by walking a torus
    const nx = Math.cos(u * TAU) * 1.2, ny = Math.sin(u * TAU) * 1.2, nz = Math.cos(v * TAU) * 1.2, nw = Math.sin(v * TAU) * 1.2;
    const a = noise(nx + nz * 0.7, ny + nw * 0.7) * 0.5 + noise(nx * 3 + nw, ny * 3 + nz) * 0.25;
    const vein = Math.abs(noise(nx * 2 + nz * 2.3, ny * 2 - nw * 1.7));
    const c = 30 + a * 9 + (vein < 0.04 ? 8 : 0) + (rand() - 0.5) * 4, o = (y * size + x) * 4;
    d.data[o] = c; d.data[o + 1] = c * 0.97; d.data[o + 2] = c * 0.93; d.data[o + 3] = 255;
    const rv = (0.66 + a * 0.16 + (vein < 0.04 ? -0.14 : 0) + (rand() - 0.5) * 0.05) * 255;
    r.data[o] = rv; r.data[o + 1] = rv; r.data[o + 2] = rv; r.data[o + 3] = 255;
  }
  cv.getContext('2d')!.putImageData(d, 0, 0); cr.getContext('2d')!.putImageData(r, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const tr = new THREE.CanvasTexture(cr); tr.wrapS = tr.wrapT = THREE.RepeatWrapping;
  return { map: t, rough: tr };
}
