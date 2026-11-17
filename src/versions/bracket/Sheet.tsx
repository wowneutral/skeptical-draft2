import { useEffect, useMemo, useRef, useState } from 'react';
import marks from '@/lib/marks.json';
import { gsap, scroll, scrollToId } from '@/lib/scroll';
import { clamp, still } from '@/lib/utils';
import { build, fit, inside, mixCam, union, ROUNDS, type Cam, type Geo } from './geo';

export const IDS = ['manifesto', 'record', 'drive', 'people', 'join'];

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const sstep = (a: number, b: number, t: number) => { const x = clamp((t - a) / (b - a)); return x * x * (3 - 2 * x); };

type Seg = { y0: number; y1: number; a: Cam; b: Cam; mid?: Cam; p0: number; p1: number };

function overview(g: Geo, vw: number, vh: number): Cam {
  const box = g.phone
    ? { x: 16, y: 56, w: vw - 32, h: vh * 0.54 - 64 }
    : { x: 56, y: 56, w: vw - 112, h: vh * 0.64 - 76 };
  return fit(g.bounds, box, vw, vh);
}

function plan(g: Geo, vw: number, vh: number): Seg[] {
  const top = (id: string) => { const el = document.getElementById(id); return el ? el.getBoundingClientRect().top + window.scrollY : 0; };
  const bot = (id: string) => { const el = document.getElementById(id); return el ? el.getBoundingClientRect().bottom + window.scrollY : 0; };
  const over = overview(g, vw, vh);
  const cams = g.fields.map((f) => inside(f, g.phone, vw, vh));
  const drift = (c: Cam): Cam => ({ ...c, s: c.s * 1.07 });
  const segs: Seg[] = [];
  segs.push({ y0: 0, y1: top(IDS[0]) - vh, a: over, b: cams[0], p0: g.stub, p1: g.stops[0] });
  for (let r = 0; r < 5; r++) {
    const enter = top(IDS[r]) - vh, leave = bot(IDS[r]) - vh * 0.2;
    segs.push({ y0: enter, y1: leave, a: cams[r], b: drift(cams[r]), p0: g.stops[r], p1: g.stops[r] });
    if (r < 4) {
      const pad = g.phone ? 40 : 60;
      const mid = fit(union(g.fields[r], g.fields[r + 1], pad), { x: 24, y: 24, w: vw - 48, h: vh - 48 }, vw, vh);
      mid.s = Math.min(Math.max(mid.s, over.s * 1.35), over.s * 2.6);
      segs.push({ y0: leave, y1: top(IDS[r + 1]) - vh, a: drift(cams[r]), b: cams[r + 1], mid, p0: g.stops[r], p1: g.stops[r + 1] });
    } else {
      segs.push({ y0: leave, y1: top('end'), a: drift(cams[r]), b: over, p0: 1, p1: 1 });
    }
  }
  return segs;
}

function sample(segs: Seg[], y: number): { cam: Cam; p: number } {
  if (y <= segs[0].y0) return { cam: segs[0].a, p: segs[0].p0 };
  for (const s of segs) {
    if (y <= s.y1) {
      const t = clamp((y - s.y0) / Math.max(1, s.y1 - s.y0));
      const p = s.p0 + (s.p1 - s.p0) * sstep(0.12, 0.88, t);
      if (s.mid) {
        const cam = t < 0.5 ? mixCam(s.a, s.mid, ease(t / 0.5)) : mixCam(s.mid, s.b, ease((t - 0.5) / 0.5));
        return { cam, p };
      }
      return { cam: mixCam(s.a, s.b, ease(t)), p };
    }
  }
  const l = segs[segs.length - 1];
  return { cam: l.b, p: l.p1 };
}

