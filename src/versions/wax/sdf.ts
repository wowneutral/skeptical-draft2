// The brand question mark as a 2D signed distance field, built once in the
// browser from marks.json: draw the path, then an exact Euclidean distance
// transform inside and out. The shader and the CPU (for picking and for the
// beads) read the same numbers, so they agree on where the wax is.
import MARKS from '@/lib/marks.json';

export const W = 400, H = 600; // texels; each is 2.8 font units
export const FX0 = -560, FY0 = -840, FW = 1120, FH = 1680; // the font-unit window the texture covers
const UNIT = 1000; // font units per world unit

export type Field = {
  data: Float32Array; // signed distance in world units, row 0 = top of the window
  base: number; // font y of the bottom of the ink (the floor)
  offX: number; // font x of the ink centre
  height: number; // world height of the mark
  dotX: number; // world x of the dot
};

/** 1D squared distance transform (Felzenszwalb and Huttenlocher). */
function edt1(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
}

function edt(grid: Float64Array) {
  const n = Math.max(W, H), f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) f[y] = grid[y * W + x];
    edt1(f, H, d, v, z);
    for (let y = 0; y < H; y++) grid[y * W + x] = d[y];
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) f[x] = grid[y * W + x];
    edt1(f, W, d, v, z);
    for (let x = 0; x < W; x++) grid[y * W + x] = Math.sqrt(d[x]);
  }
}

export function buildField(): Field {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  const s = W / FW;
  g.setTransform(s, 0, 0, s, -FX0 * s, -FY0 * s);
  g.fillStyle = '#fff';
  g.fill(new Path2D(MARKS.roman.d));
  const px = g.getImageData(0, 0, W, H).data;
  const BIG = 1e20, inside = new Float64Array(W * H), outside = new Float64Array(W * H);
  let minX = W, maxX = 0, minY = H, maxY = 0;
  const cover = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const a = px[i * 4 + 3] / 255; cover[i] = a;
    const on = a > 0.5;
    outside[i] = on ? 0 : BIG; inside[i] = on ? BIG : 0;
    if (on) { const x = i % W, y = (i / W) | 0; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  edt(outside); edt(inside);
  const data = new Float32Array(W * H), k = FW / W / UNIT;
  for (let i = 0; i < W * H; i++) {
    // sub-texel edge from the anti-aliased coverage
    const sd = outside[i] > 0 ? outside[i] - 0.5 : -(inside[i] - 0.5);
    const edge = Math.abs(sd) < 1.2 ? (0.5 - cover[i]) : sd;
    data[i] = edge * k;
  }
  const base = (maxY + 1) / s + FY0;
  const offX = ((minX + maxX + 1) / 2) / s + FX0;
  // the dot: the ink in the bottom eighth of the mark
  let sx = 0, sn = 0; const y0 = maxY - (maxY - minY) * 0.12;
  for (let y = Math.floor(y0); y <= maxY; y++) for (let x = minX; x <= maxX; x++) if (cover[y * W + x] > 0.5) { sx += x; sn++; }
  const dotX = ((sn ? sx / sn : (minX + maxX) / 2) / s + FX0 - offX) / UNIT;
  return { data, base, offX, height: (maxY - minY + 1) / s / UNIT, dotX };
}

/** The 2D field at a world point (x, y) of the mark at rest, bilinear like the GPU's. */
export function g2(F: Field, x: number, y: number) {
  const fx = x * UNIT + F.offX, fy = F.base - y * UNIT;
  const u = (fx - FX0) / FW, v = (fy - FY0) / FH;
  const cu = Math.min(0.998, Math.max(0.002, u)), cv = Math.min(0.998, Math.max(0.002, v));
  const tx = cu * W - 0.5, ty = cv * H - 0.5;
  const x0 = Math.max(0, Math.floor(tx)), y0 = Math.max(0, Math.floor(ty)), x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1);
  const ax = tx - x0, ay = ty - y0, D = F.data;
  const a = D[y0 * W + x0] * (1 - ax) + D[y0 * W + x1] * ax, b = D[y1 * W + x0] * (1 - ax) + D[y1 * W + x1] * ax;
  const d = a * (1 - ay) + b * ay;
  return d + Math.hypot((u - cu) * FW / UNIT, (v - cv) * FH / UNIT);
}

/** Half a float, for the texture. */
export function toHalf(val: number) {
  const f = new Float32Array(1), i = new Int32Array(f.buffer); f[0] = val;
  const x = i[0], sign = (x >> 16) & 0x8000; let e = ((x >> 23) & 0xff) - 127 + 15; const m = x & 0x7fffff;
  if (e <= 0) return sign;
  if (e >= 31) return sign | 0x7c00;
  return sign | (e << 10) | (m >> 13);
}
