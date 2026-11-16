// A redaction bar: real DOM text underneath, an inked canvas on top.
// Drag across it to lift the marker, press and hold to x-ray through it,
// Enter or Space when focused lifts it at once. The text is always in the DOM.
import { createElement, useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import marks from '@/lib/marks.json';
import { still } from '@/lib/utils';
import { useFile } from './store';

const Q = typeof Path2D !== 'undefined' ? new Path2D(marks.italic.d) : null;
const PAD = 16;

const rng = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const hash = (s: string) => {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 2147483647;
  return h || 1;
};

type Box = { x: number; y: number; w: number; h: number };

function paint(c: HTMLCanvasElement, host: HTMLElement, text: HTMLElement, seed: number) {
  const r = host.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const W = r.width + PAD * 2, H = r.height + PAD * 2;
  c.width = Math.ceil(W * dpr);
  c.height = Math.ceil(H * dpr);
  c.style.width = W + 'px';
  c.style.height = H + 'px';
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
  const rand = rng(seed);
  const boxes: Box[] = [];
  // merge rects that sit on the same line
  const raw = Array.from(text.getClientRects()).filter((q) => q.width > 2);
  for (const q of raw) {
    const last = boxes[boxes.length - 1];
    const y = q.top - r.top + PAD, x = q.left - r.left + PAD;
    if (last && Math.abs(last.y - y) < 4) { last.w = Math.max(last.x + last.w, x + q.width) - last.x; continue; }
    boxes.push({ x, y, w: q.width, h: q.height });
  }
  for (const b of boxes) {
    const ex = b.h * 0.14, ey = b.h * 0.02;
    const x0 = b.x - ex + (rand() - 0.5) * 3, x1 = b.x + b.w + ex + (rand() - 0.3) * b.h * 0.3;
    const y0 = b.y + ey + (rand() - 0.5) * 2, y1 = b.y + b.h - ey + (rand() - 0.5) * 2;
    g.save();
    // misregistration: every bar sits a hair off true
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    g.translate(cx, cy);
    g.rotate((rand() - 0.5) * 0.014);
    g.translate(-cx, -cy);
    const p = new Path2D();
    const step = 9;
    p.moveTo(x0 + (rand() - 0.5) * 3, y0);
    for (let x = x0; x <= x1; x += step) p.lineTo(x, y0 + (rand() - 0.5) * b.h * 0.05);
    p.lineTo(x1 + (rand() - 0.5) * 4, y0 + b.h * 0.2);
    p.lineTo(x1 + (rand() - 0.2) * 5, y1 - b.h * 0.25);
    for (let x = x1; x >= x0; x -= step) p.lineTo(x, y1 + (rand() - 0.5) * b.h * 0.05);
    p.lineTo(x0 - rand() * 3, y1 - b.h * 0.3);
    p.closePath();
    g.fillStyle = '#0a0a0a';
    g.fill(p);
    g.clip(p);
    // marker strokes: faint lighter streaks running along the bar
    for (let i = 0; i < b.h / 2.2; i++) {
      g.strokeStyle = `rgba(70,70,66,${0.05 + rand() * 0.1})`;
      g.lineWidth = 0.6 + rand() * 1.6;
      const yy = y0 + rand() * (y1 - y0);
      g.beginPath();
      g.moveTo(x0 + rand() * 40, yy);
      g.bezierCurveTo(cx - 80, yy + (rand() - 0.5) * 3, cx + 80, yy + (rand() - 0.5) * 3, x1 - rand() * 60, yy + (rand() - 0.5) * 2);
      g.stroke();
    }
    // toner speckle
    const n = Math.min(900, ((x1 - x0) * (y1 - y0)) / 40);
    for (let i = 0; i < n; i++) {
      g.fillStyle = `rgba(110,110,104,${0.08 + rand() * 0.22})`;
      const s = rand() * 1.4 + 0.3;
      g.fillRect(x0 + rand() * (x1 - x0), y0 + rand() * (y1 - y0), s, s);
    }
    // dry end: the marker runs out a little at the right
    for (let i = 0; i < 14; i++) {
      g.clearRect(x1 - rand() * b.h * 0.5, y0 + rand() * (y1 - y0), rand() * 6 + 2, rand() * 1.6 + 0.4);
    }
    // the censor's question marks
    if (Q) {
      const qh = (y1 - y0) * 0.66;
      const gap = Math.max(qh * 3.4, 90);
      const count = Math.max(1, Math.floor((x1 - x0) / gap));
      const span = (x1 - x0) / count;
      for (let i = 0; i < count; i++) {
        const qx = x0 + span * (i + 0.5) + (rand() - 0.5) * span * 0.3;
        const s = qh / 1540;
        g.save();
        g.translate(qx, cy + (rand() - 0.5) * 2);
        g.rotate((rand() - 0.5) * 0.12);
        g.scale(s, s);
        g.fillStyle = 'rgba(244,242,234,0.94)';
        g.fill(Q);
        g.restore();
      }
    }
    g.restore();
  }
  return boxes;
}

function inkLeft(c: HTMLCanvasElement) {
  const g = c.getContext('2d', { willReadFrequently: true })!;
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4 * 23) if (d[i] > 40) n++;
  return n;
}

