// The pin grid and the hidden shapes, each drawn on a canvas, blurred into a
// soft relief and sampled once per pin. Heights are 0..1; the scene scales them.
import MARKS from '@/lib/marks.json';

export const PITCH = 0.1;            // distance between pin centres, world units
export const BODONI = '"Bodoni Moda Variable", "Bodoni Moda", serif';

export type Grid = {
  nx: number; ny: number; n: number; W: number; H: number;
  x: Float32Array; y: Float32Array; u: Float32Array; v: Float32Array;
  delay: Float32Array; seed: Float32Array;
};

export function makeGrid(phone: boolean): Grid {
  const nx = phone ? 54 : 88, ny = phone ? 60 : 92;
  const n = nx * ny, row = PITCH * 0.866;
  const W = (nx - 0.5) * PITCH, H = (ny - 1) * row;
  const x = new Float32Array(n), y = new Float32Array(n), u = new Float32Array(n), v = new Float32Array(n);
  const delay = new Float32Array(n), seed = new Float32Array(n);
  let s = 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    const px = i * PITCH + (j % 2 ? PITCH * 0.5 : 0), py = j * row;
    x[k] = px - W / 2; y[k] = py - H / 2; u[k] = px / W; v[k] = py / H;
    // the wave crosses from the lower left
    delay[k] = (u[k] * 0.72 + (1 - v[k]) * 0.28) + rnd() * 0.04;
    seed[k] = rnd();
  }
  return { nx, ny, n, W, H, x, y, u, v, delay, seed };
}

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

/** Draw white on black, blur, and read the value under every pin. */
export function raster(grid: Grid, draw: Draw, blur: number, shape: (t: number) => number = (t) => t): Float32Array {
  const w = 300, h = Math.round((w * grid.H) / grid.W);
  const a = document.createElement('canvas'); a.width = w; a.height = h;
  const g = a.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff';
  draw(g, w, h);
  const b = document.createElement('canvas'); b.width = w; b.height = h;
  const gb = b.getContext('2d', { willReadFrequently: true })!;
  gb.fillStyle = '#000'; gb.fillRect(0, 0, w, h);
  gb.filter = `blur(${blur * w}px)`;
  gb.drawImage(a, 0, 0);
  gb.filter = 'none';
  const px = gb.getImageData(0, 0, w, h).data;
  const out = new Float32Array(grid.n);
  for (let k = 0; k < grid.n; k++) {
    const cx = Math.min(w - 1, Math.max(0, Math.round(grid.u[k] * (w - 1))));
    const cy = Math.min(h - 1, Math.max(0, Math.round((1 - grid.v[k]) * (h - 1))));
    out[k] = shape(px[(cy * w + cx) * 4] / 255);
  }
  return out;
}

const ss = (a: number, b: number, t: number) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
/** a rounded dome: steep shoulder, soft crown */
const dome = (t: number) => Math.pow(ss(0.04, 0.92, t), 0.62);
/** a slab: flat top, small bevel */
const slab = (t: number) => ss(0.08, 0.6, t);

function rrect(g: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, r: number) {
  const x = cx - w / 2, y = cy - h / 2;
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
  g.fill();
}

/** The brand question mark, standing in the frame. */
export function markField(grid: Grid) {
  const d = new Path2D(MARKS.italic.d);
  return raster(grid, (g, w, h) => {
    const k = (h * 0.8) / MARKS.italic.h;
    g.translate(w * 0.5, h * 0.5); g.scale(k, k); g.fill(d);
  }, 0.022, dome);
}

/** Eight of us right now. */
export function eightField(grid: Grid) {
  return raster(grid, (g, w, h) => {
    g.font = `500 ${Math.round(h * 0.98)}px ${BODONI}`;
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const m = g.measureText('8');
    const top = m.actualBoundingBoxAscent, bot = m.actualBoundingBoxDescent;
    g.fillText('8', w * 0.5, h * 0.5 + (top - bot) / 2);
  }, 0.02, dome);
}

/** Two plaques, one per result. */
export function plaqueFields(grid: Grid, phone: boolean) {
  const at = phone ? [[0.5, 0.71], [0.5, 0.29]] : [[0.5, 0.7], [0.5, 0.3]];
  return at.map(([cx, cy]) => raster(grid, (g, w, h) => {
    rrect(g, cx * w, (1 - cy) * h, w * 0.6, h * 0.24, w * 0.03);
  }, 0.009, slab));
}

/** Seven plain rounded slabs. Nothing on them. */
const SLABS: [number, number, number, number][] = [
  [0.24, 0.8, 0.3, 0.2], [0.68, 0.82, 0.4, 0.16], [0.3, 0.56, 0.42, 0.18],
  [0.76, 0.55, 0.26, 0.24], [0.2, 0.3, 0.24, 0.22], [0.58, 0.3, 0.36, 0.2], [0.5, 0.1, 0.66, 0.08],
];
export function slabFields(grid: Grid) {
  return SLABS.map(([cx, cy, sw, sh]) => raster(grid, (g, w, h) => {
    rrect(g, cx * w, (1 - cy) * h, sw * w, sh * h, Math.min(sw * w, sh * h) * 0.22);
  }, 0.008, slab));
}

/** A static picture of the mark, for a browser without WebGL. */
export const MARK_D = MARKS.italic.d;
export const MARK_W = MARKS.italic.w;
export const MARK_H = MARKS.italic.h;
