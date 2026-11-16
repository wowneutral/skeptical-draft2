// Version 26: the whiteboard. An unseen coach lectures the team onto a glossy rolling
// board as you scroll; you get four markers, an eraser and a "clean the board" sweep.
import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import '@fontsource/permanent-marker/400.css';
import '@fontsource/kalam/400.css';
import '@fontsource/kalam/700.css';
import './wb.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap, ScrollTrigger } from '@/lib/scroll';
import { clamp, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { COLORS, INK, boxOf, drawShapes, enqueue, hand, handHide, handTo, rewrite, strokeShape, wordStyle, writeWord, type Box, type Shape } from './ink';
import { soundOff, soundOn, squeak, tap } from './sound';

/* ───────── the visitor's tools ───────── */
type Tool = 'none' | 'marker' | 'eraser';
const tools = { tool: 'none' as Tool, color: 0 };
const say = { fn: (_s: string) => {} };

const A = ({ href, className, children, label }: { href: string; className?: string; children: React.ReactNode; label?: string }) => (
  <a className={className} href={href} aria-label={label} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

/** Marker text: real DOM words, revealed stroke by stroke. `mark` wraps one phrase so it can be underlined. */
function Ink({ as = 'p', id, text, mark, className, f }: { as?: string; id: string; text: string; mark?: string; className?: string; f?: 'pm' | 'ka' | 'cv' }) {
  const parts: React.ReactNode[] = [];
  const words = (s: string, key: string) => s.split(/\s+/).filter(Boolean).flatMap((w, i, arr) => {
    const el = <span key={key + i} className="wd" style={wordStyle(id + key + i + w)}>{w}</span>;
    return i < arr.length - 1 ? [el, ' '] : [el];
  });
  const i = mark ? text.indexOf(mark) : -1;
  if (mark && i >= 0) {
    const pre = text.slice(0, i), post = text.slice(i + mark.length);
    if (pre.trim()) parts.push(...words(pre, 'a'), ' ');
    parts.push(<span key="mk" className="mk" data-mk={id}>{words(mark, 'm')}</span>);
    if (post.trim()) parts.push(/^\s/.test(post) ? ' ' : '', ...words(post, 'z'));
  } else parts.push(...words(text, 'w'));
  return createElement(as, { 'data-w': id, className: [className, f].filter(Boolean).join(' ') }, parts);
}

/* ───────── one panel of the rolling board ───────── */
type Measure = (sel: string) => Box;
type BoardProps = {
  id?: string; label: string; className?: string; ghost?: string[]; children: React.ReactNode;
  shapes?: (m: Measure, phone: boolean) => Shape[]; auto?: boolean; arrive?: string; onWritten?: () => void; flip?: boolean;
};

function Board({ id, label, className, ghost = [], children, shapes, auto, arrive, onWritten, flip = true }: BoardProps) {
  const surf = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null), cv = useRef<HTMLCanvasElement>(null), glare = useRef<HTMLDivElement>(null);
  const state = useRef<{ started: boolean; groups: SVGPathElement[][]; shapes: Shape[]; tl?: gsap.core.Timeline }>({ started: false, groups: [], shapes: [] });

  const build = useCallback(() => {
    const root = surf.current, s = svg.current; if (!root || !s || !shapes) return;
    s.setAttribute('viewBox', `0 0 ${root.offsetWidth} ${root.offsetHeight}`);
    const m: Measure = (sel) => boxOf(root.querySelector(sel) as HTMLElement, root);
    const list = shapes(m, isPhone());
    state.current.shapes = list;
    state.current.groups = drawShapes(s, list);
    if (!still && !state.current.started) state.current.groups.flat().forEach((p) => gsap.set(p, { drawSVG: '0%' }));
  }, [shapes]);

  const start = useCallback(() => {
    const st = state.current, root = surf.current; if (st.started || !root) return;
    st.started = true;
    if (still) { onWritten?.(); return; }
    const tl = gsap.timeline();
    st.tl = tl;
    const used = new Set<number>();
    const ws = Array.from(root.querySelectorAll<HTMLElement>('[data-w]'));
    ws.forEach((el) => {
      const wid = el.dataset.w!;
      if (arrive && wid === arrive) {
        const words = el.querySelectorAll<HTMLElement>('.wd');
        words.forEach((w, i) => { if (i === words.length - 1) tl.addLabel('arrive'); writeWord(tl, w); });
      } else el.querySelectorAll<HTMLElement>('.wd').forEach((w) => writeWord(tl, w));
      st.shapes.forEach((sh, i) => { if (sh.after === wid) { used.add(i); strokeShape(tl, st.groups[i] ?? []); } });
    });
    st.shapes.forEach((_, i) => { if (!used.has(i)) strokeShape(tl, st.groups[i] ?? []); });
    // later redraws (resize) must not be hidden again
    enqueue(tl, () => { root.classList.add('done'); onWritten?.(); }, false, arrive ? 'arrive' : 0);
  }, [arrive, onWritten]);

  useEffect(() => {
    const root = surf.current!; let raf = 0;
    build();
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { build(); fitCanvas(); }); });
    ro.observe(root);
    const fitCanvas = () => {
      const c = cv.current; if (!c) return;
      const dpr = Math.min(2, devicePixelRatio || 1), w = root.offsetWidth, h = root.offsetHeight;
      if (c.width === Math.round(w * dpr) && c.height === Math.round(h * dpr)) return;
      const old = document.createElement('canvas'); old.width = c.width; old.height = c.height;
      if (c.width) old.getContext('2d')!.drawImage(c, 0, 0);
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      if (old.width) c.getContext('2d')!.drawImage(old, 0, 0, old.width, old.height, 0, 0, c.width * (old.width / c.width), c.height * (old.height / c.height));
    };
    fitCanvas();
    document.fonts?.ready.then(() => requestAnimationFrame(() => { build(); ScrollTrigger.refresh(); }));
    const triggers: ScrollTrigger[] = [];
    if (auto) { const t = setTimeout(start, 350); triggers.push({ kill: () => clearTimeout(t) } as unknown as ScrollTrigger); }
    else {
      triggers.push(ScrollTrigger.create({ trigger: root, start: 'top 70%', once: true, onEnter: start }));
      // the hand keeps pace with the reader: whatever has scrolled into view is already written
      if (!still) triggers.push(ScrollTrigger.create({
        trigger: root, start: 'top 60%', end: 'bottom 100%',
        onUpdate: (self) => {
          const st = state.current;
          if (!st.started && self.progress > 0) start();
          const tl = st.tl; if (!tl) return;
          const floor = Math.min(1, self.progress * 1.15);
          if (tl.progress() < floor) tl.progress(floor);
        },
      }));
    }
    if (!still) {
      if (flip) {
        const tw = gsap.fromTo(root, { rotateX: -38, y: 40, transformOrigin: '50% 0%' }, { rotateX: 0, y: 0, ease: 'none', scrollTrigger: { trigger: root, start: 'top bottom', end: 'top 55%', scrub: 0.6 } });
        triggers.push(tw.scrollTrigger!);
      }
      const g = gsap.fromTo(glare.current, { yPercent: -18 }, { yPercent: 18, ease: 'none', scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: true } });
      triggers.push(g.scrollTrigger!);
    }
    return () => { ro.disconnect(); cancelAnimationFrame(raf); triggers.forEach((t) => t.kill()); };
  }, [build, start, auto, flip]);

  /* the visitor's marker and eraser */
  const draw = useRef<{ pts: [number, number, number][]; w: number; words: HTMLElement[]; timers: Map<HTMLElement, number> } | null>(null);
  const local = (e: React.PointerEvent) => { const r = cv.current!.getBoundingClientRect(); const sx = cv.current!.width / r.width, sy = cv.current!.height / r.height; return [(e.clientX - r.left) * sx, (e.clientY - r.top) * sy, performance.now()] as [number, number, number]; };
  const ctx = () => cv.current!.getContext('2d')!;
  const down = (e: React.PointerEvent) => {
    if (tools.tool === 'none') return;
    cv.current!.setPointerCapture(e.pointerId);
    const p = local(e);
    draw.current = { pts: [p], w: 7, words: Array.from(surf.current!.querySelectorAll<HTMLElement>('.wd')), timers: new Map() };
    if (tools.tool === 'marker') { const c = ctx(); const dpr = cv.current!.width / cv.current!.getBoundingClientRect().width; c.fillStyle = COLORS[tools.color].c; c.beginPath(); c.arc(p[0], p[1], 3.5 * dpr, 0, 7); c.fill(); }
    else erase(e, p);
  };
  const erase = (e: React.PointerEvent, p: [number, number, number]) => {
    const c = ctx(), dpr = cv.current!.width / cv.current!.getBoundingClientRect().width, R = (isPhone() ? 26 : 38);
    c.save(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.ellipse(p[0], p[1], R * 1.3 * dpr, R * dpr, 0, 0, 7); c.fill(); c.restore();
    const d = draw.current!;
    const hit: HTMLElement[] = [];
    for (const w of d.words) {
      const r = w.getBoundingClientRect();
      if (e.clientX + R * 1.3 > r.left && e.clientX - R * 1.3 < r.right && e.clientY + R > r.top && e.clientY - R < r.bottom) hit.push(w);
    }
    let nope = false;
    hit.forEach((w) => {
      const keep = w.closest('.keep');
      if (keep) { nope = true; keep.classList.remove('nope'); void (keep as HTMLElement).offsetWidth; keep.classList.add('nope'); return; }
      w.classList.add('smear');
      w.style.setProperty('--sx', `${(Math.random() - 0.5) * 16}px`);
      clearTimeout(d.timers.get(w)); clearTimeout(Number(w.dataset.t || 0));
      w.dataset.t = String(window.setTimeout(() => rewrite([w]), 900));
    });
    if (nope) say.fn('That corner says do not erase.');
    if (hit.length) squeak(0.08, 0.1);
  };
  const move = (e: React.PointerEvent) => {
    const d = draw.current; if (!d) return;
    const p = local(e);
    if (tools.tool === 'eraser') { erase(e, p); return; }
    const l = d.pts[d.pts.length - 1];
    const dist = Math.hypot(p[0] - l[0], p[1] - l[1]); if (dist < 2) return;
    const dpr = cv.current!.width / cv.current!.getBoundingClientRect().width;
    const speed = dist / Math.max(1, p[2] - l[2]);
    const target = clamp(9 - speed * 2.4, 3.2, 9) * dpr;
    const w0 = d.w; d.w = d.w + (target - d.w) * 0.35;
    d.pts.push(p);
    const c = ctx(), n = d.pts.length;
    c.strokeStyle = COLORS[tools.color].c; c.lineCap = 'round'; c.lineJoin = 'round'; c.globalAlpha = 0.94;
    const a = d.pts[n - 3] ?? d.pts[n - 2], b = d.pts[n - 2];
    const m1 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], m2 = [(b[0] + p[0]) / 2, (b[1] + p[1]) / 2];
    c.lineWidth = (w0 + d.w) / 2;
    c.beginPath(); c.moveTo(m1[0], m1[1]); c.quadraticCurveTo(b[0], b[1], m2[0], m2[1]); c.stroke();
    c.globalAlpha = 1;
    if (speed > 0.25) squeak(0.1, clamp(speed / 3));
  };
  const up = () => { draw.current = null; };

  useEffect(() => {
    const onClean = () => {
      const c = cv.current; if (c) c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
      const vh = innerHeight, list: HTMLElement[] = [];
      surf.current!.querySelectorAll<HTMLElement>('.wd').forEach((w) => {
        if (w.closest('.keep')) return;
        const r = w.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
        w.classList.add('smear'); w.style.setProperty('--sx', `${(Math.random() - 0.5) * 22}px`); list.push(w);
      });
      if (list.length && state.current.started) setTimeout(() => rewrite(list), 650);
      else setTimeout(() => list.forEach((w) => w.classList.remove('smear')), 650);
    };
    addEventListener('wb:clean', onClean);
    return () => removeEventListener('wb:clean', onClean);
  }, []);

  return (
    <section id={id} className={'panel ' + (className ?? '')} aria-label={label}>
      <div className="frame">
        <div className="surf" ref={surf}>
          <div className="glare" ref={glare} aria-hidden="true"><i /><i /><i /></div>
          <div className="ghost" aria-hidden="true">{ghost.map((g, i) => <span key={i} className={'g' + i}>{g}</span>)}</div>
          <svg className="strokes" ref={svg} aria-hidden="true" />
          <div className="content">{children}</div>
          <canvas className="pad" ref={cv} aria-hidden="true" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} />
        </div>
      </div>
    </section>
  );
}

