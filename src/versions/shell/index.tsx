// Version 69: the shell. A chambered shell on a black stand under museum
// light. Press it and it parts along its plane: the cut spiral and the pearl
// beneath it make a question mark. The page walks into it one chamber at a time.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './shell.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import MARKS from '@/lib/marks.json';
import { gsap } from '@/lib/scroll';
import { Split, useRise } from '@/lib/motion';
import { clamp, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { stage } from './stage';

const Stage = lazy(() => import('./Stage'));
const STOPS = ['top', 'say', 'record', 'drive', 'people', 'join', 'end'];

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

export default function Shell() {
  useVersion('shell');
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [phone, setPhone] = useState(isPhone);
  const [open, setOpen] = useState(still);
  const [focus, setFocus] = useState(-1);
  const [lit, setLit] = useState(still || !webgl);
  const drag = useRef({ on: false, x: 0, moved: 0, id: -1 });
  useRise(root);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // The reader's place on the page, as a number of chambers.
  useEffect(() => {
    const el = root.current; if (!el) return;
    let wasOpen = false;
    const tick = () => {
      const vh = window.innerHeight, sy = window.scrollY, line = sy + vh * (isPhone() ? 0.78 : 0.62);
      const tops = STOPS.map((id, i) => { if (i === 0) return vh * (isPhone() ? 0.78 : 0.62); const s = document.getElementById(id); return s ? s.getBoundingClientRect().top + sy : 0; });
      let f = 0;
      for (let i = 0; i < tops.length; i++) {
        if (line >= tops[i]) f = i + (i < tops.length - 1 ? clamp((line - tops[i]) / Math.max(1, tops[i + 1] - tops[i])) : 0);
      }
      stage.f = f;
      const o = f > 0.45;
      if (o !== wasOpen) { wasOpen = o; el.dataset.cut = o ? '1' : '0'; }
      if (stage.lit && !lit) setLit(true);
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [lit]);

  useEffect(() => { stage.open = open; }, [open]);
  useEffect(() => { stage.focus = focus; }, [focus]);
  useEffect(() => () => { stage.focus = -1; stage.open = false; stage.f = 0; }, []);

  // Drag to turn; a press without a drag opens or closes it.
  const down = (e: React.PointerEvent) => {
    drag.current = { on: true, x: e.clientX, moved: 0, id: e.pointerId };
    stage.dragging = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    stage.px = ((e.clientX - r.left) / r.width) * 2 - 1; stage.py = ((e.clientY - r.top) / r.height) * 2 - 1;
    const d = drag.current; if (!d.on) return;
    const dx = e.clientX - d.x; d.x = e.clientX; d.moved += Math.abs(dx);
    stage.push += dx * 0.0016;
  };
  const up = () => {
    const d = drag.current; if (!d.on) return;
    d.on = false; stage.dragging = false;
    if (d.moved < 6 && stage.f < 0.4) setOpen((v) => !v);
  };
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { stage.nudge -= 0.05; e.preventDefault(); }
    if (e.key === 'ArrowRight') { stage.nudge += 0.05; e.preventDefault(); }
  };

  const q = MARKS.italic;
  return (
    <div className={`v-shell${lit ? ' is-lit' : ''}${webgl ? '' : ' no-gl'}`} ref={root} data-cut="0">
      <a className="skip-x" href="#main">Skip to content</a>

      <div className="case">
        {webgl ? (
          <div className="glass" aria-hidden="true" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={() => { stage.px = 0; stage.py = 0; }}>
            <Suspense fallback={null}><Stage key={phone ? 'p' : 'd'} /></Suspense>
          </div>
        ) : (
          <svg className="flatq" viewBox={`0 0 ${q.w} ${q.h}`} role="img" aria-label="A question mark"><path d={q.d} /></svg>
        )}
        {webgl && !still && (
          <button type="button" className="press" onClick={() => setOpen((v) => !v)} onKeyDown={keys} aria-pressed={open}>
            <span>{open ? 'Press to close it.' : 'Drag to turn. Press to open.'}</span>
          </button>
        )}
      </div>

      <div className="col">
        <header className="mast">
          <a className="brand" href="#top" aria-label="Skeptical, back to the top">Skeptical<em>?</em></a>
          <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
        </header>

        <main id="main">
          <section className="hero" id="top" aria-label={SITE.heading}>
            <h1 className="pitch"><span>{HERO.pitch[0]}</span> <em>{HERO.pitch[1]}</em></h1>
            <p className="statement">{HERO.statement.map((s) => <span key={s}>{s}</span>)}</p>
            <p className="doors">{HERO.doors.map((d) => <A key={d.href} href={d.href}>{d.label}<Arrow /></A>)}</p>
          </section>

          <section className="say" id="say" aria-label="How the team works">
            <ol className="grow">
              {MANIFESTO.map((m, i) => <li key={m} data-rise style={{ ['--k' as string]: i }}>{m}</li>)}
            </ol>
          </section>

          <section className="sec" id="record">
            <Split as="h2" className="title">{RECORD.title}</Split>
            <p className="lead" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ul className="results">
              {RECORD.results.map((r) => <li data-rise key={r.who}><h3>{r.what}</h3><p><b>{r.who}</b> {r.more}</p></li>)}
            </ul>
            <p data-rise><A className="more" href={RECORD.more.href}>{RECORD.more.label}<Arrow /></A></p>
          </section>

          <section className="sec" id="drive">
            <Split as="h2" className="title">{DRIVE.title}</Split>
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <ul className="drive" onMouseLeave={() => setFocus(-1)}>
              {DRIVE.items.map((d, i) => (
                <li key={d.term} data-rise>
                  <button type="button" className={focus === i ? 'on' : ''} aria-pressed={focus === i}
                    onMouseEnter={() => setFocus(i)} onFocus={() => setFocus(i)} onBlur={() => setFocus(-1)} onClick={() => setFocus((v) => (v === i ? -1 : i))}>
                    <span className="term">{d.term}</span><span className="txt">{d.text}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p data-rise><A className="more" href={DRIVE.more.href}>{DRIVE.more.label}<Arrow /></A></p>
          </section>

          <section className="sec" id="people">
            <Split as="h2" className="title">{PEOPLE.title}</Split>
            <ul className="coaches">
              {PEOPLE.coaches.map((c) => <li key={c.name} data-rise><h3>{c.name}</h3><p className="role">{c.role}</p><p>{c.bio}</p></li>)}
            </ul>
            <p className="count" data-rise>{PEOPLE.count}</p>
            <p data-rise><A className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}<Arrow /></A></p>
          </section>

          <section className="sec join" id="join">
            <Split as="h2" className="title">{JOIN.title}</Split>
            <p className="lead" data-rise>{JOIN.lead}</p>
            <ol className="paths">
              {JOIN.paths.map((p) => (
                <li key={p.id} data-rise>
                  <a href={p.href} rel="noopener" className="path">
                    <span className="name">{p.name}<Arrow /></span>
                    <span className="line">{p.line}</span>
                  </a>
                  <div className="more-text">{p.text.map((t) => <p key={t}>{t}</p>)}</div>
                </li>
              ))}
            </ol>
            <p className="aside" data-rise>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
            <p className="aside" data-rise>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
            <p className="aside" data-rise>{JOIN.discord}</p>
          </section>
        </main>

        <footer className="foot" id="end">
          <p className="last">{FOOTER.line}</p>
          <ul className="links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul className="pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <p className="draft">Draft 2, version 69. Not the live site.</p>
        </footer>
      </div>
    </div>
  );
}

function Arrow() {
  return <svg className="arr" viewBox="0 0 24 12" aria-hidden="true"><path d="M0 6h22M17 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>;
}
