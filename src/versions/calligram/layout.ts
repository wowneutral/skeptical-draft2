import marks from '@/lib/marks.json';

/* The calligram engine. The brand's Bodoni question mark is rasterised once per
   thickness, sliced into rows at the body line height, and each row's crossings
   with the outline become slots that are filled with the copy, in order. */

const D: string = (marks as Record<string, { d: string }>).roman.d;
const cut = D.indexOf('M', 1);
export const HOOK_D = D.slice(0, cut);
export const DOT_D = D.slice(cut);
export const HOOK = { x0: -491, x1: 491, y0: -770, y1: 230 };
export const DOT = { cx: -54.5, cy: 562, r: 208 };

export type Tok = { t: string; c?: 'a' | 'n' | 'k' | 'p'; href?: string };
export type Item =
  | { k: 'title'; text: string; sec: string; rows: number; h1?: boolean }
  | { k: 'p'; toks: Tok[]; sec: string; fresh?: boolean; gap?: boolean };

export type Line = { x: number; y: number; w: number; toks: Tok[]; ws: number; sec: string; last: boolean };
export type Title = { x: number; y: number; w: number; h: number; fs: number; text: string; sec: string; h1?: boolean };
export type Layout = {
  W: number; H: number; h1: number; fs: number; lh: number; sx: number; sy: number; r: number;
  ox: number; oy: number; lines: Line[]; titles: Title[]; dot: { x: number; y: number; d: number };
};

type Unit = { tok: Tok; t: string; w: number; sp: boolean; atom: boolean };
type Mask = { w: number; h: number; ox: number; oy: number; a: Uint8Array };

const maskCache = new Map<number, Mask>();
function mask(r: number): Mask {
  const hit = maskCache.get(r);
  if (hit) return hit;
  const ox = -HOOK.x0 + r + 2, oy = -HOOK.y0 + r + 2;
  const w = Math.ceil(HOOK.x1 - HOOK.x0 + 2 * r + 4), h = Math.ceil(HOOK.y1 - HOOK.y0 + 2 * r + 4);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  g.translate(ox, oy);
  const p = new Path2D(HOOK_D);
  g.fillStyle = '#fff'; g.strokeStyle = '#fff';
  g.fill(p);
  if (r > 0) { g.lineWidth = 2 * r; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(p); }
  const data = g.getImageData(0, 0, w, h).data;
  const a = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = data[i * 4 + 3] > 127 ? 1 : 0;
  const m = { w, h, ox, oy, a };
  maskCache.set(r, m);
  return m;
}

function runs(m: Mask, yy: number[]): [number, number][] {
  const out: [number, number][] = [];
  let s = -1;
  for (let x = 0; x <= m.w; x++) {
    let on = x < m.w;
    if (on) for (const y of yy) { const r = Math.round(y); if (r < 0 || r >= m.h || !m.a[r * m.w + x]) { on = false; break; } }
    if (on && s < 0) s = x;
    if (!on && s >= 0) { out.push([s, x]); s = -1; }
  }
  return out;
}

/* Measuring: every unit is measured once at 100px in the real face, then scaled. */
const wCache = new Map<string, number>();
export function measurer(root: HTMLElement) {
  const box = document.createElement('div');
  box.className = 'cg-measure';
  box.setAttribute('aria-hidden', 'true');
  root.appendChild(box);
  const span = document.createElement('span');
  box.appendChild(span);
  const m = (t: string, cls: string) => {
    const key = cls + '|' + t;
    const hit = wCache.get(key);
    if (hit !== undefined) return hit;
    span.className = cls;
    span.textContent = t;
    const v = span.getBoundingClientRect().width;
    wCache.set(key, v);
    return v;
  };
  return { m, done: () => box.remove() };
}

