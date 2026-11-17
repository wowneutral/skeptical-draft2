// Version 94: the arrow. A bronze arrow in a dark gallery, a short way from a
// plaster target. Before it can arrive it must cover half the distance, then
// half of what is left. Every section halves the gap; it never lands.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/index.css';
import './arrow.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap } from '@/lib/scroll';
import { Split, useRise } from '@/lib/motion';
import { clamp, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { MAX, rig, want } from './rig';

const Stage = lazy(() => import('./Stage'));

/** How many halvings each section asks for. Join closes in further; the footer pulls all the way back. */
const LEVELS: Record<string, number> = { top: 0, said: 1, record: 2, drive: 3, people: 4, join: 7, end: 0 };

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** A drawn arrow for links: on hover it travels half the way to the word. */
const Dart = () => (
  <svg className="dart" viewBox="0 0 48 12" aria-hidden="true"><path d="M0 6h40M33 1l8 5-8 5" /></svg>
);

const Go = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
  <a className={`go${className ? ' ' + className : ''}`} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>
    <Dart /><span>{children}</span>
  </a>
);

/** The fraction of the first gap still left: 1, 1/2, 1/4 ... */
function Fraction({ n }: { n: number }) {
  return (
    <span className="frac" aria-hidden="true">
      {n === 0 ? <b className="one">1</b> : <><b>1</b><i className="bar" /><b>{(2 ** n).toLocaleString('en-US')}</b></>}
    </span>
  );
}

/** Line drawing for a browser with no WebGL. */
function Flat({ tall }: { tall: boolean }) {
  return (
    <svg className="flat" viewBox="0 0 400 400" role="img" aria-label="An arrow in flight, a short way from a plaster target">
      <g transform={tall ? 'rotate(90 200 200)' : undefined}>
        <ellipse cx="318" cy="200" rx="26" ry="96" className="disc" />
        <ellipse cx="318" cy="200" rx="13" ry="48" className="ring" />
        <path className="shaft" d="M40 200H212" />
        <path className="head" d="M240 200l-36-12 6 12-6 12z" />
        <path className="fin" d="M40 200l-18-16h34zM40 200l-18 16h34z" />
      </g>
    </svg>
  );
}

