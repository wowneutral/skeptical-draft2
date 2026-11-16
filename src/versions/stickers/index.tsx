// Version 20: the stickers. A debater's laptop lid is a biography in stickers, so the site
// is a sheet of die-cut stickers and a lid. Peel them, slap them on, rotate them, peel them
// again; every section deals its own sheet. At the end the lid opens and Join is inside.
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as KE, type PointerEvent as PE } from 'react';
import '@fontsource/anton/400.css';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import './stickers.css';
import marks from '@/lib/marks.json';
import { DRIVE, FOOTER, HERO, JOIN, MANIFESTO, NAV, PEOPLE, RECORD, SITE } from '@/content';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/scroll';
import { clamp, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { Bumper, DEFS, type Def, type Sec } from './art';
import { slapSound, peelSound } from './sound';

type P = { on: boolean; x: number; y: number; r: number; z: number };
type St = Record<string, P>;
const LID_H = 66; // lid height in u (width is 100)
const BY = Object.fromEntries(DEFS.map((d) => [d.id, d])) as Record<string, Def>;
const frac = (v: number) => v - Math.floor(v);

const init = (): St => {
  const s: St = {};
  DEFS.forEach((d, i) => { s[d.id] = d.start ? { on: true, x: d.start[0], y: d.start[1], r: d.start[2], z: i + 1 } : { on: false, x: 0.5, y: 0.5, r: 0, z: 0 }; });
  return s;
};
const fit = (d: Def, x: number, y: number) => {
  const hw = d.w / 200 + 0.012, hh = d.h / (2 * LID_H) + 0.018;
  return { x: hw >= 0.5 ? 0.5 : clamp(x, hw, 1 - hw), y: hh >= 0.5 ? 0.5 : clamp(y, hh, 1 - hh) };
};
const scatter = (i: number) => ({ x: 0.1 + frac(i * 0.618 + 0.13) * 0.8, y: 0.12 + frac(i * 0.381 + 0.57) * 0.76, r: (frac(i * 0.7548) - 0.5) * 40 });
const center = (el: Element | null) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: (el as HTMLElement).offsetWidth || b.width }; };
const fly = (id: string) => document.querySelector(`.v-stickers [data-fly="${id}"]`);

