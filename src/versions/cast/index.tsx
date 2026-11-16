// Version 41: the cast. One bronze question mark, shot like a product. Scroll
// and it comes apart into its two pieces, the hook and the dot, each carrying
// a section; at Join the pieces close and the object turns to face you.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './cast.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import MARKS from '@/lib/marks.json';
import { Split, useRise } from '@/lib/motion';
import { clamp, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { shots, st, type Key } from './store';

const Scene = lazy(() => import('./Scene'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** The labels of the exploded view: section titles only, like a parts drawing. */
const LABELS = [
  { n: 'A', t: RECORD.title, href: '#record' },
  { n: 'B', t: DRIVE.title, href: '#drive' },
  { n: 'C', t: PEOPLE.title, href: '#people' },
  { n: 'D', t: JOIN.title, href: '#join' },
];

/** Shot name, element id, and where in that element it is held. */
const PLAN: [string, string, number][] = [
  ['hero', 'top', 0], ['statement', 's-statement', 0.5],
  ['apart0', 's-apart', 0.12], ['apart1', 's-apart', 0.5], ['apart1', 's-apart', 0.82],
  ['hook', 'drive', 0.5], ['dot', 'people', 0.5], ['join', 'join', 0.5], ['end', 's-end', 0.5],
];

export default function Cast() {
  useVersion('cast');
  const root = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [path, setPath] = useState(0);
  const [phone, setPhone] = useState(isPhone);
  useRise(root);

  useEffect(() => { st.path = path; }, [path]);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // Tie each shot to its place on the page.
  useEffect(() => {
    const S = shots(phone);
    const measure = () => {
      const vh = window.innerHeight, max = document.documentElement.scrollHeight - vh;
      const keys: Key[] = PLAN.map(([name, id, f]) => {
        const el = document.getElementById(id);
        let y = 0;
        if (el && id !== 'top') { const r = el.getBoundingClientRect(); y = r.top + window.scrollY + f * r.height - vh / 2; }
        return { ...S[name], y: clamp(y, 0, max) };
      });
      keys.push({ ...S.close, y: max });
      st.keys = keys;
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(document.body);
    const t = setTimeout(measure, 1200);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, [phone]);

  // The hand: point to lean it, drag sideways to turn it, tap to knock it.
  useEffect(() => {
    st.overlay = overlay.current;
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') { st.pointer.x = (e.clientX / innerWidth) * 2 - 1; st.pointer.y = (e.clientY / innerHeight) * 2 - 1; }
    };
    let down: { x: number; y: number; t: number; lx: number; lt: number; moved: boolean } | null = null;
    const start = (e: PointerEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest('.shot') || (el.closest('a, button') && !el.closest('.cast-object'))) return;
      if (el.closest('.shot-text')) return;
      down = { x: e.clientX, y: e.clientY, t: performance.now(), lx: e.clientX, lt: performance.now(), moved: false };
      st.spin.held = true; st.spin.v = 0;
    };
    const drag = (e: PointerEvent) => {
      if (!down) return;
      const now = performance.now(), dx = e.clientX - down.lx;
      if (Math.abs(e.clientX - down.x) > 6) down.moved = true;
      st.spin.a += dx * 0.011;
      st.spin.v = st.spin.v * 0.5 + (dx * 0.011) / Math.max(0.008, (now - down.lt) / 1000) * 0.5;
      down.lx = e.clientX; down.lt = now;
    };
    const end = (e: PointerEvent) => {
      if (!down) return;
      if (!down.moved && Math.abs(e.clientY - down.y) < 8 && e.type === 'pointerup') st.knock = 1;
      if (performance.now() - down.lt > 90) st.spin.v = 0;
      st.spin.held = false; down = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerdown', start);
    window.addEventListener('pointermove', drag);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', start);
      window.removeEventListener('pointermove', drag); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end);
    };
  }, []);

  const keyTurn = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { st.spin.v -= 3.5; e.preventDefault(); }
    if (e.key === 'ArrowRight') { st.spin.v += 3.5; e.preventDefault(); }
  };

  return (
    <div className={`v-cast${webgl ? '' : ' flat'}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>

      <div className="cast-stage" aria-hidden="true">
        {webgl ? <Suspense fallback={null}><Scene /></Suspense> : (
          <svg className="cast-flat" viewBox="-520 -800 1040 1600"><path d={MARKS.roman.d} /></svg>
        )}
      </div>

      {webgl && !still && (
        <div className="cast-parts" ref={overlay}>
          <svg className="cast-leaders" aria-hidden="true">
            {LABELS.map((_, i) => (
              <g key={i}>
                <path ref={(el) => { st.labels[i] = { ...(st.labels[i] ?? { a: null, line: null, pin: null }), line: el }; }} />
                <circle r="3.5" ref={(el) => { st.labels[i] = { ...(st.labels[i] ?? { a: null, line: null, pin: null }), pin: el }; }} />
              </g>
            ))}
          </svg>
          {LABELS.map((l, i) => (
            <a key={l.n} className="part" href={l.href} ref={(el) => { st.labels[i] = { ...(st.labels[i] ?? { a: null, line: null, pin: null }), a: el }; }}>
              <span className="part-n">{l.n}</span><span className="part-t">{l.t}</span>
            </a>
          ))}
        </div>
      )}

      <header className="cast-nav">
        <a className="cast-word" href="#top">{SITE.name}</a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </header>

      <main id="main">
        {/* 1. The product shot. */}
        <section className="shot hero" id="top">
          <div className="shot-text hero-text">
            <h1 className="hero-h">
              <span className="hero-word" aria-hidden="true">{SITE.name}</span>
              <span className="sr-only-x">{SITE.heading}</span>
            </h1>
            <p className="pitch">{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</p>
            <div className="doors">
              {HERO.doors.map((d, i) => <A key={d.href} className={i ? 'door' : 'door door-main'} href={d.href}>{d.label}</A>)}
            </div>
          </div>
          {webgl && (
            <button type="button" className="cast-object" aria-label="Drag to turn it: the bronze question mark. Arrow keys turn it too." onKeyDown={keyTurn} onClick={(e) => { if (e.detail === 0) st.knock = 1; }}>
              <span className="hint" aria-hidden="true">Drag to turn it.</span>
            </button>
          )}
        </section>

        {/* 2. The three lines, beside the object from the other side. */}
        <section className="shot statement" id="s-statement">
          <div className="shot-text">
            <p className="statement-l">{HERO.statement.map((l) => <span key={l} data-rise>{l}</span>)}</p>
          </div>
        </section>

        {/* 3. The manifesto on a calm field. */}
        <section className="field manifesto" aria-label="What we are">
          <ol>
            {MANIFESTO.map((m, i) => (
              <li key={i} data-rise><span className="mi">{['i', 'ii', 'iii', 'iv'][i]}</span><span className="mt">{m}</span></li>
            ))}
          </ol>
        </section>

        {/* 4. The exploded view. */}
        <section className="shot apart" id="s-apart" aria-label="Two pieces">
          <div className="apart-cap shot-text">
            <p className="apart-l"><span>Hook</span><span className="amp">and</span><span>dot.</span></p>
          </div>
          {(!webgl || still) && (
            <ul className="parts-flat">
              {LABELS.map((l) => <li key={l.n}><a href={l.href}>{l.n} {l.t}</a></li>)}
            </ul>
          )}
        </section>

        {/* 5. The record, set like a spec sheet. */}
        <section className="field record" id="record">
          <div className="sheet">
            <div className="sheet-head">
              <Split as="h2" className="h2">{RECORD.title}</Split>
              <p className="rule" data-rise>{RECORD.rule}</p>
            </div>
            <dl className="spec" data-rise>
              <div><dt>Event</dt><dd>{RECORD.name}</dd></div>
              <div><dt>Date</dt><dd>{RECORD.when}</dd></div>
              <div><dt>Place</dt><dd>{RECORD.where}</dd></div>
            </dl>
            <ol className="results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <span className="r-what">{r.what}</span>
                  <span className="r-who">{r.who}</span>
                  <span className="r-more">{r.more}</span>
                </li>
              ))}
            </ol>
            <A className="more" href={RECORD.more.href}>{RECORD.more.label}</A>
          </div>
        </section>

        {/* 6. The hook carries the drive. */}
        <section className="shot hookshot" id="drive">
          <div className="shot-text side-l">
            <Split as="h2" className="h2 h2-shot">{DRIVE.title}</Split>
            <p className="shot-lead" data-rise>{DRIVE.lead}</p>
          </div>
        </section>
        <section className="field drive" aria-label="In the drive">
          <dl className="contents">
            {DRIVE.items.map((d, i) => (
              <div key={d.term} data-rise>
                <dt><span className="ci">{String(i + 1)}</span>{d.term}</dt>
                <dd>{d.text}</dd>
              </div>
            ))}
          </dl>
          <A className="more" href={DRIVE.more.href}>{DRIVE.more.label}</A>
        </section>

        {/* 7. The dot carries the people. */}
        <section className="shot dotshot" id="people">
          <div className="shot-text side-r">
            <Split as="h2" className="h2 h2-shot">{PEOPLE.title}</Split>
            <p className="shot-lead" data-rise>{PEOPLE.count}</p>
          </div>
        </section>
        <section className="field people" aria-label="The coaches">
          <ul className="coaches">
            {PEOPLE.coaches.map((c) => (
              <li key={c.name} data-rise>
                <span className="c-role">{c.role}</span>
                <span className="c-name">{c.name}</span>
                <span className="c-bio">{c.bio}</span>
              </li>
            ))}
          </ul>
          <A className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A>
        </section>

        {/* 8. Join: the pieces close and the object faces you. */}
        <section className="shot joinshot" id="join">
          <div className="shot-text side-l">
            <Split as="h2" className="h2 h2-join">{JOIN.title}</Split>
            <p className="shot-lead" data-rise>{JOIN.lead}</p>
          </div>
        </section>
        <section className="field ways" aria-label="Three ways in">
          <div className="paths" role="group" aria-label="Pick a way in">
            {JOIN.paths.map((p, i) => (
              <article key={p.id} className={`path${path === i ? ' on' : ''}`}>
                <button type="button" className="path-pick" aria-pressed={path === i} onClick={() => setPath(i)} onFocus={() => setPath(i)}>
                  <span className="p-name">{p.name}</span>
                  <span className="p-line">{p.line}</span>
                </button>
                <ul className="p-text">
                  {p.text.map((t, j) => <li key={j} className={j ? 'p-rest' : ''}>{t}</li>)}
                </ul>
                <A className="p-go" href={p.href}>{p.name}<span aria-hidden="true" className="arrow" /></A>
              </article>
            ))}
          </div>
          <div className="join-foot" data-rise>
            <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A></p>
            <p>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A></p>
            <p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
            <p>{JOIN.discord}</p>
          </div>
        </section>

        {/* 9. The last shot: the object alone, whole, facing you. */}
        <section className="shot endshot" id="s-end" aria-label="The end">
          <div className="shot-text end-text">
            <p className="end-line">{FOOTER.line}</p>
          </div>
        </section>
      </main>

      <footer className="field cast-foot">
        <div className="foot-row">
          <span className="foot-word">{SITE.name}<svg className="foot-q" viewBox="-520 -800 1040 1600" aria-hidden="true"><path d={MARKS.roman.d} /></svg></span>
          <ul className="foot-links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul className="foot-pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        </div>
        <p className="draft">Draft 2, version 41. Not the live site.</p>
      </footer>
    </div>
  );
}