/* ───────── shapes per panel ───────── */
const heroShapes = (m: Measure, phone: boolean): Shape[] => {
  const h = m('[data-w="p1"]'), d0 = m('.door0'), d1 = m('.door1');
  const s = [0, 1, 2].map((i) => m(`[data-w="s${i}"]`));
  const out: Shape[] = [
    { k: 'line', pts: [[h.x, h.b + 10], [h.x + h.w * 0.45, h.b + 18], [h.x + h.w * 0.92, h.b + 6]], c: INK.r, sw: 6, after: 'p1' },
    ...s.map((b, i): Shape => ({ k: 'path', d: `M${b.x - 46} ${b.cy}l12 12l22 -28`, c: INK.r, sw: 5, after: `s${i}` })),
  ];
  if (!phone) {
    const from: [number, number] = [(d0.cx + d1.cx) / 2, h.b + 40];
    out.push({ k: 'line', pts: [from, [d0.cx + 30, (from[1] + d0.y) / 2 - 6], [d0.cx, d0.y - 22]], arrow: true, c: INK.k, sw: 4 });
    out.push({ k: 'line', pts: [from, [d1.cx - 30, (from[1] + d1.y) / 2 - 6], [d1.cx, d1.y - 22]], arrow: true, c: INK.k, sw: 4 });
  }
  out.push({ k: 'rect', b: d0, pad: 6, c: INK.k, sw: 5 }, { k: 'rect', b: d1, pad: 6, c: INK.r, sw: 5 });
  return out;
};