/** The fixed bracket behind the page. The scroll is the camera. */
export function Sheet() {
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 760);
  const g = useMemo(() => build(phone), [phone]);
  const svg = useRef<SVGSVGElement>(null);
  const red = useRef<SVGPathElement>(null);
  const nib = useRef<SVGCircleElement>(null);
  const skep = useRef<SVGTextElement>(null);
  const mark = useRef<SVGGElement>(null);
  const heads = useRef<(HTMLButtonElement | null)[]>([]);
  const [hot, setHot] = useState(-1);
  const moved = useRef(false);

  useEffect(() => {
    const onR = () => setPhone(window.innerWidth <= 760);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  useEffect(() => {
    const el = svg.current!, path = red.current!;
    let vw = window.innerWidth, vh = window.innerHeight;
    let segs = plan(g, vw, vh);
    let over = overview(g, vw, vh);
    const replan = () => { vw = window.innerWidth; vh = window.innerHeight; segs = plan(g, vw, vh); over = overview(g, vw, vh); };
    const t1 = setTimeout(replan, 300), t2 = setTimeout(replan, 1500);
    window.addEventListener('resize', replan);
    const ro = new ResizeObserver(replan);
    ro.observe(document.body);

    const first = still ? { cam: over, p: 1 } : sample(segs, window.scrollY);
    const cam = { ...first.cam };
    let p = still ? 1 : g.stub * 0.15; // the opening: the stub is drawn as the page arrives
    const born = performance.now();
    const pan = { x: 0, y: 0, vx: 0, vy: 0, held: false };
    const len = path.getTotalLength();

    const draw = () => {
      const s = cam.s;
      const cx = cam.cx - pan.x / s, cy = cam.cy - pan.y / s;
      const w = vw / s, h = vh / s;
      el.setAttribute('viewBox', `${(cx - w / 2).toFixed(2)} ${(cy - h / 2).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
      el.style.setProperty('--k', String(1 / s));
      path.style.strokeDashoffset = String(1 - p);
      const pt = path.getPointAtLength(clamp(p) * len);
      nib.current!.setAttribute('cx', String(pt.x));
      nib.current!.setAttribute('cy', String(pt.y));
      nib.current!.setAttribute('r', String(3.2 / s));
      const z = s / over.s;
      const fade = clamp(1 - (z - 1.6) / 3);
      if (skep.current) skep.current.style.opacity = String(fade);
      if (mark.current) mark.current.style.opacity = String(clamp(1 - (z - 1.25) / 0.9));
      const hv = clamp(1 - (z - 1.08) / 0.25);
      heads.current.forEach((b, r) => {
        if (!b) return;
        const c = g.cols[r];
        const x = (c.x - cx) * s + vw / 2, y = (c.y - cy) * s + vh / 2;
        b.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        b.style.width = `${(c.w * s).toFixed(1)}px`;
        b.style.height = `${(c.h * s).toFixed(1)}px`;
        b.style.opacity = String(hv);
        b.style.pointerEvents = hv > 0.4 ? 'auto' : 'none';
      });
    };

    const tick = (_t: number, dms: number) => {
      const dt = Math.min(0.05, dms / 1000);
      if (!still) {
        const { cam: tc, p: tp } = sample(segs, scroll.y || window.scrollY);
        const k = 1 - Math.exp(-dt * 6.5);
        cam.s = Math.exp(Math.log(cam.s) + (Math.log(tc.s) - Math.log(cam.s)) * k);
        cam.cx += (tc.cx - cam.cx) * k;
        cam.cy += (tc.cy - cam.cy) * k;
        const intro = sstep(0.25, 1.6, (performance.now() - born) / 1000);
        const target = Math.max(g.stub * 0.15, tp * intro + g.stub * 0.15 * (1 - intro));
        p += (target - p) * (1 - Math.exp(-dt * 5));
        if (!pan.held) {
          // a spring with a little give, so the sheet settles back with weight
          pan.vx += (-120 * pan.x - 14 * pan.vx) * dt; pan.vy += (-120 * pan.y - 14 * pan.vy) * dt;
          pan.x += pan.vx * dt; pan.y += pan.vy * dt;
        }
      }
      draw();
    };
    draw();
    if (!still) gsap.ticker.add(tick);

    // Drag anywhere on the sheet to pan it.
    let sx = 0, sy = 0, lx = 0, ly = 0, id = -1, touch = false;
    const down = (e: PointerEvent) => {
      if (still || e.button > 0) return;
      const t = e.target as HTMLElement;
      if (t.closest('a, p, h1, h2, h3, dt, dd, li, input, .v-bracket .join')) return;
      if (!t.closest('.v-bracket')) return;
      id = e.pointerId; touch = e.pointerType !== 'mouse';
      sx = lx = e.clientX; sy = ly = e.clientY; moved.current = false; pan.held = true;
      document.documentElement.classList.add('bk-grab');
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      if (Math.hypot(e.clientX - sx, e.clientY - sy) > 6) moved.current = true;
      const lim = vw * 0.6;
      pan.x = clamp(pan.x + dx, -lim, lim);
      if (!touch) pan.y = clamp(pan.y + dy, -vh * 0.6, vh * 0.6);
      pan.vx = dx / 0.016; pan.vy = touch ? 0 : dy / 0.016;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1; pan.held = false;
      if (moved.current) setHot(-1);
      pan.vx = clamp(pan.vx, -2500, 2500) * 0.3; pan.vy = clamp(pan.vy, -2500, 2500) * 0.3;
      document.documentElement.classList.remove('bk-grab');
    };
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);

    return () => {
      clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener('resize', replan);
      ro.disconnect();
      gsap.ticker.remove(tick);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [g]);

  const q = marks.roman;
  const ms = g.mark.size / 1540;

  return (
    <div className="sheet" data-hot={hot}>
      <svg ref={svg} className="sheet-svg" aria-hidden="true" preserveAspectRatio="none">
        <g className="rules">
          {g.rules.map((l, i) => (
            <line key={i} className={`r${l.r}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
        <g className="skep-in"><text ref={skep} className="skep" x={g.skep.x} y={g.skep.y} fontSize={g.skep.size}>SKEPTICAL</text></g>
        <g ref={mark} transform={`translate(${g.mark.x} ${g.mark.y - g.mark.size / 2}) scale(${ms})`}>
          <path className="mark mark-in" d={q.d} />
        </g>
        <path ref={red} className="red" d={g.path} pathLength={1} />
        <circle ref={nib} className="nib" r={2} />
      </svg>
      <div className="heads">
        {ROUNDS.map((name, r) => (
          <button
            key={name}
            ref={(b) => { heads.current[r] = b; }}
            className={`head h${r}`}
            onPointerEnter={() => setHot(r)}
            onPointerLeave={() => setHot(-1)}
            onFocus={() => setHot(r)}
            onBlur={() => setHot(-1)}
            onClick={(e) => { if (moved.current) { e.preventDefault(); moved.current = false; return; } scrollToId(IDS[r]); }}
          >
            <span className="head-name">{name}</span>
            <span className="sr-only-x">, go to this round</span>
          </button>
        ))}
      </div>
    </div>
  );
}
