// The black inclusion, drawn once per cut on a canvas. The brand's question mark is the vein at the
// centre of the stone; the further a cut is from the centre, the more the noise eats it, until only
// threads are left. One 3D noise field runs through the whole block, so neighbouring cuts agree.
import { createNoise3D } from 'simplex-noise';
import MARKS from '@/lib/marks.json';
import { N } from './state';

export const TEX_W = 256, TEX_H = 410; // D = 1.0 by H = 1.6

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function markBox(d: string) {
  const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) { x0 = Math.min(x0, nums[i]); x1 = Math.max(x1, nums[i]); y0 = Math.min(y0, nums[i + 1]); y1 = Math.max(y1, nums[i + 1]); }
  return { x0, x1, y0, y1 };
}

/** The mark, white on black, filling about two thirds of the face's height. */
function markCanvas(blur: number) {
  const cv = document.createElement('canvas'); cv.width = TEX_W; cv.height = TEX_H;
  const c = cv.getContext('2d', { willReadFrequently: true })!;
  c.fillStyle = '#000'; c.fillRect(0, 0, TEX_W, TEX_H);
  const M = MARKS.roman, b = markBox(M.d);
  const k = (TEX_H * 0.66) / (b.y1 - b.y0);
  c.filter = blur > 0 ? `blur(${blur}px)` : 'none';
  c.translate(TEX_W / 2 - ((b.x0 + b.x1) / 2) * k, TEX_H * 0.5 - ((b.y0 + b.y1) / 2) * k);
  c.scale(k, k);
  c.fillStyle = '#fff';
  c.fill(new Path2D(M.d));
  return c.getImageData(0, 0, TEX_W, TEX_H).data;
}

const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** One canvas per cut plane p = 1 .. N-1. Red channel is ink. */
export function drawInks(): HTMLCanvasElement[] {
  const noise = createNoise3D(rng(4111));
  const tight = markCanvas(2.2), wide = markCanvas(22);
  const out: HTMLCanvasElement[] = [];
  for (let p = 0; p <= N; p++) {
    const cv = document.createElement('canvas'); cv.width = TEX_W; cv.height = TEX_H;
    out.push(cv);
    if (p === 0 || p === N) continue;
    const e = Math.abs(p / N - 0.5) * 2; // 0 at the centre cut, 1 at the outside
    const zz = p * 0.21;
    const c = cv.getContext('2d')!;
    const img = c.createImageData(TEX_W, TEX_H), px = img.data;
    for (let y = 0; y < TEX_H; y++) {
      for (let x = 0; x < TEX_W; x++) {
        const i = (y * TEX_W + x) * 4;
        const u = x / TEX_W, v = y / TEX_W;
        const t = tight[i] / 255, w = wide[i] / 255;
        // Erosion: low-frequency body plus a finer bite.
        const n1 = noise(u * 3.1, v * 3.1, zz) * 0.65 + noise(u * 9.0, v * 9.0, zz * 1.7 + 5) * 0.35;
        const core = t + n1 * (0.06 + 0.95 * e) - (0.5 + 0.62 * e);
        let ink = sstep(-0.035, 0.035, core);
        // Threads: thin ridges of the same field, gathered round where the mark will be.
        const warp = noise(u * 1.6 + 7, v * 1.6, zz * 0.6) * 0.9;
        const r = 1 - Math.abs(noise(u * 2.4 + warp, v * 1.25 - warp * 0.4, zz * 0.8 + 11));
        const near = sstep(0.04 + 0.1 * e, 0.42, w);
        const thread = sstep(0.962 - 0.012 * e, 0.988, r) * near * (0.55 + 0.45 * e);
        // A few hairlines wander further out on the outer cuts.
        const r2 = 1 - Math.abs(noise(u * 4.2 - warp, v * 2.2 + warp, zz + 23));
        const hair = sstep(0.985, 0.996, r2) * sstep(0.0, 0.2, w + 0.12 * e) * 0.8;
        ink = Math.max(ink, thread, hair);
        const g = Math.round(ink * 255);
        px[i] = g; px[i + 1] = g; px[i + 2] = g; px[i + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
  }
  return out;
}