const maniShapes = (m: Measure): Shape[] => [0, 1, 2, 3].flatMap((i): Shape[] => {
  const n = m(`.num${i}`), k = m(`[data-mk="m${i}"]`);
  return [
    { k: 'ellipse', b: n, pad: 14, c: INK.r, sw: 4, after: `n${i}` },
    { k: 'line', pts: [[k.x - 4, k.b + 2], [k.cx, k.b + 7], [k.r + 6, k.b + 1]], c: INK.r, sw: 5, after: `m${i}` },
  ];
});

const recordShapes = (m: Measure, phone: boolean): Shape[] => {
  const t = m('.rtable'), rows = [0, 1].map((i) => m(`.rrow${i}`)), c1 = m('.rcol1'), c2 = m('.rcol2'), ev = m('.rev');
  const out: Shape[] = [
    { k: 'rect', b: ev, pad: 16, c: INK.k, sw: 3, after: 'ewhere' },
    { k: 'line', pts: [[t.x, t.y], [t.r, t.y + 4]], c: INK.k, sw: 4 },
    { k: 'line', pts: [[t.x, rows[1].y - 6], [t.r, rows[1].y - 8]], c: INK.k, sw: 3 },
    { k: 'line', pts: [[t.x, t.b + 4], [t.r, t.b]], c: INK.k, sw: 4 },
  ];
  if (!phone) out.push({ k: 'line', pts: [[c1.x - 18, t.y + 8], [c1.x - 16, t.b - 4]], c: INK.k, sw: 3 }, { k: 'line', pts: [[c2.x - 18, t.y + 8], [c2.x - 20, t.b - 4]], c: INK.k, sw: 3 });
  const w0 = m('[data-w="rw0"]');
  out.push({ k: 'ellipse', b: w0, pad: 16, c: INK.r, sw: 4, after: 'rw0' });
  return out;
};

