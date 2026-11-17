// Version 74: the strobe. Zeno's arrow on a turntable: sixteen plaster figures,
// each a single stroke a little further along from an exclamation mark to a
// question mark. Still, they are sixteen sculptures. Spin the table (drag it, or
// read fast) and they become one mark curling into doubt and straightening again.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/standard.css';
import './strobe.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { useRise } from '@/lib/motion';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { N, bendOf, outline, bounds, DOT } from './geo';
import { st, push, now, type Key } from './store';

const Scene = lazy(() => import('./Scene'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** One figure drawn flat, from the same centreline as the plaster ones. */
function Glyph({ b, className }: { b: number; className?: string }) {
  const d = useMemo(() => outline(b), [b]);
  const bx = useMemo(() => bounds(b), [b]);
  const pad = 0.04;
  return (
    <svg className={className} viewBox={`${bx.x0 - pad} ${-bx.y1 - pad} ${bx.x1 - bx.x0 + pad * 2} ${bx.y1 - bx.y0 + pad * 2}`} aria-hidden="true" focusable="false">
      <path d={d} />
      <circle cx={0} cy={-DOT.y} r={DOT.r} />
    </svg>
  );
}

/** Without motion or WebGL: the sixteen figures at rest, side by side, like a contact sheet. */
function Sheet() {
  return (
    <figure className="st-sheet" role="img" aria-label="Sixteen figures, an exclamation mark bending step by step into a question mark and back.">
      {Array.from({ length: N }, (_, k) => (
        <span className="st-frame" key={k}><Glyph b={bendOf(k)} /></span>
      ))}
    </figure>
  );
}

export default function Strobe() {
  const [phone] = useState(isPhone);
  useVersion('strobe', { anchorOffset: phone ? -Math.round(window.innerHeight * 0.42) : 0 });
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const live = webgl && !still;
  const [sel, setSel] = useState(0);
  const [grab, setGrab] = useState(false);
  useRise(root);

  // Where each section starts, for the scene's camera and the table's stops.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const measure = () => {
      st.vh = window.innerHeight;
      const secs: typeof st.secs = [];
      el.querySelectorAll<HTMLElement>('[data-k]').forEach((n) => secs.push({ k: n.dataset.k as Key, top: n.getBoundingClientRect().top + window.scrollY }));
      st.secs = secs.sort((a, b) => a.top - b.top);
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    document.fonts.ready.then(measure);
    return () => { ro.disconnect(); st.secs = []; st.theta = st.omega = st.shown = 0; st.strobe = false; };
  }, []);

  useEffect(() => { st.sel = sel; }, [sel]);

  // Drag spins the table; the release keeps its speed and friction takes it down.
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const s = stage.current; if (!s || !live) return;
    let id = -1, lx = 0, lt = 0, w = 0;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      id = e.pointerId; lx = e.clientX; lt = performance.now(); w = 0;
      st.drag = true; st.omega = 0; st.lastUser = now(); setGrab(true);
      s.setPointerCapture(id);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const t = performance.now(), dt = Math.max(8, t - lt) / 1000;
      const d = ((e.clientX - lx) / Math.min(900, window.innerWidth)) * 4.2;
      st.theta += d;
      w = w * 0.6 + (d / dt) * 0.4;
      lx = e.clientX; lt = t; st.lastUser = now();
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1; st.drag = false; setGrab(false);
      if (performance.now() - lt > 90) w = 0;
      st.omega = Math.max(-11, Math.min(11, w)); st.lastUser = now();
    };
    s.addEventListener('pointerdown', down);
    s.addEventListener('pointermove', move);
    s.addEventListener('pointerup', up);
    s.addEventListener('pointercancel', up);
    return () => { s.removeEventListener('pointerdown', down); s.removeEventListener('pointermove', move); s.removeEventListener('pointerup', up); s.removeEventListener('pointercancel', up); };
  }, [live]);

  const spinKeys = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { push(3.5); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { push(-3.5); e.preventDefault(); }
  };

  return (
    <div className={`v-strobe${live ? ' is-live' : ' is-flat'}${grab ? ' is-grab' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      {live && (
        <div className="st-stage" ref={stage}>
          <Suspense fallback={null}><Scene phone={phone} /></Suspense>
        </div>
      )}

      <header className="st-top">
        <a className="st-word" href="#main">Skeptical<span aria-hidden="true">?</span></a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </header>

      <main id="main" className="st-main">
        <section className="st-sec st-hero" data-k="hero" aria-labelledby="st-h1">
          {!live && <Sheet />}
          <div className="st-col st-panel">
            <h1 id="st-h1" className="st-h1">Skeptical<span className="sr-only-x">: an independent Lincoln-Douglas debate team</span></h1>
            <p className="st-pitch">{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</p>
            <p className="st-state">{HERO.statement.map((l) => <span key={l}>{l}</span>)}</p>
            <div className="st-doors">
              {HERO.doors.map((d, i) => <A key={d.href} className={i === 0 ? 'st-door is-main' : 'st-door'} href={d.href}>{d.label}</A>)}
            </div>
            {live && (
              <p className="st-hint">
                <button type="button" className="st-spin" onClick={() => push(9)} onKeyDown={spinKeys}>Spin the table</button>
                <span>or drag it. Read fast.</span>
              </p>
            )}
          </div>
        </section>

        <section className="st-sec st-mani" data-k="manifesto" aria-label="What we are">
          <div className="st-col st-panel">
            {MANIFESTO.map((l, i) => (
              <p className="st-claim" key={l} data-rise>
                <Glyph className="st-claim-g" b={[0.06, 0.36, 0.7, 1][i]} />
                <span>{l}</span>
              </p>
            ))}
          </div>
        </section>

        <section className="st-sec st-record" id="record" data-k="record" aria-labelledby="st-rec">
          <div className="st-col st-panel">
            <h2 id="st-rec" className="st-h2">{RECORD.title}</h2>
            <p className="st-rule">{RECORD.rule}</p>
            <p className="st-event"><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ol className="st-results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <span className="st-who">{r.who}</span>
                  <span className="st-what">{r.what}</span>
                  <span className="st-more-t">{r.more}</span>
                </li>
              ))}
            </ol>
            <A className="st-more" href={RECORD.more.href}>{RECORD.more.label}</A>
          </div>
        </section>

        <section className="st-sec st-drive" id="drive" data-k="drive" aria-labelledby="st-drv">
          <div className="st-col st-panel">
            <h2 id="st-drv" className="st-h2">{DRIVE.title}</h2>
            <p className="st-lead">{DRIVE.lead}</p>
            <ul className="st-items">
              {DRIVE.items.map((it, i) => (
                <li key={it.term}>
                  <button type="button" className={i === sel ? 'st-item is-on' : 'st-item'} aria-pressed={i === sel}
                    onClick={() => setSel(i)} onFocus={() => setSel(i)} onMouseEnter={() => setSel(i)}>
                    <span className="st-term">{it.term}</span>
                    <span className="st-def">{it.text}</span>
                  </button>
                </li>
              ))}
            </ul>
            <A className="st-more" href={DRIVE.more.href}>{DRIVE.more.label}</A>
          </div>
        </section>

        <section className="st-sec st-people" id="people" data-k="people" aria-labelledby="st-ppl">
          <div className="st-col st-panel">
            <h2 id="st-ppl" className="st-h2">{PEOPLE.title}</h2>
            {PEOPLE.coaches.map((c) => (
              <article className="st-coach" key={c.name} data-rise>
                <h3>{c.name}</h3>
                <p className="st-role">{c.role}</p>
                <p>{c.bio}</p>
              </article>
            ))}
            <p className="st-count">{PEOPLE.count}</p>
            <A className="st-more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A>
          </div>
        </section>

        <section className="st-sec st-join" id="join" data-k="join" aria-labelledby="st-jn">
          <div className="st-join-head">
            <h2 id="st-jn" className="st-h2">{JOIN.title}</h2>
            <p className="st-lead">{JOIN.lead}</p>
          </div>
          <div className="st-ways st-panel">
            {JOIN.paths.map((p, i) => (
              <article className="st-way" key={p.id} data-rise>
                <Glyph className="st-way-g" b={[0.35, 0.7, 1][i]} />
                <h3><A href={p.href}>{p.name}</A></h3>
                <p className="st-line">{p.line}</p>
                <ul>{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
              </article>
            ))}
          </div>
          <div className="st-after st-panel">
            <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A></p>
            <p>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A></p>
            <p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
            <p>{JOIN.discord}</p>
          </div>
        </section>

        <footer className="st-foot st-panel" data-k="end">
          <p className="st-last">{FOOTER.line}</p>
          <ul className="st-links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul className="st-pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <p className="st-draft">Draft 2, version 74. Not the live site.</p>
        </footer>
      </main>
    </div>
  );
}
