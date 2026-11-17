// Version 79: the triangle. Three marble beams on a plinth that close into an
// impossible triangle from exactly one place in the room. Move, and it lies.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/index.css';
import './triangle.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { gsap } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { clamp, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { stage } from './stage';

const Scene = lazy(() => import('./Scene'));
let wake: (() => void) | null = null;
import('./Scene').then((m) => { wake = m.wakeAudio; }).catch(() => {});

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** A small drawn arrow, for links that leave the page. */
const Arrow = () => (
  <svg className="arr" viewBox="0 0 24 12" aria-hidden="true"><path d="M0 6h22M17 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
);

/** The triangle as a mark, with one side drawn heavy: which side of the sculpture this way in stands under. */
const Side = ({ i }: { i: number }) => {
  const pts = [[24, 3], [3, 39], [45, 39]];
  const seg = [[0, 1], [1, 2], [2, 0]][i];
  return (
    <svg className="side" viewBox="0 0 48 42" aria-hidden="true">
      <path d="M24 3L3 39H45Z" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <path d={`M${pts[seg[0]].join(' ')}L${pts[seg[1]].join(' ')}`} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="square" />
    </svg>
  );
};

/** Without WebGL: the figure as a flat print, the classic drawing. */
const Flat = () => (
  <svg className="flat" viewBox="0 0 120 106" role="img" aria-label="A triangle drawn in three strokes">
    <path d="M60 8L10 96H110Z" fill="none" stroke="#141311" strokeWidth="9" strokeLinejoin="miter" />
  </svg>
);