type P = { id: string; as?: string; className?: string; children: ReactNode; auto?: number; label?: string };

export function Bar({ id, as = 'p', className, children, auto }: P) {
  const host = useRef<HTMLElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const lifted = useFile((s) => !!s.lifted[id]);
  const nonce = useFile((s) => s.nonce);
  const add = useFile((s) => s.add);
  const lift = useFile((s) => s.lift);
  const st = useRef({ boxes: [] as Box[], full: 1, down: false, lx: 0, ly: 0, moved: 0, n: 0, hold: 0, xr: 0 });
  const uid = useId();

  useEffect(() => { add(id); if (still) lift(id); }, [id, add, lift]);

  const redraw = useCallback(() => {
    const c = canvas.current, h = host.current, t = text.current;
    if (!c || !h || !t) return;
    st.current.boxes = paint(c, h, t, hash(id));
    st.current.full = Math.max(1, inkLeft(c));
  }, [id]);

  useEffect(() => {
    if (lifted) return;
    let alive = true;
    document.fonts.ready.then(() => alive && redraw());
    const ro = new ResizeObserver(() => redraw());
    if (host.current) ro.observe(host.current);
    return () => { alive = false; ro.disconnect(); };
  }, [lifted, nonce, redraw]);

  // the invitation: one bar wipes itself away
  useEffect(() => {
    if (!auto || still) return;
    let raf = 0;
    const t = window.setTimeout(() => {
      const c = canvas.current;
      if (!c || useFile.getState().lifted[id]) return;
      const g = c.getContext('2d')!;
      const b = st.current.boxes;
      const t0 = performance.now();
      const dur = 1100;
      let px = -1;
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - k, 3);
        g.globalCompositeOperation = 'destination-out';
        for (const bx of b) {
          const x = PAD - 20 + (bx.x + bx.w + 60) * e;
          const from = px < 0 ? PAD - 20 : PAD - 20 + (bx.x + bx.w + 60) * px;
          g.lineCap = 'round';
          g.lineWidth = bx.h * 1.25;
          g.beginPath();
          g.moveTo(from, bx.y + bx.h / 2);
          g.lineTo(x, bx.y + bx.h / 2 + Math.sin(k * 9) * 3);
          g.stroke();
        }
        px = e;
        if (k < 1) raf = requestAnimationFrame(tick);
        else lift(id);
      };
      raf = requestAnimationFrame(tick);
    }, auto);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [auto, id, lift]);

  const wipe = (x: number, y: number) => {
    const c = canvas.current!;
    const r = c.getBoundingClientRect();
    const g = c.getContext('2d', { willReadFrequently: true })!;
    const s = st.current;
    const lh = s.boxes[0]?.h ?? 40;
    const ax = s.lx - r.left, ay = s.ly - r.top, bx = x - r.left, by = y - r.top;
    g.globalCompositeOperation = 'destination-out';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.lineWidth = lh * 1.05;
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
    // bristle edges so the lift looks like a marker, not an eraser
    g.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const o = (Math.random() - 0.5) * lh * 1.7;
      g.globalAlpha = 0.5;
      g.beginPath(); g.moveTo(ax, ay + o); g.lineTo(bx, by + o); g.stroke();
    }
    g.globalAlpha = 1;
    s.n++;
    if (s.n % 5 === 0 && inkLeft(c) / s.full < 0.42) lift(id);
  };

  const onDown = (e: React.PointerEvent) => {
    const s = st.current;
    s.down = true; s.lx = e.clientX; s.ly = e.clientY; s.moved = 0;
    clearTimeout(s.hold); clearTimeout(s.xr);
    s.xr = window.setTimeout(() => { if (s.down && s.moved < 8) host.current?.classList.add('xray'); }, 180);
    s.hold = window.setTimeout(() => { if (s.down && s.moved < 8) lift(id); }, 1400);
    if (e.pointerType === 'mouse') (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s.down) return;
    const d = Math.hypot(e.clientX - s.lx, e.clientY - s.ly);
    if (d < 2) return;
    s.moved += d;
    if (s.moved > 8) { clearTimeout(s.hold); clearTimeout(s.xr); host.current?.classList.remove('xray'); }
    wipe(e.clientX, e.clientY);
    s.lx = e.clientX; s.ly = e.clientY;
  };
  const onUp = () => {
    const s = st.current;
    s.down = false;
    clearTimeout(s.hold); clearTimeout(s.xr);
    host.current?.classList.remove('xray');
  };

  return createElement(
    as,
    {
      ref: host,
      className: 'rx ' + (lifted ? 'is-up ' : '') + (className ?? ''),
      tabIndex: lifted ? undefined : 0,
      'aria-describedby': lifted ? undefined : uid,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (lifted || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault();
        lift(id);
      },
    },
    <span ref={text} className="rx-t">{children}</span>,
    lifted ? null : <span id={uid} className="sr-only-x"> (redacted line, press Enter to lift the bar)</span>,
    <canvas
      key={nonce}
      ref={canvas}
      aria-hidden="true"
      className="rx-c"
      style={{ left: -PAD, top: -PAD }}
      onPointerDown={lifted ? undefined : onDown}
      onPointerMove={lifted ? undefined : onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={onUp}
    />,
  );
}