const driveShapes = (m: Measure, phone: boolean): Shape[] => {
  const lk = m('.lockbox'), keep = m('.keep'), out: Shape[] = [];
  out.push({ k: 'rect', b: keep, pad: 4, c: INK.r, sw: 4, after: 'dl' });
  out.push({ k: 'rect', b: lk, pad: 0, c: INK.k, sw: 6, after: 'dl' });
  // padlock: shackle and body
  const pw = Math.min(lk.w, lk.h) * 0.42, px = lk.cx - pw / 2, py = lk.cy - pw * 0.1;
  out.push({ k: 'path', d: `M${px + pw * 0.2} ${py} L${px + pw * 0.2} ${py - pw * 0.35} C${px + pw * 0.2} ${py - pw * 0.85} ${px + pw * 0.8} ${py - pw * 0.85} ${px + pw * 0.8} ${py - pw * 0.35} L${px + pw * 0.8} ${py}`, c: INK.k, sw: 6, after: 'dl' });
  out.push({ k: 'rect', b: { x: px, y: py, w: pw, h: pw * 0.8, r: px + pw, b: py + pw * 0.8, cx: lk.cx, cy: py + pw * 0.4 }, pad: 0, c: INK.r, sw: 6, after: 'dl' });
  out.push({ k: 'path', d: `M${lk.cx} ${py + pw * 0.3} L${lk.cx} ${py + pw * 0.55}`, c: INK.r, sw: 6, after: 'dl' });
  for (let i = 0; i < 7; i++) {
    const it = m(`.dterm${i}`), row = m(`.ditem${i}`), edge = m('.dlist');
    if (phone) out.push({ k: 'line', pts: [[lk.x + 18, lk.b], [lk.x + 14, it.cy - 10], [it.x - 10, it.cy]], c: INK.k, sw: 3, after: `dt${i}` });
    else out.push({ k: 'line', pts: [[lk.r, lk.cy + (i - 3) * lk.h * 0.11], [(lk.r + it.x) / 2, it.cy + (lk.cy - it.cy) * 0.2], [it.x - 14, it.cy]], arrow: true, c: INK.k, sw: 3, after: `dt${i}` });
    out.push({ k: 'line', pts: [[row.x, row.b + 4], [edge.r + 60, row.b + 4]], c: INK.k, sw: 2, after: `dx${i}` });
  }
  return out;
};

