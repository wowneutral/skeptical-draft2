// Version 48: the thread. The sceptic suspends judgement, so the centrepiece is a
// suspension: an iron question mark on one steel wire, a hand's width above a
// stone floor. Push it and it swings and twists with its own weight; scroll and
// the camera cranes down and round it once; at Join it hangs dead still; at the
// end you look straight up the wire to the one point it hangs from.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/wght.css';
import './thread.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import MARKS from '@/lib/marks.json';
import { Split, useRise } from '@/lib/motion';
import { gsap } from '@/lib/scroll';
import { clamp, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { st, type Key, type Pose } from './store';

const Scene = lazy(() => import('./Scene'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const TAU = Math.PI * 2;
/** The crane: one pose per stop, down and round the object once. */
function poses(phone: boolean): Record<string, Pose> {
  const sx = phone ? 0 : 0.37, sy = phone ? 0.02 : 0, r = phone ? 1.08 : 1.12, f = 1;
  return {
    top: { az: 0.42, h: 3.4, r: 12.5 * r, ty: 1.75, fov: 24 * f, sx, sy, up: 0 },
    say: { az: 1.05, h: 3.1, r: 12 * r, ty: 1.7, fov: 24 * f, sx, sy, up: 0 },
    mani: { az: 1.95, h: 2.7, r: 11.5 * r, ty: 1.7, fov: 24 * f, sx, sy, up: 0 },
    record: { az: 2.95, h: 2.3, r: 11 * r, ty: 1.6, fov: 24 * f, sx, sy, up: 0 },
    drive: { az: 3.95, h: 1.8, r: 10.5 * r, ty: 1.5, fov: 24 * f, sx, sy, up: 0 },
    people: { az: 5.0, h: 1.25, r: 10 * r, ty: 1.4, fov: 24 * f, sx, sy, up: 0 },
    join: { az: TAU + 0.3, h: 0.32, r: 11.5 * r, ty: 1.35, fov: 21 * f, sx, sy, up: 0 },
    end: { az: TAU + 0.85, h: 0.45, r: 1.9, ty: 1.05, fov: phone ? 50 : 46, sx: 0, sy: 0, up: 1 },
  };
}
const PLAN: [string, string, number][] = [
  ['top', 'top', 0], ['say', 's-say', 0.5], ['mani', 's-mani', 0.5], ['record', 'record', 0.5],
  ['drive', 'drive', 0.5], ['people', 'people', 0.5], ['join', 'join', 0.35], ['join', 'join', 0.75], ['end', 's-end', 0.5],
];

/** A struck iron casting: a dull thud, and the wire's thin note above it. */
let audio: AudioContext | null = null;
function thud(k: number) {
  if (!audio || still) return;
  const a = audio, t = a.currentTime, g = a.createGain(), o = a.createOscillator();
  const v = clamp(k, 0.2, 1.6) * 0.11;
  o.type = 'sine'; o.frequency.setValueAtTime(96, t); o.frequency.exponentialRampToValueAtTime(54, t + 0.35);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.62);
  const w = a.createOscillator(), wg = a.createGain();
  w.type = 'sine'; w.frequency.setValueAtTime(1870, t);
  wg.gain.setValueAtTime(0.0001, t); wg.gain.exponentialRampToValueAtTime(v * 0.12, t + 0.01); wg.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  w.connect(wg).connect(a.destination); w.start(t); w.stop(t + 1.42);
}

export default function Thread() {
  useVersion('thread');
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [phone, setPhone] = useState(isPhone);
  const [over, setOver] = useState(false);
  const [pushed, setPushed] = useState(false);
  const [lit, setLit] = useState(still);
  useRise(root);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    st.onOver = setOver;
    st.onStrike = (k) => { thud(k); setPushed(true); };
    return () => { window.removeEventListener('resize', on); st.onOver = null; st.onStrike = null; };
  }, []);

  // Tie each pose to its place on the page, and Join to the stillness.
  useEffect(() => {
    const P = poses(phone);
    const measure = () => {
      const vh = window.innerHeight, max = document.documentElement.scrollHeight - vh;
      const keys: Key[] = PLAN.map(([name, id, f]) => {
        const el = document.getElementById(id);
        let y = 0;
        if (el && id !== 'top') { const r = el.getBoundingClientRect(); y = r.top + window.scrollY + f * r.height - vh / 2; }
        return { ...P[name], y: clamp(y, 0, max) };
      });
      keys.push({ ...P.end, y: max });
      st.keys = keys;
    };
    const settle = () => {
      const el = document.getElementById('join');
      if (!el) return;
      const vh = window.innerHeight, top = el.getBoundingClientRect().top;
      st.settle = clamp((vh * 0.95 - top) / (vh * 0.75));
    };
    measure(); settle();
    const ro = new ResizeObserver(measure); ro.observe(document.body);
    const t = setTimeout(measure, 1200);
    gsap.ticker.add(settle);
    return () => { ro.disconnect(); clearTimeout(t); gsap.ticker.remove(settle); };
  }, [phone]);

  // The hand: a click strikes it where the pointer is; a tap is a push.
  useEffect(() => {
    if (!webgl) return;
    let last = { x: 0, y: 0, t: 0 }, speed = 0;
    let down: { x: number; y: number; t: number } | null = null;
    const stage = document.querySelector('.v-thread .stage');
    const ndc = (e: PointerEvent) => {
      const r = stage?.getBoundingClientRect() ?? { left: 0, top: 0, width: innerWidth, height: innerHeight };
      return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 };
    };
    const wake = () => {
      try { if (!audio) audio = new AudioContext(); if (audio.state === 'suspended') void audio.resume(); } catch { audio = null; }
    };
    const blocked = (e: PointerEvent) => {
      const el = e.target as HTMLElement;
      return !!el.closest('a, input, .col, .foot') || (!!el.closest('button') && !el.closest('.push'));
    };
    const move = (e: PointerEvent) => {
      const now = performance.now(), n = ndc(e);
      if (e.pointerType === 'mouse') { st.pointer.x = n.x; st.pointer.y = n.y; st.pointer.in = !blocked(e); }
      const dtm = Math.max(8, now - last.t);
      speed = speed * 0.6 + (Math.hypot(e.clientX - last.x, e.clientY - last.y) / dtm) * 1000 * 0.4;
      last = { x: e.clientX, y: e.clientY, t: now };
    };
    const start = (e: PointerEvent) => {
      if (blocked(e) || e.button > 0) return;
      if (e.pointerType === 'mouse') { wake(); const n = ndc(e); st.strikes.push({ ...n, k: 0.8 + Math.min(1.1, speed / 1600) }); }
      else down = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const end = (e: PointerEvent) => {
      if (!down) return;
      const tap = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10 && performance.now() - down.t < 600;
      down = null;
      if (tap && e.type === 'pointerup') { wake(); st.strikes.push({ ...ndc(e), k: 1.1 }); }
    };
    const leave = () => { st.pointer.in = false; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerdown', start);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    document.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', start);
      window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end);
      document.removeEventListener('pointerleave', leave);
    };
  }, [webgl]);

  const keyPush = (e: React.KeyboardEvent) => {
    const side = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : null;
    if (side !== null) { e.preventDefault(); try { if (!audio) audio = new AudioContext(); } catch { /* no sound */ } st.nudges.push({ side, k: 1.2 }); }
  };

  return (
    <div className={`v-thread${webgl ? '' : ' flat'}${over ? ' over' : ''}${lit ? ' lit' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>

      <div className="stage" aria-hidden="true">
        {webgl ? <Suspense fallback={null}><Scene onReady={() => setTimeout(() => setLit(true), still ? 0 : 500)} /></Suspense> : (
          <svg className="flat-mark" viewBox="-520 -2400 1040 3300" preserveAspectRatio="xMidYMax meet">
            <line x1="-60" y1="-2400" x2="-60" y2="-719" />
            <path d={MARKS.roman.d} />
          </svg>
        )}
      </div>
      <div className="scrim" aria-hidden="true" />

      <header className="bar">
        <a className="word" href="#top">{SITE.name}</a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </header>

      <main id="main">
        <section className="sec hero" id="top">
          <div className="col">
            <h1 className="hero-h">
              <span className="hero-word" aria-hidden="true">{SITE.name}</span>
              <span className="sr-only-x">{SITE.heading}</span>
            </h1>
            <p className="pitch">{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</p>
            <div className="doors">
              {HERO.doors.map((d, i) => <A key={d.href} className={i ? 'door' : 'door door-main'} href={d.href}>{d.label}</A>)}
            </div>
          </div>
          {webgl && !still && (
            <button type="button" className={`push${pushed ? ' done' : ''}`} aria-label="Push the iron question mark. Left and right arrows push it from the side."
              onKeyDown={keyPush} onClick={(e) => { if (e.detail === 0) { try { if (!audio) audio = new AudioContext(); } catch { /* no sound */ } st.nudges.push({ side: 0, k: 1.2 }); } }}>
              <span className="push-l" aria-hidden="true">Push it.</span>
            </button>
          )}
        </section>

        <section className="sec say" id="s-say" aria-label="In three lines">
          <div className="col">
            <p className="say-l">{HERO.statement.map((l) => <span key={l} data-rise>{l}</span>)}</p>
          </div>
        </section>

        <section className="sec mani" id="s-mani" aria-label="What we are">
          <div className="col">
            <ul className="mani-l">
              {MANIFESTO.map((m) => <li key={m} data-rise>{m}</li>)}
            </ul>
          </div>
        </section>

        <section className="sec record" id="record">
          <div className="col">
            <Split as="h2" className="h2">{RECORD.title}</Split>
            <p className="rule" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise><span>{RECORD.name}</span><span>{RECORD.when}. {RECORD.where}.</span></p>
            <ol className="results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <span className="r-what">{r.what}.</span>
                  <span className="r-who">{r.who}</span>
                  <span className="r-more">{r.more}</span>
                </li>
              ))}
            </ol>
            <A className="more" href={RECORD.more.href}>{RECORD.more.label}</A>
          </div>
        </section>

        <section className="sec drive" id="drive">
          <div className="col">
            <Split as="h2" className="h2">{DRIVE.title}</Split>
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <dl className="items">
              {DRIVE.items.map((d) => (
                <div key={d.term} data-rise><dt>{d.term}</dt><dd>{d.text}</dd></div>
              ))}
            </dl>
            <A className="more" href={DRIVE.more.href}>{DRIVE.more.label}</A>
          </div>
        </section>

        <section className="sec people" id="people">
          <div className="col">
            <Split as="h2" className="h2">{PEOPLE.title}</Split>
            <p className="lead" data-rise>{PEOPLE.count}</p>
            <ul className="coaches">
              {PEOPLE.coaches.map((c) => (
                <li key={c.name} data-rise>
                  <span className="c-name">{c.name}</span>
                  <span className="c-role">{c.role}</span>
                  <span className="c-bio">{c.bio}</span>
                </li>
              ))}
            </ul>
            <A className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A>
          </div>
        </section>

        <section className="sec join" id="join">
          <div className="col">
            <Split as="h2" className="h2 h2-join">{JOIN.title}</Split>
            <p className="lead" data-rise>{JOIN.lead}</p>
            <ol className="paths">
              {JOIN.paths.map((p) => (
                <li key={p.id} data-rise>
                  <A className="p-go" href={p.href}><span className="p-name">{p.name}</span><span className="p-line">{p.line}</span></A>
                  <ul className="p-text">{p.text.map((t, j) => <li key={j}>{t}</li>)}</ul>
                </li>
              ))}
            </ol>
            <div className="join-foot" data-rise>
              <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A></p>
              <p>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A></p>
              <p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
              <p>{JOIN.discord}</p>
            </div>
          </div>
        </section>

        <section className="sec end" id="s-end" aria-label="The end">
          <div className="col">
            <p className="end-l">{FOOTER.line}</p>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="foot-row">
          <span className="foot-word">{SITE.name}<svg className="foot-q" viewBox="-520 -800 1040 1600" aria-hidden="true"><path d={MARKS.roman.d} /></svg></span>
          <ul className="foot-links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul className="foot-pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        </div>
        <p className="draft">Draft 2, version 48. Not the live site.</p>
      </footer>
    </div>
  );
}
