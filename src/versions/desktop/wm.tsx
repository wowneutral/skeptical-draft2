// The window manager: frames you drag by the title, resize from any corner,
// raise by touching, pocket to the shelf, fill the screen, close and reopen.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { gsap } from '@/lib/scroll';
import { cn, still } from '@/lib/utils';
import { Px, MAPS } from './pixels';
import { useOS, BAR, SHELF, type AppId, type Rect } from './store';

export type AppDef = { id: AppId; title: string; label: string; icon: keyof typeof MAPS; min: [number, number] };

const Glyph = ({ k }: { k: 'close' | 'min' | 'max' | 'restore' }) => (
  <svg viewBox="0 0 9 9" width="18" height="18" shapeRendering="crispEdges" aria-hidden="true">
    {k === 'close' && <path d="M1 1h2v1h1v1h1V2h1V1h2v2H7v1H6v1h1v1h1v2H6V7H5V6H4v1H3v1H1V6h1V5h1V4H2V3H1z" fill="currentColor" />}
    {k === 'min' && <path d="M1 6h7v2H1z" fill="currentColor" />}
    {k === 'max' && <path d="M1 1h7v7H1zM2 3v4h5V3z" fill="currentColor" fillRule="evenodd" />}
    {k === 'restore' && <path d="M3 1h5v5H7V2H3zM1 3h5v5H1zM2 5v2h3V5z" fill="currentColor" fillRule="evenodd" />}
  </svg>
);

const area = () => ({ x: 0, y: BAR, w: innerWidth, h: innerHeight - BAR - SHELF });