const peopleShapes = (m: Measure): Shape[] => {
  const t = m('.tally'), out: Shape[] = [];
  const step = Math.min(30, t.w / 12), h = Math.max(54, t.h);
  for (let g = 0; g < 2; g++) {
    const gx = t.x + g * step * 6.2, n = g === 0 ? 5 : 3;
    for (let i = 0; i < Math.min(n, 4); i++) out.push({ k: 'line', pts: [[gx + i * step, t.y], [gx + i * step + 3, t.y + h]], c: INK.k, sw: 5, after: 'pc' });
    if (n === 5) out.push({ k: 'line', pts: [[gx - 10, t.y + h * 0.75], [gx + step * 3.4, t.y + h * 0.2]], c: INK.r, sw: 5, after: 'pc' });
  }
  return out;
};

const joinShapes = (m: Measure, phone: boolean): Shape[] => {
  const t = m('[data-w="jlead"]'), out: Shape[] = [];
  const bx = [0, 1, 2].map((i) => m(`.jpath${i}`));
  const root: [number, number] = phone ? [t.x + 24, t.b + 18] : [bx[1].cx, t.b + 24];
  const trunk: [number, number] = phone ? [t.x + 24, bx[0].y - 30] : [bx[1].cx, bx[0].y - 58];
  out.push({ k: 'line', pts: [root, trunk], c: INK.k, sw: 5, after: 'jt' });
  bx.forEach((b, i) => {
    if (phone) out.push({ k: 'line', pts: [[trunk[0], trunk[1]], [trunk[0] - 8, b.y + 30], [b.x + 4, b.y + 34]], arrow: true, c: INK.k, sw: 4, after: 'jt' });
    else out.push({ k: 'line', pts: [trunk, [(trunk[0] + b.cx) / 2, trunk[1] + 8], [b.cx, b.y - 20]], arrow: true, c: INK.k, sw: 4, after: 'jt' });
    out.push({ k: 'rect', b, pad: 4, c: i === 0 ? INK.r : INK.k, sw: 5, after: 'jt' });
  });
  return out;
};

/* ───────── coach cards on magnets ───────── */
function Card({ i, children }: { i: number; children: React.ReactNode }) {
  const el = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const setR = useRef<((v: number) => void) | null>(null);
  useEffect(() => { if (el.current) setR.current = gsap.quickTo(el.current, 'rotation', { duration: 0.6, ease: 'elastic.out(1, 0.4)' }); }, []);
  const place = (x: number, y: number, vx = 0) => {
    const box = el.current!.closest('.surf') as HTMLElement, c = el.current!;
    const maxX = box.offsetWidth * 0.5, maxY = box.offsetHeight * 0.4;
    pos.current = { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
    gsap.set(c, { x: pos.current.x, y: pos.current.y });
    setR.current?.(clamp(vx * 1.4, -14, 14) + (i ? 2 : -2));
  };
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; lx: number } | null>(null);
  return (
    <div className={'card c' + i} ref={el}
      onPointerDown={(e) => { if (tools.tool !== 'none' || (e.target as HTMLElement).closest('a')) return; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.current.x, oy: pos.current.y, lx: e.clientX }; el.current!.classList.add('held'); tap(); }}
      onPointerMove={(e) => { const d = drag.current; if (!d) return; place(d.ox + e.clientX - d.sx, d.oy + e.clientY - d.sy, e.clientX - d.lx); d.lx = e.clientX; }}
      onPointerUp={() => { if (!drag.current) return; drag.current = null; el.current!.classList.remove('held'); setR.current?.(i ? 2 : -2); tap(); }}>
      <button className="magnet" type="button" aria-label={`Magnet. Arrow keys move this card`}
        onKeyDown={(e) => {
          const k = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] }[e.key];
          if (k) { e.preventDefault(); place(pos.current.x + k[0], pos.current.y + k[1], k[0] / 3); setTimeout(() => setR.current?.(i ? 2 : -2), 200); }
        }} />
      {children}
    </div>
  );
}

