// Version 68: the pieces. Seven marble pieces on black slate. The same seven
// make every shape on the page, the way the same prep runs any position.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/index.css';
import './pieces.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { useRise } from '@/lib/motion';
import { isPhone } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { ARR_POLYS, RED } from './shapes';
import { board } from './store';

const Scene = lazy(() => import('./Scene'));

/** Which piece stands for which part of the drive. */
const DRIVE_PIECE = [0, 1, 2, 3, 4, 6, 5];

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

const Arrow = () => (
  <svg className="arw" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h16M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** The arrangement drawn flat, for a browser without WebGL. */
function Flat({ n }: { n: number }) {
  const polys = ARR_POLYS[n], all = polys.flat();
  const x0 = Math.min(...all.map((p) => p[0])), x1 = Math.max(...all.map((p) => p[0]));
  const y0 = Math.min(...all.map((p) => p[1])), y1 = Math.max(...all.map((p) => p[1]));
  return (
    <svg className="flat" viewBox={`${x0 - 0.3} ${-y1 - 0.3} ${x1 - x0 + 0.6} ${y1 - y0 + 0.6}`} aria-hidden="true">
      {polys.map((p, i) => <polygon key={i} points={p.map(([x, y]) => `${x},${-y}`).join(' ')} className={i === RED ? 'r' : ''} />)}
    </svg>
  );
}

export default function Pieces() {
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [phone, setPhone] = useState(isPhone);
  const [ready, setReady] = useState(false);
  const [touched, setTouched] = useState(false);
  const [focus, setFocus] = useState(-1);
  const [lit, setLit] = useState(-1);
  useVersion('pieces', { anchorOffset: phone ? Math.round(window.innerHeight * 0.44) : 0 });
  useRise(root);

  useEffect(() => {
    const on = () => { setPhone(isPhone()); board.focusX = isPhone() ? 0.5 : 0.29; };
    on();
    window.addEventListener('resize', on);
    board.onTouch = (i) => { setTouched(true); if (board.arr === 3) setLit(DRIVE_PIECE.indexOf(i)); };
    board.onReady = () => setReady(true);
    const t = setTimeout(() => setReady(true), 6000);
    return () => { window.removeEventListener('resize', on); board.onTouch = null; board.onReady = null; clearTimeout(t); board.arr = 0; board.hl = []; board.focus = -1; };
  }, []);

  // The section at the reading line decides the shape on the slate.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const secs = Array.from(el.querySelectorAll<HTMLElement>('[data-arr]'));
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const vh = window.innerHeight, line = isPhone() ? vh * 0.78 : vh * 0.5;
      let n = 0;
      for (const s of secs) { const r = s.getBoundingClientRect(); if (r.top <= line) n = Number(s.dataset.arr); }
      if (window.scrollY + vh >= document.documentElement.scrollHeight - 4) n = 6;
      if (n !== board.arr) { board.arr = n; board.hl = []; el.dataset.arr = String(n); }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  const keys = (i: number) => (e: React.KeyboardEvent) => {
    const step = 0.25, m: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (m[e.key]) { e.preventDefault(); board.nudge(i, ...m[e.key]); setTouched(true); }
  };

  return (
    <div className="v-pieces" ref={root} data-arr="0" data-ready={ready || !webgl || undefined}>
      <a className="skip-x" href="#main">Skip to the page</a>

      {webgl && (
        <aside className="stage" aria-label="The seven pieces">
          <Suspense fallback={null}><Scene /></Suspense>
          <div className="keys">
            {Array.from({ length: 7 }, (_, i) => (
              <button key={i} type="button" className="sr-only-x"
                onFocus={() => { board.focus = i; setFocus(i); }} onBlur={() => { board.focus = -1; setFocus(-1); }}
                onClick={() => { board.turn(i); setTouched(true); }} onKeyDown={keys(i)}>
                Turn piece {i + 1} of 7
              </button>
            ))}
          </div>
          <p className={'hint' + (touched ? ' gone' : '')} aria-hidden="true">Drag a piece. Press one to turn it.</p>
          {touched && <button type="button" className="back" onClick={() => { board.reset++; setTouched(false); }}>Put them back</button>}
          {focus >= 0 && <p className="keycap" aria-hidden="true">Piece {focus + 1} of 7. Enter turns it, arrows slide it.</p>}
        </aside>
      )}

      <header className="top">
        <a className="mark" href="#top" aria-label="Skeptical, back to the top">Skeptical<i>?</i></a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </header>

      <main id="main" className="col">
        <section id="top" className="sec hero" data-arr="0">
          {!webgl && <Flat n={0} />}
          <h1 className="pitch">
            <span className="sr-only-x">{SITE.heading}. </span>
            {HERO.pitch.map((l, i) => <span key={i} className="ln" style={{ '--i': i } as React.CSSProperties}>{l}</span>)}
          </h1>
          <p className="statement">{HERO.statement.map((l, i) => <span key={i}>{l}</span>)}</p>
          <div className="doors">
            {HERO.doors.map((d, i) => <A key={d.href} href={d.href} className={'door' + (i ? ' alt' : '')}><span>{d.label}</span><Arrow /></A>)}
          </div>
        </section>

        <section className="sec manifesto" data-arr="1" aria-labelledby="m-h">
          {!webgl && <Flat n={1} />}
          <h2 id="m-h" className="sr-only-x">Who we are.</h2>
          <div className="lines">
            {MANIFESTO.map((l, i) => <p key={i} data-rise className={i === 3 ? 'last' : ''}>{l}</p>)}
          </div>
        </section>

        <section id="record" className="sec record" data-arr="2" aria-labelledby="r-h">
          {!webgl && <Flat n={2} />}
          <h2 id="r-h" className="title" data-rise>{RECORD.title}</h2>
          <p className="rule" data-rise>{RECORD.rule}</p>
          <p className="event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
          <ul className="results">
            {RECORD.results.map((r) => (
              <li key={r.who} data-rise><strong>{r.who}</strong><span className="what">{r.what}</span><span className="more">{r.more}</span></li>
            ))}
          </ul>
          <A className="go" href={RECORD.more.href}>{RECORD.more.label}<Arrow /></A>
        </section>

        <section id="drive" className="sec drive" data-arr="3" aria-labelledby="d-h">
          {!webgl && <Flat n={3} />}
          <h2 id="d-h" className="title" data-rise>{DRIVE.title}</h2>
          <p className="lead" data-rise>{DRIVE.lead}</p>
          <dl className="items">
            {DRIVE.items.map((it, k) => (
              <div key={it.term} className={'item' + (lit === k ? ' on' : '')}
                onMouseEnter={() => { board.hl = [DRIVE_PIECE[k]]; setLit(k); }} onMouseLeave={() => { board.hl = []; setLit(-1); }}>
                <dt>{it.term}</dt><dd>{it.text}</dd>
              </div>
            ))}
          </dl>
          <A className="go" href={DRIVE.more.href}>{DRIVE.more.label}<Arrow /></A>
        </section>

        <section id="people" className="sec people" data-arr="4" aria-labelledby="p-h">
          {!webgl && <Flat n={4} />}
          <h2 id="p-h" className="title" data-rise>{PEOPLE.title}</h2>
          <div className="coaches">
            {PEOPLE.coaches.map((c, k) => (
              <article key={c.name} className="coach" data-rise
                onMouseEnter={() => { board.hl = k ? [2, 3, 4, 5, 6] : [0, 1]; }} onMouseLeave={() => { board.hl = []; }}>
                <h3>{c.name}</h3>
                <p className="role">{c.role}</p>
                <p>{c.bio}</p>
              </article>
            ))}
          </div>
          <p className="count" data-rise>{PEOPLE.count}</p>
          <A className="go" href={PEOPLE.more.href}>{PEOPLE.more.label}<Arrow /></A>
        </section>

        <section id="join" className="sec join" data-arr="5" aria-labelledby="j-h">
          {!webgl && <Flat n={5} />}
          <h2 id="j-h" className="title" data-rise>{JOIN.title}</h2>
          <p className="lead" data-rise>{JOIN.lead}</p>
          <ol className="paths">
            {JOIN.paths.map((p) => (
              <li key={p.id} className="path" data-rise>
                <A href={p.href} className="pname"><span>{p.name}</span><Arrow /></A>
                <p className="pline">{p.line}</p>
                {p.text.map((t, i) => <p key={i} className="ptext">{t}</p>)}
              </li>
            ))}
          </ol>
          <div className="after" data-rise>
            <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>.</p>
            <p>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
            <p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
            <p>{JOIN.discord}</p>
          </div>
        </section>

        <footer className="sec foot" data-arr="6">
          {!webgl && <Flat n={6} />}
          <p className="line">{FOOTER.line}</p>
          <ul className="links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul className="pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <small>Draft 2, version 68. Not the live site.</small>
        </footer>
      </main>
    </div>
  );
}
