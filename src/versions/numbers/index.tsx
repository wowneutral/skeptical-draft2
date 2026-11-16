import { useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource-variable/fraunces/full.css';
import '@fontsource/abril-fatface/400.css';
import './numbers.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { gsap, scroll, scrollToY } from '@/lib/scroll';
import { clamp, lerp, smooth, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { adv, glyphD, mix, pair, shape, toD, VB, BOX, type Pt } from './geom';

const RED = '#d42e1b';
const ACC: Record<string, string> = { eight: RED, people: RED, drive: RED, record: RED, results: RED, free: RED, join: RED };
const INDEX = [
  { n: '8', id: 'eight', label: 'Debaters' },
  { n: '2', id: 'people', label: 'Coaches' },
  { n: '7', id: 'drive', label: 'The drive' },
  { n: '1', id: 'record', label: 'Tournament' },
  { n: '2', id: 'results', label: 'Results' },
  { n: '0', id: 'free', label: 'The fee' },
  { n: '3', id: 'join', label: 'Ways in' },
];

function useTick(fn: (dt: number) => void, deps: unknown[] = []) {
  useEffect(() => {
    const f = (_t: number, dt: number) => fn(Math.min(0.05, dt / 1000));
    gsap.ticker.add(f);
    return () => gsap.ticker.remove(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
const prog = (el: HTMLElement | null) => {
  if (!el) return 0;
  const r = el.getBoundingClientRect();
  return clamp(-r.top / Math.max(1, r.height - innerHeight));
};
const ease2 = (t: number) => smooth(smooth(t));

/** A numeral as an SVG. */
function Num({ ch, className, stroke, tight, fit }: { ch: string; className?: string; stroke?: boolean; tight?: boolean; fit?: 'none' }) {
  const a = adv(ch);
  return (
    <svg className={className} viewBox={tight ? `${((BOX - a) / 2).toFixed(1)} -730 ${a} 760` : VB} preserveAspectRatio={fit === 'none' ? 'none' : undefined} aria-hidden="true" focusable="false">
      <path d={glyphD(ch)} {...(stroke ? { fill: 'none', stroke: 'currentColor', strokeWidth: 3, vectorEffect: 'non-scaling-stroke' } : { fill: 'currentColor' })} />
    </svg>
  );
}

function Crop() {
  return <span className="crop" aria-hidden="true"><i /><i /><i /><i /></span>;
}

/* ---------- pendulum physics, shared by the 8 and the record plaque ---------- */
function usePendulum(opts: { k: number; c: number; kick?: number }) {
  const st = useRef({ a: 0, w: 0, drag: false, target: 0, last: 0 });
  const step = (dt: number) => {
    const s = st.current;
    if (s.drag) { const na = lerp(s.a, s.target, 1 - Math.exp(-18 * dt)); s.w = (na - s.a) / Math.max(dt, 1e-3); s.a = na; }
    else { s.w += (-opts.k * Math.sin(s.a) - opts.c * s.w) * dt; s.a += s.w * dt; }
    if (!still && !s.drag) s.w += clamp(scroll.v, -4, 4) * 0.004 * (opts.kick ?? 1);
    return s;
  };
  return { st, step };
}

/* ---------- opening: the count assembles into the 8 ---------- */
function Hero() {
  const path = useRef<SVGPathElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const words = useRef<HTMLSpanElement[]>([]);
  const ptr = useRef({ x: -999, y: -999, tx: 0, rx: 0 });
  useEffect(() => {
    const seq = ['1', '2', '3', '4', '5', '6', '7', '8'];
    if (still || !path.current) { path.current?.setAttribute('d', toD(shape('8'))); return; }
    const pairs = seq.slice(0, -1).map((c, i) => pair(c, seq[i + 1]));
    path.current.setAttribute('d', toD(shape('1')));
    const o = { t: 0 };
    const tw = gsap.to(o, {
      t: 7, duration: 2.6, delay: 0.35, ease: 'power1.inOut',
      onUpdate() {
        const i = Math.min(6, Math.floor(o.t)); const f = o.t - i;
        path.current?.setAttribute('d', mix(pairs[i], ease2(clamp(f * 1.25))));
      },
    });
    return () => { tw.kill(); };
  }, []);
  useEffect(() => {
    const m = (e: PointerEvent) => { ptr.current.x = e.clientX; ptr.current.y = e.clientY; };
    window.addEventListener('pointermove', m, { passive: true });
    return () => window.removeEventListener('pointermove', m);
  }, []);
  useTick((dt) => {
    if (still) return;
    const p = ptr.current;
    const nx = p.x < -900 ? 0 : p.x / innerWidth - 0.5;
    p.tx = lerp(p.tx, nx, 1 - Math.exp(-4 * dt));
    if (tilt.current) tilt.current.style.transform = `rotate(${(p.tx * 5).toFixed(2)}deg) translateY(${(-scroll.y * 0.25).toFixed(1)}px)`;
    for (const w of words.current) {
      if (!w) continue;
      const r = w.getBoundingClientRect();
      const d = p.x < -900 ? 1 : clamp(Math.hypot(r.left + r.width / 2 - p.x, r.top + r.height / 2 - p.y) / 420);
      const cur = +(w.dataset.w || 380); const tgt = lerp(900, 380, d);
      const nw = lerp(cur, tgt, 1 - Math.exp(-10 * dt)); w.dataset.w = String(nw);
      w.style.fontVariationSettings = `'wght' ${nw.toFixed(0)}, 'opsz' 144, 'SOFT' ${(100 - (nw - 380) / 5.2).toFixed(0)}`;
    }
  });
  let wi = 0;
  return (
    <header className="hero" id="top" data-acc="eight">
      <Crop />
      <div className="hero-num" ref={tilt} aria-hidden="true">
        <svg viewBox={VB} focusable="false"><path ref={path} fillRule="evenodd" /></svg>
      </div>
      <div className="hero-copy">
        <p className="mark">Skeptical<span>.</span></p>
        <h1 className="pitch">
          <span className="sr-only-x">{SITE.name}: </span>
          {HERO.pitch.map((l) => (
            <span className="pl" key={l}>
              {l.split(' ').map((w, j) => { const idx = wi++; return <span key={j} className="pw" ref={(el) => { if (el) words.current[idx] = el; }}>{w} </span>; })}
            </span>
          ))}
        </h1>
        <ul className="statement">{HERO.statement.map((s) => <li key={s}>{s}</li>)}</ul>
        <div className="doors">
          {HERO.doors.map((d, i) => <a key={d.href} href={d.href} className={i ? 'btn ghost' : 'btn'}>{d.label}</a>)}
        </div>
      </div>
    </header>
  );
}

/* ---------- 8: two loops you can swing, eight beads riding them ---------- */
function Eight() {
  const g = useRef<SVGGElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const beads = useRef<SVGCircleElement[]>([]);
  const phase = useRef(0);
  const { st, step } = usePendulum({ k: 7, c: 0.28 });
  const [outer, holes] = useMemo(() => { const s = shape('8'); return [s[0], s.slice(1).flat()] as [Pt[], Pt[]]; }, []);
  const PX = 360, PY = -1000;
  const grab = useRef(0);
  const ang = (e: React.PointerEvent) => {
    const s = svg.current!; const m = s.getScreenCTM(); if (!m) return 0;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return Math.atan2(PX - pt.x, pt.y - PY);
  };
  const down = (e: React.PointerEvent) => {
    st.current.drag = true; (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    grab.current = st.current.a - ang(e); st.current.target = st.current.a;
  };
  const move = (e: React.PointerEvent) => { if (!st.current.drag) return; st.current.target = clamp(ang(e) + grab.current, -0.75, 0.75); };
  const up = () => { st.current.drag = false; };
  useTick((dt) => {
    const s = step(dt);
    if (g.current) g.current.setAttribute('transform', `rotate(${(s.a * 57.3).toFixed(2)} ${PX} ${PY})`);
    if (!still) phase.current += dt * (0.035 + Math.abs(s.w) * 0.09);
    const n = outer.length;
    beads.current.forEach((b, i) => {
      if (!b) return;
      const f = ((phase.current + i / 8) % 1) * n; const k = Math.floor(f) % n; const t = f - Math.floor(f);
      const a = outer[k], c = outer[(k + 1) % n]; const x = lerp(a[0], c[0], t), y = lerp(a[1], c[1], t);
      let best = holes[0], bd = Infinity;
      for (let j = 0; j < holes.length; j += 2) { const h = holes[j]; const d = (h[0] - x) ** 2 + (h[1] - y) ** 2; if (d < bd) { bd = d; best = h; } }
      b.setAttribute('cx', ((x + best[0]) / 2).toFixed(1)); b.setAttribute('cy', ((y + best[1]) / 2).toFixed(1));
    });
  });
  return (
    <section className="sec eight" id="eight" data-acc="eight" aria-labelledby="h-eight">
      <Crop />
      <div className="sec-copy">
        <h2 id="h-eight" className="big" data-vf>{PEOPLE.count}</h2>
        <p className="lede">{MANIFESTO[1]}</p>
      </div>
      <div className="eight-stage">
        <svg ref={svg} viewBox="-150 -1000 1020 1060" preserveAspectRatio="xMidYMid meet" className="eight-svg" role="button" tabIndex={0} aria-label="Swing the eight. Eight parts ride its loops."
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          onKeyDown={(e) => { if (['Enter', ' ', 'ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); st.current.w += e.key === 'ArrowLeft' ? -2.2 : e.key === 'ArrowRight' ? 2.2 : (st.current.a > 0 ? -2.2 : 2.2); } }}>
          <g ref={g}>
            <line x1={PX} y1={PY} x2={PX} y2={-700} className="string" />
            <path d={glyphD('8')} className="eight-path" />
            {Array.from({ length: 8 }, (_, i) => <circle key={i} r="26" className="bead" ref={(el) => { if (el) beads.current[i] = el; }} />)}
          </g>
        </svg>
      </div>
    </section>
  );
}

/* ---------- pinned morph between two numerals ---------- */
function Morph({ a, b, from, to, capA, capB }: { a: string; b: string; from: string; to: string; capA: string; capB: string }) {
  const sec = useRef<HTMLElement>(null);
  const path = useRef<SVGPathElement>(null);
  const pr = useMemo(() => pair(a, b), [a, b]);
  const col = useMemo(() => gsap.utils.interpolate(ACC[from], ACC[to]), [from, to]);
  const last = useRef(-1);
  useTick(() => {
    const p = prog(sec.current);
    const t = ease2(clamp((p - 0.15) / 0.7));
    if (Math.abs(t - last.current) < 0.0005) return;
    last.current = t;
    path.current?.setAttribute('d', mix(pr, t));
    path.current?.setAttribute('fill', col(t));
    if (path.current?.parentElement) (path.current.parentElement as unknown as SVGElement).style.transform = `rotate(${(Math.sin(t * Math.PI) * -8).toFixed(2)}deg) scale(${(1 + Math.sin(t * Math.PI) * 0.06).toFixed(3)})`;
    sec.current?.style.setProperty('--t', t.toFixed(3));
  });
  return (
    <section className="morph" ref={sec} aria-hidden="true" data-acc={to}>
      <div className="morph-pin">
        <Crop />
        <span className="cap a"><b>{a}</b>{capA}</span>
        <svg viewBox={VB} className="morph-svg" focusable="false"><g><path ref={path} fillRule="evenodd" d={toD(shape(a))} /></g></svg>
        <span className="cap b"><b>{b}</b>{capB}</span>
      </div>
    </section>
  );
}

/* ---------- 2: two pens draw the 2, then it splits into the two coaches ---------- */
function Two() {
  const sec = useRef<HTMLElement>(null);
  const [pick, setPick] = useState(-1);
  const outer = useMemo(() => shape('2')[0], []);
  const d = useMemo(() => toD([outer]), [outer]);
  useTick(() => {
    const el = sec.current; if (!el) return;
    const p = still ? 1 : prog(el);
    const h = clamp(p / 0.5) / 2; const fill = clamp((p - 0.45) / 0.12); const sp = ease2(clamp((p - 0.58) / 0.25));
    el.style.setProperty('--fill', fill.toFixed(3)); el.style.setProperty('--sp', sp.toFixed(3));
    el.querySelectorAll<SVGPathElement>('.s-a').forEach((s) => s.setAttribute('stroke-dasharray', `${h.toFixed(4)} 2`));
    el.querySelectorAll<SVGPathElement>('.s-b').forEach((s) => s.setAttribute('stroke-dasharray', `0 ${(1 - h).toFixed(4)} ${h.toFixed(4)} 2`));
    const n = outer.length;
    const at = (f: number, sgn: number) => { const k = Math.floor(((f % 1) + 1) % 1 * n); const a = outer[k], b = outer[(k + sgn + n) % n]; return { x: a[0], y: a[1], r: Math.atan2(b[1] - a[1], b[0] - a[0]) * 57.3 }; };
    const A = at(h, 1), B = at(1 - h, -1);
    el.querySelectorAll<SVGGElement>('.pen-a').forEach((g) => { g.setAttribute('transform', `translate(${A.x} ${A.y}) rotate(${A.r - 60})`); g.style.opacity = String(1 - fill); });
    el.querySelectorAll<SVGGElement>('.pen-b').forEach((g) => { g.setAttribute('transform', `translate(${B.x} ${B.y}) rotate(${B.r - 60})`); g.style.opacity = String(1 - fill); });
  });
  const art = (
    <svg viewBox={VB} focusable="false" aria-hidden="true">
      <path d={glyphD('2')} className="two-ghost" />
      <path d={glyphD('2')} className="two-fill" />
      <path d={d} pathLength={1} className="two-stroke s-a" />
      <path d={d} pathLength={1} className="two-stroke s-b" />
      <g className="pen-a"><circle r="15" className="nib-a" /></g>
      <g className="pen-b"><circle r="15" className="nib-b" /></g>
    </svg>
  );
  return (
    <section className="two" id="people" ref={sec} data-acc="people" data-pick={pick} aria-labelledby="h-people">
      <div className="two-pin">
        <Crop />
        <h2 id="h-people" className="sr-only-x">{PEOPLE.title}</h2>
        <div className="half l">{art}</div>
        <div className="half r">{art}</div>
        <div className="coaches">
          {PEOPLE.coaches.map((c, i) => (
            <button key={c.name} className="coach" aria-pressed={pick === i} onClick={() => setPick(pick === i ? -1 : i)}>
              <span className="c-role">{c.role}</span>
              <span className="c-name">{c.name}</span>
              <span className="c-bio">{c.bio}</span>
            </button>
          ))}
          <a className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</a>
        </div>
      </div>
    </section>
  );
}

/* ---------- 7: seven layers that fan out into the drive ---------- */
function Seven() {
  const list = useRef<HTMLOListElement>(null);
  const f = useRef({ v: still ? 1 : 0 });
  const [open, setOpen] = useState(still);
  const geo = useRef<{ off: number[]; closed: number; full: number }>({ off: [], closed: 0, full: 0 });
  const measure = () => {
    const el = list.current; if (!el) return;
    const rows = [...el.children] as HTMLElement[];
    const sh = (rows[0].querySelector('.slice') as HTMLElement).offsetHeight;
    geo.current = { off: rows.map((r, i) => r.offsetTop - i * sh), closed: sh * 7, full: rows[6].offsetTop + rows[6].offsetHeight };
  };
  const apply = () => {
    const el = list.current; if (!el) return; const v = f.current.v; const G = geo.current;
    el.style.height = lerp(G.closed, G.full, v).toFixed(1) + 'px';
    ([...el.children] as HTMLElement[]).forEach((r, i) => {
      r.style.transform = `translateY(${(-(1 - v) * (G.off[i] || 0)).toFixed(1)}px)`;
      const lv = clamp(v * 1.6 - i * 0.09);
      r.style.setProperty('--lv', lv.toFixed(3));
    });
  };
  useEffect(() => {
    measure(); apply();
    const ro = new ResizeObserver(() => { measure(); apply(); });
    if (list.current) ro.observe(list.current.parentElement!);
    let fired = false;
    const io = new IntersectionObserver((es) => { if (!fired && es[0].isIntersecting) { fired = true; setTimeout(() => setOpen(true), 500); } }, { threshold: 0.45 });
    if (list.current) io.observe(list.current);
    return () => { ro.disconnect(); io.disconnect(); };
  }, []);
  useEffect(() => {
    if (still) { f.current.v = open ? 1 : 0; apply(); return; }
    const tw = gsap.to(f.current, { v: open ? 1 : 0, duration: open ? 1.3 : 0.8, ease: open ? 'back.out(1.25)' : 'power3.inOut', onUpdate: apply });
    return () => { tw.kill(); };
  }, [open]);
  const drag = useRef<{ y: number; v: number } | null>(null);
  return (
    <section className="sec seven" id="drive" data-acc="drive" aria-labelledby="h-drive">
      <Crop />
      <div className="seven-head">
        <h2 id="h-drive" className="big" data-vf>{DRIVE.title}</h2>
        <p className="lede">{DRIVE.lead}</p>
        <p className="lede">{MANIFESTO[2]}</p>
        <button className="btn" aria-expanded={open} aria-controls="drive-list" onClick={() => setOpen(!open)}>{open ? 'Close the file' : 'Open the file'}</button>
      </div>
      <ol className="layers" id="drive-list" ref={list}
        onPointerDown={(e) => { if (e.pointerType !== 'mouse') return; drag.current = { y: e.clientY, v: f.current.v }; }}
        onPointerMove={(e) => { if (!drag.current) return; f.current.v = clamp(drag.current.v + (e.clientY - drag.current.y) / 400, 0, 1.08); apply(); }}
        onPointerUp={() => { if (!drag.current) return; const o = f.current.v > 0.5; drag.current = null; if (o === open) gsap.to(f.current, { v: o ? 1 : 0, duration: 0.6, ease: 'back.out(1.4)', onUpdate: apply }); else setOpen(o); }}
        onPointerLeave={() => { if (drag.current) { const o = f.current.v > 0.5; drag.current = null; if (o === open) gsap.to(f.current, { v: o ? 1 : 0, duration: 0.6, onUpdate: apply }); else setOpen(o); } }}>
        {DRIVE.items.map((it, i) => (
          <li key={it.term} className="layer" style={{ zIndex: 10 - i }}>
            <span className="slice" aria-hidden="true"><span className="slice-in" style={{ top: `calc(var(--sh) * ${-i})` }}><Num ch="7" tight /></span></span>
            <span className="lbl"><span className="term">{it.term}</span><span className="txt">{it.text}</span></span>
          </li>
        ))}
      </ol>
      <a className="more" href={DRIVE.more.href}>{DRIVE.more.label}</a>
    </section>
  );
}

/* ---------- 1: one tall mark, the record hangs from it ---------- */
function One() {
  const sec = useRef<HTMLElement>(null);
  const one = useRef<HTMLButtonElement>(null);
  const plaque = useRef<HTMLDivElement>(null);
  const { st, step } = usePendulum({ k: 6, c: 0.9, kick: 0.4 });
  const origin = useRef({ x: 0, y: 0, g: 0 });
  useTick((dt) => {
    const r = sec.current?.getBoundingClientRect(); if (!r) return;
    const p = clamp((innerHeight - r.top) / (innerHeight * 1.1));
    if (one.current) one.current.style.transform = `scaleY(${still ? 1 : lerp(0.35, 1, ease2(p)).toFixed(3)})`;
    const s = step(dt);
    if (plaque.current) plaque.current.style.transform = `rotate(${(s.a * 57.3).toFixed(2)}deg)`;
  });
  const down = (e: React.PointerEvent) => {
    const r = plaque.current!.getBoundingClientRect(); const o = { x: r.left + r.width / 2, y: r.top - 150, g: 0 };
    o.g = st.current.a - Math.atan2(o.x - e.clientX, e.clientY - o.y); origin.current = o;
    st.current.drag = true; st.current.target = st.current.a; (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };
  const move = (e: React.PointerEvent) => { if (!st.current.drag) return; const o = origin.current; st.current.target = clamp(Math.atan2(o.x - e.clientX, e.clientY - o.y) + o.g, -0.6, 0.6); };
  const up = () => { st.current.drag = false; };
  return (
    <section className="sec one" id="record" ref={sec} data-acc="record" aria-labelledby="h-record">
      <Crop />
      <button className="one-mark" ref={one} aria-label="Knock the one. The record swings." onClick={() => { st.current.w += 0.9; }}><Num ch="1" tight /></button>
      <div className="one-arm" aria-hidden="true" />
      <div className="one-hang">
        <div className="plaque" ref={plaque} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <span className="strings" aria-hidden="true"><i /></span>
          <h2 id="h-record" className="big" data-vf>{RECORD.title}</h2>
          <p className="rule">{RECORD.rule}</p>
          <p className="when">{RECORD.when}</p>
          <p className="name">{RECORD.name}</p>
          <p className="where">{RECORD.where}</p>
        </div>
      </div>
    </section>
  );
}

/* ---------- 2 results: two lines of type that turn over ---------- */
function Results() {
  const [flip, setFlip] = useState([false, false]);
  return (
    <section className="sec results" id="results" data-acc="results" aria-labelledby="h-results">
      <Crop />
      <Num ch="2" className="results-ghost" stroke />
      <h2 id="h-results" className="big res-title" data-vf>{RECORD.results.map((r) => r.who).join(' and ')}</h2>
      <ol className="res-rows">
        {RECORD.results.map((r, i) => (
          <li key={r.who}>
            <button className="res" aria-pressed={flip[i]} onClick={() => setFlip(flip.map((v, j) => (j === i ? !v : v)))}>
              <span className="res-n" aria-hidden="true">{i + 1}</span>
              <span className="res-in">
                <span className="res-face res-front"><span className="res-who">{r.who}</span><span className="res-what">{r.what}</span></span>
                <span className="res-face res-back"><span className="res-more">{r.more}</span></span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      <a className="more" href={RECORD.more.href}>{RECORD.more.label}</a>
    </section>
  );
}

/* ---------- 0: a hole you look through into the next section ---------- */
function Zero() {
  const sec = useRef<HTMLElement>(null);
  const grp = useRef<SVGGElement>(null);
  const hole = useRef<SVGGElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1440, h: 900 });
  const s0 = useMemo(() => shape('0'), []);
  const inner = useMemo(() => toD([s0[1]]), [s0]);
  const both = useMemo(() => toD(s0), [s0]);
  const c = useMemo(() => { const p = s0[1]; let x = 0, y = 0; for (const q of p) { x += q[0]; y += q[1]; } return [x / p.length, y / p.length]; }, [s0]);
  const ptr = useRef({ x: 0, y: 0, sx: 0, sy: 0 });
  useEffect(() => {
    const r = () => setSize({ w: innerWidth, h: innerHeight }); r();
    window.addEventListener('resize', r); return () => window.removeEventListener('resize', r);
  }, []);
  useTick((dt) => {
    const el = sec.current; if (!el) return;
    const p = prog(el);
    const P = ptr.current; P.sx = lerp(P.sx, P.x, 1 - Math.exp(-5 * dt)); P.sy = lerp(P.sy, P.y, 1 - Math.exp(-5 * dt));
    const phone = size.w < 760;
    const base = (size.h * (phone ? 0.5 : 0.9)) / 760;
    const zoom = still ? 1 : Math.pow(60, ease2(clamp((p - 0.3) / 0.62)));
    const cx = phone ? size.w * 0.5 : size.w * 0.7, cy = phone ? size.h * 0.36 : size.h * 0.5;
    const k = 1 - clamp((zoom - 1) / 3);
    const t = `translate(${(cx + P.sx * 60 * k).toFixed(1)} ${(cy + P.sy * 40 * k).toFixed(1)}) scale(${(base * zoom).toFixed(4)}) translate(${-c[0]} ${-c[1]})`;
    grp.current?.setAttribute('transform', t); hole.current?.setAttribute('transform', t);
    if (back.current) back.current.style.transform = `translate(${(-P.sx * 50 * k).toFixed(1)}px, ${(-P.sy * 30 * k).toFixed(1)}px) scale(${lerp(0.82, 1, clamp((zoom - 1) / 20)).toFixed(3)})`;
    if (copy.current && !still) { const o = 1 - clamp((p - 0.32) / 0.14); copy.current.style.opacity = o.toFixed(3); copy.current.style.visibility = o < 0.01 ? 'hidden' : 'visible'; }
  }, [size]);
  const pm = (e: React.PointerEvent) => { ptr.current.x = e.clientX / innerWidth - 0.5; ptr.current.y = e.clientY / innerHeight - 0.5; };
  return (
    <section className="zero" id="free" ref={sec} data-acc="free" aria-labelledby="h-free" onPointerMove={pm}>
      <div className="zero-pin">
        <div className="zero-back" aria-hidden="true">
          <div ref={back} className="zero-back-in"><Num ch="3" tight /><span>Three ways in.</span></div>
        </div>
        <svg className="zero-svg" viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true" focusable="false" preserveAspectRatio="none">
          <defs>
            <mask id="nz-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={size.w} height={size.h}>
              <rect width={size.w} height={size.h} fill="#fff" />
              <g ref={hole}><path d={inner} fill="#000" /></g>
            </mask>
          </defs>
          <rect width={size.w} height={size.h} className="zero-ink" mask="url(#nz-mask)" />
          <g ref={grp}><path d={both} fillRule="evenodd" className="zero-ring" /></g>
        </svg>
        <div className="zero-copy" ref={copy}>
          <p className="z-small">{MANIFESTO[0].split('. ')[0]}.</p>
          <h2 id="h-free" className="z-big">{MANIFESTO[0].split('. ')[1]}</h2>
        </div>
      </div>
    </section>
  );
}

/* ---------- 3: three doors, each a third of the 3 ---------- */
function Three() {
  const [open, setOpen] = useState<boolean[]>(still ? [true, true, true] : [false, false, false]);
  return (
    <section className="sec three" id="join" data-acc="join" aria-labelledby="h-join">
      <Crop />
      <div className="three-head">
        <h2 id="h-join" className="big" data-vf>{JOIN.title}</h2>
        <p className="lede">{JOIN.lead}</p>
      </div>
      <div className="doors3">
        {JOIN.paths.map((p, i) => (
          <div key={p.id} className="door" data-open={open[i]} id={`way-${p.id}`}>
            <div className="behind">
              <p className="b-name">{p.name}</p>
              <p className="b-line">{p.line}</p>
              <ul className="b-text">{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
              <a className="btn" href={p.href}>{p.name}: apply</a>
            </div>
            <button className="leaf" aria-expanded={open[i]} aria-controls={`way-${p.id}`} onClick={() => setOpen(open.map((v, j) => (j === i ? !v : v)))}>
              <span className="leaf-num" aria-hidden="true"><span style={{ ["--i" as string]: i }}><Num ch="3" tight fit="none" /></span></span>
              <span className="leaf-name">{p.name}</span>
              <span className="leaf-line">{p.line}</span>
              <span className="leaf-cta">{open[i] ? 'Close' : 'Open'}</span>
            </button>
          </div>
        ))}
      </div>
      <div className="three-foot">
        <p>{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a></p>
        <p>{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a></p>
        <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
        <p>{JOIN.discord}</p>
      </div>
    </section>
  );
}

/* ---------- the ending: add them up, get the name ---------- */
function Sum() {
  const sec = useRef<HTMLElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const [done, setDone] = useState(still);
  const play = () => {
    const el = sec.current; if (!el || still) return;
    tl.current?.kill();
    const nums = el.querySelectorAll('.s-num'); const plus = el.querySelectorAll('.s-op'); const word = el.querySelectorAll('.s-word, .s-ways, .s-pos');
    tl.current = gsap.timeline({ onComplete: () => setDone(true) })
      .set(word, { autoAlpha: 0, y: 40 })
      .set(plus, { autoAlpha: 0, scale: 0.4 })
      .fromTo(nums, { y: () => -innerHeight * 0.9, rotation: () => gsap.utils.random(-50, 50), autoAlpha: 1 }, { y: 0, rotation: 0, duration: 1.1, ease: 'bounce.out', stagger: 0.11 })
      .to(plus, { autoAlpha: 1, scale: 1, duration: 0.35, stagger: 0.06, ease: 'back.out(2)' }, '-=0.3')
      .to(word, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out' }, '+=0.15');
  };
  useEffect(() => {
    if (still) return;
    const el = sec.current!;
    gsap.set(el.querySelectorAll('.s-num'), { autoAlpha: 0 });
    gsap.set(el.querySelectorAll('.s-op, .s-word, .s-ways, .s-pos'), { autoAlpha: 0 });
    let fired = false;
    const io = new IntersectionObserver((es) => { if (!fired && es[0].isIntersecting) { fired = true; play(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => { io.disconnect(); tl.current?.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const seq = INDEX.map((x) => x.n);
  return (
    <section className="sum" id="end" ref={sec} aria-labelledby="h-end">
      <Crop />
      <p className="s-line" aria-hidden="true">
        {seq.map((n, i) => (
          <span key={i} className="s-cell">
            <span className="s-num"><Num ch={n} tight /></span>
            {i < seq.length - 1 ? <span className="s-op">+</span> : <span className="s-op">=</span>}
          </span>
        ))}
      </p>
      <h2 id="h-end" className="s-word">{SITE.name}<span>.</span></h2>
      <p className="s-pos">{MANIFESTO[3]}</p>
      <ul className="s-ways">
        {JOIN.paths.map((p) => <li key={p.id}><a href={p.href}><span>{p.name}</span><span>{p.line}</span></a></li>)}
      </ul>
      {!still && <button className="btn ghost again" onClick={() => { setDone(false); play(); }} disabled={!done}>Add them up again</button>}
    </section>
  );
}

function Index() {
  const nav = useRef<HTMLElement>(null);
  const cur = useRef('');
  useTick(() => {
    let id = '';
    for (const it of INDEX) { const el = document.getElementById(it.id); if (!el) continue; const r = el.getBoundingClientRect(); if (r.top < innerHeight * 0.55 && r.bottom > innerHeight * 0.45) id = it.id; }
    if (!id) { const t = document.getElementById('top')!.getBoundingClientRect(); if (t.bottom > innerHeight * 0.45) id = 'top'; }
    if (id === cur.current) return; cur.current = id;
    const root = nav.current?.closest('.v-numbers') as HTMLElement | null;
    root?.style.setProperty('--acc', ACC[id] || ACC.eight);
    root?.setAttribute('data-on', id);
    nav.current?.querySelectorAll('a').forEach((a) => { if (a.dataset.id === id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  });
  return (
    <nav className="nidx" ref={nav} aria-label="The numbers">
      <ol>
        {INDEX.map((it) => (
          <li key={it.id}><a href={`#${it.id}`} data-id={it.id}><span className="ni-n">{it.n}</span><span className="ni-l">{it.label}</span></a></li>
        ))}
      </ol>
    </nav>
  );
}

export default function Numbers() {
  useVersion('numbers');
  const root = useRef<HTMLDivElement>(null);
  useTick(() => {
    if (still || !root.current) return;
    root.current.querySelectorAll<HTMLElement>('[data-vf]').forEach((el) => {
      const r = el.getBoundingClientRect();
      const c = clamp(1 - Math.abs(r.top + r.height / 2 - innerHeight * 0.45) / (innerHeight * 0.6));
      el.style.fontVariationSettings = `'wght' ${lerp(260, 900, smooth(c)).toFixed(0)}, 'opsz' 144, 'SOFT' ${lerp(100, 0, c).toFixed(0)}, 'WONK' 1`;
    });
  });
  return (
    <div className="v-numbers" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <Index />
      <Hero />
      <main id="main">
        <Eight />
        <Morph a="8" b="2" from="eight" to="people" capA="debaters" capB="coaches" />
        <Two />
        <Morph a="2" b="7" from="people" to="drive" capA="coaches" capB="things in the drive" />
        <Seven />
        <Morph a="7" b="1" from="drive" to="record" capA="things in the drive" capB="tournament" />
        <One />
        <Results />
        <Zero />
        <Three />
        <Sum />
      </main>
      <footer className="foot">
        <p className="f-line">{FOOTER.line}</p>
        <ul className="f-links">{FOOTER.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
        <ul className="f-pages">{FOOTER.pages.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
        <p className="f-small">Draft 2, version 21. Not the live site. Numerals set in Abril Fatface, text in Fraunces.</p>
        <button className="btn ghost" onClick={() => scrollToY(0)}>Back to the eight</button>
      </footer>
    </div>
  );
}
