// The lenticular print. Every strip is a canvas made of fine vertical ribs;
// each rib shows reading A or reading B depending on the angle it is seen from.
import marks from '@/lib/marks.json';
import { clamp, still, isPhone } from '@/lib/utils';

export type Look = 'plain' | 'hero' | 'join' | 'end';
export type Spec = { a: string; b: string; look: Look; hero?: boolean; align?: 'left' | 'center' };

export const C = {
  bone: '#ebe6db',
  plastic: '#f3eee4',
  ink: '#121110',
  red: '#c22a1b',
  redHot: '#e0412b',
};

type Inst = {
  el: HTMLElement;
  cv: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  A: HTMLCanvasElement;
  B: HTMLCanvasElement;
  spec: Spec;
  w: number; h: number; dpr: number; rib: number;
  flip: number; flipT: number;
  sig: number; dirty: boolean;
};

const insts = new Set<Inst>();
export const view = { p: 1, t: 1, intro: true, fonts: false };
let raf = 0;

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

const qPath = typeof Path2D !== 'undefined' ? new Path2D((marks as { roman: { d: string } }).roman.d) : null;

function inkOf(look: Look, side: 'a' | 'b') {
  if (look === 'join') return side === 'a' ? { g: C.plastic, f: C.red } : { g: C.red, f: '#f6f1e7' };
  if (look === 'hero') return side === 'a' ? { g: C.plastic, f: C.ink } : { g: C.ink, f: C.redHot };
  return side === 'a' ? { g: C.plastic, f: C.ink } : { g: C.ink, f: C.plastic };
}

/** Break words into n balanced lines (greedy on a target width). */
function breakLines(ctx: CanvasRenderingContext2D, words: string[], n: number): string[] {
  if (n <= 1) return [words.join(' ')];
  const total = ctx.measureText(words.join(' ')).width;
  let target = total / n;
  for (let tries = 0; tries < 30; tries++) {
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? cur + ' ' + w : w;
      if (cur && ctx.measureText(next).width > target) { lines.push(cur); cur = w; } else cur = next;
    }
    if (cur) lines.push(cur);
    if (lines.length <= n) return lines;
    target *= 1.05;
  }
  return [words.join(' ')];
}

function paint(cv: HTMLCanvasElement, s: Spec, side: 'a' | 'b', w: number, h: number) {
  const ctx = cv.getContext('2d')!;
  const { g, f } = inkOf(s.look, side);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = f;
  if (s.look === 'hero' && side === 'b' && qPath) {
    // one giant question mark, the brand's Bodoni
    const sc = (h * 0.86) / 1540;
    ctx.save();
    ctx.translate(w / 2, h / 2 + h * 0.005);
    ctx.scale(sc, sc);
    ctx.fill(qPath);
    ctx.restore();
    return;
  }
  const text = (side === 'a' ? s.a : s.b).toUpperCase();
  const pad = Math.max(h * 0.12, Math.min(w, h) * 0.1, 14);
  ctx.font = `100px Anton`;
  ctx.textBaseline = 'alphabetic';
  const capH = ctx.measureText('H').actualBoundingBoxAscent || 73;
  const gap = 18; // at 100px
  const words = text.split(' ');
  let best = { size: 0, lines: [text] };
  let forced: string[] | null = null;
  if (s.hero && w / h < 1.7 && text === 'SKEPTICAL') forced = ['SKEP', 'TICAL'];
  for (let n = 1; n <= Math.min(5, words.length); n++) {
    if (forced && n > 1) break;
    const lines = forced ?? breakLines(ctx, words, n);
    const maxW = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const blockH = lines.length * capH + (lines.length - 1) * gap;
    const size = 100 * Math.min((w - pad * 2) / maxW, (h - pad * 2) / blockH);
    if (size > best.size * 1.06) best = { size, lines };
  }
  const k = best.size / 100;
  ctx.font = `${best.size}px Anton`;
  const ch = capH * k, gp = gap * k;
  const blockH = best.lines.length * ch + (best.lines.length - 1) * gp;
  let y = (h - blockH) / 2 + ch;
  const center = s.align === 'center' || s.hero;
  ctx.textAlign = center ? 'center' : 'left';
  for (const l of best.lines) {
    ctx.fillText(l, center ? w / 2 : pad, y);
    y += ch + gp;
  }
}

function build(i: Inst) {
  const r = i.el.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
  const w = Math.max(2, Math.round(r.width * dpr));
  const h = Math.max(2, Math.round(r.height * dpr));
  if (w === i.w && h === i.h && !i.dirty) return;
  i.w = w; i.h = h; i.dpr = dpr;
  i.rib = Math.max(4, Math.round((isPhone() ? 5 : 6) * dpr));
  for (const c of [i.cv, i.A, i.B]) { c.width = w; c.height = h; }
  if (!view.fonts) return;
  paint(i.A, i.spec, 'a', w, h);
  paint(i.B, i.spec, 'b', w, h);
  i.dirty = true;
  i.sig = NaN;
}

