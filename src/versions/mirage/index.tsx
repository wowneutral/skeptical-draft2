// Version 90: the mirage. Two mirrors closed like a shell throw a question mark
// up into the opening. It looks solid. Reach for it and there is nothing there.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/index.css';
import './mirage.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import MARKS from '@/lib/marks.json';
import { gsap } from '@/lib/scroll';
import { Split, useRise } from '@/lib/motion';
import { clamp, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { stage } from './stage';

const Stage = lazy(() => import('./Scene'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** Without WebGL: the mark, drawn flat, standing on a line. */
function Flat() {
  const m = MARKS.italic;
  return (
    <svg className="flat" viewBox={`${-m.w / 2 - 300} ${-m.h / 2 - 120} ${m.w + 600} ${m.h + 420}`} role="img" aria-label="A question mark">
      <path d={m.d} fill="currentColor" />
      <line x1={-m.w / 2 - 260} x2={m.w / 2 + 260} y1={m.h / 2 + 140} y2={m.h / 2 + 140} stroke="currentColor" strokeWidth="6" opacity="0.4" />
    </svg>
  );
}

export default function Mirage() {
  useVersion('mirage');
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [phone, setPhone] = useState(isPhone);
  const [ready, setReady] = useState(still || !webgl);
  const [up, setUp] = useState(false);
  const [open, setOpen] = useState(-1);
  useRise(root);

  useEffect(() => {
    stage.phone = phone;
    const on = () => { const p = isPhone(); stage.phone = p; setPhone(p); };
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [phone]);

  // The opening: the words wait for the lid to land and the image to appear.
  useEffect(() => {
    stage.lift = 0; stage.yaw = 0; stage.yawV = 0; stage.f = 0;
    stage.onSeated = () => setReady(true);
    stage.onLid = (u) => setUp(u);
    const t = setTimeout(() => setReady(true), 6500);
    return () => { clearTimeout(t); stage.onSeated = null; stage.onLid = null; };
  }, []);

  // Scroll to shot: each section has a place for the camera.
  useEffect(() => {
    const el = root.current; if (!el) return;
    let marks: number[] = [];
    const measure = () => {
      const vh = window.innerHeight, sy = window.scrollY;
      marks = Array.from(el.querySelectorAll<HTMLElement>('[data-shot]')).map((s) => {
        const r = s.getBoundingClientRect();
        return r.top + sy + Math.min(r.height, vh) * 0.5;
      });
      marks[0] = Math.min(marks[0], vh * 0.5);
      const max = document.documentElement.scrollHeight - vh;
      marks[marks.length - 1] = Math.min(marks[marks.length - 1], max + vh * 0.5);
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    document.fonts.ready.then(measure);
    const tick = () => {
      if (!marks.length) return;
      const c = window.scrollY + window.innerHeight * 0.5;
      let f = 0;
      if (c >= marks[marks.length - 1]) f = marks.length - 1;
      else for (let i = 0; i < marks.length - 1; i++) if (c < marks[i + 1]) { f = i + clamp((c - marks[i]) / Math.max(1, marks[i + 1] - marks[i])); break; }
      stage.f = f;
    };
    gsap.ticker.add(tick);
    return () => { ro.disconnect(); gsap.ticker.remove(tick); };
  }, [phone]);

  const lift = () => { stage.lift = stage.lift ? 0 : 1; };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); stage.yawV += e.key === 'ArrowLeft' ? -2.6 : 2.6; }
  };
  const play = webgl && !still;

  return (
    <div className={`v-mirage${ready ? ' is-ready' : ''}${phone ? ' is-phone' : ''}${webgl ? '' : ' no-gl'}${up ? ' is-up' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>

      <div className="stage" aria-hidden={webgl ? 'true' : undefined}>
        {webgl ? <Suspense fallback={null}><Stage /></Suspense> : <Flat />}
      </div>
      {webgl && (
        <div className="touch">
          <button type="button" className="lift" onClick={lift} onKeyDown={key} aria-pressed={up}>
            {up ? 'Set it back.' : 'Lift the top.'}
          </button>
          {play && <span className="hint" aria-hidden="true">{phone ? 'Swipe sideways to turn it.' : 'Drag to turn it.'}</span>}
        </div>
      )}

      <main id="main">
        <section className="sec hero" data-shot="hero" id="top" aria-label={SITE.heading}>
          <header className="top">
            <a className="brand" href="#top" aria-label="Skeptical, back to the top">Skeptical<i>?</i></a>
            <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
          </header>
          <h1 className="pitch">{HERO.pitch.map((p) => <span key={p}>{p}</span>)}</h1>
          <p className="statement">{HERO.statement.map((s) => <span key={s}>{s}</span>)}</p>
          <p className="doors">{HERO.doors.map((d, i) => <A key={d.href} className={i ? 'door alt' : 'door'} href={d.href}>{d.label}</A>)}</p>
        </section>

        <section className="sec say" data-shot="manifesto" aria-label="How the team works">
          {MANIFESTO.map((m, i) => <Split as="p" key={m} className={`line l${i}`} by="words">{m}</Split>)}
        </section>

        <section className="sec record" data-shot="record" id="record">
          <Split as="h2" className="title">{RECORD.title}</Split>
          <p className="rule" data-rise>{RECORD.rule}</p>
          <p className="event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
          <ul className="results">
            {RECORD.results.map((r) => (
              <li data-rise key={r.who}><h3>{r.what}</h3><p><b>{r.who}</b> {r.more}</p></li>
            ))}
          </ul>
          <p data-rise><A className="more" href={RECORD.more.href}>{RECORD.more.label}</A></p>
        </section>

        <section className="sec drive" data-shot="drive" id="drive">
          <Split as="h2" className="title">{DRIVE.title}</Split>
          <p className="lead" data-rise>{DRIVE.lead}</p>
          <dl className="kit">
            {DRIVE.items.map((d) => <div data-rise key={d.term}><dt>{d.term}</dt><dd>{d.text}</dd></div>)}
          </dl>
          <p data-rise><A className="more" href={DRIVE.more.href}>{DRIVE.more.label}</A></p>
        </section>

        <section className="sec people" data-shot="people" id="people">
          <Split as="h2" className="title">{PEOPLE.title}</Split>
          <ul className="coaches">
            {PEOPLE.coaches.map((c) => <li data-rise key={c.name}><h3>{c.name}</h3><p className="role">{c.role}</p><p>{c.bio}</p></li>)}
          </ul>
          <p className="count" data-rise>{PEOPLE.count}</p>
          <p data-rise><A className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>
        </section>

        <section className="sec join" data-shot="join" id="join">
          <Split as="h2" className="title">{JOIN.title}</Split>
          <p className="lead" data-rise>{JOIN.lead}</p>
          <ol className="ways">
            {JOIN.paths.map((p, i) => {
              const on = open === i;
              return (
                <li key={p.id} className={on ? 'is-on' : undefined} data-rise>
                  <h3>
                    <button type="button" aria-expanded={on} aria-controls={`way-${p.id}`} onClick={() => setOpen(on ? -1 : i)}>
                      <span className="name">{p.name}</span><span className="what">{p.line}</span><span className="sign" aria-hidden="true" />
                    </button>
                  </h3>
                  <p className="first">{p.text[0]}</p>
                  <div className="more-way" id={`way-${p.id}`} hidden={!on}>
                    <ul>{p.text.slice(1).map((t) => <li key={t}>{t}</li>)}</ul>
                  </div>
                  <A className="go" href={p.href}>{p.name}<span aria-hidden="true"> &rarr;</span></A>
                </li>
              );
            })}
          </ol>
          <p className="after" data-rise>{JOIN.discord}</p>
          <p className="after" data-rise>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
          <p className="after" data-rise>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
        </section>
      </main>

      <footer className="sec end" data-shot="end">
        <p className="last">{FOOTER.line}</p>
        <ul className="links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <ul className="pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <small>Draft 2, version 90. Not the live site.</small>
      </footer>
    </div>
  );
}
