// Version 16: the elevator. The elevator pitch, taken literally: call the
// lift in the lobby, ride it floor by floor, and the doors open on each part
// of the team. The drive is the basement and needs a key.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import '../../../node_modules/@fontsource-variable/big-shoulders-display/wght.css';
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource/bodoni-moda/500.css';
import '@fontsource/bodoni-moda/500-italic.css';
import '@fontsource/dm-serif-display/400.css';
import './elevator.css';
import { gsap, getLenis, scroll, scrollToY } from '@/lib/scroll';
import { clamp, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { DrivePlate, Dark, Join, Line, Lobby, People, Record, ShaftView } from './Rooms';
import { FLOORS, RIDE, emit, floorAt, lift, on, resetLift, yFor, type Phase } from './lift';
import { makeGeo } from './geo';
import { alarm, chime, click, doorSound, motor, soundOff, soundOn } from './sound';

const Stage = lazy(() => import('./Stage'));
const N = 16;

/** Interface jokes for the alarm bell. None of them is about the team. */
const JOKES = ['Time.', 'Finish your sentence.', 'That is a new argument.', 'Extend it.', 'Clear.', 'Grace period is over.', 'Please do not run the alarm.'];

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

export default function Elevator() {
  useVersion('elevator');
  const [gl] = useState(hasWebGL);
  return gl && !still ? <Lift /> : <Plain />;
}

/* ------------------------------------------------------------------ */
/* Icons for the panel                                                  */
/* ------------------------------------------------------------------ */
const IcOpen = () => (<svg viewBox="0 0 32 20" aria-hidden="true"><path d="M2 10l8-7v14zM30 10l-8-7v14z" /><rect x="15" y="1" width="2" height="18" /></svg>);
const IcClose = () => (<svg viewBox="0 0 32 20" aria-hidden="true"><path d="M14 10L6 3v14zM18 10l8-7v14z" /><rect x="1" y="1" width="2" height="18" /><rect x="29" y="1" width="2" height="18" /></svg>);
const IcBell = () => (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5a1.6 1.6 0 0 1 1.6 1.6v.6a6 6 0 0 1 4.4 5.8v4.2l2 2.3v1H4v-1l2-2.3v-4.2a6 6 0 0 1 4.4-5.8v-.6A1.6 1.6 0 0 1 12 2.5zM9.6 19.8h4.8a2.4 2.4 0 0 1-4.8 0z" /></svg>);
const IcSound = ({ on }: { on: boolean }) => (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3z" />{on ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /> : <path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}</svg>);
const IcKey = () => (<svg viewBox="0 0 40 16" aria-hidden="true"><circle cx="7" cy="8" r="6" /><circle cx="7" cy="8" r="2.2" className="hole" /><path d="M12 6.5h26v3h-3v4h-3v-4h-3v3h-3v-3h-14z" /></svg>);

/* ------------------------------------------------------------------ */
/* The lift                                                             */
/* ------------------------------------------------------------------ */
function Lift() {
  const [hostEl, setHostEl] = useState<HTMLDivElement | null>(null), [rootEl, setRootEl] = useState<HTMLDivElement | null>(null);
  const root = useRef<HTMLDivElement | null>(null), host = useRef<HTMLDivElement | null>(null), drum = useRef<HTMLSpanElement>(null), keyBtn = useRef<HTMLButtonElement>(null), spacer = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const geo = useMemo(() => makeGeo(phone), [phone]);
  const els = useMemo(() => ({ rooms: Array.from({ length: FLOORS.length }, (_, i) => { const d = document.createElement('div'); d.className = 'cssroom'; d.dataset.floor = String(i); return d; }), floors: Array.from({ length: FLOORS.length }, (_, i) => { const d = document.createElement('div'); d.className = 'cssroom cssfloor'; d.dataset.floor = String(i); return d; }),
    shaft: (() => { const d = document.createElement('div'); d.className = 'cssroom cssshaft'; return d; })() }), []);
  const [phase, setPhase] = useState<Phase>('outside');
  const [at, setAt] = useState(-1);
  const [status, setStatus] = useState('');
  const [key, setKey] = useState(false);
  const [lit, setLit] = useState<number[]>([]);
  const [sound, setSound] = useState(false);
  const [ready, setReady] = useState(false);
  const over = useRef<number[]>(FLOORS.map(() => 0));
  const joke = useRef(0);
  const prog = useRef(0);

  useEffect(() => {
    const r = () => setPhone(isPhone());
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  // A fresh lift, the lobby lights coming on, and no scrolling until it is called.
  useEffect(() => {
    resetLift();
    const tl = gsap.timeline({ delay: 0.5, onComplete: () => setReady(true) });
    tl.to(lift, { lights: 0.7, duration: 0.08 }).to(lift, { lights: 0.1, duration: 0.1 }).to(lift, { lights: 0.9, duration: 0.07 }).to(lift, { lights: 0.35, duration: 0.12 }).to(lift, { lights: 1, duration: 0.6, ease: 'power2.out' });
    const t = setTimeout(() => { if (lift.phase === 'outside') getLenis()?.stop(); }, 0);
    return () => { tl.kill(); clearTimeout(t); getLenis()?.start(); };
  }, []);

  // The room elements live in the 3D layer; size them to the doorway.
  useEffect(() => {
    const h = host.current; if (!h) return;
    els.floors.forEach((el) => { if (!el.parentElement) h.appendChild(el); el.style.width = `${geo.floor.w * geo.PX}px`; el.style.height = `${geo.floor.d * geo.PX}px`; });
    els.shaft.style.width = `${geo.shaft.w * geo.PX}px`; els.shaft.style.height = `${geo.shaft.h * geo.PX}px`;
    [...els.rooms, els.shaft].forEach((el) => {
      if (!el.parentElement) h.appendChild(el);
      if (el !== els.shaft) { el.style.width = `${geo.room.w * geo.PX}px`; el.style.height = `${geo.room.h * geo.PX}px`; }
      el.style.setProperty('--win-x', `${geo.win.x}px`); el.style.setProperty('--win-y', `${geo.win.y}px`);
      el.style.setProperty('--win-w', `${geo.win.w}px`); el.style.setProperty('--win-h', `${geo.win.h}px`);
      el.style.setProperty('--floor-y', `${geo.win.floor}px`); el.style.setProperty('--fh', `${geo.FH * geo.PX}px`);
    });
  }, [els, geo]);

  // How long each floor holds: a beat, plus however much of the room is below the doorway.
  useEffect(() => {
    const measure = () => {
      const vh = window.innerHeight, gap = vh * 0.85;
      let y = 0;
      lift.segs = RIDE.map((i, k) => {
        const sc = els.rooms[i].querySelector<HTMLElement>('.scroll'), win = els.rooms[i].querySelector<HTMLElement>('.win');
        const o = sc && win ? Math.max(0, sc.scrollHeight - win.clientHeight) : 0;
        over.current[i] = o;
        const a = y, b = a + vh * (k === 0 ? 0.5 : 0.45) + o * 1.1;
        y = b + gap;
        return { i, a, b };
      });
      lift.gap = gap;
      const end = lift.segs[lift.segs.length - 1].b;
      if (spacer.current) spacer.current.style.height = `${Math.round(end + vh)}px`;
    };
    measure();
    const ro = new ResizeObserver(measure);
    els.rooms.forEach((el) => { const sc = el.querySelector('.scroll'); if (sc) ro.observe(sc); });
    document.fonts.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [els, geo]);

  // Walk in once the doors are open in the lobby.
  const enter = useCallback(() => {
    if (lift.phase !== 'calling') return;
    lift.phase = 'entering'; setPhase('entering');
    gsap.to(lift, {
      enter: 1, duration: phone ? 3.6 : 4.2, ease: 'none',
      onComplete: () => { lift.phase = 'inside'; setPhase('inside'); getLenis()?.start(); emit('phase'); },
    });
  }, [phone]);

  const call = useCallback((how: 'button' | 'jump') => {
    if (lift.phase !== 'outside') return;
    getLenis()?.start();
    if (how === 'jump') {
      // Arrived by a jump down the page: skip the walk.
      gsap.killTweensOf(lift);
      Object.assign(lift, { phase: 'inside', enter: 1, lights: 1, p: lift.scrollF, doors: 0 });
      setPhase('inside'); setReady(true);
      return;
    }
    click();
    lift.phase = 'calling'; setPhase('calling');
    lift.lit.add(1); setLit([1]);
    setStatus('Coming down.');
  }, []);

  // What the lift tells the page.
  useEffect(() => {
    const offA = on('arrive', (i = 1) => {
      chime(true); setAt(i);
      setLit([...lift.lit]);
      const f = FLOORS[i];
      setStatus(i === 0 ? 'Basement. The doors only open this far.' : `${f.label}. ${f.name}.`);
      if (lift.phase === 'calling' && i === 1) gsap.delayedCall(1.1, enter);
      if (i !== 0 && lift.key) { lift.key = false; setKey(false); }
    });
    const offD = on('depart', () => { setAt(-1); });
    return () => { offA(); offD(); };
  }, [enter]);

  // Every frame: read the scroll, show the right room, roll the drum, snap to a floor when the scroll rests between two.
  useEffect(() => {
    const r = root.current; if (!r) return;
    let lastF = 1, shown = -2, lastY = -1, still_ = 0, dir = 1, lastDoor = 0, moving = false;
    const tick = (_t: number, dms: number) => {
      const y = scroll.y;
      if (lift.phase === 'outside' && y > 6) call(y > innerHeight * 1.2 ? 'jump' : 'button');
      const { f, t } = floorAt(y);
      if (lift.phase === 'inside' && Math.abs(f - lastF) > 1.2) lift.express = true;
      lastF = f; lift.scrollF = f; lift.roomT = t;
      if (y !== lastY) { dir = y > lastY ? 1 : -1; lastY = y; still_ = 0; } else still_ += dms;

      const s = lift.at >= 0 ? lift.at : lift.doors > 0.004 ? shown : -1;
      if (s !== shown) {
        shown = s; r.dataset.at = s >= 0 ? FLOORS[s].id : 'shaft';
        els.rooms.forEach((el, i) => el.classList.toggle('on', i === s));
        els.floors.forEach((el, i) => el.classList.toggle('on', i === s));
      }
      if (shown > 0 && lift.dest === null) {
        const sc = els.rooms[shown].firstElementChild?.querySelector<HTMLElement>('.scroll');
        if (sc) sc.style.transform = `translate3d(0, ${(-t * over.current[shown]).toFixed(1)}px, 0)`;
      }
      if (drum.current) drum.current.style.transform = `translateY(${(-(FLOORS.length - 1 - lift.p) * 100 / FLOORS.length).toFixed(3)}%)`;
      const mv = Math.abs(lift.v) > 0.02;
      if (mv !== moving) { moving = mv; r.classList.toggle('is-moving', mv); }
      if (mv) { const up = lift.v > 0; r.classList.toggle('go-up', up); r.classList.toggle('go-down', !up); }
      r.style.setProperty('--doors', lift.doors.toFixed(3));
      motor(lift.v);
      if (lift.doorTarget !== lastDoor) { if (Math.abs(lift.doorTarget - lift.doors) > 0.2) doorSound(); lastDoor = lift.doorTarget; }

      // Resting between two floors: the lift picks the one you were heading for.
      if (lift.phase === 'inside' && lift.dest === null && Math.abs(f - Math.round(f)) > 0.001 && still_ > 650 && performance.now() > prog.current) {
        const target = dir > 0 ? Math.ceil(f) : Math.floor(f);
        const seg = lift.segs.find((g) => g.i === target);
        if (seg) { prog.current = performance.now() + 1500; scrollToY(dir > 0 ? seg.a + 2 : seg.b - 2); }
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [els, call]);

  // Scrolling by hand takes back control from the buttons; the first scroll calls the lift.
  useEffect(() => {
    const take = () => {
      if (lift.phase === 'outside') { call('button'); return; }
      if (lift.phase === 'inside' && lift.dest !== null && performance.now() > prog.current - 1200) { lift.dest = null; setLit([]); lift.lit.clear(); }
    };
    const keys = (e: KeyboardEvent) => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(e.key) && !(e.target as HTMLElement)?.closest?.('button, a')) take(); };
    window.addEventListener('wheel', take, { passive: true });
    window.addEventListener('touchmove', take, { passive: true });
    window.addEventListener('keydown', keys);
    return () => { window.removeEventListener('wheel', take); window.removeEventListener('touchmove', take); window.removeEventListener('keydown', keys); };
  }, [call]);

  const goTo = useCallback((i: number, quiet = false) => {
    if (lift.phase === 'outside') { call('button'); return; }
    if (lift.phase !== 'inside') return;
    if (!quiet) click();
    if (i === 0 && !lift.key) {
      setStatus('B needs the key. Turn it first.');
      keyBtn.current?.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-14deg)' }, { transform: 'rotate(10deg)' }, { transform: 'rotate(0)' }], { duration: 420 });
      return;
    }
    lift.shut = false;
    if (lift.at === i) { setStatus(`You are on ${FLOORS[i].label}.`); return; }
    lift.lit.add(i); setLit([...lift.lit]);
    lift.dest = i;
    setStatus(i === 0 ? 'Going down.' : 'Going ' + (i > lift.p ? 'up.' : 'down.'));
    if (i > 0) { prog.current = performance.now() + 2200; scrollToY(yFor(i)); }
  }, [call]);

  const turnKey = () => {
    if (lift.phase !== 'inside') { call('button'); return; }
    click();
    const k = !lift.key; lift.key = k; setKey(k);
    setStatus(k ? 'Key turned. B is live.' : 'Key out.');
    if (!k && lift.dest === 0) { lift.dest = null; lift.lit.delete(0); setLit([...lift.lit]); }
  };

  const doorsOpen = () => {
    click();
    if (lift.phase !== 'inside') return;
    if (lift.at < 0) { setStatus(Math.abs(lift.v) > 0.02 ? 'Not between floors.' : 'Pick a floor first.'); return; }
    lift.shut = false; setStatus(lift.at === 0 ? 'That is as far as they go.' : 'Doors open.');
  };
  const doorsClose = () => {
    click();
    if (lift.phase !== 'inside' || lift.at < 0) return;
    lift.shut = true; setStatus('Doors closed. Open them, or pick a floor.');
  };
  const ring = () => {
    alarm(); lift.shake = 1;
    setStatus(JOKES[joke.current % JOKES.length]); joke.current++;
    gsap.fromTo(lift, { lights: 0.45 }, { lights: 1, duration: 0.6, ease: 'steps(4)' });
  };
  const toggleSound = async () => {
    if (sound) { soundOff(); setSound(false); return; }
    const ok = await soundOn(); setSound(ok);
    if (ok) chime(true);
  };

  // Keyboard and screen readers: focus inside a room rides the lift there and scrolls the room to it.
  const onRoomFocus = useCallback((i: number, e: FocusEvent) => {
    if (lift.phase === 'outside' || lift.phase === 'calling') call('jump');
    const seg = lift.segs.find((g) => g.i === i); if (!seg) return;
    const el = e.target as HTMLElement, sc = els.rooms[i].querySelector<HTMLElement>('.scroll');
    let t = 0;
    if (sc && over.current[i] > 0) { const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top; t = clamp((top - geo.win.h * 0.45) / over.current[i]); }
    lift.dest = null; lift.shut = false;
    prog.current = performance.now() + 1600;
    scrollToY(seg.a + t * (seg.b - seg.a));
  }, [els, geo, call]);
  useEffect(() => {
    const offs = els.rooms.map((el, i) => { const f = (e: FocusEvent) => onRoomFocus(i, e); el.addEventListener('focusin', f); return () => el.removeEventListener('focusin', f); });
    return () => offs.forEach((o) => o());
  }, [els, onRoomFocus]);
  const onPlateFocus = () => { if (lift.phase !== 'inside') call('jump'); if (lift.at !== 0) { lift.key = true; setKey(true); lift.dest = 0; } };

  const inside = phase === 'inside';
  return (
    <div className={`v-elevator is-lift${phone ? ' is-phone' : ''} ph-${phase}${ready ? ' is-ready' : ''}${key ? ' has-key' : ''}`} ref={(el) => { root.current = el; setRootEl(el); }}>
      <a className="skip-x" href="#main" onClick={(e) => { e.preventDefault(); els.rooms[1].querySelector<HTMLElement>('a')?.focus(); }}>Skip to content</a>
      <div className="scene" aria-hidden="true">
        {hostEl && rootEl && <Suspense fallback={null}><Stage key={phone ? 'p' : 'd'} geo={geo} rooms={els.rooms} floors={els.floors} shaft={els.shaft} host={hostEl} root={rootEl} /></Suspense>}
      </div>

      <main id="main">
        <div className="host" ref={(el) => { host.current = el; setHostEl(el); }} />
        {createPortal(<Dark />, els.rooms[0])}
        {createPortal(<Lobby />, els.rooms[1])}
        {createPortal(<Line />, els.rooms[2])}
        {createPortal(<Record />, els.rooms[3])}
        {createPortal(<People />, els.rooms[4])}
        {createPortal(<Join n={N} />, els.rooms[5])}
        {createPortal(<ShaftView />, els.shaft)}
        <div className="plate-wrap"><DrivePlate onFocus={onPlateFocus} /></div>
      </main>

      {/* Outside: the call button sits on the brass plate by the doors. */}
      <section className="outside" aria-label="Outside the lift" aria-hidden={phase !== 'outside' ? true : undefined}>
        <button type="button" className="callbtn" onClick={() => call('button')} disabled={phase !== 'outside'} aria-label="Call the lift" tabIndex={phase === 'outside' ? 0 : -1}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4l6 8H4z" /></svg>
        </button>
        <p className="sign"><span className="t">The elevator pitch.</span><span className="h">{phone ? 'Tap the button. Or swipe.' : 'Press the button. Or scroll.'}</span></p>
      </section>

      <nav className="panel" aria-label="Lift panel" inert={!inside}>
        <div className="display" aria-hidden="true">
          <span className="drum"><span ref={drum}>{[...FLOORS].reverse().map((f) => <b key={f.id}>{f.label}</b>)}</span></span>
          <span className="arrow" />
        </div>
        <ol className="floors">
          {[...FLOORS].reverse().map((f, k) => {
            const i = FLOORS.length - 1 - k;
            const isLit = lit.includes(i) || at === i;
            return (
              <li key={f.id} className={i === 0 ? 'b' : undefined}>
                {i === 0 && <button type="button" ref={keyBtn} className={`key${key ? ' on' : ''}`} onClick={turnKey} aria-pressed={key} aria-label="Basement key"><IcKey /></button>}
                <button type="button" className={`fb${isLit ? ' lit' : ''}${at === i ? ' here' : ''}`} onClick={() => goTo(i)} aria-label={`${f.label}, ${f.name}${i === 0 ? ', needs the key' : ''}`} aria-current={at === i ? 'location' : undefined}>
                  <span>{f.label}</span>
                </button>
                <span className="name" aria-hidden="true">{f.name}</span>
              </li>
            );
          })}
        </ol>
        <div className="ctl">
          <button type="button" className="cb" onClick={doorsOpen} aria-label="Open the doors"><IcOpen /></button>
          <button type="button" className="cb" onClick={doorsClose} aria-label="Close the doors"><IcClose /></button>
          <button type="button" className="cb alarm" onClick={ring} aria-label="Alarm"><IcBell /></button>
        </div>
      </nav>
      <button type="button" className={`snd${sound ? ' on' : ''}`} onClick={toggleSound} aria-pressed={sound}><IcSound on={sound} /><span>{sound ? 'Sound on' : 'Sound off'}</span></button>
      <p className="status" role="status">{status}</p>
      <p className="hint" aria-hidden="true">{phone ? 'Tap a floor. Or swipe.' : 'Press a floor. Or scroll.'}</p>
      <div className="spacer" ref={spacer} aria-hidden="true" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Without the lift: every floor is a plain section, doors open        */
/* ------------------------------------------------------------------ */
function Plain() {
  return (
    <div className="v-elevator is-plain">
      <a className="skip-x" href="#main">Skip to content</a>
      <nav className="pnav" aria-label="Floors">
        {[['L', 'lobby'], ['2', 'line'], ['3', 'record'], ['B', 'drive'], ['4', 'people'], ['5', 'join']].map(([l, id]) => <a key={id} href={`#${id}`}>{l}</a>)}
      </nav>
      <main id="main">
        <Lobby />
        <Line />
        <Record />
        <div className="plate-wrap"><DrivePlate /></div>
        <People />
        <Join n={N} />
      </main>
    </div>
  );
}
