// Version 98: the tower. A square tower looks round from far away. Scroll
// walks you toward it; hold to step back and watch it round off again.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/index.css';
import './tower.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { useRise } from '@/lib/motion';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { tw } from './state';

const Scene = lazy(() => import('./Scene'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

export default function Tower() {
  useVersion('tower');
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const [held, setHeld] = useState(false);
  useRise(root);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // Where each stop sits on the page: the scroll at which its section is centred on screen.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const measure = () => {
      const vh = window.innerHeight, max = Math.max(1, document.documentElement.scrollHeight - vh);
      const secs = Array.from(el.querySelectorAll<HTMLElement>('[data-shot]'));
      tw.stops = secs.map((s, i) => {
        if (i === 0) return 0;
        if (i === secs.length - 1) return max;
        const r = s.getBoundingClientRect();
        return Math.min(max, r.top + window.scrollY + r.height / 2 - vh / 2);
      });
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    document.fonts.ready.then(measure);
    const t = setTimeout(measure, 900);
    // Reduced motion: two still frames, far and near.
    const onScroll = () => { if (tw.stops.length > 2) tw.frame = window.scrollY > tw.stops[2] - window.innerHeight * 0.6 ? 1 : 0; };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { ro.disconnect(); clearTimeout(t); window.removeEventListener('scroll', onScroll); };
  }, [phone]);

  // Drag anywhere to circle the tower; press and hold anywhere to step back.
  useEffect(() => {
    if (still || !webgl) return;
    let id = -1, x0 = 0, y0 = 0, lx = 0, lt = 0, timer = 0, mode: 'none' | 'wait' | 'drag' | 'hold' = 'none';
    const skip = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest?.('a, button, [data-text], input, textarea');
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || skip(e.target) || mode !== 'none') return;
      id = e.pointerId; x0 = lx = e.clientX; y0 = e.clientY; lt = performance.now(); mode = 'wait';
      tw.azV = 0;
      timer = window.setTimeout(() => { if (mode === 'wait') { mode = 'hold'; tw.holding = true; setHeld(true); } }, 240);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id || mode === 'none') return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (mode === 'wait' && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) { mode = 'drag'; tw.dragging = true; clearTimeout(timer); }
      else if (mode === 'wait' && Math.abs(dy) > 8) { clearTimeout(timer); mode = 'none'; id = -1; }
      if (mode === 'drag' || mode === 'hold') {
        const now = performance.now(), d = e.clientX - lx, k = 5.2 / Math.max(600, window.innerWidth);
        tw.az -= d * k;
        tw.azV = (-d * k) / Math.max(0.008, (now - lt) / 1000) * 0.6;
        lx = e.clientX; lt = now;
      }
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      clearTimeout(timer);
      if (performance.now() - lt > 90) tw.azV = 0;
      mode = 'none'; id = -1; tw.dragging = false; tw.holding = false; setHeld(false);
    };
    const menu = (e: Event) => { if (mode === 'hold' || mode === 'drag') e.preventDefault(); };
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('contextmenu', menu);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      window.removeEventListener('contextmenu', menu);
      tw.holding = false; tw.dragging = false;
    };
  }, [webgl]);

  useEffect(() => () => { tw.intro = 0; tw.az = 0; tw.azV = 0; tw.hold = 0; tw.stops = []; }, []);

  // The keyboard path: hold Space or Enter on the button to step back, arrows to walk around.
  const keyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) { tw.holding = true; setHeld(true); } }
    if (e.key === 'ArrowLeft') { e.preventDefault(); tw.keyTurn = 1; }
    if (e.key === 'ArrowRight') { e.preventDefault(); tw.keyTurn = -1; }
  };
  const keyUp = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') { tw.holding = false; setHeld(false); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') tw.keyTurn = 0;
  };
  const press = (on: boolean) => { tw.holding = on; setHeld(on); };

  const gl = webgl;
  return (
    <div className={`v-tower${gl ? '' : ' is-flat'}${held ? ' is-held' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to the page</a>
      {gl ? (
        <div className="tw-stage" aria-hidden="true">
          <Suspense fallback={null}><Scene phone={phone} /></Suspense>
        </div>
      ) : null}

      <main id="main">
        <section className="tw-top" data-shot="top" aria-labelledby="tw-h1">
          <nav className="tw-nav" aria-label="Sections">
            {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
          </nav>
          <h1 id="tw-h1" className="tw-mark">
            <span className="sr-only-x">{SITE.heading}</span>
            <span aria-hidden="true">Skeptical<i>?</i></span>
          </h1>
          <div className="tw-flank">
            <p className="tw-pitch tw-in" style={{ '--d': '0.9s' } as React.CSSProperties}>
              {HERO.pitch.map((l) => <span key={l}>{l}</span>)}
            </p>
            <div className="tw-right tw-in" style={{ '--d': '1.15s' } as React.CSSProperties}>
              <ul className="tw-statement">{HERO.statement.map((l) => <li key={l}>{l}</li>)}</ul>
              <div className="tw-doors">
                {HERO.doors.map((d) => <A key={d.href} className="tw-door" href={d.href}>{d.label}</A>)}
              </div>
            </div>
          </div>
          <p className="tw-hint tw-in" style={{ '--d': '2.2s' } as React.CSSProperties}>{gl && !still ? 'Round from here. Walk closer, or hold.' : 'Round from here. Walk closer.'}</p>
        </section>

        <section className="tw-sec tw-mani" data-shot="manifesto" aria-label="What we are">
          <div className="tw-col">
            {MANIFESTO.map((l) => <p key={l} data-rise>{l}</p>)}
          </div>
        </section>

        <section className="tw-sec tw-rec" id="record" data-shot="record" aria-labelledby="tw-rec">
          <div className="tw-col tw-panel">
            <h2 id="tw-rec" className="tw-title" data-rise>{RECORD.title}</h2>
            <p className="tw-lead" data-rise>{RECORD.rule}</p>
            <p className="tw-event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ol className="tw-results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <span className="tw-what">{r.what}</span>
                  <span className="tw-who">{r.who}</span>
                  <span className="tw-more">{r.more}</span>
                </li>
              ))}
            </ol>
            <A className="tw-link" href={RECORD.more.href}>{RECORD.more.label}</A>
          </div>
        </section>

        <section className="tw-sec tw-drive" id="drive" data-shot="drive" aria-labelledby="tw-drive">
          <div className="tw-col tw-panel" data-text>
            <h2 id="tw-drive" className="tw-title" data-rise>{DRIVE.title}</h2>
            <p className="tw-lead" data-rise>{DRIVE.lead}</p>
            <dl className="tw-items">
              {DRIVE.items.map((it) => (
                <div key={it.term} data-rise><dt>{it.term}</dt><dd>{it.text}</dd></div>
              ))}
            </dl>
            <A className="tw-link" href={DRIVE.more.href}>{DRIVE.more.label}</A>
          </div>
        </section>

        <section className="tw-sec tw-people" id="people" data-shot="people" aria-labelledby="tw-people">
          <div className="tw-col tw-panel" data-text>
            <h2 id="tw-people" className="tw-title" data-rise>{PEOPLE.title}</h2>
            {PEOPLE.coaches.map((c) => (
              <div className="tw-coach" key={c.name} data-rise>
                <h3>{c.name}</h3>
                <p className="tw-role">{c.role}</p>
                <p>{c.bio}</p>
              </div>
            ))}
            <p className="tw-count" data-rise>{PEOPLE.count}</p>
            <A className="tw-link" href={PEOPLE.more.href}>{PEOPLE.more.label}</A>
          </div>
        </section>

        <section className="tw-sec tw-join" id="join" data-shot="join" aria-labelledby="tw-join">
          <div className="tw-col tw-panel" data-text>
            <h2 id="tw-join" className="tw-title" data-rise>{JOIN.title}</h2>
            <p className="tw-lead" data-rise>{JOIN.lead}</p>
            <ul className="tw-paths">
              {JOIN.paths.map((p) => (
                <li key={p.id} data-rise>
                  <h3><A href={p.href}><span className="tw-pname">{p.name}</span><span className="tw-pline">{p.line}</span></A></h3>
                  <ul>{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
                </li>
              ))}
            </ul>
            <p className="tw-small" data-rise>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A></p>
            <p className="tw-small" data-rise>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A></p>
            <p className="tw-small" data-rise>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
            <p className="tw-small" data-rise>{JOIN.discord} <A href={SITE.discord}>Discord</A></p>
          </div>
        </section>
        <p id="tw-hold-d" className="sr-only-x">Hold Space to step back from the tower. Left and right arrows walk around it.</p>
      </main>

      <footer className="tw-end" data-shot="end">
        <div className="tw-endin">
          <p className="tw-line">{FOOTER.line}</p>
          <ul className="tw-flinks">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul className="tw-pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <p className="tw-draft">Draft 2, version 98. Not the live site.</p>
        </div>
      </footer>

      {gl && !still ? (
        <button
          type="button" className="tw-hold" aria-pressed={held} aria-describedby="tw-hold-d"
          onPointerDown={(e) => { e.preventDefault(); press(true); }} onPointerUp={() => press(false)} onPointerLeave={() => press(false)}
          onKeyDown={keyDown} onKeyUp={keyUp} onBlur={() => { press(false); tw.keyTurn = 0; }}
        >
          {held ? 'Stepping back' : 'Hold to step back'}
        </button>
      ) : null}
    </div>
  );
}
