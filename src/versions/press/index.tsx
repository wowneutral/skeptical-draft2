// Version 46: the press. One piece of metal type with the question mark cast
// backwards on its face. The visitor prints it the right way round; scrolling
// tilts the camera down onto the sheet, and the rest of the site is that sheet.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/index.css';
import './press.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { scroll } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { clamp, smooth, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { drawPrint, M } from './geo';
import { st } from './store';

const Scene = lazy(() => import('./Scene'));

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

const VB = `${-M.w / 2} ${-M.h / 2} ${M.w} ${M.h}`;
const Mark = ({ flip = false, className }: { flip?: boolean; className?: string }) => (
  <svg className={className} viewBox={VB} aria-hidden="true" focusable="false">
    <path d={M.d} transform={flip ? 'scale(-1,1)' : undefined} />
  </svg>
);

/** Paint one impression into a canvas, centred. */
function paintOne(c: HTMLCanvasElement | null, ink: number, seed: number) {
  if (!c) return;
  const g = c.getContext('2d'); if (!g) return;
  g.clearRect(0, 0, c.width, c.height);
  drawPrint(g, c.width / 2, c.height / 2, c.height * 0.86, 0, ink, seed);
}

export default function Press() {
  useVersion('press');
  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  const under = useRef<HTMLDivElement>(null);
  const proofs = useRef<HTMLCanvasElement>(null);
  const last = useRef<HTMLCanvasElement>(null);
  const recordMark = useRef<HTMLSpanElement>(null);
  const joinSlot = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [inked, setInked] = useState(false);
  useRise(root);

  // The scroll: hero text leaves, the bone comes up as the camera looks down onto the sheet.
  useEffect(() => {
    let id = 0;
    const tick = () => {
      const p = clamp(scroll.y / window.innerHeight);
      if (hero.current) { hero.current.style.opacity = String(1 - smooth(clamp(p / 0.38))); hero.current.style.transform = `translateY(${-p * 60}px)`; }
      if (under.current) under.current.style.opacity = String(webgl ? smooth(clamp((p - 0.78) / 0.2)) : smooth(clamp((p - 0.3) / 0.6)));
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, [webgl]);

  // The broadside shows the visitor's own proofs and the last impression.
  useEffect(() => {
    const draw = () => {
      const c = proofs.current;
      if (c) {
        const g = c.getContext('2d')!;
        g.clearRect(0, 0, c.width, c.height);
        if (st.inkLayer && st.prints && !still) {
          const L = st.inkLayer, k = Math.min(c.width / L.width, c.height / L.height);
          g.drawImage(L, (c.width - L.width * k) / 2, (c.height - L.height * k) / 2, L.width * k, L.height * k);
        } else paintOne(c, 1, 1);
      }
      paintOne(last.current, st.prints ? st.lastInk : 1, st.prints || 1);
    };
    st.onPrint = () => { draw(); setInked(true); };
    draw();
    return () => { st.onPrint = null; };
  }, []);

  // The record: the sort prints the section's mark in the margin by itself.
  useEffect(() => {
    st.recordMark = recordMark.current; st.joinSlot = joinSlot.current;
    const el = recordMark.current; if (!el) return;
    if (still || !webgl) { el.classList.add('is-printed'); return; }
    const io = new IntersectionObserver((es) => {
      if (es[0].isIntersecting && st.stamp < 0) { st.stamp = performance.now(); io.disconnect(); }
    }, { rootMargin: '-30% 0px -30% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [webgl]);

  // The hand: tap or click to print, drag the sort through the ink, click the slab to ink it.
  const down = useRef<{ x: number; y: number; hit: string; moved: boolean } | null>(null);
  const ndc = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 };
  };
  const busy = () => (st.press >= 0) || (st.auto >= 0);
  const press = () => { if (!busy() && !still) st.press = performance.now(); };
  const onDown = (e: React.PointerEvent) => {
    const n = ndc(e); st.pointer.x = n.x; st.pointer.y = n.y;
    down.current = { x: e.clientX, y: e.clientY, hit: st.hit(n.x, n.y), moved: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const n = ndc(e); st.pointer.x = n.x; st.pointer.y = n.y; st.pointer.inside = true;
    const d = down.current;
    if (d && !d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 7) {
      d.moved = true;
      if (d.hit === 'sort' && !busy()) { st.drag = true; try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* fine */ } }
    }
  };
  const onUp = () => {
    const d = down.current; down.current = null;
    if (st.drag) { st.drag = false; return; }
    if (!d || d.moved) return;
    if (d.hit === 'slab') { if (!busy()) st.auto = performance.now(); }
    else press();
  };
  const onCancel = () => { down.current = null; st.drag = false; };
  const reink = () => { if (!busy() && !still) st.auto = performance.now(); };

  return (
    <div className="v-press" ref={root}>
      <a className="skip-x" href="#main">Skip to the sheet</a>

      {webgl && (
        <div className="pr-canvas" aria-hidden="true">
          <Suspense fallback={null}><Scene /></Suspense>
        </div>
      )}

      <header className="pr-top" id="top">
        <div className="pr-stick">
          {webgl && (
            <button type="button" className="pr-hit" aria-label="Print the question mark"
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancel}
              onPointerLeave={() => { st.pointer.inside = false; }}
              onClick={(e) => { if (e.detail === 0) press(); }} />
          )}
          {!webgl && (
            <div className="pr-flat" aria-hidden="true">
              <div className="pr-flat-face"><Mark flip /></div>
              <Mark className="pr-flat-print" />
            </div>
          )}
          <div className="pr-hero" ref={hero}>
            <h1 className="pr-h1">{SITE.name}<span className="sr-only-x">: an independent Lincoln-Douglas debate team</span></h1>
            <p className="pr-pitch">{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</p>
            <nav className="pr-doors" aria-label="Two ways in">
              {HERO.doors.map((d) => <A key={d.href} className="pr-door" href={d.href}>{d.label}</A>)}
            </nav>
            {webgl && (
              <p className="pr-hint">
                {still ? 'The mark is cast backwards.' : inked ? 'Again. Each print is lighter.' : 'Press the sort. It prints.'}
                {!still && <button type="button" className="pr-reink" onClick={reink}>Ink it</button>}
              </p>
            )}
          </div>
          <div className="pr-under" ref={under} />
        </div>
      </header>

      <main id="main" className="pr-sheet">
        <section className="pr-mast" aria-label="Statement">
          <h2 className="pr-statement">{HERO.statement.map((l) => <span key={l} data-rise>{l}</span>)}</h2>
          <figure className="pr-proofs" data-rise>
            <canvas ref={proofs} width={900} height={1200} aria-label="Your prints from the sheet above" role="img" />
            <figcaption>{inked ? 'Your proofs.' : 'The proof.'}</figcaption>
          </figure>
        </section>

        <section className="pr-manifesto" aria-label="What we are">
          {MANIFESTO.map((l) => <p key={l} data-rise>{l}</p>)}
        </section>

        <section className="pr-sec pr-record" id="record" aria-labelledby="h-record">
          <div className="pr-margin">
            <span className="pr-stamp" ref={recordMark}><Mark /></span>
          </div>
          <div className="pr-body">
            <h2 className="pr-h2" id="h-record" data-rise>{RECORD.title}</h2>
            <p className="pr-rule" data-rise>{RECORD.rule}</p>
            <p className="pr-event" data-rise><span>{RECORD.when}.</span> <span>{RECORD.name}.</span> <span>{RECORD.where}.</span></p>
            <ol className="pr-results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <span className="pr-who">{r.who}</span>
                  <span className="pr-what">{r.what}.</span>
                  <span className="pr-more">{r.more}</span>
                </li>
              ))}
            </ol>
            <A className="pr-link" href={RECORD.more.href}>{RECORD.more.label}</A>
          </div>
        </section>

        <section className="pr-sec pr-drive" id="drive" aria-labelledby="h-drive">
          <div className="pr-margin"><span className="pr-fig">{DRIVE.items.length}</span></div>
          <div className="pr-body">
            <h2 className="pr-h2" id="h-drive" data-rise>{DRIVE.title}</h2>
            <p className="pr-lead" data-rise>{DRIVE.lead}</p>
            <dl className="pr-items">
              {DRIVE.items.map((it) => (
                <div key={it.term} data-rise><dt>{it.term}</dt><dd>{it.text}</dd></div>
              ))}
            </dl>
            <A className="pr-link" href={DRIVE.more.href}>{DRIVE.more.label}</A>
          </div>
        </section>

        <section className="pr-sec pr-people" id="people" aria-labelledby="h-people">
          <div className="pr-margin"><span className="pr-fig">8</span></div>
          <div className="pr-body">
            <h2 className="pr-h2" id="h-people" data-rise>{PEOPLE.title}</h2>
            <div className="pr-coaches">
              {PEOPLE.coaches.map((c) => (
                <article key={c.name} data-rise>
                  <h3>{c.name}</h3>
                  <p className="pr-role">{c.role}</p>
                  <p>{c.bio}</p>
                </article>
              ))}
            </div>
            <p className="pr-count" data-rise>{PEOPLE.count}</p>
            <A className="pr-link" href={PEOPLE.more.href}>{PEOPLE.more.label}</A>
          </div>
        </section>

        <section className="pr-sec pr-join" id="join" aria-labelledby="h-join">
          <div className="pr-body pr-join-body">
            <div className="pr-pair">
              <div className="pr-join-head">
                <h2 className="pr-h2 pr-h2-big" id="h-join" data-rise>{JOIN.title}</h2>
                <p className="pr-lead" data-rise>{JOIN.lead}</p>
              </div>
              <div className="pr-pair-art">
                <canvas ref={last} className="pr-last" width={480} height={640} aria-label="The last print, the right way round" role="img" />
                <div className="pr-slot" ref={joinSlot}>
                  {(!webgl || still) && <div className="pr-slot-face"><Mark flip /></div>}
                </div>
              </div>
            </div>
            <ol className="pr-paths">
              {JOIN.paths.map((p) => (
                <li key={p.id} id={`path-${p.id}`} data-rise>
                  <h3>{p.name}</h3>
                  <p className="pr-line">{p.line}</p>
                  {p.text.map((t) => <p key={t}>{t}</p>)}
                  <A className="pr-go" href={p.href}>Apply<span className="sr-only-x"> to {p.name.toLowerCase()}</span></A>
                </li>
              ))}
            </ol>
            <div className="pr-also">
              <p>{JOIN.already.before}<A className="pr-link-in" href={JOIN.already.href}>{JOIN.already.label}</A>.</p>
              <p>{JOIN.coach.before}<A className="pr-link-in" href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
              <p>{JOIN.also} <A className="pr-link-in" href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
              <p>{JOIN.discord} <A className="pr-link-in" href={SITE.discord}>Discord</A>.</p>
            </div>
          </div>
        </section>

        <footer className="pr-foot">
          <p className="pr-foot-line">{FOOTER.line}</p>
          <ul className="pr-foot-links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul className="pr-foot-pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <p className="pr-draft">Draft 2, version 46. Not the live site.</p>
        </footer>
      </main>
    </div>
  );
}