/* ───────── tick boxes, ticked with your own marker ───────── */
function Tick({ name }: { name: string }) {
  const [on, setOn] = useState(false);
  const p = useRef<SVGPathElement>(null);
  const [c, setC] = useState<string>(COLORS[0].c);
  return (
    <button type="button" className={'tick' + (on ? ' on' : '')} aria-pressed={on}
      onClick={() => {
        const n = !on; setOn(n); setC(COLORS[tools.color].c);
        if (n) { squeak(0.18, 0.6); if (p.current && !still) gsap.fromTo(p.current, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.45, ease: 'power2.out' }); say.fn(`${name} ticked.`); }
      }}>
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M8 10 C22 8 44 9 56 8 C57 22 56 42 57 56 C42 57 22 56 8 57 C7 44 8 24 8 10" className="sq" />
        {on && <path ref={p} d="M14 34 C20 38 24 44 28 50 C34 36 44 20 60 4" style={{ stroke: c }} className="ck" />}
      </svg>
      <span className="tl">{on ? 'Ticked' : 'Tick it'}</span><span className="sr-only-x"> {name}</span>
    </button>
  );
}

/* ───────── marker tray ───────── */
function Marker({ c }: { c: string }) {
  return (
    <svg viewBox="0 0 120 30" aria-hidden="true" className="mk-svg">
      <rect x="2" y="6" width="80" height="18" rx="4" fill="#f4f4f1" stroke="#9aa0a8" />
      <rect x="10" y="6" width="44" height="18" fill={c} opacity="0.95" />
      <rect x="80" y="4" width="28" height="22" rx="5" fill={c} />
      <path d="M108 9 L117 13 L117 17 L108 21 Z" fill={c} />
    </svg>
  );
}

function Tray({ tool, color, set, sound, toggleSound, parked }: { tool: Tool; color: number; set: (t: Tool, c?: number) => void; sound: boolean; toggleSound: () => void; parked: boolean }) {
  return (
    <div className={'tray' + (parked ? ' parked' : '')} role="toolbar" aria-label="Marker tray">
      {COLORS.map((m, i) => (
        <button key={m.id} type="button" className={'tm' + (tool === 'marker' && color === i ? ' up' : '')} aria-pressed={tool === 'marker' && color === i} aria-label={`${m.label} marker`} onClick={() => set(tool === 'marker' && color === i ? 'none' : 'marker', i)}>
          <Marker c={m.c} />
        </button>
      ))}
      <button type="button" className={'te' + (tool === 'eraser' ? ' up' : '')} aria-pressed={tool === 'eraser'} aria-label="Eraser" onClick={() => set(tool === 'eraser' ? 'none' : 'eraser')}>
        <span className="felt" aria-hidden="true" />
      </button>
      <button type="button" className="tc" onClick={() => dispatchEvent(new Event('wb:sweep'))}>Clean</button>
      <button type="button" className="ts" aria-pressed={sound} onClick={toggleSound}>{sound ? 'Squeak on' : 'Squeak off'}</button>
    </div>
  );
}

