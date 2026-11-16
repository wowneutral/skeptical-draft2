// The unseen coach's hand: a queue of writing jobs, a marker cursor that follows
// the stroke, word reveals at hand speed and rough.js shapes drawn with DrawSVG.
import rough from 'roughjs';
import { gsap } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { squeak } from './sound';

export const COLORS = [
  { id: 'black', label: 'Black', c: '#15171c' },
  { id: 'blue', label: 'Blue', c: '#1d47c4' },
  { id: 'red', label: 'Red', c: '#c3261f' },
  { id: 'green', label: 'Green', c: '#0f7440' },
] as const;
export const INK: Record<string, string> = { k: COLORS[0].c, b: COLORS[1].c, r: COLORS[2].c, g: COLORS[3].c };

/* ───────── the coach's marker cursor ───────── */
export const hand = { el: null as HTMLElement | null, x: 0, y: 0, shown: false, color: INK.k };
export function handTo(x: number, y: number, color?: string) {
  const el = hand.el; if (!el || still) return;
  hand.x = x; hand.y = y;
  el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  if (!hand.shown) { hand.shown = true; el.classList.add('on'); }
  if (color && color !== hand.color) { hand.color = color; el.style.setProperty('--cap', color); }
}
export function handHide() { if (hand.el) { hand.shown = false; hand.el.classList.remove('on'); } }

/* ───────── the queue: one hand, one job at a time ───────── */
type Job = { tl: gsap.core.Timeline; done?: () => void; from?: string | number };
const queue: Job[] = [];
let current: Job | null = null;
let idle: ReturnType<typeof setTimeout> | undefined;
export function enqueue(tl: gsap.core.Timeline, done?: () => void, front = false, from?: string | number) {
  tl.pause();
  const job: Job = { tl, done, from };
  if (front) { queue.unshift(job); if (!current) next(); return; }
  // a fresh panel came into view: the coach finishes everything before it at once
  const old = [current, ...queue.splice(0)].filter(Boolean) as Job[];
  current = null;
  old.forEach((j) => { j.tl.eventCallback('onComplete', null); j.tl.progress(1); j.done?.(); });
  queue.push(job);
  next();
}
function next() {
  clearTimeout(idle);
  current = queue.shift() ?? null;
  if (!current) { idle = setTimeout(handHide, 900); return; }
  const j = current;
  if (j.tl.progress() >= 1) { current = null; j.done?.(); next(); return; }
  j.tl.timeScale(1.5 + queue.length * 1.5);
  j.tl.eventCallback('onComplete', () => { j.done?.(); next(); });
  // the scroll may already have pushed this job forward: never rewind it
  if (j.from !== undefined && j.tl.progress() === 0) j.tl.play(j.from); else j.tl.play();
}
export function flushQueue() { queue.splice(0).forEach((j) => { j.tl.progress(1); j.done?.(); }); if (current) { current.tl.progress(1); } }

/* ───────── words ───────── */
function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
export function wordStyle(key: string): React.CSSProperties {
  const a = hash(key), b = hash(key + 'y'), c = hash(key + 'o');
  return { '--rot': `${((a - 0.5) * 2.2).toFixed(2)}deg`, '--dy': `${((b - 0.5) * 0.08).toFixed(3)}em`, '--ink': (0.84 + c * 0.16).toFixed(2) } as React.CSSProperties;
}

/** Add one word's stroke to a timeline. Speed follows the size of the letters. */
export function writeWord(tl: gsap.core.Timeline, w: HTMLElement, at?: number | string) {
  const fs = parseFloat(getComputedStyle(w).fontSize) || 20;
  const chars = (w.textContent || '').length;
  const per = 0.034 * Math.min(2.2, Math.max(0.5, fs / 34));
  const dur = 0.06 + chars * per * (0.85 + Math.random() * 0.3);
  const color = getComputedStyle(w).color;
  tl.fromTo(w, { '--r': 100 }, {
    '--r': 0, duration: dur, ease: 'none',
    onStart: () => squeak(Math.min(0.3, dur * 0.8), fs / 120),
    onUpdate() {
      if (!tl.isActive()) return;
      const p = this.progress(); const r = w.getBoundingClientRect();
      handTo(r.left + r.width * p, r.top + r.height * (0.62 + Math.sin(p * 30) * 0.08), color);
    },
  }, at);
  tl.to({}, { duration: 0.04 + Math.random() * 0.08 });
  return dur;
}

/** Reveal a word again after it was wiped. */
export function rewrite(ws: HTMLElement[]) {
  if (!ws.length) return;
  const tl = gsap.timeline();
  ws.forEach((w) => { tl.set(w, { '--r': 100 }); tl.call(() => w.classList.remove('smear')); writeWord(tl, w); });
  tl.eventCallback('onComplete', () => { ws.forEach((w) => { w.classList.remove('smear'); w.style.setProperty('--r', '0'); }); if (!current) idle = setTimeout(handHide, 700); });
  tl.timeScale(1.8);
}

