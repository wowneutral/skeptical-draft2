// Version 63: the heap. A cone of bone sand on black stone under one low light.
// Each section takes it down a step, you can brush it away yourself, and at Join one grain is left.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/schibsted-grotesk/wght.css';
import './heap.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { clamp, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { stage } from './stage';

const Scene = lazy(() => import('./Scene'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** Without WebGL: the heap drawn as a stipple of grains. */
function FlatHeap() {
  const dots: React.ReactNode[] = [];
  let s = 9;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 900; i++) {
    const y = Math.sqrt(r()), x = (r() - 0.5) * 2 * y;
    dots.push(<circle key={i} cx={200 + x * 190} cy={40 + y * 200} r={0.8 + r() * 1.4} />);
  }
  return <svg className="flat" viewBox="0 0 400 250" role="img" aria-label="A heap of sand">{dots}</svg>;
}

export default function TheHeap() {
  useVersion('heap');
  const root = useRef<HTMLDivElement>(null), dot = useRef<HTMLSpanElement>(null);
  const [webgl] = useState(hasWebGL);
  const [drawn, setDrawn] = useState(!webgl);
  const [phone, setPhone] = useState(isPhone);
  const [way, setWay] = useState(-1);
  useRise(root);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // The opening: black, then the light comes up off the stone and finds the heap.
  useEffect(() => {
    stage.drawn = false; stage.open = still ? 1 : 0; stage.take = 0; stage.way = -1;
    stage.onDrawn = () => {
      setDrawn(true);
      if (!still) gsap.to(stage, { open: 1, duration: 3.4, ease: 'power2.out', delay: 0.25 });
    };
    const t = setTimeout(() => { setDrawn(true); stage.open = 1; }, 12000);
    return () => { clearTimeout(t); stage.onDrawn = null; gsap.killTweensOf(stage); };
  }, []);

  // Where we are on the page, as a number of steps down the heap.
  useEffect(() => {
    const el = root.current; if (!el) return;
    stage.dot = dot.current;
    let marks: number[] = [];
    const measure = () => {
      const vh = window.innerHeight, sy = window.scrollY;
      marks = Array.from(el.querySelectorAll<HTMLElement>('[data-stop]')).map((s, i) => {
        if (i === 0) return 0;
        const top = s.getBoundingClientRect().top + sy;
        return Math.max(0, top - vh * (i === 5 ? 0.15 : 0.55));
      });
      const d = dot.current;
      if (d) marks[5] = Math.max(marks[4] + 10, d.getBoundingClientRect().top + sy - vh * 0.68);
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    document.fonts.ready.then(measure);
    let lastJoin = false;
    const tick = () => {
      const y = window.scrollY;
      let f = 0;
      for (let i = 0; i < marks.length - 1; i++) if (y >= marks[i]) f = i + clamp((y - marks[i]) / Math.max(1, marks[i + 1] - marks[i]));
      stage.f = f;
      const j = f > 4.35;
      if (j !== lastJoin) { lastJoin = j; el.classList.toggle('at-join', j); }
    };
    gsap.ticker.add(tick);
    return () => { ro.disconnect(); gsap.ticker.remove(tick); stage.dot = null; };
  }, []);

  const point = (i: number) => { stage.way = i; setWay(i); };

  return (
    <div className={`v-heap${drawn ? ' is-drawn' : ''}${webgl ? '' : ' no-gl'}${phone ? ' is-phone' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      {webgl && <div className="scene" aria-hidden="true"><Suspense fallback={null}><Scene key={phone ? 'p' : 'd'} /></Suspense></div>}
      <div className="field" aria-hidden="true" />

      <header className="top">
        <a className="brand" href="#top" aria-label="Skeptical, back to the top">Skeptical</a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
      </header>

      <main id="main">
        <section className="sec hero" data-stop="hero" id="top" aria-label={SITE.heading}>
          <div className="col">
            <h1 className="pitch">{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</h1>
            <p className="statement">{HERO.statement.map((s) => <span key={s}>{s}</span>)}</p>
            <p className="doors">{HERO.doors.map((d) => <A key={d.href} href={d.href}>{d.label}</A>)}</p>
          </div>
          {webgl ? (
            <button type="button" className="plaque" onClick={() => { stage.take += 1; }} disabled={still} aria-describedby="plaque-how">
              One grain at a time.
              <span className="sr-only-x" id="plaque-how">Press to take sand off the heap.</span>
            </button>
          ) : <FlatHeap />}
        </section>

        <section className="sec say" data-stop="manifesto" aria-label="How the team works">
          <div className="col">
            {MANIFESTO.map((m, i) => <p key={m} className={`line l${i}`} data-rise>{m}</p>)}
          </div>
        </section>

        <section className="sec record" data-stop="record" id="record">
          <div className="col">
            <h2 className="title" data-rise>{RECORD.title}</h2>
            <p className="rule" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ul className="results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <h3>{r.what}</h3>
                  <p><b>{r.who}</b> {r.more}</p>
                </li>
              ))}
            </ul>
            <p data-rise><A className="more" href={RECORD.more.href}>{RECORD.more.label}</A></p>
          </div>
        </section>

        <section className="sec drive" data-stop="drive" id="drive">
          <div className="col">
            <h2 className="title" data-rise>{DRIVE.title}</h2>
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <dl className="kit">
              {DRIVE.items.map((d) => <div key={d.term} data-rise><dt>{d.term}</dt><dd>{d.text}</dd></div>)}
            </dl>
            <p data-rise><A className="more" href={DRIVE.more.href}>{DRIVE.more.label}</A></p>
          </div>
        </section>

        <section className="sec people" data-stop="people" id="people">
          <div className="col">
            <h2 className="title" data-rise>{PEOPLE.title}</h2>
            <ul className="coaches">
              {PEOPLE.coaches.map((c) => (
                <li key={c.name} data-rise>
                  <h3>{c.name}</h3>
                  <p className="role">{c.role}</p>
                  <p>{c.bio}</p>
                </li>
              ))}
            </ul>
            <p className="count" data-rise>{PEOPLE.count}</p>
            <p data-rise><A className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>
          </div>
        </section>

        <section className="sec join" data-stop="join" id="join">
          <div className="head">
            <h2 className="title" data-rise>{JOIN.title}</h2>
            <p className="lead" data-rise>{JOIN.lead}</p>
          </div>
          <ol className="ways">
            {JOIN.paths.map((p, i) => (
              <li key={p.id} className={way === i ? 'is-on' : undefined}
                onPointerEnter={(e) => { if (e.pointerType === 'mouse') point(i); }} onPointerLeave={(e) => { if (e.pointerType === 'mouse') point(-1); }}
                onFocus={() => point(i)} onBlur={() => point(-1)} onTouchStart={() => point(i)}>
                <a href={p.href} rel="noopener"><span className="name">{p.name}</span><span className="what">{p.line}</span></a>
                <ul>{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
              </li>
            ))}
          </ol>
          <div className="ground">
            <span className="dot" ref={dot} aria-hidden="true" />
            {!webgl && <span className="flatdot" aria-hidden="true" />}
          </div>
          <div className="after">
            <p>{JOIN.discord}</p>
            <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
            <p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
          </div>
        </section>
      </main>

      <footer className="end">
        <p className="last">{FOOTER.line}</p>
        <ul>{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <ul className="pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <small>Draft 2, version 63. Not the live site.</small>
      </footer>
    </div>
  );
}