/* ---------- one sticker ---------- */
type SP = { d: Def; where: 'slot' | 'lid' | 'held' | 'static'; p?: P; sel?: boolean; kb?: boolean; onDown?: (e: PE<HTMLDivElement>, id: string) => void; onKey?: (e: KE<HTMLDivElement>, id: string) => void; onRot?: (e: PE<HTMLButtonElement>, id: string) => void; onRotKey?: (e: KE<HTMLButtonElement>, id: string) => void };
const Sticker = memo(function Sticker({ d, where, p, sel, kb, onDown, onKey, onRot, onRotKey }: SP) {
  const live = where !== 'static';
  const style = { '--w': d.w, '--h': d.h, ...((where === 'lid' || where === 'static') && p ? { left: `${p.x * 100}%`, top: `${p.y * 100}%`, zIndex: p.z } : {}) } as CSSProperties;
  const r = where === 'slot' ? d.tilt : p?.r ?? 0;
  return (
    <div className={`stk at-${where}${sel ? ' is-sel' : ''}${kb ? ' is-kb' : ''}${d.lift ? ' lifts' : ''}`} style={style} data-sid={d.id}
      {...(live && where !== 'held' ? { tabIndex: 0, role: 'button', onPointerDown: (e: PE<HTMLDivElement>) => onDown?.(e, d.id), onKeyDown: (e: KE<HTMLDivElement>) => onKey?.(e, d.id) } : { 'aria-hidden': true })}>
      {live && where !== 'held' && <span className="sr-only-x">{`Sticker: ${d.label}. ${where === 'slot' ? 'Enter to put it on the lid.' : 'On the lid. Enter to pick up, arrows to move, R to rotate, Delete to peel off.'}`}</span>}
      <div className="stk-fly" {...(live ? { 'data-fly': d.id } : {})}>
        <div className="stk-rot" style={{ transform: `rotate(${r}deg)` }}>
          <div className="stk-peel">
            {d.art()}
            <span className="curl" />
          </div>
          {where === 'lid' && sel && (
            <button type="button" className="rot-h" aria-label={`Rotate ${d.label}. Arrow keys turn it.`} onPointerDown={(e) => onRot?.(e, d.id)} onKeyDown={(e) => onRotKey?.(e, d.id)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.5 8.5A7.5 7.5 0 1 0 19.5 14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /><path d="M19.8 3.8v5.4h-5.4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
const Ghost = memo(function Ghost({ d }: { d: Def }) {
  return (
    <div className="stk at-ghost" style={{ '--w': d.w, '--h': d.h } as CSSProperties} aria-hidden="true">
      <div className="stk-rot" style={{ transform: `rotate(${d.tilt}deg)` }}>{d.art()}</div>
    </div>
  );
});

const Arrow = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h15M13 5.5 19.5 12 13 18.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" /></svg>
);
const Deboss = () => (
  <svg className="deboss" viewBox="-470 -800 940 1600" aria-hidden="true" focusable="false"><path d={marks.italic.d} /></svg>
);

/* ---------- the page ---------- */
export default function Stickers() {
  useVersion('stickers');
  const root = useRef<HTMLDivElement>(null);
  const lidRef = useRef<HTMLDivElement>(null);
  const [st, setSt] = useState<St>(init);
  const stRef = useRef(st); stRef.current = st;
  const [held, setHeld] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [kb, setKb] = useState<string | null>(null);
  const [say, setSay] = useState('');
  const zTop = useRef(DEFS.length + 1);
  const flights = useRef(new Map<string, { x: number; y: number; w: number; r: number; s: number; slap: boolean; dur: number }>());
  const focusAfter = useRef<string | null>(null);
  const heldEl = useRef<HTMLDivElement>(null);
  const drag = useRef<null | { id: string; from: 'slot' | 'lid'; sx: number; sy: number; ox: number; oy: number; started: boolean; pid: number; r: number; tx: number; ty: number; x: number; y: number; vx: number; tilt: number; two?: { pid: number; a0: number; r0: number; px: number; py: number } }>(null);


  /* pointer light for the gloss */
  useEffect(() => {
    const el = root.current; if (!el) return;
    let raf = 0, mx = 0.5, my = 0.5;
    const mv = (e: PointerEvent) => { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; if (!raf) raf = requestAnimationFrame(() => { raf = 0; el.style.setProperty('--mx', mx.toFixed(3)); el.style.setProperty('--my', my.toFixed(3)); }); };
    window.addEventListener('pointermove', mv, { passive: true });
    return () => { window.removeEventListener('pointermove', mv); cancelAnimationFrame(raf); };
  }, []);

  /* FLIP flights after every commit */
  useLayoutEffect(() => {
    if (focusAfter.current) { const el = document.querySelector<HTMLElement>(`.v-stickers [data-sid="${focusAfter.current}"].at-lid, .v-stickers [data-sid="${focusAfter.current}"].at-slot`); el?.focus({ preventScroll: true }); focusAfter.current = null; }
    if (!flights.current.size) return;
    flights.current.forEach((f, id) => {
      const el = fly(id); const c = center(el);
      if (!el || !c) return;
      const dx = f.x - c.x, dy = f.y - c.y, k = f.w && c.w ? f.w / c.w : 1;
      gsap.killTweensOf(el);
      if (still) { gsap.set(el, { x: 0, y: 0, scale: 1, rotation: 0 }); return; }
      gsap.fromTo(el, { x: dx, y: dy, scale: k * f.s, rotation: f.r }, {
        x: 0, y: 0, scale: 1, rotation: 0, duration: f.dur, ease: f.slap ? 'power3.in' : 'power3.out',
        onComplete: f.slap ? () => slap(id) : undefined,
      });
    });
    flights.current.clear();
  });

  const slap = useCallback((id: string) => {
    const el = fly(id); const lid = lidRef.current; const p = stRef.current[id];
    slapSound();
    if (el && !still) {
      gsap.timeline().set(el, { scaleX: 1.12, scaleY: 0.86 }).to(el, { scaleX: 1, scaleY: 1, duration: 0.55, ease: 'elastic.out(1.1, 0.45)' });
      el.classList.remove('landed'); void (el as HTMLElement).offsetWidth; el.classList.add('landed');
    }
    if (lid && p?.on && !still) {
      const puff = document.createElement('span');
      puff.className = 'puff'; puff.style.left = p.x * 100 + '%'; puff.style.top = p.y * 100 + '%';
      puff.style.setProperty('--s', String(Math.max(BY[id].w, BY[id].h)));
      for (let i = 0; i < 10; i++) { const b = document.createElement('i'); b.style.setProperty('--a', i * 36 + (i % 2) * 14 + 'deg'); puff.appendChild(b); }
      lid.appendChild(puff); setTimeout(() => puff.remove(), 800);
    }
  }, []);

  const toLid = useCallback((id: string, x: number, y: number, r: number, opt: { slap?: boolean; from?: { x: number; y: number; w: number }; s?: number; dr?: number; dur?: number } = {}) => {
    const d = BY[id]; const c = opt.from ?? center(fly(id));
    const f = fit(d, x, y);
    if (c) flights.current.set(id, { x: c.x, y: c.y, w: c.w, r: opt.dr ?? 0, s: opt.s ?? 1.25, slap: opt.slap ?? true, dur: opt.dur ?? 0.5 });
    setSt((s) => ({ ...s, [id]: { on: true, x: f.x, y: f.y, r, z: ++zTop.current } }));
  }, []);
  const toSlot = useCallback((id: string, opt: { from?: { x: number; y: number; w: number }; dur?: number } = {}) => {
    const c = opt.from ?? center(fly(id));
    if (c) flights.current.set(id, { x: c.x, y: c.y, w: c.w, r: 0, s: 1.15, slap: false, dur: opt.dur ?? 0.6 });
    setSt((s) => ({ ...s, [id]: { ...s[id], on: false } }));
  }, []);

  /* pointer: peel, drag, drop, two-finger turn */
  const onDown = useCallback((e: PE<HTMLDivElement>, id: string) => {
    if (e.button !== 0 || drag.current) return;
    if (e.pointerType === 'mouse') e.preventDefault();
    const el = e.currentTarget.querySelector('.stk-fly'); const c = center(el); if (!c) return;
    const p = stRef.current[id];
    drag.current = { id, from: p.on ? 'lid' : 'slot', sx: e.clientX, sy: e.clientY, ox: e.clientX - c.x, oy: e.clientY - c.y, started: false, pid: e.pointerId, r: p.on ? p.r : BY[id].tilt, tx: c.x, ty: c.y, x: c.x, y: c.y, vx: 0, tilt: 0 };
    if (p.on) setSel(id);
  }, []);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const g = drag.current; raf = 0;
      if (!g || !g.started) return;
      const nx = g.x + (g.tx - g.x) * 0.38, ny = g.y + (g.ty - g.y) * 0.38;
      g.vx = nx - g.x; g.x = nx; g.y = ny;
      g.tilt += (clamp(g.vx * 0.9, -16, 16) - g.tilt) * 0.2;
      const el = heldEl.current;
      if (el) el.style.transform = `translate(${g.x}px, ${g.y}px) translate(-50%, -50%) rotate(${g.tilt}deg)`;
      const rot = el?.querySelector<HTMLElement>('.stk-rot'); if (rot) rot.style.transform = `rotate(${g.r}deg)`;
      raf = requestAnimationFrame(loop);
    };
    const move = (e: PointerEvent) => {
      const g = drag.current; if (!g) return;
      if (g.two && (e.pointerId === g.two.pid || e.pointerId === g.pid)) {
        if (e.pointerId === g.two.pid) { g.two.px = e.clientX; g.two.py = e.clientY; } else { g.tx = e.clientX - g.ox; g.ty = e.clientY - g.oy; }
        const px = g.tx + g.ox, py = g.ty + g.oy;
        g.r = g.two.r0 + (Math.atan2(g.two.py - py, g.two.px - px) * 180) / Math.PI - g.two.a0;
        return;
      }
      if (e.pointerId !== g.pid) return;
      g.tx = e.clientX - g.ox; g.ty = e.clientY - g.oy;
      if (!g.started && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > 7) {
        g.started = true; peelSound();
        setHeld(g.id); setSel(null);
        if (!raf) raf = requestAnimationFrame(loop);
      }
    };
    const downAlso = (e: PointerEvent) => {
      const g = drag.current; if (!g || e.pointerId === g.pid || g.two) return;
      const px = g.tx + g.ox, py = g.ty + g.oy;
      g.two = { pid: e.pointerId, px: e.clientX, py: e.clientY, a0: (Math.atan2(e.clientY - py, e.clientX - px) * 180) / Math.PI, r0: g.r };
      if (!g.started) { g.started = true; setHeld(g.id); setSel(null); if (!raf) raf = requestAnimationFrame(loop); }
    };
    const up = (e: PointerEvent) => {
      const g = drag.current; if (!g) return;
      if (g.two && e.pointerId === g.two.pid) { g.two = undefined; return; }
      if (e.pointerId !== g.pid) return;
      drag.current = null; cancelAnimationFrame(raf); raf = 0;
      if (!g.started) {
        if (e.type === 'pointercancel') return;
        if (g.from === 'slot') { const n = DEFS.filter((d) => stRef.current[d.id].on).length; const s = scatter(n + DEFS.findIndex((d) => d.id === g.id)); toLid(g.id, s.x, s.y, s.r); setSay(`${BY[g.id].label} is on the lid.`); }
        return;
      }
      const lid = lidRef.current?.getBoundingClientRect();
      const at = { x: g.x, y: g.y, w: heldEl.current?.querySelector<HTMLElement>('.stk-fly')?.offsetWidth ?? 0 };
      setHeld(null);
      if (lid && e.type !== 'pointercancel' && at.x > lid.left && at.x < lid.right && at.y > lid.top && at.y < lid.bottom) {
        toLid(g.id, (at.x - lid.left) / lid.width, (at.y - lid.top) / lid.height, g.r, { from: at, s: 1.1, dr: g.tilt, dur: 0.16 });
        setSel(g.id); setSay(`${BY[g.id].label} is on the lid.`);
      } else {
        toSlot(g.id, { from: at });
        setSay(`${BY[g.id].label} is back on its sheet.`);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerdown', downAlso);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', downAlso); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); cancelAnimationFrame(raf); };
  }, [toLid, toSlot]);

  /* the rotate handle */
  const onRot = useCallback((e: PE<HTMLButtonElement>, id: string) => {
    e.stopPropagation(); e.preventDefault();
    const c = center(fly(id)); if (!c) return;
    const r0 = stRef.current[id].r, a0 = (Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180) / Math.PI;
    const mv = (ev: PointerEvent) => {
      const a = (Math.atan2(ev.clientY - c.y, ev.clientX - c.x) * 180) / Math.PI;
      setSt((s) => ({ ...s, [id]: { ...s[id], r: r0 + a - a0 } }));
    };
    const end = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
  }, []);
  const turn = (id: string, by: number) => setSt((s) => ({ ...s, [id]: { ...s[id], r: s[id].r + by } }));
  const onRotKey = useCallback((e: KE<HTMLButtonElement>, id: string) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); turn(id, -15); }
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); turn(id, 15); }
    if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
  }, []);

  /* keyboard: tab to a sticker, enter to pick up, arrows to move, enter to stick */
  const onKey = useCallback((e: KE<HTMLDivElement>, id: string) => {
    if (e.target !== e.currentTarget) return;
    const p = stRef.current[id], d = BY[id];
    const k = e.key;
    if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      if (!p.on) { focusAfter.current = id; toLid(id, 0.5, 0.5, 0, { slap: false }); setKb(id); setSel(id); setSay(`${d.label} picked up over the lid. Arrows move it, Enter sticks it.`); }
      else if (kb !== id) { setKb(id); setSel(id); peelSound(); setSay(`${d.label} picked up. Arrows move it, Enter sticks it.`); }
      else { setKb(null); slap(id); setSay(`${d.label} stuck.`); }
      return;
    }
    if (!p.on) return;
    const step = e.shiftKey ? 0.1 : 0.03;
    const mv: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (mv[k]) {
      e.preventDefault();
      if (kb !== id) { setKb(id); setSel(id); }
      const f = fit(d, p.x + mv[k][0], p.y + mv[k][1]);
      setSt((s) => ({ ...s, [id]: { ...s[id], x: f.x, y: f.y, z: s[id].z } }));
    } else if (k === 'r' || k === 'R') { e.preventDefault(); turn(id, k === 'R' ? -15 : 15); }
    else if (k === 'Delete' || k === 'Backspace' || k === 'Escape') { e.preventDefault(); setKb(null); setSel(null); focusAfter.current = id; toSlot(id); setSay(`${d.label} peeled off, back on its sheet.`); }
  }, [kb, toLid, toSlot, slap]);

  /* the two big buttons */
  const timers = useRef<number[]>([]);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const stickAll = () => {
    clearTimers(); setKb(null); setSel(null);
    const off = DEFS.filter((d) => !stRef.current[d.id].on);
    off.forEach((d, i) => {
      timers.current.push(window.setTimeout(() => { const s = scatter(DEFS.indexOf(d) * 3 + 1); toLid(d.id, s.x, s.y, s.r, { dur: 0.42 }); }, still ? 0 : i * 95));
    });
    setSay(off.length ? 'Every sticker is on the lid.' : 'The lid is already full.');
  };
  const peelAll = () => {
    clearTimers(); setKb(null); setSel(null);
    const on = DEFS.filter((d) => stRef.current[d.id].on).sort((a, b) => stRef.current[b.id].z - stRef.current[a.id].z);
    on.forEach((d, i) => timers.current.push(window.setTimeout(() => { peelSound(); toSlot(d.id, { dur: 0.7 }); }, still ? 0 : i * 55)));
    setSay('The lid is clean.');
  };
  useEffect(() => () => clearTimers(), []);

  /* deselect when clicking empty lid or page */
  useEffect(() => {
    const f = (e: PointerEvent) => { if (!(e.target as Element).closest?.('.v-stickers .stk.at-lid')) setSel(null); };
    window.addEventListener('pointerdown', f);
    return () => window.removeEventListener('pointerdown', f);
  }, []);

  /* sheets deal their stickers when reached */
  useEffect(() => {
    const sheets = root.current?.querySelectorAll('.sheet') ?? [];
    if (still || !('IntersectionObserver' in window)) { sheets.forEach((s) => s.classList.add('dealt')); return; }
    const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('dealt'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    sheets.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  /* the ending: the lid opens a crack, light comes out, Join is inside */
  useGSAP(() => {
    if (still) return;
    const q = gsap.utils.selector(root);
    const tl = gsap.timeline({ scrollTrigger: { trigger: q('.f-stage')[0], start: 'center center', end: '+=130%', scrub: 0.6, pin: true, anticipatePin: 1 } });
    tl.fromTo(q('.f-lid'), { rotateX: 0 }, { rotateX: 9, duration: 0.3, ease: 'power2.out' })
      .fromTo(q('.f-crack'), { opacity: 0, scaleX: 0.4 }, { opacity: 1, scaleX: 1, duration: 0.25 }, 0.02)
      .fromTo(q('.f-light'), { opacity: 0, scaleY: 0.2 }, { opacity: 1, scaleY: 1, duration: 0.3 }, 0)
      .to(q('.f-lid'), { rotateX: 74, yPercent: -36, opacity: 0, duration: 0.5, ease: 'power2.in' }, 0.32)
      .fromTo(q('.f-screen'), { filter: 'brightness(0.25)' }, { filter: 'brightness(1)', duration: 0.4 }, 0.3)
      .fromTo(q('.f-screen [data-in]'), { y: 30, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.04, duration: 0.25 }, 0.55)
      .to(q('.f-light'), { opacity: 0.55, duration: 0.2 }, 0.8)
      .to(q('.f-crack'), { opacity: 0, duration: 0.2 }, 0.62);
    ScrollTrigger.refresh();
  }, { scope: root });

  const sheetOf = (sec: Sec, title: string, _n?: string) => (
    <div className="sheet" aria-label={`Sticker sheet: ${title}`} role="group">
      <div className="sheet-slots">
        {DEFS.filter((d) => d.sec === sec).map((d, i) => (
          <div className="slot" key={d.id} style={{ '--i': i, '--w': d.w, '--h': d.h } as CSSProperties}>
            <Ghost d={d} />
            {!st[d.id].on && held !== d.id && <Sticker d={d} where="slot" onDown={onDown} onKey={onKey} />}
          </div>
        ))}
      </div>
    </div>
  );

  const lidStickers = useMemo(() => DEFS.filter((d) => st[d.id].on && held !== d.id), [st, held]);

  return (
    <div className="v-stickers" ref={root}>
      <a className="skip-x" href="#main">Skip to the content</a>
      <header className="bar">
        <a className="brand" href="#top" aria-label="Skeptical, back to the top">Skeptical<b>?</b></a>
        <nav aria-label="Sections" className="bar-nav">{NAV.map((n) => <a key={n.id} href={'#' + n.id}>{n.label}</a>)}</nav>
        <div className="bar-tools">
          <button type="button" className="btn btn-stick" onClick={stickAll}>Stick them all</button>
          <button type="button" className="btn btn-peel" onClick={peelAll}>Peel it clean</button>
        </div>
      </header>
      <p className="sr-only-x" aria-live="polite">{say}</p>

      <div className="stage" id="top">
        <aside className="lid-col" aria-label="The laptop lid">
          <div className="lid-wrap">
            <div className="lid" ref={lidRef} role="group" aria-label="The laptop lid. Stickers you put here stay here.">
              <div className="lid-grain" aria-hidden="true" />
              <Deboss />
              <div className="lid-lip" aria-hidden="true" />
              {lidStickers.map((d) => <Sticker key={d.id} d={d} where="lid" p={st[d.id]} sel={sel === d.id} kb={kb === d.id} onDown={onDown} onKey={onKey} onRot={onRot} onRotKey={onRotKey} />)}
            </div>
            <p className="lid-help"><span className="dk">Peel one off the sheet. Slap it on.</span><span className="ph">Tap a sticker to slap it on.</span></p>
          </div>
        </aside>

        <main id="main" className="col">
          <section className="sec hero" aria-labelledby="h1">
            <h1 id="h1"><span className="h1-big">{SITE.name}<b aria-hidden="true">?</b></span><span className="sr-only-x">: </span><span className="h1-small">an independent Lincoln-Douglas debate team</span></h1>
            <p className="pitch">{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</p>
            <ul className="statement">{HERO.statement.map((l, i) => <li key={l} className={'st' + i}>{l}</li>)}</ul>
            <div className="doors">{HERO.doors.map((d, i) => <a key={d.href} href={d.href} className={'door door' + i}>{d.label}<Arrow /></a>)}</div>
            {sheetOf('hero', 'The pitch', '01')}
          </section>

          <section className="sec" aria-labelledby="h-lines">
            <h2 id="h-lines" className="h2">Four lines.</h2>
            <ol className="lines">{MANIFESTO.map((l, i) => <li key={l}><b aria-hidden="true">{i + 1}</b>{l}</li>)}</ol>
            {sheetOf('lines', 'The lines', '02')}
          </section>

          <section className="sec" id="record" aria-labelledby="h-record">
            <h2 id="h-record" className="h2">{RECORD.title}</h2>
            <p className="lead">{RECORD.rule}</p>
            <p className="event"><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ul className="results">{RECORD.results.map((r) => <li key={r.who}><b>{r.what}</b><span>{r.who}</span><em>{r.more}</em></li>)}</ul>
            <a className="more" href={RECORD.more.href}>{RECORD.more.label}</a>
            {sheetOf('record', 'The record', '03')}
          </section>

          <section className="sec" id="drive" aria-labelledby="h-drive">
            <h2 id="h-drive" className="h2">{DRIVE.title}</h2>
            <p className="lead">{DRIVE.lead}</p>
            <dl className="drive">{DRIVE.items.map((it) => <div key={it.term}><dt>{it.term}</dt><dd>{it.text}</dd></div>)}</dl>
            <a className="more" href={DRIVE.more.href}>{DRIVE.more.label}</a>
            {sheetOf('drive', 'The drive, closed', '04')}
          </section>

          <section className="sec" id="people" aria-labelledby="h-people">
            <h2 id="h-people" className="h2">{PEOPLE.title}</h2>
            <div className="coaches">{PEOPLE.coaches.map((c) => <div key={c.name} className="coach"><h3>{c.name}</h3><p className="role">{c.role}</p><p>{c.bio}</p></div>)}</div>
            <p className="lead">{PEOPLE.count}</p>
            <a className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</a>
            {sheetOf('people', 'The people', '05')}
          </section>

          <section className="sec ways" aria-labelledby="h-ways">
            <h2 id="h-ways" className="h2">Three ways in.</h2>
            <p className="lead">{JOIN.paths.map((p) => p.name).join('. ')}. Keep scrolling and the lid opens.</p>
            {sheetOf('ways', 'The ways in', '06')}
          </section>
        </main>
      </div>

      <section className="finale" id="join" aria-labelledby="h-join">
        <div className="f-stage">
          <div className="f-light" aria-hidden="true" />
          <div className="laptop">
            <div className="f-screen">
              <h2 id="h-join" className="j-title" data-in>{JOIN.title}</h2>
              <p className="j-lead" data-in>{JOIN.lead}</p>
              <div className="j-paths">
                {JOIN.paths.map((p, i) => (
                  <a key={p.id} href={p.href} className={'j-path jp' + i} data-in>
                    <span className="j-name">{p.name}</span>
                    <span className="j-line">{p.line}</span>
                    <span className="j-first">{p.text[0]}</span>
                    <Arrow className="j-go" />
                  </a>
                ))}
              </div>
            </div>
            <div className="f-crack" aria-hidden="true" />
            <div className="f-lid" aria-hidden="true">
              <div className="lid lid-static">
                <div className="lid-grain" />
                <Deboss />
                <div className="lid-lip" />
                {DEFS.filter((d) => st[d.id].on).map((d) => <Sticker key={d.id} d={d} where="static" p={st[d.id]} />)}
              </div>
            </div>
          </div>
        </div>
        <div className="j-more">
          {JOIN.paths.map((p) => (
            <div key={p.id} className="j-full">
              <h3>{p.name}. <span>{p.line}</span></h3>
              <ul>{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
              <a href={p.href} className="more">{p.name}: {p.line}</a>
            </div>
          ))}
          <div className="j-small">
            <p>{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a>.</p>
            <p>{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a>.</p>
            <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
            <p>{JOIN.discord}</p>
          </div>
        </div>
      </section>

      <footer className="foot">
        <div className="foot-bumper" aria-hidden="true"><div className="stk at-static" style={{ '--w': 74, '--h': 12 } as CSSProperties}><div className="stk-rot"><Bumper /></div></div></div>
        <p className="sr-only-x">{FOOTER.line}</p>
        <ul className="foot-links">{FOOTER.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
        <ul className="foot-pages">{FOOTER.pages.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
        <p className="foot-small">Draft 2, version 20. Not the live site. Every sticker drawn for this page.</p>
      </footer>

      {held && (
        <div className="held-layer" aria-hidden="true">
          <div className="held" ref={heldEl} style={{ transform: `translate(${drag.current?.x ?? 0}px, ${drag.current?.y ?? 0}px) translate(-50%, -50%)` }}>
            <Sticker d={BY[held]} where="held" p={{ ...st[held], r: drag.current?.r ?? 0 }} />
          </div>
        </div>
      )}
    </div>
  );
}