/* ───────── shapes (rough.js) ───────── */
export type Box = { x: number; y: number; w: number; h: number; r: number; b: number; cx: number; cy: number };
export type Shape =
  | { k: 'rect'; b: Box; pad?: number; c?: string; sw?: number; after?: string; seed?: number }
  | { k: 'line'; pts: [number, number][]; c?: string; sw?: number; after?: string; arrow?: boolean; seed?: number }
  | { k: 'ellipse'; b: Box; pad?: number; c?: string; sw?: number; after?: string; seed?: number }
  | { k: 'path'; d: string; c?: string; sw?: number; after?: string; seed?: number };

const gen = rough.generator();
const NS = 'http://www.w3.org/2000/svg';

function paths(s: Shape, i: number): { d: string; c: string; sw: number }[] {
  const c = s.c ?? INK.k, sw = s.sw ?? 4;
  const o = { stroke: c, strokeWidth: sw, roughness: 1.1, bowing: 1.2, seed: s.seed ?? 7 + i * 13, disableMultiStroke: true, preserveVertices: false };
  let dr;
  if (s.k === 'rect') { const p = s.pad ?? 14; dr = gen.rectangle(s.b.x - p, s.b.y - p, s.b.w + p * 2, s.b.h + p * 2, o); }
  else if (s.k === 'ellipse') { const p = s.pad ?? 18; dr = gen.ellipse(s.b.cx, s.b.cy, s.b.w + p * 2, s.b.h + p * 2, o); }
  else if (s.k === 'path') dr = gen.path(s.d, { ...o, roughness: 0.6 });
  else {
    const out = [] as { d: string; c: string; sw: number }[];
    const pts = s.pts;
    dr = pts.length > 2 ? gen.curve(pts, o) : gen.line(pts[0][0], pts[0][1], pts[1][0], pts[1][1], o);
    gen.toPaths(dr).forEach((p) => out.push({ d: p.d, c, sw }));
    if (s.arrow) {
      const [a, b] = [pts[pts.length - 2], pts[pts.length - 1]];
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = 18;
      const h1 = [b[0] - L * Math.cos(ang - 0.5), b[1] - L * Math.sin(ang - 0.5)];
      const h2 = [b[0] - L * Math.cos(ang + 0.5), b[1] - L * Math.sin(ang + 0.5)];
      out.push({ d: `M${h1[0].toFixed(1)} ${h1[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}L${h2[0].toFixed(1)} ${h2[1].toFixed(1)}`, c, sw });
    }
    return out;
  }
  return gen.toPaths(dr).map((p) => ({ d: p.d, c, sw }));
}

/** Draw shapes into an svg. Returns, per shape, its path elements. */
export function drawShapes(svg: SVGSVGElement, shapes: Shape[]) {
  svg.replaceChildren();
  return shapes.map((s, i) => paths(s, i).map((p) => {
    const el = document.createElementNS(NS, 'path');
    el.setAttribute('d', p.d); el.setAttribute('stroke', p.c); el.setAttribute('stroke-width', String(p.sw));
    el.setAttribute('fill', 'none'); el.setAttribute('stroke-linecap', 'round'); el.setAttribute('stroke-linejoin', 'round');
    svg.append(el);
    return el;
  }));
}

/** Add a shape's strokes to a timeline at hand speed, with the marker on the nib. */
export function strokeShape(tl: gsap.core.Timeline, els: SVGPathElement[]) {
  els.forEach((el) => {
    let len = 200; try { len = el.getTotalLength(); } catch { /* */ }
    const dur = Math.min(1.1, 0.12 + len / 1500);
    const color = el.getAttribute('stroke') || INK.k;
    tl.fromTo(el, { drawSVG: '0%' }, {
      drawSVG: '100%', duration: dur, ease: 'power1.inOut',
      onStart: () => squeak(Math.min(0.35, dur), 0.3),
      onUpdate() {
        if (!tl.isActive()) return;
        try {
          const p = this.progress(), pt = el.getPointAtLength(len * p), m = el.getScreenCTM();
          if (m) handTo(m.a * pt.x + m.c * pt.y + m.e, m.b * pt.x + m.d * pt.y + m.f, color);
        } catch { /* */ }
      },
    });
    tl.to({}, { duration: 0.05 });
  });
}

/** A box relative to an ancestor, from layout (ignores the panel's flip transform). */
export function boxOf(el: HTMLElement | null, root: HTMLElement): Box {
  let x = 0, y = 0, n: HTMLElement | null = el;
  while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent as HTMLElement | null; if (n && n !== root && !root.contains(n)) break; }
  const w = el?.offsetWidth ?? 0, h = el?.offsetHeight ?? 0;
  return { x, y, w, h, r: x + w, b: y + h, cx: x + w / 2, cy: y + h / 2 };
}
