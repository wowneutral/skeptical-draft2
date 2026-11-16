// Version 38: the marble. One question mark carved from white marble on a plinth,
// in a quiet grey room with a high window. The site is its wall label and catalogue.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/instrument-sans/index.css';
import './marble.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import MARKS from '@/lib/marks.json';
import { gsap, scroll } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { clamp, isPhone, smooth, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { rig } from './rig';

const Scene = lazy(() => import('./Scene'));

const ext = (href: string) => (href.startsWith('http') ? { rel: 'noopener' } : {});

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const Arrow = () => (
  <svg className="arr" viewBox="0 0 22 12" aria-hidden="true"><path d="M0 6h20M15 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
);

/** Without WebGL the sculpture is drawn flat, on its plinth. */
function Flat() {
  const M = MARKS.roman;
  return (
    <div className="flat-room">
      <svg viewBox={`${-M.w / 2 - 60} ${-1000} ${M.w + 120} ${M.h + 120}`} aria-hidden="true">
        <path d={M.d} fill="#f3f1ec" stroke="#8a847a" strokeWidth="6" />
      </svg>
      <div className="flat-plinth" />
    </div>
  );
}

/** The drive, as a cabinet of seven drawers. Each opens far enough to read its card, and no further. */
function Cabinet() {
  const [open, setOpen] = useState(-1);
  return (
    <ul className="cab">
      {DRIVE.items.map((it, i) => {
        const on = open === i;
        return (
          <li key={it.term} className={on ? 'dr on' : 'dr'}>
            <button className="dr-front" aria-expanded={on} aria-controls={`dr-${i}`} onClick={() => setOpen(on ? -1 : i)}>
              <span className="holder"><span>{it.term}</span></span>
              <span className="pull" aria-hidden="true" />
            </button>
            <div className="dr-body" id={`dr-${i}`} role="region" aria-label={it.term}>
              <div className="dr-in">
                <p className="card">{it.text}</p>
                <p className="seal">Not on display.</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function Marble() {
  useVersion('marble');
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [phone, setPhone] = useState(isPhone);
  const [lit, setLit] = useState(still || !webgl);
  useRise(root);
  rig.phone = phone;

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // The walk: each section's middle is one view; between them the camera travels.
  useEffect(() => {
    const el = root.current; if (!el) return;
    let stops: number[] = [];
    const measure = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      stops = [...el.querySelectorAll<HTMLElement>('[data-view]')].map((s, i, all) => {
        if (i === 0) return 0;
        if (i === all.length - 1) return max;
        const r = s.getBoundingClientRect();
        return clamp(r.top + scrollY + r.height / 2 - innerHeight / 2, 0, max);
      });
    };
    const tick = () => {
      const y = scroll.y;
      let at = 0;
      for (let i = 0; i < stops.length - 1; i++) {
        if (y >= stops[i] && y <= stops[i + 1]) {
          const u = (y - stops[i]) / Math.max(1, stops[i + 1] - stops[i]);
          at = i + smooth(clamp((u - 0.12) / 0.76));
          break;
        }
        if (y > stops[i + 1]) at = i + 1;
      }
      if (Math.abs(at - rig.at) > 1e-4) { rig.at = at; rig.wake(); }
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    gsap.ticker.add(tick);
    return () => { ro.disconnect(); gsap.ticker.remove(tick); };
  }, [phone]);

  // Turning the sculpture: drag anywhere on the room, or press the button.
  useEffect(() => {
    const el = root.current; if (!el || !webgl) return;
    let lastX = 0, lastT = 0, down = false;
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.room')) return;
      down = true; rig.held = true; lastX = e.clientX; lastT = performance.now(); rig.spin = 0; rig.lastTouch = lastT;
      el.classList.add('grabbing');
    };
    const onMove = (e: PointerEvent) => {
      rig.px = (e.clientX / innerWidth) * 2 - 1; rig.py = (e.clientY / innerHeight) * 2 - 1;
      if (!down) { rig.wake(); return; }
      const now = performance.now(), dx = e.clientX - lastX, dt = Math.max(8, now - lastT) / 1000;
      const k = 5.2 / Math.max(500, innerWidth);
      rig.turn += dx * k; rig.spin = (dx * k) / dt; lastX = e.clientX; lastT = now; rig.lastTouch = now;
      rig.wake();
    };
    const onUp = () => { if (!down) return; down = false; rig.held = false; rig.lastTouch = performance.now(); el.classList.remove('grabbing'); rig.wake(); };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => { window.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp); };
  }, [webgl]);

  const turn = (dir = 1) => {
    rig.lastTouch = performance.now();
    if (still) { rig.turn += dir * Math.PI / 2; } else { rig.spin += dir * 5.2; }
    rig.wake();
  };

  // The opening: the room is dim, then the lights come up and the label is set.
  const onReady = () => {
    if (still) { rig.light = 1; rig.wake(); setLit(true); return; }
    gsap.to(rig, { light: 1, duration: 2.8, delay: 0.2, ease: 'power2.inOut', onUpdate: () => rig.wake() });
    setTimeout(() => setLit(true), 1300);
  };
  useEffect(() => { const t = setTimeout(() => setLit(true), 7000); return () => clearTimeout(t); }, []);
  useEffect(() => { if (!webgl) rig.light = 1; }, [webgl]);

  return (
    <div ref={root} className={'v-marble' + (lit ? ' lit' : '')}>
      <a className="skip-x" href="#main">Skip to the labels</a>

      <div className="room" aria-hidden="true">
        {webgl ? (
          <Suspense fallback={null}>
            <Scene onReady={onReady} />
          </Suspense>
        ) : <Flat />}
      </div>

      <header className="top">
        <a className="mark" href="#top" aria-label="Skeptical, back to the start">Skeptical<span>?</span></a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </header>

      <main id="main">
        {/* 1. The label. */}
        <section className="sec s-hero side-l" id="top" data-view>
          <article className="label hero-label">
            <h1 className="ttl"><span aria-hidden="true">Skeptical.</span><span className="sr-only-x">{SITE.heading}</span></h1>
            <div className="meta">
              {HERO.pitch.map((l) => <p key={l}>{l}</p>)}
              <p>Marble, on a plinth.</p>
            </div>
            <p className="say">{HERO.statement.map((l) => <span key={l}>{l} </span>)}</p>
            <div className="doors">
              {HERO.doors.map((d) => <a key={d.href} className="door" href={d.href} {...ext(d.href)}>{d.label}<Arrow /></a>)}
            </div>
            {webgl && <button className="turn" onClick={() => turn(1)}>Turn the marble.</button>}
          </article>
        </section>

        {/* 2. Wall text. */}
        <section className="sec s-wall side-r" aria-labelledby="wall-h" data-view>
          <article className="label wall-label" data-rise>
            <h2 id="wall-h" className="sr-only-x">Wall text.</h2>
            <ol className="wall">
              {MANIFESTO.map((l) => <li key={l}>{l}</li>)}
            </ol>
          </article>
        </section>

        {/* 3. The record, as an accession plaque. */}
        <section className="sec s-record side-l" id="record" aria-labelledby="record-h" data-view>
          <article className="label" data-rise>
            <h2 id="record-h" className="h2">{RECORD.title}</h2>
            <p className="rule">{RECORD.rule}</p>
            <div className="plaque">
              <div className="pl-in">
                <p className="pl-meta"><span>{RECORD.when}</span><span>{RECORD.where}</span></p>
                <p className="pl-name">{RECORD.name}</p>
                <ul className="pl-res">
                  {RECORD.results.map((r) => (
                    <li key={r.who}><span className="who">{r.who}</span><span className="what">{r.what}</span><span className="more">{r.more}</span></li>
                  ))}
                </ul>
              </div>
            </div>
            <a className="more-l" href={RECORD.more.href} {...ext(RECORD.more.href)}>{RECORD.more.label}<Arrow /></a>
          </article>
        </section>

        {/* 4. The drive, closed. */}
        <section className="sec s-drive side-r" id="drive" aria-labelledby="drive-h" data-view>
          <article className="label" data-rise>
            <h2 id="drive-h" className="h2">{DRIVE.title}</h2>
            <p className="lead">{DRIVE.lead}</p>
            <Cabinet />
            <a className="more-l" href={DRIVE.more.href} {...ext(DRIVE.more.href)}>{DRIVE.more.label}<Arrow /></a>
          </article>
        </section>

        {/* 5. The people. */}
        <section className="sec s-people side-l" id="people" aria-labelledby="people-h" data-view>
          <article className="label" data-rise>
            <h2 id="people-h" className="h2">{PEOPLE.title}</h2>
            <ul className="coaches">
              {PEOPLE.coaches.map((c) => (
                <li key={c.name}><p className="c-name">{c.name}</p><p className="c-role">{c.role}</p><p className="c-bio">{c.bio}</p></li>
              ))}
            </ul>
            <p className="count">{PEOPLE.count}</p>
            <a className="more-l" href={PEOPLE.more.href} {...ext(PEOPLE.more.href)}>{PEOPLE.more.label}<Arrow /></a>
          </article>
        </section>

        {/* 6. Join. */}
        <section className="sec s-join side-r" id="join" aria-labelledby="join-h" data-view>
          <article className="label join-label" data-rise>
            <h2 id="join-h" className="h2">{JOIN.title}</h2>
            <p className="lead">{JOIN.lead}</p>
            <ul className="paths">
              {JOIN.paths.map((p) => (
                <li key={p.id} className="path">
                  <h3 className="p-name">{p.name}</h3>
                  <a className="p-go" href={p.href} {...ext(p.href)}>{p.line}<Arrow /></a>
                  <div className="p-text">{p.text.map((t) => <p key={t}>{t}</p>)}</div>
                </li>
              ))}
            </ul>
            <div className="also">
              <p>{JOIN.already.before}<a href={JOIN.already.href} {...ext(JOIN.already.href)}>{JOIN.already.label}</a>.</p>
              <p>{JOIN.coach.before}<a href={JOIN.coach.href} {...ext(JOIN.coach.href)}>{JOIN.coach.label}</a>.</p>
              <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
              <p>{JOIN.discord}</p>
            </div>
          </article>
        </section>
      </main>

      {/* 7. The end of the visit. */}
      <footer className="sec s-end side-l" data-view>
        <div className="label end-label">
          <p className="end-line">{FOOTER.line}</p>
          <a className="again" href="#top">Walk round again.<Arrow /></a>
          <ul className="f-links">{FOOTER.links.map((l) => <li key={l.href}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}</ul>
          <ul className="f-pages">{FOOTER.pages.map((l) => <li key={l.href}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}</ul>
          <p className="small">Draft 2, version 38. Not the live site.</p>
        </div>
      </footer>
    </div>
  );
}