/** Composite one strip at a base angle. f(x) is how much of each rib shows reading B. */
function draw(i: Inst, base: number) {
  const { ctx, w, h, rib, A, B } = i;
  const spread = i.spec.hero ? 0.95 : 0.7;
  const edge = 0.24;
  let runStart = 0, runSide: 0 | 1 | -1 = -1;
  const flush = (end: number) => {
    if (runSide === -1 || end <= runStart) return;
    ctx.drawImage(runSide === 0 ? A : B, runStart, 0, end - runStart, h, runStart, 0, end - runStart, h);
  };
  const ribs = Math.ceil(w / rib);
  const fs = new Float32Array(ribs);
  const as = new Float32Array(ribs);
  for (let k = 0; k < ribs; k++) {
    const x0 = k * rib;
    const xn = (x0 + rib / 2) / w;
    const a = base + (xn - 0.5) * spread;
    as[k] = a;
    const f = smoothstep(-edge, edge, a);
    fs[k] = f;
    const side = f < 0.02 ? 0 : f > 0.98 ? 1 : 2;
    if (side === 2) {
      flush(x0); runSide = -1;
      const rw = Math.min(rib, w - x0);
      const wa = Math.round(rw * (1 - f));
      if (wa > 0) ctx.drawImage(A, x0, 0, wa, h, x0, 0, wa, h);
      if (rw - wa > 0) ctx.drawImage(B, x0 + wa, 0, rw - wa, h, x0 + wa, 0, rw - wa, h);
      runStart = x0 + rw;
    } else if (side !== runSide) {
      flush(x0); runSide = side as 0 | 1; runStart = x0;
    }
  }
  flush(w);

  // The plastic: a groove between ribs, a shadow on the far side of each rib
  // (deeper as the angle grows), and a thin highlight that runs along the ribs.
  const light = 0.5 - base * 0.42;
  const hw = Math.max(1, Math.round(i.dpr));
  for (let k = 0; k < ribs; k++) {
    const x0 = k * rib;
    const a = as[k];
    const f = fs[k];
    const dark = f > 0.5 && i.spec.look !== 'join';
    const sh = 0.035 + Math.min(0.09, Math.abs(a) * 0.05) + (f > 0.02 && f < 0.98 ? 0.05 : 0);
    ctx.fillStyle = dark ? `rgba(0,0,0,${sh * 2.2})` : `rgba(18,17,16,${sh})`;
    const sw = Math.round(rib * 0.38);
    ctx.fillRect(a > 0 ? x0 : x0 + rib - sw, 0, sw, h);
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.05)' : 'rgba(18,17,16,0.07)';
    ctx.fillRect(x0, 0, hw, h);
    const xn = (x0 + rib / 2) / w;
    const d = (xn - light) / 0.11;
    const hi = Math.exp(-d * d) * (dark ? 0.13 : 0.22);
    if (hi > 0.01) {
      ctx.fillStyle = `rgba(255,252,246,${hi})`;
      ctx.fillRect(x0 + Math.round(rib * clamp(0.5 - a * 0.25, 0.15, 0.8)), 0, hw, h);
    }
  }
}

function frame() {
  raf = requestAnimationFrame(frame);
  if (!view.fonts) return;
  view.p += (view.t - view.p) * (view.intro ? 0.06 : 0.12);
  const vh = window.innerHeight;
  const sy = window.scrollY;
  for (const i of insts) {
    if (!i.w || i.dirty === undefined) continue;
    const r = i.el.getBoundingClientRect();
    if (r.bottom < -20 || r.top > vh + 20) continue;
    i.flip += (i.flipT - i.flip) * 0.1;
    let base: number;
    if (still) base = -1;
    else if (i.spec.hero) base = view.p + clamp(sy / (vh * 0.55)) * 2.2;
    else {
      const cy = r.top + r.height / 2;
      const bias = clamp(-(cy - vh * 0.5) / (vh * 0.3), -1.8, 1.8);
      base = view.p * 0.6 + bias;
    }
    base *= i.flip;
    const sig = Math.round(base * 400);
    if (sig === i.sig && !i.dirty) continue;
    if (!still) {
      // the sheet itself leans with the angle, a few degrees, like a card turned in the hand
      const ry = clamp(base, -1.6, 1.6) * (i.spec.hero ? 3.2 : 2.2);
      i.cv.style.transform = `perspective(1600px) rotateY(${ry.toFixed(2)}deg)`;
    }
    i.sig = sig;
    i.dirty = false;
    draw(i, base);
  }
}

export function register(el: HTMLElement, cv: HTMLCanvasElement, spec: Spec) {
  const i: Inst = {
    el, cv, ctx: cv.getContext('2d')!, spec,
    A: document.createElement('canvas'), B: document.createElement('canvas'),
    w: 0, h: 0, dpr: 1, rib: 6, flip: 1, flipT: 1, sig: NaN, dirty: true,
  };
  insts.add(i);
  build(i);
  const ro = new ResizeObserver(() => { i.dirty = true; build(i); });
  ro.observe(el);
  return {
    toggle() { i.flipT = -i.flipT; return i.flipT < 0; },
    dispose() { ro.disconnect(); insts.delete(i); },
  };
}

export function start() {
  let alive = true;
  Promise.all([document.fonts.load('100px Anton'), document.fonts.ready]).then(() => {
    if (!alive) return;
    view.fonts = true;
    for (const i of insts) { i.dirty = true; i.w = 0; build(i); }
    if (still) { view.p = view.t = -1; view.intro = false; return; }
    // opening: the question mark first, then the poster turns to the name
    view.p = view.t = 1.05;
    window.setTimeout(() => { view.t = -0.9; }, 700);
    window.setTimeout(() => { view.intro = false; }, 2600);
  });
  raf = requestAnimationFrame(frame);
  return () => { alive = false; cancelAnimationFrame(raf); view.fonts = false; };
}

/** Set where the viewer stands, -1 (left) to 1 (right). */
export function stand(x: number) {
  view.t = clamp(x, -1.15, 1.15);
}
