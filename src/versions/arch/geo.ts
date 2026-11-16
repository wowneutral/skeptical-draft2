// The arch, measured: eleven voussoirs on two piers. Shared by the 3D scene
// and the flat drawing shown without WebGL.
import MARKS from '@/lib/marks.json';

export const N = 11, KEY = 5;
export const R1 = 2.0, R2 = 3.05, HS = 3.2, D = 1.3, GAP = 0.016;
export const RM = (R1 + R2) / 2;

/** The outline of voussoir i in arch coordinates (y up), outer arc then inner arc. */
export function outline(i: number, seg = 8) {
  const da = Math.PI / N, g = GAP / 2 / RM;
  const a0 = Math.PI - i * da - (i === 0 ? 0 : g), a1 = Math.PI - (i + 1) * da + (i === N - 1 ? 0 : g);
  const pts: [number, number][] = [];
  for (let k = 0; k <= seg; k++) { const a = a0 + (a1 - a0) * (k / seg); pts.push([R2 * Math.cos(a), HS + R2 * Math.sin(a)]); }
  for (let k = seg; k >= 0; k--) { const a = a0 + (a1 - a0) * (k / seg); pts.push([R1 * Math.cos(a), HS + R1 * Math.sin(a)]); }
  return pts;
}

export function centroid(pts: [number, number][]) {
  let x = 0, y = 0;
  for (const p of pts) { x += p[0]; y += p[1]; }
  return [x / pts.length, y / pts.length] as [number, number];
}

/** Pier blocks: [cx, cy, w, h, d] for one pier at x = sign * RM. */
export function pierBlocks(sign: number): [number, number, number, number, number][] {
  const x = sign * RM, plinth = 0.42, impost = 0.26, shaft = HS - plinth - impost, c = shaft / 3;
  const out: [number, number, number, number, number][] = [[x, plinth / 2, 1.5, plinth, D + 0.42]];
  for (let k = 0; k < 3; k++) out.push([x, plinth + c * k + c / 2, R2 - R1 - 0.02, c - GAP, D]);
  out.push([x, HS - impost / 2, 1.3, impost - GAP, D + 0.2]);
  return out;
}

/** The brand question mark (roman cut) and its bounds. */
export const MARK = MARKS.roman;
export function markBounds() {
  const nums = MARK.d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) { x0 = Math.min(x0, nums[i]); x1 = Math.max(x1, nums[i]); y0 = Math.min(y0, nums[i + 1]); y1 = Math.max(y1, nums[i + 1]); }
  return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

/** A small seeded random, so every load cuts the same stone. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
