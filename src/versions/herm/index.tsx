// Version 53: the herm. A double herm in a dark gallery, two marble faces looking opposite ways.
// In LD you argue the side you are given. The visitor turns it, and the light hands over.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/index.css';
import './herm.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap } from '@/lib/scroll';
import { Loader } from '@/components/Loader';
import { coarse, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { push, rig } from './rig';

const Scene = lazy(() => import('./Scene'));
const ext = (href: string) => (href.startsWith('http') ? { rel: 'noopener' } : {});

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const Arrow = () => (
  <svg className="arr" viewBox="0 0 26 12" aria-hidden="true"><path d="M0 6h24M19 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
);

const [YES, NO] = (() => { const s = MANIFESTO[3]; const i = s.indexOf('. ') + 1; return [s.slice(0, i), s.slice(i + 1)]; })();

export default function Herm() {
  useVersion('herm');
  const [webgl] = useState(hasWebGL);
  const [lit, setLit] = useState(still || !webgl);
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<string | null>(null);

  // anchors: where each pose sits down the page
  useEffect(() => {
    const el = root.current; if (!el) return;
    const measure = () => {
      const vh = window.innerHeight;
      rig.anchors = [...el.querySelectorAll<HTMLElement>('[data-anchor]')].map((n) => {
        const top = n.getBoundingClientRect().top + window.scrollY;
        // the turn happens while the next part comes up the screen, and is done before you read it
        return { s: top - vh * 0.45, e: top + vh * 0.22, top, v: n.dataset.anchor! };
      });
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  // the hand on the stone
  useEffect(() => {
    const s = stage.current; if (!s || !webgl) return;
    let id = -1, lx = 0, lt = 0, sx = 0, sy = 0, live = false;
    const down = (e: PointerEvent) => { id = e.pointerId; lx = sx = e.clientX; sy = e.clientY; lt = performance.now(); live = false; };
    const move = (e: PointerEvent) => {
      if (!coarse && e.pointerType === 'mouse') rig.lean = (e.clientX / window.innerWidth) * 2 - 1;
      if (e.pointerId !== id) return;
      if (!live) {
        if (Math.abs(e.clientX - sx) < 6 || Math.abs(e.clientX - sx) < Math.abs(e.clientY - sy)) return;
        live = true; rig.drag = true; s.classList.add('is-held');
        try { s.setPointerCapture(id); } catch { /* fine */ }
      }
      const now = performance.now(), dx = e.clientX - lx, dt = Math.max(8, now - lt) / 1000;
      const d = dx * (6.2 / Math.max(700, window.innerWidth));
      rig.user += d; rig.vel = rig.vel * 0.35 + (d / dt) * 0.65;
      lx = e.clientX; lt = now;
    };
    const up = () => { id = -1; live = false; rig.drag = false; s.classList.remove('is-held'); };
    const leave = () => { rig.lean = 0; };
    s.addEventListener('pointerdown', down);
    s.addEventListener('pointermove', move);
    s.addEventListener('pointerup', up);
    s.addEventListener('pointercancel', up);
    s.addEventListener('pointerleave', leave);
    return () => {
      s.removeEventListener('pointerdown', down); s.removeEventListener('pointermove', move);
      s.removeEventListener('pointerup', up); s.removeEventListener('pointercancel', up); s.removeEventListener('pointerleave', leave);
    };
  }, [webgl]);

  // the lights come up once the stone is in the room
  const onLoaded = () => {
    if (still) { rig.intro = 1; setLit(true); return; }
    const wait = () => {
      if (!rig.loaded) { requestAnimationFrame(wait); return; }
      gsap.to(rig, { intro: 1, duration: 3, ease: 'power2.inOut' });
      setTimeout(() => setLit(true), 500);
    };
    wait();
  };
  useEffect(() => { if (!webgl) rig.intro = 1; }, [webgl]);

  return (
    <div ref={root} className={`v-herm${lit ? ' is-lit' : ''}${webgl ? '' : ' no-gl'}`}>
      <a className="skip-x" href="#main">Skip to content</a>
      {webgl && (
        <aside ref={stage} className="stage" aria-label="The herm: a marble pillar with two faces. Drag it to turn it.">
          <Suspense fallback={null}><Scene /></Suspense>
        </aside>
      )}
      {webgl && !still && <Loader onDone={onLoaded} bg="#0c0c0d" ink="#ece8df" font="'Bodoni Moda Variable', serif" />}
      {webgl && still && <LoaderStill onDone={onLoaded} />}

      <header className="top">
        <a className="mark" href="#main" aria-label="Skeptical, top of page">Skeptical</a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </header>

      <main id="main">
        <section className="sec hero side-l" data-anchor="hero" aria-labelledby="h1">
          <div className="spacer" aria-hidden="true" />
          <div className="panel">
            <h1 id="h1" className="h1"><span className="word">Skeptical</span><span className="sr-only-x">{SITE.heading.replace('Skeptical', '')}</span></h1>
            <p className="pitch">{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</p>
            <p className="statement">{HERO.statement.map((l) => <span key={l}>{l}</span>)}</p>
            <div className="doors">
              {HERO.doors.map((d) => <a key={d.label} className="door" href={d.href} {...ext(d.href)}><span>{d.label}</span><Arrow /></a>)}
            </div>
            {webgl && <button type="button" className="turn" onClick={() => push(1, still)}>Turn it. Argue both sides.</button>}
          </div>
        </section>

        <section className="sec creed side-r" data-anchor="creed" aria-label="What we are">
          <div className="spacer" aria-hidden="true" />
          <div className="panel">
            <ol className="lines">
              {MANIFESTO.slice(0, 3).map((l) => <li key={l}>{l}</li>)}
            </ol>
          </div>
        </section>

        <section className="sec yesno" aria-label="The name">
          <div className="yes" data-anchor="yes">
            <div className="spacer" aria-hidden="true" />
            <p className="panel big">{YES}</p>
          </div>
          <div className="no" data-anchor="no">
            <div className="spacer" aria-hidden="true" />
            <p className="panel big">{NO}</p>
          </div>
        </section>

        <section id="record" className="sec record side-l" data-anchor="record" aria-labelledby="h-record">
          <div className="spacer" aria-hidden="true" />
          <div className="panel">
            <h2 id="h-record" className="h2">{RECORD.title}</h2>
            <p className="rule">{RECORD.rule}</p>
            <p className="event"><span>{RECORD.name}</span><span>{RECORD.where}. {RECORD.when}.</span></p>
            <ul className="results">
              {RECORD.results.map((r) => (
                <li key={r.who}>
                  <span className="what">{r.what}</span>
                  <span className="who">{r.who}</span>
                  <span className="more">{r.more}</span>
                </li>
              ))}
            </ul>
            <a className="link" href={RECORD.more.href} {...ext(RECORD.more.href)}>{RECORD.more.label}<Arrow /></a>
          </div>
        </section>

        <section id="drive" className="sec drive side-r" data-anchor="drive" aria-labelledby="h-drive">
          <div className="spacer" aria-hidden="true" />
          <div className="panel">
            <h2 id="h-drive" className="h2">{DRIVE.title}</h2>
            <p className="lead">{DRIVE.lead}</p>
            <dl className="items">
              {DRIVE.items.map((it) => (
                <div key={it.term} className="item">
                  <dt>{it.term}</dt><dd>{it.text}</dd>
                </div>
              ))}
            </dl>
            <a className="link" href={DRIVE.more.href} {...ext(DRIVE.more.href)}>{DRIVE.more.label}<Arrow /></a>
          </div>
        </section>

        <section id="people" className="sec people side-l" data-anchor="people" aria-labelledby="h-people">
          <div className="spacer" aria-hidden="true" />
          <div className="panel">
            <h2 id="h-people" className="h2">{PEOPLE.title}</h2>
            <ul className="coaches">
              {PEOPLE.coaches.map((c) => (
                <li key={c.name}>
                  <h3 className="name">{c.name}</h3>
                  <p className="role">{c.role}</p>
                  <p className="bio">{c.bio}</p>
                </li>
              ))}
            </ul>
            <p className="count">{PEOPLE.count}</p>
            <a className="link" href={PEOPLE.more.href} {...ext(PEOPLE.more.href)}>{PEOPLE.more.label}<Arrow /></a>
          </div>
        </section>

        <section id="join" className="sec join" data-anchor="join" aria-labelledby="h-join">
          <div className="join-top">
            <h2 id="h-join" className="h2 jt">{JOIN.title}</h2>
            <p className="lead jl">{JOIN.lead}</p>
          </div>
          <ul className="paths">
            {JOIN.paths.map((p) => {
              const on = open === p.id;
              return (
                <li key={p.id} className={on ? 'path on' : 'path'}>
                  <h3 className="pname">{p.name}</h3>
                  <p className="pline">{p.line}</p>
                  <p className="ptext">{p.text[0]}</p>
                  <div className="prest" id={`rest-${p.id}`} hidden={!on}>
                    {p.text.slice(1).map((t) => <p key={t}>{t}</p>)}
                  </div>
                  <div className="pact">
                    <a className="go" href={p.href} {...ext(p.href)}>{p.name}<Arrow /></a>
                    <button type="button" className="more-b" aria-expanded={on} aria-controls={`rest-${p.id}`} onClick={() => setOpen(on ? null : p.id)}>{on ? 'Less' : 'The rest'}</button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="join-foot">
            <p>{JOIN.already.before}<a href={JOIN.already.href} {...ext(JOIN.already.href)}>{JOIN.already.label}</a>.</p>
            <p>{JOIN.coach.before}<a href={JOIN.coach.href} {...ext(JOIN.coach.href)}>{JOIN.coach.label}</a>.</p>
            <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
            <p>{JOIN.discord}</p>
          </div>
        </section>
      </main>

      <footer className="foot" data-anchor="end">
        <div className="spacer end-space" aria-hidden="true" />
        <div className="panel">
          <p className="fline">{FOOTER.line}</p>
          <ul className="flinks">
            {FOOTER.links.map((l) => <li key={l.label}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}
          </ul>
          <ul className="fpages">
            {FOOTER.pages.map((l) => <li key={l.label}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}
          </ul>
          <p className="draft">Draft 2, version 53. Not the live site. The heads are the Lee Perry-Smith scan by Infinite Realities, CC BY 3.0, as shipped with three.js.</p>
        </div>
      </footer>
    </div>
  );
}

function LoaderStill({ onDone }: { onDone: () => void }) {
  const done = useRef(onDone);
  useEffect(() => { done.current(); }, []);
  return null;
}