export default function Arrow() {
  useVersion('arrow');
  const root = useRef<HTMLDivElement>(null), status = useRef<HTMLParagraphElement>(null);
  const [tall, setTall] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const [step, setStep] = useState(0);
  const [lit, setLit] = useState(still || !webgl);
  useRise(root);

  useEffect(() => {
    const on = () => setTall(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // The reached step, shown as a fraction under the frame.
  useEffect(() => {
    let last = -1;
    rig.onStep = (n) => { if (n !== last) { last = n; setStep(n); } };
    return () => { rig.onStep = null; };
  }, []);

  // Which section is being read decides how many halvings the arrow owes.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const secs = Array.from(el.querySelectorAll<HTMLElement>('[data-at]'));
    let last = '';
    const tick = () => {
      const line = window.innerHeight * (isPhone() ? 0.72 : 0.55);
      let at = 'top';
      for (const s of secs) if (s.getBoundingClientRect().top < line) at = s.dataset.at!;
      if (at !== last) {
        last = at;
        rig.level = LEVELS[at] ?? 0;
        rig.glow = at === 'join' ? 1 : 0;
        if (at === 'end' || at === 'top') rig.clicks = 0;
        el.dataset.at = at;
        if (!webgl || still) setStep(want());
      }
    };
    tick();
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [webgl]);

  // Press the arrow: it lunges half the gap again. Drag: turn the pair to see the gap from the side.
  const drag = useRef({ id: -1, x: 0, y: 0, moved: false, yaw: 0, pitch: 0 });
  const push = () => {
    if (want() >= MAX) rig.clicks = 0; else rig.clicks++;
    const n = want();
    if (!webgl || still) setStep(n);
    if (status.current) status.current.textContent = n === 0 ? 'Back to the first frame.' : `Half again. 1 in ${(2 ** n).toLocaleString('en-US')} of the gap is left.`;
  };
  const down = (e: React.PointerEvent) => {
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, yaw: rig.yaw, pitch: rig.pitch };
    rig.held = true;
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; if (d.id !== e.pointerId) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) { d.moved = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
    if (!d.moved && e.pointerType !== 'touch' && Math.abs(dy) > 6) { d.moved = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
    if (!d.moved) return;
    const w = (e.currentTarget as HTMLElement).clientWidth;
    rig.yaw = clamp(d.yaw + (dx / w) * 2.2, -0.95, 0.5);
    if (e.pointerType !== 'touch') rig.pitch = clamp(d.pitch - (dy / w) * 1.4, -0.35, 0.45);
  };
  const up = (e: React.PointerEvent) => {
    const d = drag.current; if (d.id !== e.pointerId) return;
    d.id = -1; rig.held = false; rig.releasedAt = performance.now();
    if (d.moved) { e.preventDefault(); return; }
  };
  const click = (e: React.MouseEvent) => {
    if (drag.current.moved) { drag.current.moved = false; e.preventDefault(); return; }
    push();
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      rig.yaw = clamp(rig.yaw + (e.key === 'ArrowLeft' ? -0.3 : 0.3), -0.95, 0.5); rig.releasedAt = performance.now();
    }
  };

  const play = webgl && !still;
  return (
    <div className={`v-arrow${tall ? ' is-tall' : ''}${webgl ? '' : ' no-gl'}${lit ? ' is-lit' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>

      <aside className="stage" aria-label="The arrow and the target">
        <div className="frame">
          {webgl ? (
            <Suspense fallback={null}><Stage tall={tall} low={tall} onReady={() => setTimeout(() => setLit(true), 300)} /></Suspense>
          ) : <Flat tall={tall} />}
          {webgl && (
            <button
              type="button" className="hit" aria-label="Push the arrow half the remaining gap. Left and right arrow keys turn it."
              onPointerEnter={(e) => { if (e.pointerType === 'mouse') rig.hover = true; }} onPointerLeave={() => { rig.hover = false; }} onFocus={() => { rig.hover = true; }} onBlur={() => { rig.hover = false; }}
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClick={click} onKeyDown={key}
            />
          )}
        </div>
        <div className="label">
          <p className="how">{play ? (tall ? 'Tap the arrow. Drag to turn it.' : 'Press the arrow. Drag to turn it.') : 'Half the distance first.'}</p>
          <p className="left"><span className="sr-only-x">Gap left:</span><Fraction n={step} /></p>
        </div>
        <p className="sr-only-x" role="status" ref={status} />
      </aside>

      <div className="col">
        <header className="top">
          <a className="brand" href="#top" aria-label="Skeptical, back to the first frame">Skeptical<i>?</i></a>
          <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
        </header>

        <main id="main">
          <section className="sec hero" id="top" data-at="top" aria-label={SITE.heading}>
            <Split as="h1" className="pitch" on="load" delay={0.5}>{HERO.pitch.join(' ')}</Split>
            <p className="statement" data-rise>{HERO.statement.map((s) => <span key={s}>{s}</span>)}</p>
            <p className="doors" data-rise>{HERO.doors.map((d) => <Go key={d.href} href={d.href}>{d.label}</Go>)}</p>
          </section>

          <section className="sec said" data-at="said" aria-label="How the team works">
            <ol className="lines">
              {MANIFESTO.map((m, i) => <li key={m} data-rise><Fraction n={i + 1} /><Split as="p">{m}</Split></li>)}
            </ol>
          </section>

          <section className="sec record" id="record" data-at="record">
            <Split as="h2" className="title">{RECORD.title}</Split>
            <p className="rule" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise><span>{RECORD.when}</span><b>{RECORD.name}</b><span>{RECORD.where}</span></p>
            <ul className="results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <h3>{r.what}</h3>
                  <p><b>{r.who}</b> {r.more}</p>
                </li>
              ))}
            </ul>
            <p data-rise><Go href={RECORD.more.href}>{RECORD.more.label}</Go></p>
          </section>

          <section className="sec drive" id="drive" data-at="drive">
            <Split as="h2" className="title">{DRIVE.title}</Split>
            <p className="rule" data-rise>{DRIVE.lead}</p>
            <dl className="items">
              {DRIVE.items.map((d) => (
                <div key={d.term} data-rise><dt>{d.term}</dt><dd>{d.text}</dd></div>
              ))}
            </dl>
            <p data-rise><Go href={DRIVE.more.href}>{DRIVE.more.label}</Go></p>
          </section>

          <section className="sec people" id="people" data-at="people">
            <Split as="h2" className="title">{PEOPLE.title}</Split>
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
            <p data-rise><Go href={PEOPLE.more.href}>{PEOPLE.more.label}</Go></p>
          </section>

          <section className="sec join" id="join" data-at="join">
            <Split as="h2" className="title">{JOIN.title}</Split>
            <p className="rule" data-rise>{JOIN.lead}</p>
            <ol className="paths">
              {JOIN.paths.map((p) => (
                <li key={p.id} data-rise>
                  <a className="path" href={p.href} rel="noopener">
                    <span className="name">{p.name}</span>
                    <span className="line">{p.line}</span>
                    <Dart />
                  </a>
                  <ul className="more-lines">{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
                </li>
              ))}
            </ol>
            <div className="also" data-rise>
              <p>{JOIN.already.before}<a href={JOIN.already.href} rel="noopener">{JOIN.already.label}</a></p>
              <p>{JOIN.coach.before}<a href={JOIN.coach.href} rel="noopener">{JOIN.coach.label}</a></p>
              <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
              <p>{JOIN.discord}</p>
            </div>
          </section>
        </main>

        <footer className="sec end" data-at="end">
          <p className="last">{FOOTER.line}</p>
          <a className="again" href="#top"><Dart /><span>Back to the first frame</span></a>
          <ul className="links">{FOOTER.links.map((l) => <li key={l.href}><a href={l.href} rel={l.href.startsWith('http') ? 'noopener' : undefined}>{l.label}</a></li>)}</ul>
          <ul className="pages">{FOOTER.pages.map((l) => <li key={l.href}><a href={l.href} rel="noopener">{l.label}</a></li>)}</ul>
          <p className="draft">Draft 2, version 94. Not the live site.</p>
        </footer>
      </div>
    </div>
  );
}
