// Version 77: the maze. Aporia, "no way through": a marble labyrinth with one
// black ball. The page rolls it one ring on per section; you can tilt the
// stone and take it anywhere. At Join it drops into the centre and becomes
// the dot of the question mark.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans';
import './maze.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap } from '@/lib/scroll';
import { Split, useRise } from '@/lib/motion';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { outline } from './path';
import { maze } from './store';

const Stone = lazy(() => import('./Stone'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** The labyrinth from above, drawn flat, for a browser without WebGL. */
function Plan() {
  const d = 'M' + outline().map((p) => `${(p.x * 100).toFixed(1)} ${(p.z * 100).toFixed(1)}`).join('L') + 'Z';
  return (
    <svg className="plan" viewBox="-104 -104 208 208" role="img" aria-label="A round labyrinth with one path to the centre">
      <circle r="100" className="plan-stone" />
      <path d={d} className="plan-cut" />
      <circle cx="6" cy="90" r="2.8" className="plan-ball" />
    </svg>
  );
}

export default function Maze() {
  useVersion('maze');
  const root = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [phone, setPhone] = useState(isPhone);
  const [rest, setRest] = useState(false);
  const [focus, setFocus] = useState(false);
  useRise(root);

  useEffect(() => {
    const on = () => { setPhone(isPhone()); maze.phone = isPhone(); };
    on(); window.addEventListener('resize', on);
    maze.onRest = (r) => setRest(r);
    if (import.meta.env.DEV) (window as unknown as { __maze: unknown }).__maze = maze;
    return () => { window.removeEventListener('resize', on); maze.onRest = null; };
  }, []);

  // Which part of the page is being read: the last one whose top has passed the middle.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const secs = Array.from(el.querySelectorAll<HTMLElement>('[data-stop]'));
    let last = -1;
    const tick = () => {
      const line = window.innerHeight * (isPhone() ? 0.78 : 0.62);
      let s = 0;
      secs.forEach((x, i) => { if (x.getBoundingClientRect().top < line) s = i; });
      s = Math.min(s, 5);
      if (s !== last) { last = s; maze.sec = s; el.dataset.sec = String(s); }
    };
    tick();
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  // The stone answers the pointer: hover leans it, a press leans it further; on a phone, hold then drag.
  useEffect(() => {
    const st = stage.current; if (!st || !webgl || still) return;
    const P = maze.pointer;
    const rel = (x: number, y: number) => { const r = st.getBoundingClientRect(); return { x: x - (r.left + r.width / 2), y: y - (r.top + r.height / 2), inside: x >= r.left && x <= r.right && y >= r.top && y <= r.bottom }; };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const p = rel(e.clientX, e.clientY); P.x = p.x; P.y = p.y; P.on = p.inside && !isPhone();
    };
    const down = (e: PointerEvent) => { if (e.pointerType !== 'mouse' || e.button !== 0) return; e.preventDefault(); const p = rel(e.clientX, e.clientY); P.x = p.x; P.y = p.y; P.down = true; st.classList.add('is-held'); };
    const up = () => { if (P.down && !hold) { P.down = false; st.classList.remove('is-held'); } };
    const leave = () => { P.on = false; };
    let hold = false, timer = 0, sx = 0, sy = 0;
    const tstart = (e: TouchEvent) => {
      const t = e.touches[0]; if (!t || e.touches.length > 1) return;
      sx = t.clientX; sy = t.clientY;
      clearTimeout(timer);
      timer = window.setTimeout(() => { hold = true; const p = rel(sx, sy); P.x = p.x; P.y = p.y; P.down = true; P.on = true; st.classList.add('is-held'); }, 260);
    };
    const tmove = (e: TouchEvent) => {
      const t = e.touches[0]; if (!t) return;
      if (hold) { e.preventDefault(); const p = rel(t.clientX, t.clientY); P.x = p.x; P.y = p.y; return; }
      if (Math.hypot(t.clientX - sx, t.clientY - sy) > 10) clearTimeout(timer);
    };
    const tend = () => { clearTimeout(timer); if (hold) { hold = false; P.down = false; P.on = false; st.classList.remove('is-held'); } };
    window.addEventListener('pointermove', move, { passive: true });
    st.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    document.documentElement.addEventListener('pointerleave', leave);
    st.addEventListener('touchstart', tstart, { passive: true });
    window.addEventListener('touchmove', tmove, { passive: false });
    window.addEventListener('touchend', tend); window.addEventListener('touchcancel', tend);
    return () => {
      window.removeEventListener('pointermove', move); st.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up);
      document.documentElement.removeEventListener('pointerleave', leave);
      st.removeEventListener('touchstart', tstart); window.removeEventListener('touchmove', tmove);
      window.removeEventListener('touchend', tend); window.removeEventListener('touchcancel', tend);
      clearTimeout(timer);
    };
  }, [webgl]);

  const keys = (e: React.KeyboardEvent) => {
    const dir: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const d = dir[e.key]; if (!d || still) return;
    e.preventDefault();
    maze.keys.x = d[0]; maze.keys.z = d[1]; maze.keys.t = performance.now();
  };

  const play = webgl && !still;
  return (
    <div className={`v-maze${phone ? ' is-phone' : ''}${webgl ? '' : ' no-gl'}${rest ? ' is-rest' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>

      {webgl ? (
        <div className="stage" ref={stage} tabIndex={0} role="application" aria-label="The stone. Arrow keys tilt it and roll the ball." onKeyDown={keys} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}>
          <Suspense fallback={null}><Stone /></Suspense>
        </div>
      ) : (
        <div className="stage flat"><Plan /></div>
      )}

      <p className="label" aria-live="polite">
        {rest && play
          ? <button type="button" className="again" onClick={() => { maze.reset++; setRest(false); }}>Roll it again</button>
          : focus ? <span>Arrow keys tilt the stone.</span>
          : <span><em>Aporia:</em> no way through.{play && phone ? ' Hold to tilt.' : ''}</span>}
      </p>

      <header className="top">
        <a className="brand" href="#top" aria-label="Skeptical, back to the top">Skeptical<i>?</i></a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
      </header>

      <main id="main">
        <section className="sec hero" data-stop id="top" aria-label={SITE.heading}>
          <div className="col">
            <h1 className="pitch">{HERO.pitch.map((l, i) => <span key={l} className={i ? 'it' : ''}>{l}</span>)}</h1>
            <p className="statement">{HERO.statement.map((s) => <span key={s}>{s}</span>)}</p>
            <p className="doors">{HERO.doors.map((d) => <A key={d.href} href={d.href}>{d.label}<b aria-hidden="true" /></A>)}</p>
          </div>
        </section>

        <section className="sec say" data-stop aria-label="How the team works">
          <div className="col">
            {MANIFESTO.map((m, i) => <Split as="p" key={m} className={`line l${i}`}>{m}</Split>)}
          </div>
        </section>

        <section className="sec record" data-stop id="record">
          <div className="col">
            <Split as="h2" className="title">{RECORD.title}</Split>
            <p className="lead" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ul className="results">
              {RECORD.results.map((r) => <li data-rise key={r.who}><h3>{r.what}</h3><p><b>{r.who}</b> {r.more}</p></li>)}
            </ul>
            <p data-rise><A className="more" href={RECORD.more.href}>{RECORD.more.label}</A></p>
          </div>
        </section>

        <section className="sec drive" data-stop id="drive">
          <div className="col">
            <Split as="h2" className="title">{DRIVE.title}</Split>
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <dl className="items">
              {DRIVE.items.map((d) => <div key={d.term} data-rise><dt>{d.term}</dt><dd>{d.text}</dd></div>)}
            </dl>
            <p data-rise><A className="more" href={DRIVE.more.href}>{DRIVE.more.label}</A></p>
          </div>
        </section>

        <section className="sec people" data-stop id="people">
          <div className="col">
            <Split as="h2" className="title">{PEOPLE.title}</Split>
            <ul className="coaches">
              {PEOPLE.coaches.map((c) => <li key={c.name} data-rise><h3>{c.name}</h3><p className="role">{c.role}</p><p>{c.bio}</p></li>)}
            </ul>
            <p className="count" data-rise>{PEOPLE.count}</p>
            <p data-rise><A className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>
          </div>
        </section>

        <section className="sec join" data-stop id="join">
          <div className="col">
            <Split as="h2" className="title">{JOIN.title}</Split>
            <p className="lead" data-rise>{JOIN.lead}</p>
          </div>
          <div className="field">
            <ol className="ways">
              {JOIN.paths.map((p) => (
                <li key={p.id} data-rise>
                  <h3><A href={p.href}>{p.name}<b aria-hidden="true" /></A></h3>
                  <p className="line">{p.line}</p>
                  {p.text.map((t) => <p key={t}>{t}</p>)}
                </li>
              ))}
            </ol>
            <div className="after" data-rise>
              <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A></p>
              <p>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A></p>
              <p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
              <p>{JOIN.discord}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <p className="fline">{FOOTER.line}</p>
        <nav aria-label="Elsewhere" className="links">{FOOTER.links.map((l) => <A key={l.href} href={l.href}>{l.label}</A>)}</nav>
        <nav aria-label="Pages" className="pages">{FOOTER.pages.map((l) => <A key={l.href} href={l.href}>{l.label}</A>)}</nav>
        <p className="small">Draft 2, version 77. Not the live site.</p>
      </footer>
    </div>
  );
}
