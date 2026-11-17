// One plate: a constructed letter. Guides draw at the speed of a hand, the ink
// floods in, the accent points can be dragged and spring back, and pressing the
// letter rubs the ink out and constructs it again.
import { useEffect, useMemo, useRef } from 'react';
import { gsap, ScrollTrigger } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { at, guidePath, v, type Glyph, type Guide, type V } from './geo';

/** Where the straightedge line has got to: lines run past their points, as drawn. */
function lineAt(g: Extract<Guide, { k: 'l' }>, t: number): V {
  const d = Math.hypot(g.b.x - g.a.x, g.b.y - g.a.y) || 1, ux = (g.b.x - g.a.x) / d, uy = (g.b.y - g.a.y) / d;
  const s = -g.e + (d + 2 * g.e) * t;
  return v(g.a.x + ux * s, g.a.y + uy * s);
}

let uid = 0;

type Props = {
  g: Glyph;
  label: string;
  trigger?: 'load' | 'view' | 'go';
  go?: boolean;
  delay?: number;
  outline?: boolean;
  interactive?: boolean;
  onDone?: () => void;
  className?: string;
};

export default function Plate({ g, label, trigger = 'view', go, delay = 0, outline, interactive = true, onDone, className }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const cid = useMemo(() => `cmp-clip-${++uid}`, []);
  const first = useMemo(() => g.build(g.pts), [g]);
  const st = useRef({
    off: g.pts.map(() => v(0, 0)),
    vel: g.pts.map(() => v(0, 0)),
    tgt: g.pts.map(() => v(0, 0)),
    drag: -1, grab: v(0, 0), t: 0, i: 0, upp: 1, busy: false, played: false, running: false, keyT: 0 as number | ReturnType<typeof setTimeout>,
    tl: null as gsap.core.Timeline | null,
  }).current;
  const api = useRef({ play: () => {}, draw: () => {} });
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const el = svg.current!;
    const guides = [...el.querySelectorAll<SVGPathElement>('[data-g]')];
    const inks = [...el.querySelectorAll<SVGPathElement>('[data-i]')];
    const marks = [...el.querySelectorAll<SVGCircleElement>('[data-m]')];
    const hands = [...el.querySelectorAll<SVGGElement>('[data-h]')];
    const clip = el.querySelector<SVGCircleElement>('[data-clip]')!;
    const tip = el.querySelector<SVGCircleElement>('[data-tip]')!;
    const [vx, vy, vw, vh] = g.vb;
    const diag = Math.hypot(vw, vh);
    const n = guides.length;
    const w = Math.min(0.42, 2.6 / n);

    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) st.upp = Math.max(vw / r.width, vh / r.height);
      el.style.setProperty('--u', String(st.upp));
    };
    measure();
    const ro = new ResizeObserver(() => { measure(); draw(); });
    ro.observe(el);

    const cur = (): V[] => g.pts.map((q, k) => v(q.x + st.off[k].x, q.y + st.off[k].y));

    function draw() {
      const p = cur();
      const b = g.build(p);
      let head: V | null = null;
      for (let k = 0; k < n; k++) {
        const s = n > 1 ? (k * (1 - w)) / (n - 1) : 0;
        const loc = Math.min(1, Math.max(0, (st.t - s) / w));
        if (loc > 0 && loc < 1) {
          const gd = b.guides[k];
          head = gd.k === 'c' ? at(gd.c, gd.r, gd.s + 360 * loc) : lineAt(gd, loc);
        }
        const e = guides[k];
        e.setAttribute('d', guidePath(b.guides[k]));
        e.style.strokeDashoffset = String(1 - loc);
        e.style.opacity = loc > 0 ? '1' : '0';
      }
      if (head) { tip.setAttribute('cx', String(head.x)); tip.setAttribute('cy', String(head.y)); tip.setAttribute('r', String(3.4 * st.upp)); }
      else tip.setAttribute('r', '0');
      inks.forEach((e, k) => e.setAttribute('d', b.ink[k]));
      clip.setAttribute('cx', String(b.from.x));
      clip.setAttribute('cy', String(b.from.y));
      clip.setAttribute('r', String(st.i >= 1 ? diag * 2 : st.i * diag * 0.9));
      const mOn = Math.min(1, Math.max(0, (st.t - 0.15) * 4));
      marks.forEach((e, k) => {
        const m = b.marks[k];
        e.setAttribute('cx', String(m.x)); e.setAttribute('cy', String(m.y));
        e.setAttribute('r', String(2.6 * st.upp));
        e.style.opacity = String(mOn);
      });
      const hOn = Math.min(1, st.t * 6);
      const hp = b.hp ?? p;
      hands.forEach((e, k) => {
        e.setAttribute('transform', `translate(${hp[k].x} ${hp[k].y})`);
        const [dot, hit] = e.querySelectorAll('circle');
        dot.setAttribute('r', String((st.drag === k ? 8.5 : 6) * st.upp * hOn));
        hit.setAttribute('r', String(24 * st.upp));
      });
    }

    // Springs: points are pulled to their target (rest, or a lean toward the pointer).
    const K = 230, D = still ? 60 : 15;
    function tick() {
      const steps = Math.max(1, Math.min(4, Math.round(gsap.ticker.deltaRatio(60))));
      let live = st.drag >= 0;
      for (let s = 0; s < steps; s++) {
        for (let k = 0; k < g.pts.length; k++) {
          if (k === st.drag) continue;
          const o = st.off[k], vl = st.vel[k], t = st.tgt[k];
          const ax = -K * (o.x - t.x) - D * vl.x, ay = -K * (o.y - t.y) - D * vl.y;
          vl.x += ax / 60; vl.y += ay / 60;
          o.x += vl.x / 60; o.y += vl.y / 60;
        }
      }
      for (let k = 0; k < g.pts.length; k++) {
        if (k === st.drag) continue;
        const o = st.off[k], vl = st.vel[k], t = st.tgt[k];
        if (Math.abs(o.x - t.x) > 0.3 || Math.abs(o.y - t.y) > 0.3 || Math.abs(vl.x) > 0.5 || Math.abs(vl.y) > 0.5) live = true;
        else { o.x = t.x; o.y = t.y; vl.x = 0; vl.y = 0; }
      }
      draw();
      if (!live) { gsap.ticker.remove(tick); st.running = false; }
    }
    const wake = () => { if (!st.running) { st.running = true; gsap.ticker.add(tick); } };

    const toVB = (e: PointerEvent): V => {
      const m = el.getScreenCTM();
      if (!m) return v(0, 0);
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
      return v(pt.x, pt.y);
    };
    const MAXR = Math.min(vw, vh) * 0.3;
    const soft = (x: number, y: number) => {
      const l = Math.hypot(x, y);
      if (l < 1e-3) return v(0, 0);
      const s = (MAXR * Math.tanh(l / MAXR)) / l;
      return v(x * s, y * s);
    };

    function play() {
      if (st.busy) return;
      st.played = true;
      if (still) { st.t = 1; st.i = 1; draw(); el.classList.add('is-done'); doneRef.current?.(); return; }
      st.busy = true;
      st.tl?.kill();
      el.classList.remove('is-done');
      st.tl = gsap.timeline({ delay, onComplete: () => { st.busy = false; el.classList.add('is-done'); doneRef.current?.(); } })
        .to(st, { t: 1, duration: g.dur, ease: 'sine.inOut', onUpdate: draw })
        .to(st, { i: 1, duration: 0.95, ease: 'power2.inOut', onUpdate: draw }, '-=0.25');
    }
    function rubOut() {
      if (st.busy || !st.played || still) { if (still) play(); return; }
      st.busy = true;
      st.tl?.kill();
      el.classList.remove('is-done');
      el.classList.add('is-rub');
      st.tl = gsap.timeline({ onComplete: () => { el.classList.remove('is-rub'); st.busy = false; play(); } })
        .to(st, { i: 0, duration: 0.55, ease: 'power3.in', onUpdate: draw })
        .to(st, { t: 0, duration: 0.7, ease: 'power2.inOut', onUpdate: draw }, '-=0.05')
        .to({}, { duration: 0.2 });
    }
    api.current = { play, draw };

    // Pointer: drag a point, or lean the nearest points toward the cursor.
    const onDown = (e: PointerEvent) => {
      const h = (e.target as Element).closest('[data-h]');
      if (!h || !interactive) return;
      const k = Number(h.getAttribute('data-h'));
      const p = toVB(e);
      st.drag = k;
      st.grab = v(p.x - (g.pts[k].x + st.off[k].x), p.y - (g.pts[k].y + st.off[k].y));
      (h as Element).setPointerCapture?.(e.pointerId);
      el.classList.add('is-drag');
      e.preventDefault();
      wake();
    };
    const onMove = (e: PointerEvent) => {
      if (!interactive) return;
      const p = toVB(e);
      if (st.drag >= 0) {
        const k = st.drag;
        st.off[k] = soft(p.x - st.grab.x - g.pts[k].x, p.y - st.grab.y - g.pts[k].y);
        draw();
        return;
      }
      if (e.pointerType !== 'mouse' || still || !st.played) return;
      const reach = 150 * st.upp;
      g.pts.forEach((q, k) => {
        const dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy);
        const f = d < reach ? 0.22 * (1 - d / reach) : 0;
        st.tgt[k] = v(dx * f, dy * f);
      });
      wake();
    };
    const onUp = () => {
      if (st.drag < 0) return;
      st.drag = -1;
      el.classList.remove('is-drag');
      if (still) { st.off.forEach((o) => { o.x = 0; o.y = 0; }); draw(); return; }
      wake();
    };
    const onLeave = () => { st.tgt.forEach((t) => { t.x = 0; t.y = 0; }); wake(); };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', onLeave);

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as Element;
      if (t.hasAttribute('data-ink') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); rubOut(); return; }
      const h = t.closest('[data-h]');
      if (!h) return;
      const k = Number(h.getAttribute('data-h'));
      const step = 34;
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!d) return;
      e.preventDefault();
      st.drag = k;
      st.off[k] = soft(st.off[k].x + d[0] * step, st.off[k].y + d[1] * step);
      draw();
      clearTimeout(st.keyT as number);
      st.keyT = setTimeout(() => { st.drag = -1; if (still) { st.off[k] = v(0, 0); draw(); } else wake(); }, 900);
    };
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element).closest('[data-ink]')) rubOut();
    };
    el.addEventListener('keydown', onKey);
    el.addEventListener('click', onClick);

    draw();
    let trig: ScrollTrigger | null = null;
    if (still) { st.t = 1; st.i = 1; st.played = true; draw(); el.classList.add('is-done'); }
    else if (trigger === 'load') play();
    else if (trigger === 'view') trig = ScrollTrigger.create({ trigger: el, start: 'top 78%', once: true, onEnter: play });

    return () => {
      ro.disconnect();
      trig?.kill();
      st.tl?.kill();
      gsap.ticker.remove(tick);
      st.running = false; st.busy = false;
      clearTimeout(st.keyT as number);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('click', onClick);
    };
  }, [g, trigger, delay, interactive, st]);

  useEffect(() => {
    if (trigger === 'go' && go) api.current.play();
  }, [trigger, go]);

  const [x, y, w, h] = g.vb;
  return (
    <svg
      ref={svg}
      className={'cmp-plate' + (outline ? ' is-outline' : '') + (className ? ' ' + className : '')}
      viewBox={`${x} ${y} ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      role={label ? 'group' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <clipPath id={cid}><circle data-clip cx="0" cy="0" r="0" /></clipPath>
      </defs>
      <g className="cmp-guides" aria-hidden="true">
        {first.guides.map((_, k) => (
          <path key={k} data-g pathLength={1} />
        ))}
        <circle data-tip className="cmp-tip" r="0" />
      </g>
      {interactive ? (
        <g data-ink className="cmp-ink" clipPath={`url(#${cid})`} role="button" tabIndex={0} aria-label="Rub out the ink and construct it again">
          {first.ink.map((_, k) => <path key={k} data-i />)}
        </g>
      ) : (
        <g className="cmp-ink" clipPath={`url(#${cid})`} aria-hidden="true">
          {first.ink.map((_, k) => <path key={k} data-i />)}
        </g>
      )}
      <g className="cmp-marks" aria-hidden="true">
        {first.marks.map((_, k) => <circle key={k} data-m />)}
      </g>
      {interactive && (
        <g className="cmp-hands">
          {g.pts.map((_, k) => (
            <g key={k} data-h={k} className="cmp-hand" tabIndex={0} role="button" aria-label="Construction point. Drag it, or use the arrow keys.">
              <circle className="cmp-dot" r="6" />
              <circle className="cmp-hit" r="24" />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