export default function Triangle() {
  useVersion('triangle');
  const root = useRef<HTMLDivElement>(null), ways = useRef<HTMLDivElement>(null), stageEl = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [hover, setHover] = useState(-1);
  useRise(root);

  // Where each view sits on the page: the scroll position at which that section is being read.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const measure = () => {
      const vh = window.innerHeight, sy = window.scrollY, phone = isPhone();
      stage.phone = phone;
      el.classList.toggle('is-phone', phone);
      const max = Math.max(1, document.documentElement.scrollHeight - vh);
      const secs = Array.from(el.querySelectorAll<HTMLElement>('[data-stop]'));
      stage.stops = secs.map((s, i) => {
        const r = s.getBoundingClientRect(), top = r.top + sy;
        if (i === 0) return 0;
        if (s.dataset.stop === 'join') return clamp(phone ? top - vh * 0.45 : top, 0, max);
        const read = phone ? vh * 0.76 : vh * 0.5;
        return clamp(top + Math.min(r.height, vh * 1.1) / 2 - read, 0, max);
      });
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    window.addEventListener('resize', measure);
    document.fonts.ready.then(measure);
    const t = setTimeout(measure, 900);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); clearTimeout(t); };
  }, []);

  // The three ways in follow the plinth's front edge.
  useEffect(() => {
    stage.onEdge = (y, l, w) => {
      const el = ways.current; if (!el) return;
      el.style.setProperty('--ey', `${y.toFixed(1)}px`); el.style.setProperty('--el', `${l.toFixed(1)}px`); el.style.setProperty('--ew', `${w.toFixed(1)}px`);
    };
    stage.onBand = (v) => root.current?.style.setProperty('--band', v.toFixed(3));
    return () => { stage.onEdge = null; stage.onBand = null; };
  }, []);

  // The pointer leans the camera; a drag swings it round the plinth.
  useEffect(() => {
    const onScroll = () => root.current?.classList.toggle('scrolled', window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      stage.px = (e.clientX / window.innerWidth) * 2 - 1; stage.py = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('scroll', onScroll); };
  }, []);

  useEffect(() => {
    const el = stageEl.current; if (!el) return;
    let x0 = 0, d0 = 0, lastX = 0, lastT = 0, v = 0, id = -1;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      wake?.();
      id = e.pointerId; x0 = lastX = e.clientX; lastT = performance.now(); d0 = stage.drag; v = 0;
      stage.held = true; stage.vel = 0;
      try { el.setPointerCapture(id); } catch { /* fine */ }
      el.classList.add('is-held');
    };
    const move = (e: PointerEvent) => {
      if (!stage.held || e.pointerId !== id) return;
      const span = Math.min(window.innerWidth, 900);
      stage.drag = Math.max(-150, Math.min(150, d0 + ((e.clientX - x0) / span) * 190));
      const now = performance.now(), dt = Math.max(1, now - lastT);
      v = v * 0.6 + (((e.clientX - lastX) / span) * 190 * 1000 / dt) * 0.4;
      lastX = e.clientX; lastT = now;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      stage.held = false; stage.vel = Math.max(-400, Math.min(400, v)); id = -1;
      el.classList.remove('is-held');
    };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
  }, [webgl]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault(); wake?.();
    const dir = e.key === 'ArrowLeft' ? -1 : 1;
    if (e.key === 'Enter' || e.key === ' ') { stage.vel += 260; return; }
    stage.vel += dir * 150;
  };

  // The opening: the words arrive while the skylight comes up.
  useEffect(() => {
    if (still || !root.current) return;
    const ctx = gsap.context(() => {
      gsap.from('[data-in]', { opacity: 0, y: 34, duration: 1.3, ease: 'expo.out', stagger: 0.09, delay: 0.35 });
    }, root);
    return () => ctx.revert();
  }, []);

  const point = (i: number) => { stage.hover = i; setHover(i); };

  return (
    <div className="v-triangle" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <aside className="room" aria-label="The sculpture">
      {webgl ? (
        <div
          className="stage" ref={stageEl} tabIndex={0} role="slider" onKeyDown={onKey}
          aria-label="The sculpture. Arrow keys walk round it." aria-valuemin={-150} aria-valuemax={150} aria-valuenow={0} aria-valuetext="The one place it closes"
        >
          <Suspense fallback={null}><Scene /></Suspense>
        </div>
      ) : (
        <div className="stage flat-stage"><Flat /></div>
      )}
      </aside>

      {webgl && <div className="band" aria-hidden="true" />}
      {webgl && <p className="hint" aria-hidden="true"><span data-in>Drag it. Then let go.</span></p>}

      <main id="main">
        <section className="sec hero" data-stop="hero" aria-labelledby="t-h1">
          <div className="col">
            <h1 id="t-h1" className="mark" data-in>
              Skeptical<span className="dot">.</span>
              <span className="sr-only-x"> {SITE.heading}</span>
            </h1>
            <p className="pitch" data-in>{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</p>
            <p className="statement" data-in>{HERO.statement.map((l) => <span key={l}>{l}</span>)}</p>
            <div className="doors" data-in>
              <A className="door door-a" href={HERO.doors[0].href}>{HERO.doors[0].label}<Arrow /></A>
              <A className="door door-b" href={HERO.doors[1].href}>{HERO.doors[1].label}<Arrow /></A>
            </div>
          </div>
        </section>

        <section className="sec manifesto" data-stop="manifesto" aria-label="What we are">
          <div className="col">
            <ol className="lines">
              {MANIFESTO.map((l) => <li key={l} data-rise>{l}</li>)}
            </ol>
          </div>
        </section>

        <section className="sec record" id="record" data-stop="record" aria-labelledby="t-rec">
          <div className="col">
            <h2 id="t-rec" className="title" data-rise>{RECORD.title}</h2>
            <p className="rule" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ul className="results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <span className="what">{r.what}</span>
                  <span className="who">{r.who}</span>
                  <span className="more">{r.more}</span>
                </li>
              ))}
            </ul>
            <A className="link" href={RECORD.more.href}>{RECORD.more.label}<Arrow /></A>
          </div>
        </section>

        <section className="sec drive" id="drive" data-stop="drive" aria-labelledby="t-drive">
          <div className="col">
            <h2 id="t-drive" className="title" data-rise>{DRIVE.title}</h2>
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <dl className="items">
              {DRIVE.items.map((it) => (
                <div key={it.term} className="item" data-rise>
                  <dt>{it.term}</dt>
                  <dd>{it.text}</dd>
                </div>
              ))}
            </dl>
            <A className="link" href={DRIVE.more.href}>{DRIVE.more.label}<Arrow /></A>
          </div>
        </section>

        <section className="sec people" id="people" data-stop="people" aria-labelledby="t-people">
          <div className="col">
            <h2 id="t-people" className="title" data-rise>{PEOPLE.title}</h2>
            {PEOPLE.coaches.map((c) => (
              <article key={c.name} className="coach" data-rise>
                <h3>{c.name}</h3>
                <p className="role">{c.role}</p>
                <p className="bio">{c.bio}</p>
              </article>
            ))}
            <p className="count" data-rise>{PEOPLE.count}</p>
            <A className="link" href={PEOPLE.more.href}>{PEOPLE.more.label}<Arrow /></A>
          </div>
        </section>

        <section className="sec join" id="join" data-stop="join" aria-labelledby="t-join">
          <div className="pin">
            <div className="join-head">
              <h2 id="t-join" className="title big">{JOIN.title}</h2>
              <p className="lead">{JOIN.lead}</p>
            </div>
            <div className="join-side">
              <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A></p>
              <p>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A></p>
              <p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
              <p>{JOIN.discord}</p>
            </div>
            <div className="ways" ref={ways}>
              {JOIN.paths.map((p, i) => (
                <a
                  key={p.id} className={`way${hover === i ? ' on' : ''}`} href={p.href} rel="noopener"
                  onPointerEnter={() => point(i)} onPointerLeave={() => point(-1)} onFocus={() => point(i)} onBlur={() => point(-1)}
                >
                  <span className="way-top"><Side i={i} /><span className="way-name">{p.name}</span><Arrow /></span>
                  <span className="way-line">{p.line}</span>
                  <span className="way-text">{p.text[0]}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <p className="foot-line">{FOOTER.line}</p>
        <ul className="foot-links">
          {FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}
        </ul>
        <ul className="foot-pages">
          {FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}
        </ul>
        <p className="draft">Draft 2, version 79. Not the live site.</p>
      </footer>
    </div>
  );
}