export function prepare(items: Item[], m: (t: string, cls: string) => number) {
  const space = m('a a', 'tx') - m('aa', 'tx');
  const blocks = items.map((it) => {
    if (it.k === 'title') return { it, units: [] as Unit[], tw: m(it.text, 'dp') };
    const units: Unit[] = [];
    it.toks.forEach((tok, ti) => {
      const cls = 'tx' + (tok.c ? ' ' + tok.c : '');
      if (tok.c === 'a' || tok.c === 'n' || tok.c === 'p') {
        units.push({ tok, t: tok.t, w: m(tok.t, cls), sp: ti > 0, atom: true });
      } else {
        tok.t.split(' ').filter(Boolean).forEach((wd, wi) => units.push({ tok, t: wd, w: m(wd, cls), sp: ti > 0 || wi > 0, atom: false }));
      }
    });
    return { it, units, tw: 0 };
  });
  return { blocks, space };
}

type Opts = { W: number; mode: 'stroke' | 'hull'; r: number; fs: number; lh: number; sy: number; minLine: number; pad: number; skip?: number };

function flow(prep: ReturnType<typeof prepare>, o: Opts): Omit<Layout, 'dot' | 'h1'> | null {
  const mk = mask(o.r);
  const sx = o.W / mk.w;
  const sy = o.sy * sx;
  const H = mk.h * sy;
  const nRows = Math.floor(H / o.lh);
  const k = o.fs / 100;
  const space = prep.space * k;
  const rowSpans: [number, number][][] = [];
  for (let i = 0; i < nRows; i++) {
    const y0 = (i * o.lh) / sy, y1 = ((i + 1) * o.lh) / sy;
    if (o.mode === 'stroke') {
      rowSpans.push(runs(mk, [y0 + 0.5, (y0 + y1) / 2, y1 - 0.5]).map(([a, b]) => [a * sx + o.pad, b * sx - o.pad] as [number, number]));
    } else {
      let L = Infinity, R = -Infinity;
      for (const yy of [y0 + 0.5, (y0 + y1) / 2, y1 - 0.5]) {
        const rr = runs(mk, [yy]);
        if (rr.length) { L = Math.min(L, rr[0][0]); R = Math.max(R, rr[rr.length - 1][1]); }
      }
      if (L === Infinity) { rowSpans.push([]); continue; }
      let a = L * sx + o.pad, b = R * sx - o.pad;
      if (b - a < o.minLine) { const c = (a + b) / 2; a = c - o.minLine / 2; b = c + o.minLine / 2; if (a < 0) { b -= a; a = 0; } if (b > o.W) { a -= b - o.W; b = o.W; } }
      rowSpans.push([[a, b]]);
    }
  }
  const lines: Line[] = [];
  const titles: Title[] = [];
  let row = 0, slot = 0;
  const next = () => { slot++; if (slot >= (rowSpans[row]?.length ?? 0)) { row++; slot = 0; } };
  const freshRow = () => { if (slot > 0) { row++; slot = 0; } };
  let prevLast: Line | null = null;
  for (const b of prep.blocks) {
    const it = b.it;
    if (it.k === 'title' && it.h1) continue;
    if (it.k === 'title') {
      freshRow();
      if (prevLast) prevLast.last = true;
      // find rows i..i+n-1 whose common span is wide enough
      for (;;) {
        if (row + it.rows > nRows) return null;
        let com: [number, number][] = rowSpans[row].slice();
        for (let j = 1; j < it.rows; j++) {
          const nx: [number, number][] = [];
          for (const [a, bb] of com) for (const [c, d] of rowSpans[row + j]) { const l = Math.max(a, c), r = Math.min(bb, d); if (r - l > 0) nx.push([l, r]); }
          com = nx;
        }
        const best = com.sort((p, q) => q[1] - q[0] - (p[1] - p[0]))[0];
        const need = Math.max(o.minLine * 1.2, b.tw * (o.fs * 1.7) / 100);
        if (best && best[1] - best[0] >= need) {
          const w = best[1] - best[0];
          const fs = Math.min((w / b.tw) * 100 * 0.985, it.rows * o.lh * 0.86);
          titles.push({ x: best[0], y: row * o.lh, w, h: it.rows * o.lh, fs, text: it.text, sec: it.sec, h1: it.h1 });
          row += it.rows; slot = 0;
          break;
        }
        row++; slot = 0;
      }
      prevLast = null;
      continue;
    }
    if (prevLast) prevLast.last = true;
    if (it.gap && o.skip) { if (slot > 0) { row++; slot = 0; } row += o.skip; }
    let u = 0;
    const us = b.units;
    while (u < us.length) {
      if (row >= nRows) return null;
      const sp = rowSpans[row][slot];
      if (!sp) { row++; slot = 0; continue; }
      const w = sp[1] - sp[0];
      if (w < o.minLine * 0.97) { next(); continue; }
      let nat = 0, n = 0, gaps = 0;
      while (u + n < us.length) {
        const un = us[u + n];
        const add = un.w * k + (n > 0 && un.sp ? space : 0);
        if (nat + add > w - 2) break;
        nat += add; if (n > 0 && un.sp) gaps++; n++;
      }
      if (n === 0) { next(); continue; }
      const toks: Tok[] = [];
      for (let j = 0; j < n; j++) {
        const un = us[u + j];
        const prev = toks[toks.length - 1];
        const lead = j > 0 && un.sp ? ' ' : '';
        if (prev && prev.c === un.tok.c && prev.href === un.tok.href && !un.atom && !(un.tok.c === 'n')) prev.t += lead + un.t;
        else { if (lead && prev) prev.t += ' '; toks.push({ t: un.t, c: un.tok.c, href: un.tok.href }); }
      }
      const extra = gaps ? (w - nat) / gaps : 0;
      const line: Line = { x: sp[0], y: row * o.lh, w, toks, ws: Math.min(extra, o.fs * 0.55), sec: it.sec, last: false };
      lines.push(line);
      prevLast = line;
      u += n;
      next();
    }
  }
  if (prevLast) prevLast.last = true;
  return { W: o.W, H, fs: o.fs, lh: o.lh, sx, sy, r: o.r, ox: mk.ox, oy: mk.oy, lines, titles };
}