export function Window({ app, children, className }: { app: AppDef; children: ReactNode; className?: string }) {
  const { id, title, min: [mw, mh] } = app;
  const w = useOS((s) => s.wins[id]);
  const focused = useOS((s) => s.focus === id);
  const { raise, place, close, minimise, toggleMax } = useOS.getState();
  const el = useRef<HTMLElement>(null);
  const [anim, setAnim] = useState(false);
  const prevMin = useRef(w.min);

  // Coming back from the shelf: fly up out of its tab.
  useLayoutEffect(() => {
    const was = prevMin.current; prevMin.current = w.min;
    if (!el.current || still || !was || w.min) return;
    const tab = document.querySelector<HTMLElement>(`[data-tab="${id}"]`)?.getBoundingClientRect();
    if (!tab) return;
    const r = el.current.getBoundingClientRect();
    gsap.fromTo(el.current, { x: tab.left + tab.width / 2 - (r.left + r.width / 2), y: tab.top - (r.top + r.height / 2), scale: 0.12, opacity: 0.4 },
      { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.36, ease: 'back.out(1.3)', clearProps: 'transform,opacity' });
  }, [w.min, id]);

  const rect: Rect = w.max ? area() : w;

  const pocket = () => {
    const tab = document.querySelector<HTMLElement>(`[data-tab="${id}"]`)?.getBoundingClientRect();
    if (still || !el.current || !tab) { minimise(id); return; }
    const r = el.current.getBoundingClientRect();
    gsap.to(el.current, {
      x: tab.left + tab.width / 2 - (r.left + r.width / 2), y: tab.top - (r.top + r.height / 2), scale: 0.12, opacity: 0.3, duration: 0.3, ease: 'power3.in',
      onComplete: () => { minimise(id); gsap.set(el.current, { clearProps: 'transform,opacity' }); },
    });
  };
  const shut = () => {
    const back = () => { close(id); document.querySelector<HTMLElement>(`[data-icon="${id}"]`)?.focus({ preventScroll: true }); };
    if (still || !el.current) { back(); return; }
    gsap.to(el.current, { scale: 0.9, opacity: 0, duration: 0.16, ease: 'power2.in', onComplete: back });
  };
  const maxi = () => { setAnim(true); toggleMax(id); setTimeout(() => setAnim(false), 260); };

  // Drag by the title bar. Dragging a filled window un-fills it under the pointer.
  const drag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button') || e.button !== 0) return;
    const bar = e.currentTarget as HTMLElement;
    bar.setPointerCapture(e.pointerId);
    let s = useOS.getState().wins[id];
    const sx = e.clientX, sy = e.clientY;
    let ox = s.x, oy = s.y;
    if (s.max) {
      const fx = (e.clientX) / innerWidth;
      ox = e.clientX - s.w * fx; oy = BAR;
      place(id, { max: false, x: ox, y: oy });
      s = useOS.getState().wins[id];
    }
    el.current?.classList.add('is-drag');
    const mv = (ev: PointerEvent) => {
      const x = Math.min(innerWidth - 90, Math.max(90 - s.w, ox + ev.clientX - sx));
      const y = Math.min(innerHeight - SHELF - 40, Math.max(BAR, oy + ev.clientY - sy));
      place(id, { x, y });
    };
    const up = () => { bar.removeEventListener('pointermove', mv); bar.removeEventListener('pointerup', up); bar.removeEventListener('pointercancel', up); el.current?.classList.remove('is-drag'); };
    bar.addEventListener('pointermove', mv); bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
  };

  const resize = (corner: 'nw' | 'ne' | 'sw' | 'se') => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const h = e.currentTarget as HTMLElement;
    h.setPointerCapture(e.pointerId);
    const s0 = { ...(useOS.getState().wins[id].max ? area() : useOS.getState().wins[id]) };
    if (useOS.getState().wins[id].max) place(id, { ...s0, max: false });
    const sx = e.clientX, sy = e.clientY;
    const mv = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      let { x, y, w: ww, h: hh } = s0;
      if (corner.includes('e')) ww = Math.max(mw, s0.w + dx);
      if (corner.includes('s')) hh = Math.max(mh, Math.min(innerHeight - SHELF - s0.y, s0.h + dy));
      if (corner.includes('w')) { ww = Math.max(mw, s0.w - dx); x = s0.x + s0.w - ww; }
      if (corner.includes('n')) { hh = Math.max(mh, s0.h - dy); y = Math.max(BAR, s0.y + s0.h - hh); hh = s0.y + s0.h - y; }
      place(id, { x, y, w: ww, h: hh });
    };
    const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); };
    h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
  };

  const keys = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); e.stopPropagation(); shut(); return; }
    if (e.target !== e.currentTarget) return;
    const d = e.shiftKey ? 0 : 1, step = 24;
    const m: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const v = m[e.key];
    if (!v) return;
    e.preventDefault();
    const s = useOS.getState().wins[id];
    if (d) place(id, { x: Math.min(innerWidth - 90, Math.max(90 - s.w, s.x + v[0])), y: Math.min(innerHeight - SHELF - 40, Math.max(BAR, s.y + v[1])), max: false });
    else place(id, { w: Math.max(mw, s.w + v[0]), h: Math.max(mh, s.h + v[1]), max: false });
  };

  if (!w.open) return null;
  return (
    <section
      ref={el}
      className={cn('win', `win--${id}`, focused && 'is-focus', w.max && 'is-max', anim && 'is-anim', className)}
      aria-label={title}
      tabIndex={0}
      hidden={w.min}
      data-win={id}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: w.z }}
      onPointerDownCapture={() => raise(id)}
      onFocus={() => raise(id)}
      onKeyDown={keys}
    >
      <div className="win-bar" onPointerDown={drag} onDoubleClick={(e) => { if (!(e.target as HTMLElement).closest('button')) maxi(); }}>
        <div className="win-ctl">
          <button type="button" className="ctl ctl--x" onClick={shut} aria-label={`Close ${title}`}><Glyph k="close" /></button>
          <button type="button" className="ctl" onClick={pocket} aria-label={`Put ${title} on the shelf`}><Glyph k="min" /></button>
          <button type="button" className="ctl" onClick={maxi} aria-label={w.max ? `Restore ${title}` : `Fill the screen with ${title}`}><Glyph k={w.max ? 'restore' : 'max'} /></button>
        </div>
        <p className="win-title"><span>{title}</span></p>
        <span className="win-grip" aria-hidden="true" />
        <Px name={app.icon} size={28} shadow={false} className="win-ico" />
      </div>
      <div className="win-body">{children}</div>
      {!w.max && (['nw', 'ne', 'sw', 'se'] as const).map((c) => <span key={c} className={`rz rz--${c}`} onPointerDown={resize(c)} aria-hidden="true" />)}
    </section>
  );
}

