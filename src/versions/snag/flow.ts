// The text engine: a solid glyph lies in the page and every line breaks round it.
import marks from '@/lib/marks.json';

export const MARK = marks.roman; // { d, w, h }, centred on 0,0
export const UH = MARK.h; // 1540 units tall
const PR = 1000; // profile rows
const PS = PR / UH; // profile px per unit

/** Per row of the glyph, the leftmost and rightmost ink, in glyph units. */
let PROFILE: Float32Array | null = null;
export function profile() {
  if (PROFILE) return PROFILE;
  const w = Math.ceil(MARK.w * PS) + 8;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = PR;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.translate(w / 2, PR / 2);
  g.scale(PS, PS);
  g.fill(new Path2D(MARK.d));
  const px = g.getImageData(0, 0, w, PR).data;
  const out = new Float32Array(PR * 2).fill(NaN);
  for (let r = 0; r < PR; r++) {
    let a = -1;
    let b = -1;
    for (let x = 0; x < w; x++) {
      if (px[(r * w + x) * 4 + 3] > 100) {
        if (a < 0) a = x;
        b = x;
      }
    }
    if (a >= 0) {
      out[r * 2] = (a - w / 2) / PS;
      out[r * 2 + 1] = (b + 1 - w / 2) / PS;
    }
  }
  PROFILE = out;
  return out;
}

export type Mark = { x: number; y: number; s: number; on: boolean };

/** The ink of the glyph between y0 and y1 (local px), grown by margin m. Null when clear. */
export function blocked(M: Mark, y0: number, y1: number, m: number): [number, number] | null {
  if (!M.on) return null;
  const k = M.s / UH;
  const top = M.y - M.s / 2;
  if (y1 + m < top || y0 - m > top + M.s) return null;
  const P = profile();
  const r0 = Math.max(0, Math.floor(((y0 - m - top) / k) * PS));
  const r1 = Math.min(PR - 1, Math.ceil(((y1 + m - top) / k) * PS));
  let a = Infinity;
  let b = -Infinity;
  for (let r = r0; r <= r1; r++) {
    const l = P[r * 2];
    if (l !== l) continue;
    if (l < a) a = l;
    const rr = P[r * 2 + 1];
    if (rr > b) b = rr;
  }
  if (a === Infinity) return null;
  return [M.x + a * k - m, M.x + b * k + m];
}

export type Style = { lh: number; sp: number; min: number; gap: number; hug: boolean; size: number; keep?: boolean };
export type Tok = { el: HTMLElement; w: number; x: number; y: number; px: number; py: number; shown: boolean };
export type Para = { toks: Tok[]; st: Style };

export type Cursor = { p: number; t: number };

type Seg = { a: number; b: number; side: 0 | 1 | 2 }; // 0 full, 1 left of mark, 2 right of mark

function segs(M: Mark, x0: number, x1: number, y0: number, y1: number, m: number, out: Seg[]) {
  out.length = 0;
  const inset = (y1 - y0) * 0.12;
  const bl = blocked(M, y0 + inset, y1 - inset, m);
  if (!bl || bl[1] <= x0 || bl[0] >= x1) {
    out.push({ a: x0, b: x1, side: 0 });
    return out;
  }
  if (bl[0] > x0) out.push({ a: x0, b: Math.min(x1, bl[0]), side: 1 });
  if (bl[1] < x1) out.push({ a: Math.max(x0, bl[1]), b: x1, side: 2 });
  return out;
}

const SEG: Seg[] = [];
const SEG2: Seg[] = [];

/**
 * Pour paragraphs into a region, line by line, round the mark.
 * Stops before a row would pass yMax. Returns where it stopped.
 */
export function pour(paras: Para[], cur: Cursor, x0: number, x1: number, y: number, yMax: number, M: Mark, m: number, top: boolean): { cur: Cursor; y: number } {
  let { p, t } = cur;
  let first = top;
  let guard = 0;
  while (p < paras.length) {
    const { toks, st } = paras[p];
    const gy = t === 0 && !first ? st.gap : 0;
    if (t === 0 && st.keep && p + 1 < paras.length) {
      const nx = paras[p + 1].st;
      if (y + gy + st.lh + nx.gap + nx.lh > yMax) return { cur: { p, t }, y };
      if (yMax !== Infinity) {
        // the heading only goes where its first line of text can follow it
        const nt = paras[p + 1].toks;
        let need = 0;
        for (let k = 0; k < Math.min(nx.min, nt.length); k++) need += nt[k].w + (k ? nx.sp : 0);
        const ny = y + gy + st.lh + nx.gap;
        segs(M, x0, x1, ny, ny + nx.lh, m, SEG2);
        if (!SEG2.some((sg) => sg.b - sg.a >= need)) return { cur: { p, t }, y };
      }
    }
    y += gy;
    first = false;
    while (t < toks.length) {
      if (y + st.lh > yMax) return { cur: { p, t }, y };
      if (++guard > 4000) return { cur: { p: paras.length, t: 0 }, y };
      segs(M, x0, x1, y, y + st.lh, m, SEG);
      for (let si = 0; si < SEG.length && t < toks.length; si++) {
        const s = SEG[si];
        const W = s.b - s.a;
        let j = t;
        let w = 0;
        while (j < toks.length) {
          const add = (j > t ? st.sp : 0) + toks[j].w;
          if (w + add > W) break;
          w += add;
          j++;
        }
        let n = j - t;
        const need = Math.min(st.min, toks.length - t);
        if (n < need) {
          // a word wider than the whole clear region is set anyway
          if (s.side === 0 && n === 0) {
            j = t + 1;
            n = 1;
            w = toks[t].w;
          } else continue;
        }
        const last = j === toks.length;
        const extra = W - w;
        let gapW = st.sp;
        let x = s.a;
        if (st.hug) {
          if (s.side === 1) x = s.b - w;
        } else if (!last && n > 1 && extra / (n - 1) < st.sp * 1.6) {
          gapW = st.sp + extra / (n - 1);
        } else if (s.side === 1 && n > 0 && extra / Math.max(1, n - 1) >= st.sp * 1.6) {
          // a short left-of-mark line keeps the column edge clean
          x = s.a;
        }
        for (let k = t; k < j; k++) {
          const tk = toks[k];
          tk.x = x;
          tk.y = y;
          x += tk.w + gapW;
        }
        t = j;
      }
      y += st.lh;
    }
    p++;
    t = 0;
  }
  return { cur: { p, t }, y };
}

/** Flow paragraphs down the left column then the right one, split at a gutter. */
export function pourCols(paras: Para[], x0: number, x1: number, gut: number, gap: number, y0: number, M: Mark, m: number, step: number): number {
  const L = gut - gap / 2;
  const R = gut + gap / 2;
  let H = step * 2;
  for (let i = 0; i < 300; i++, H += step) {
    const a = pour(paras, { p: 0, t: 0 }, x0, L, y0, y0 + H, M, m, true);
    if (a.cur.p >= paras.length) return a.y;
    const b = pour(paras, a.cur, R, x1, y0, y0 + H, M, m, true);
    if (b.cur.p >= paras.length) return Math.max(a.y, b.y);
  }
  return pour(paras, { p: 0, t: 0 }, x0, x1, y0, Infinity, M, m, true).y;
}
