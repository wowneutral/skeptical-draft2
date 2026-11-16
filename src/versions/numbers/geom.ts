// Numeral outlines (Abril Fatface, via test/glyphs.mjs) and a small path morph.
import G from './glyphs.json';

export type Pt = [number, number];
export type Shape = Pt[][];

export const BOX = 720; // every numeral sits centred in a 720 x 760 box
export const TOP = -730;
export const H = 760;

type Glyph = { ch: string; d: string; x: number; advance: number };
const byCh: Record<string, Glyph> = {};
for (const g of G.glyphs as Glyph[]) byCh[g.ch] = g;

export const adv = (ch: string) => byCh[ch].advance;

/** The raw path of a numeral, shifted into the shared box. */
export function glyphD(ch: string) {
  const g = byCh[ch];
  const dx = -g.x + (BOX - g.advance) / 2;
  return shift(g.d, dx);
}
function shift(d: string, dx: number) {
  const tok = d.match(/[MLQZ]|-?\d*\.?\d+/g) || [];
  let out = ''; let k = 0;
  for (const t of tok) {
    if (/[MLQZ]/.test(t)) { out += t; k = 0; continue; }
    const v = parseFloat(t);
    out += (k % 2 === 0 ? (v + dx).toFixed(1) : v.toFixed(1)) + ' ';
    k++;
  }
  return out;
}

function contours(ch: string): Pt[][] {
  const d = glyphD(ch);
  const tok = d.match(/[MLQZ]|-?\d*\.?\d+/g) || [];
  const out: Pt[][] = []; let cur: Pt[] = []; let i = 0; let c = ''; let last: Pt = [0, 0];
  const num = () => parseFloat(tok[i++]);
  while (i < tok.length) {
    if (/[MLQZ]/.test(tok[i])) { c = tok[i++]; if (c === 'Z') { if (cur.length) out.push(cur); cur = []; } continue; }
    if (c === 'M') { if (cur.length) out.push(cur); last = [num(), num()]; cur = [last]; c = 'L'; }
    else if (c === 'L') { last = [num(), num()]; cur.push(last); }
    else if (c === 'Q') {
      const q: Pt = [num(), num()]; const e: Pt = [num(), num()];
      for (let s = 1; s <= 8; s++) { const t = s / 8, u = 1 - t; cur.push([u * u * last[0] + 2 * u * t * q[0] + t * t * e[0], u * u * last[1] + 2 * u * t * q[1] + t * t * e[1]]); }
      last = e;
    } else i++;
  }
  if (cur.length) out.push(cur);
  return out;
}

const area = (p: Pt[]) => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; };

export function resample(p: Pt[], n: number): Pt[] {
  const L: number[] = [0];
  for (let i = 1; i <= p.length; i++) { const a = p[i - 1], b = p[i % p.length]; L.push(L[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const tot = L[L.length - 1]; const out: Pt[] = []; let j = 0;
  for (let k = 0; k < n; k++) {
    const s = (k / n) * tot;
    while (L[j + 1] < s) j++;
    const a = p[j], b = p[(j + 1) % p.length]; const t = (s - L[j]) / (L[j + 1] - L[j] || 1);
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

const N = 180;
const cache: Record<string, Shape> = {};
/** A numeral as resampled contours, biggest first, all wound the same way. */
export function shape(ch: string): Shape {
  if (cache[ch]) return cache[ch];
  const cs = contours(ch).filter((c) => c.length > 2).sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
  return (cache[ch] = cs.map((c) => { const r = resample(c, N); return area(r) < 0 ? r.reverse() : r; }));
}

const centroid = (p: Pt[]): Pt => { let x = 0, y = 0; for (const q of p) { x += q[0]; y += q[1]; } return [x / p.length, y / p.length]; };

/** Pair two numerals contour by contour so they can be interpolated. */
export function pair(a: string, b: string): [Shape, Shape] {
  const A = shape(a), B = shape(b); const n = Math.max(A.length, B.length);
  const outA: Shape = [], outB: Shape = [];
  for (let i = 0; i < n; i++) {
    let pa = A[i], pb = B[i];
    if (!pa) { const c = centroid(pb); pa = pb.map(() => [c[0], c[1]] as Pt); }
    if (!pb) { const c = centroid(pa); pb = pa.map(() => [c[0], c[1]] as Pt); }
    // rotate pb so its start lines up with pa
    let best = 0, bd = Infinity;
    for (let o = 0; o < N; o += 3) { let d = 0; for (let k = 0; k < N; k += 6) { const p = pa[k], q = pb[(k + o) % N]; d += (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; } if (d < bd) { bd = d; best = o; } }
    outA.push(pa); outB.push(pb.map((_, k) => pb[(k + best) % N]));
  }
  return [outA, outB];
}

/** Interpolated path data between two paired shapes. Holes are cut with evenodd. */
export function mix([A, B]: [Shape, Shape], t: number) {
  let d = '';
  for (let i = 0; i < A.length; i++) {
    const a = A[i], b = B[i];
    for (let k = 0; k < a.length; k++) {
      const x = a[k][0] + (b[k][0] - a[k][0]) * t, y = a[k][1] + (b[k][1] - a[k][1]) * t;
      d += (k ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    d += 'Z';
  }
  return d;
}

export const toD = (s: Shape) => s.map((c) => c.map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('') + 'Z').join('');
export const VB = `0 ${TOP} ${BOX} ${H}`;