/** The shelf: every open window as a tab. Press a tab to raise it, press the raised one to pocket it. */
export function Shelf({ apps }: { apps: AppDef[] }) {
  const wins = useOS((s) => s.wins);
  const focus = useOS((s) => s.focus);
  const { open, raise } = useOS.getState();
  const list = apps.filter((a) => wins[a.id].open).sort((a, b) => wins[a.id].born - wins[b.id].born);
  return (
    <nav className="shelf" aria-label="Open windows">
      <ul>
        {list.map((a) => {
          const w = wins[a.id];
          return (
            <li key={a.id}>
              <button type="button" data-tab={a.id} className={cn('tab', w.min && 'is-min', focus === a.id && !w.min && 'is-on')}
                aria-label={`${a.title}${w.min ? ', on the shelf' : ''}`}
                onClick={() => {
                  if (w.min) open(a.id);
                  else if (focus === a.id) document.querySelector<HTMLElement>(`[data-win="${a.id}"] .ctl:nth-child(2)`)?.click();
                  else { raise(a.id); document.querySelector<HTMLElement>(`[data-win="${a.id}"]`)?.focus({ preventScroll: true }); }
                }}>
                <Px name={a.icon} size={26} shadow={false} /><span>{a.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The clock in the bar: the visitor's own time, the colon ticking. */
export function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const h = now.getHours(), m = String(now.getMinutes()).padStart(2, '0');
  const day = now.toLocaleDateString(undefined, { weekday: 'short' });
  return (
    <p className="clock">
      <span className="clock-d">{day}</span>
      <time dateTime={now.toISOString()}>{String(h).padStart(2, '0')}<span className={cn('colon', now.getSeconds() % 2 && 'is-off')}>:</span>{m}</time>
    </p>
  );
}

/** Prep time, as in a round: four minutes, press to run, press to hold. */
export function Prep() {
  const [left, setLeft] = useState(240);
  const [run, setRun] = useState(false);
  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setLeft((v) => { if (v <= 1) { setRun(false); return 0; } return v - 1; }), 1000);
    return () => clearInterval(t);
  }, [run]);
  const mm = Math.floor(left / 60), ss = String(left % 60).padStart(2, '0');
  return (
    <button type="button" className={cn('prep', run && 'is-run', left === 0 && 'is-out')} aria-pressed={run}
      onClick={() => { if (left === 0) { setLeft(240); setRun(false); } else setRun((r) => !r); }}
      onContextMenu={(e) => { e.preventDefault(); setLeft(240); setRun(false); }}>
      <span className="prep-k">Prep</span><span className="prep-t">{left === 0 ? 'Time' : `${mm}:${ss}`}</span>
      <span className="sr-only-x">{run ? ', running. Press to hold.' : ', press to start.'}</span>
    </button>
  );
}

/** A pull-down menu from the bar. Arrow keys move through it, Escape shuts it. */
export function Menu({ label, children, className }: { label: ReactNode; children: (close: () => void) => ReactNode; className?: string }) {
  const [on, setOn] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!on) return;
    const off = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOn(false); };
    document.addEventListener('pointerdown', off);
    requestAnimationFrame(() => root.current?.querySelector<HTMLElement>('.menu-list button, .menu-list a')?.focus());
    return () => document.removeEventListener('pointerdown', off);
  }, [on]);
  const close = () => { setOn(false); root.current?.querySelector<HTMLElement>('.menu-btn')?.focus(); };
  return (
    <div className={cn('menu', on && 'is-on', className)} ref={root}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && on) { e.preventDefault(); e.stopPropagation(); close(); }
        if (on && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
          e.preventDefault();
          const items = [...(root.current?.querySelectorAll<HTMLElement>('.menu-list button, .menu-list a') ?? [])];
          const i = items.indexOf(document.activeElement as HTMLElement);
          items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
        }
      }}>
      <button type="button" className="menu-btn" aria-expanded={on} onClick={() => setOn((o) => !o)}>{label}</button>
      {on && <div className="menu-list">{children(() => setOn(false))}</div>}
    </div>
  );
}