/* ───────── the page ───────── */
export default function Whiteboard() {
  useVersion('whiteboard');
  const root = useRef<HTMLDivElement>(null), handEl = useRef<HTMLDivElement>(null), sweepEl = useRef<HTMLDivElement>(null), rubber = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>('none');
  const [color, setColor] = useState(0);
  const [sound, setSound] = useState(false);
  const [msg, setMsg] = useState('');
  const [parked, setParked] = useState(false);
  const [armed] = useState(() => !still);

  useEffect(() => { say.fn = (s) => { setMsg(''); requestAnimationFrame(() => setMsg(s)); }; hand.el = handEl.current; }, []);
  const set = (t: Tool, c?: number) => {
    tools.tool = t; setTool(t);
    if (c !== undefined) { tools.color = c; setColor(c); }
    tap();
    say.fn(t === 'none' ? 'Tool down. Scroll and click as normal.' : t === 'eraser' ? 'Eraser up. Wipe anything. It comes back.' : `${COLORS[c ?? tools.color].label} marker up. Draw anywhere.`);
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && tools.tool !== 'none') set('none'); };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  });

  // eraser follows the pointer
  useEffect(() => {
    const m = (e: PointerEvent) => { if (rubber.current) rubber.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`; };
    addEventListener('pointermove', m, { passive: true });
    return () => removeEventListener('pointermove', m);
  }, []);

  // clean the board: a sweep
  useEffect(() => {
    const go = () => {
      const s = sweepEl.current; if (!s) return;
      squeak(0.3, 0.05);
      if (still) { dispatchEvent(new Event('wb:clean')); say.fn('Board cleaned. The lecture is written back.'); return; }
      const W = innerWidth, H = innerHeight;
      const tl = gsap.timeline();
      tl.set(s, { autoAlpha: 1, x: -260, y: H * 0.12, rotate: -8 });
      for (let i = 0; i < 4; i++) tl.to(s, { x: i % 2 ? -260 : W + 40, y: H * (0.12 + i * 0.24), rotate: i % 2 ? -8 : 8, duration: 0.42, ease: 'power1.inOut', onStart: () => squeak(0.3, 0.1) });
      tl.call(() => dispatchEvent(new Event('wb:clean')), [], 0.5);
      tl.set(s, { autoAlpha: 0 });
      say.fn('Board cleaned. The lecture is written back.');
    };
    addEventListener('wb:sweep', go);
    return () => removeEventListener('wb:sweep', go);
  }, []);

  const toggleSound = async () => { if (sound) { soundOff(); setSound(false); } else { const ok = await soundOn(); setSound(ok); if (ok) squeak(0.25, 0.4); } };

  // the end of the lecture: the marker goes back in the tray
  const ended = useCallback(() => {
    if (still) { setParked(true); return; }
    const slot = document.querySelector('.v-whiteboard .tm') as HTMLElement | null, h = handEl.current;
    if (!slot || !h) return;
    const r = slot.getBoundingClientRect();
    const p = { x: hand.x, y: hand.y };
    gsap.to(p, { x: r.left + r.width / 2, y: r.top + 4, duration: 1.1, ease: 'power2.inOut', delay: 0.4, onUpdate: () => handTo(p.x, p.y), onComplete: () => { handHide(); setParked(true); tap(); say.fn('Marker down. Your turn: tick a box.'); setTimeout(() => setParked(false), 1600); } });
  }, []);


  return (
    <div ref={root} className={'v-whiteboard' + (armed ? ' armed' : '') + ' t-' + tool} style={{ '--pen': COLORS[color].c } as React.CSSProperties}>
      <a className="skip-x" href="#main">Skip to the lecture</a>
      <div className="hand" ref={handEl} aria-hidden="true"><svg viewBox="0 0 60 200"><rect x="14" y="40" width="32" height="150" rx="7" fill="#f4f4f1" stroke="#8d939b" strokeWidth="2" /><rect x="14" y="70" width="32" height="70" fill="var(--cap)" /><path d="M18 40 L24 12 L36 12 L42 40 Z" fill="#d9dbde" stroke="#8d939b" strokeWidth="2" /><path d="M25 12 L30 0 L35 12 Z" fill="var(--cap)" /></svg></div>
      <div className="sweeper" ref={sweepEl} aria-hidden="true"><span /></div>
      <div className="rubber" ref={rubber} aria-hidden="true"><span /></div>
      <p className="sr-only-x" aria-live="polite">{msg}</p>

      <main id="main">
        <Board label="The pitch" className="hero" auto arrive="p1" flip={false} shapes={heroShapes} ghost={['value: morality', 'weigh the impacts', 'extend the 1AC', 'turns case?']}>
          <header className="top">
            <p className="brand"><span className="cv note">Today’s lecture:</span> <span className="pm">{SITE.name}.</span></p>
            <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
          </header>
          <div className="hgrid">
            <h1 className="pitch">
              <span className="sr-only-x">{SITE.heading}. </span>
              <Ink as="span" id="p0" text={HERO.pitch[0]} className="l0" />
              <Ink as="span" id="p1" text={HERO.pitch[1]} className="l1" />
            </h1>
            <ul className="stmt" aria-label="In three lines">
              {HERO.statement.map((s, i) => <li key={i}><Ink as="span" id={`s${i}`} text={s} /></li>)}
            </ul>
            <div className="doors">
              {HERO.doors.map((d, i) => <A key={d.href} className={`door door${i}`} href={d.href}><Ink as="span" id={`d${i}`} text={d.label} /></A>)}
            </div>
          </div>
        </Board>

        <Board label="What we are" className="mani" shapes={maniShapes} ghost={['NC: skep', 'a priori', 'theory > K?']}>
          <p className="kicker cv">Write this down.</p>
          <ol className="mlist">
            {MANIFESTO.map((l, i) => (
              <li key={i} className={`ml ml${i}`}>
                <Ink as="span" id={`n${i}`} text={String(i + 1)} className={`num num${i}`} f="pm" />
                <Ink as="span" id={`m${i}`} text={l} className="mtxt" mark={[ 'No school, no fee.', 'both still competing.', 'it stays in the drive.', 'you don’t have to run it.'][i]} />
              </li>
            ))}
          </ol>
        </Board>

        <Board id="record" label={RECORD.title} className="rec" shapes={recordShapes} ghost={['ballot', 'RFD:', 'speaks']}>
          <h2 className="h2"><Ink as="span" id="rt" text={RECORD.title} /></h2>
          <Ink id="rr" text={RECORD.rule} className="lead" />
          <div className="rev">
            <Ink id="ewhen" text={RECORD.when} className="ewhen" f="cv" />
            <Ink id="ename" text={RECORD.name} className="ename" />
            <Ink id="ewhere" text={RECORD.where} className="ewhere" f="cv" />
          </div>
          <div className="rtable" role="table" aria-label="Results">
            {RECORD.results.map((r, i) => (
              <div key={r.who} className={`rrow rrow${i}`} role="row">
                <span role="cell" className={i === 0 ? 'rcol0' : ''}><Ink as="span" id={`rw${i}`} text={r.who} className="who" /></span>
                <span role="cell" className={i === 0 ? 'rcol1' : ''}><Ink as="span" id={`ra${i}`} text={r.what} className="what" /></span>
                <span role="cell" className={i === 0 ? 'rcol2' : ''}><Ink as="span" id={`rm${i}`} text={r.more} className="rmore" /></span>
              </div>
            ))}
          </div>
          <A className="more" href={RECORD.more.href}><Ink as="span" id="rx" text={RECORD.more.label} /> <span aria-hidden="true" className="arr">→</span></A>
        </Board>

        <Board id="drive" label={DRIVE.title} className="drv" shapes={driveShapes} ghost={['card the 1NC', 'frontlines', 'cut it']}>
          <h2 className="h2"><Ink as="span" id="dtt" text={DRIVE.title} /></h2>
          <div className="keep">
            <span className="keepl cv" aria-hidden="true">Do not erase</span>
            <Ink id="dl" text={DRIVE.lead} className="lead" />
          </div>
          <div className="dgrid">
            <div className="lockbox" role="img" aria-label="The drive, locked" />
            <ul className="dlist">
              {DRIVE.items.map((it, i) => (
                <li key={it.term} className={`ditem ditem${i}`}>
                  <Ink as="span" id={`dt${i}`} text={it.term} className={`dterm dterm${i}`} f="pm" />
                  <Ink as="span" id={`dx${i}`} text={it.text} className="dtext" />
                </li>
              ))}
            </ul>
          </div>
          <A className="more" href={DRIVE.more.href}><Ink as="span" id="dm" text={DRIVE.more.label} /> <span aria-hidden="true" className="arr">→</span></A>
        </Board>

        <Board id="people" label={PEOPLE.title} className="ppl" shapes={peopleShapes} ghost={['CX:', 'flow it', 'pref sheet']}>
          <h2 className="h2"><Ink as="span" id="pt" text={PEOPLE.title} /></h2>
          <div className="cards">
            {PEOPLE.coaches.map((c, i) => (
              <Card key={c.name} i={i}>
                <h3 className="cn">{c.name}</h3>
                <p className="cr">{c.role}</p>
                <p className="cb">{c.bio}</p>
              </Card>
            ))}
          </div>
          <div className="count">
            <span className="tally" aria-hidden="true" />
            <Ink id="pc" text={PEOPLE.count} className="pcount" />
          </div>
          <A className="more" href={PEOPLE.more.href}><Ink as="span" id="pm" text={PEOPLE.more.label} /> <span aria-hidden="true" className="arr">→</span></A>
        </Board>

        <Board id="join" label={JOIN.title} className="jn" shapes={joinShapes} onWritten={ended} ghost={['2AR', 'vote aff', 'collapse']}>
          <h2 className="h2"><Ink as="span" id="jt" text={JOIN.title} /></h2>
          <div className="jpaths">
            {JOIN.paths.map((p, i) => (
              <div key={p.id} className={`jpath jpath${i}`}>
                <h3 className="jname"><Ink as="span" id={`jn${i}`} text={p.name} /></h3>
                <Ink id={`jl${i}`} text={p.line} className="jline" />
                <Ink id={`jx${i}`} text={p.text[0]} className="jtext" />
                <div className="jrow">
                  <A className="jgo" href={p.href}>{p.name} <span aria-hidden="true">→</span></A>
                  <Tick name={p.name} />
                </div>
              </div>
            ))}
          </div>
          <div className="jfoot">
            <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>.</p>
            <p>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
            <p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
            <p>{JOIN.discord}</p>
          </div>
          <Ink id="jlead" text={JOIN.lead} className="jlead" />
        </Board>
      </main>

      <footer className="foot">
        <p className="fline">{FOOTER.line}</p>
        <ul className="flinks">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <ul className="fpages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <p className="draft">Draft 2, version 26. Not the live site.</p>
      </footer>

      <aside aria-label="Your marker"><Tray tool={tool} color={color} set={set} sound={sound} toggleSound={toggleSound} parked={parked} /></aside>
    </div>
  );
}