export function solve(prep: ReturnType<typeof prepare>, W: number, mode: 'stroke' | 'hull', fsMin: number, fsMax: number, r: number, lhK = 1.42): Layout {
  let skip = 0;
  const mk = (fs: number, sy: number, kk = lhK) => flow(prep, { W, mode, r, fs, skip, lh: Math.round(fs * kk * 10) / 10, sy, minLine: fs * (mode === 'hull' ? 14 : 5.2), pad: fs * 0.3 });
  let best: Omit<Layout, 'dot' | 'h1'> | null = null;
  let lo = fsMin, hi = fsMax;
  if (mk(lo, 1)) {
    for (let i = 0; i < 9; i++) { const mid = (lo + hi) / 2; const t = mk(mid, 1); if (t) { best = t; lo = mid; } else hi = mid; }
    best = best ?? mk(lo, 1);
    // open the leading until the copy reaches the foot of the stem
    let a = lhK, z = lhK * 1.3;
    for (let i = 0; i < 8; i++) { const mid = (a + z) / 2; const t = mk(lo, 1, mid); if (t) { best = t; a = mid; } else z = mid; }
    // then drop the last section as low as it will go, so it ends at the foot of the stem
    if (mode === 'stroke') {
      let s0 = 0, s1 = 16;
      while (s1 - s0 > 1) { const m = (s0 + s1) >> 1; skip = m; const t = mk(lo, 1, a); if (t) { best = t; s0 = m; } else s1 = m; }
      skip = s0;
    }
  } else {
    let a = 1, bb = 1.25;
    while (!mk(fsMin, bb) && bb < 40) { a = bb; bb *= 1.25; }
    for (let i = 0; i < 9; i++) { const mid = (a + bb) / 2; if (mk(fsMin, mid)) bb = mid; else a = mid; }
    best = mk(fsMin, bb);
  }
  const L = best!;
  // trim the shape to the last row actually used so nothing dangles
  const dot = { x: (DOT.cx + L.ox) * L.sx, y: (DOT.cy + L.oy) * L.sy, d: (DOT.r * 2 + r * 1.2) * L.sx };
  const hb = prep.blocks.find((b) => b.it.k === 'title' && b.it.h1);
  const h1 = hb ? (W / hb.tw) * 100 * 0.97 : W * 0.15;
  return { ...L, h1, dot };
}
