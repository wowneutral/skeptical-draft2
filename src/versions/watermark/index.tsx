// Version 93: the watermark. A sheet of bone paper with SKEPTICAL printed on it.
// Hold it up to the lamp and a question mark shows inside the paper itself.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/index.css';
import './watermark.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import MARKS from '@/lib/marks.json';
import { useRise } from '@/lib/motion';
import { clamp, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { st, type Pose } from './state';

const Stage = lazy(() => import('./Stage'));

const A = ({ href, className, children, onFocus, onBlur, onEnter, onLeave }: { href: string; className?: string; children: React.ReactNode; onFocus?: () => void; onBlur?: () => void; onEnter?: () => void; onLeave?: () => void }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined} onFocus={onFocus} onBlur={onBlur} onMouseEnter={onEnter} onMouseLeave={onLeave}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** Each section says how the sheet should sit while it is on screen. */
const pose = (p: Partial<Pose>) => JSON.stringify({ lift: 0, side: 1, cover: 0, bright: 0, up: 0, zoom: 1, ...p });

/** The question mark as it shows without WebGL: a flat sheet, the mark in the paper. */
function FlatSheet() {
  const m = MARKS.roman;
  return (
    <div className="wm-flat" aria-hidden="true">
      <div className="wm-flat-sheet">
        <span className="wm-flat-word">SKEPTICAL</span>
        <svg viewBox={`${-m.w / 2} ${-m.h / 2} ${m.w} ${m.h}`}><path d={m.d} /></svg>
      </div>
    </div>
  );
}

export default function Watermark() {
  useVersion('watermark');
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [pinned, setPinned] = useState(false);
  useRise(root);

  useEffect(() => { st.pinned = pinned ? 1 : 0; }, [pinned]);

  // Measure each section once it is laid out: where its pose holds, and where it hands over.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const measure = () => {
      st.phone = isPhone();
      const vh = window.innerHeight;
      const secs = Array.from(el.querySelectorAll<HTMLElement>('[data-pose]'));
      st.keys = secs.map((s, i) => {
        const r = s.getBoundingClientRect(), top = r.top + window.scrollY;
        const p = JSON.parse(s.dataset.pose!) as Pose;
        // on a phone the sheet shows in the gap at the head of each section, so it holds while that gap is on screen
        const hold = s.dataset.hold ? +s.dataset.hold : null;
        const a = i === 0 ? 0 : st.phone ? top - vh * 0.55 : top - vh * 0.3;
        const b = i === 0 ? 0 : Math.max(a, st.phone ? top + vh * 0.05 : hold !== null ? top + vh * hold : top + r.height - vh * 0.75);
        return { ...p, a, b };
      });
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    window.addEventListener('resize', measure);
    document.fonts.ready.then(measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  // The pointer moves the lamp. A mouse drag on the page lifts the sheet.
  useEffect(() => {
    let y0 = 0, h0 = 0;
    const move = (e: PointerEvent) => {
      st.px = clamp((e.clientX / window.innerWidth) * 2 - 1, -1, 1);
      st.py = clamp(-((e.clientY / window.innerHeight) * 2 - 1), -1, 1);
      st.moved = performance.now() / 1000;
      if (st.dragging) st.hold = clamp(h0 + (y0 - e.clientY) / (window.innerHeight * 0.45), -1, 1);
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || still) return;
      const t = e.target as HTMLElement;
      if (t.closest('a,button,input,label,p,li,dd,dt,h2,h3,blockquote')) return;
      st.dragging = true; y0 = e.clientY; h0 = st.hold;
      document.documentElement.classList.add('wm-grabbing');
      e.preventDefault();
    };
    const up = () => { st.dragging = false; document.documentElement.classList.remove('wm-grabbing'); };
    const touch = (e: TouchEvent) => {
      const p = e.touches[0]; if (!p) return;
      st.px = clamp((p.clientX / window.innerWidth) * 2 - 1, -1, 1);
      st.py = clamp(-((p.clientY / window.innerHeight) * 2 - 1), -1, 1);
      st.moved = performance.now() / 1000;
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('touchmove', touch, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      window.removeEventListener('touchmove', touch);
    };
  }, []);

  const aim = (i: number | null) => () => { st.aim = i; };
  const lead = DRIVE.lead.split('. ');

  return (
    <div className="v-watermark" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <div className="wm-stage" aria-hidden="true">
        {webgl ? <Suspense fallback={null}><Stage line={HERO.pitch[0]} /></Suspense> : <FlatSheet />}
      </div>

      <header className="wm-top">
        <a className="wm-mark" href="#main">Skeptical<span className="sr-only-x">, to the top</span></a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </header>

      <main id="main">
        <section className="wm-hero" data-pose={pose({ side: 0 })} aria-labelledby="wm-h1">
          <h1 id="wm-h1" className="sr-only-x">{SITE.heading}</h1>
          <div className="wm-hero-pitch">
            {HERO.pitch.map((l) => <p key={l}>{l}</p>)}
            <div className="wm-doors">
              {HERO.doors.map((d) => <A key={d.href} href={d.href} className="wm-door">{d.label}</A>)}
            </div>
            <button type="button" className="wm-hold" aria-pressed={pinned} onClick={() => setPinned((v) => !v)}>
              <span>{pinned ? 'Set it down.' : 'Hold it up to the light.'}</span>
            </button>
          </div>
        </section>

        <section className="wm-sec wm-statement" data-pose={pose({ lift: 1 })} aria-label="What we are">
          <div className="wm-field">
            {HERO.statement.map((l) => <p key={l} className="wm-huge" data-rise>{l}</p>)}
          </div>
        </section>

        <section className="wm-sec" data-pose={pose({ lift: 0 })} aria-label="Manifesto">
          <div className="wm-field">
            <ol className="wm-manifesto">
              {MANIFESTO.map((l) => <li key={l} data-rise>{l}</li>)}
            </ol>
          </div>
        </section>

        <section id="record" className="wm-sec" data-pose={pose({ lift: 1, bright: 0.3 })} aria-labelledby="wm-record">
          <div className="wm-field">
            <h2 id="wm-record" className="wm-title" data-rise>{RECORD.title}</h2>
            <p className="wm-rule" data-rise>{RECORD.rule}</p>
            <p className="wm-event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ul className="wm-results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <span className="wm-who">{r.who}</span>
                  <span className="wm-what">{r.what}</span>
                  <span className="wm-more-line">{r.more}</span>
                </li>
              ))}
            </ul>
            <A className="wm-link" href={RECORD.more.href}>{RECORD.more.label}</A>
          </div>
        </section>

        <section id="drive" className="wm-sec" data-pose={pose({ lift: 1, cover: 1 })} aria-labelledby="wm-drive">
          <div className="wm-field">
            <h2 id="wm-drive" className="wm-title" data-rise>{DRIVE.title}</h2>
            <p className="wm-lead" data-rise>{lead.slice(0, -1).map((l) => l + '. ').join('')}<strong>{lead[lead.length - 1]}</strong></p>
            <dl className="wm-drive">
              {DRIVE.items.map((d) => (
                <div key={d.term} data-rise><dt>{d.term}</dt><dd>{d.text}</dd></div>
              ))}
            </dl>
            <A className="wm-link" href={DRIVE.more.href}>{DRIVE.more.label}</A>
          </div>
        </section>

        <section id="people" className="wm-sec" data-pose={pose({ lift: 0 })} aria-labelledby="wm-people">
          <div className="wm-field">
            <h2 id="wm-people" className="wm-title" data-rise>{PEOPLE.title}</h2>
            <div className="wm-coaches">
              {PEOPLE.coaches.map((c) => (
                <article key={c.name} data-rise>
                  <h3>{c.name}</h3>
                  <p className="wm-role">{c.role}</p>
                  <p>{c.bio}</p>
                </article>
              ))}
            </div>
            <p className="wm-count" data-rise>{PEOPLE.count}</p>
            <A className="wm-link" href={PEOPLE.more.href}>{PEOPLE.more.label}</A>
          </div>
        </section>

        <section id="join" className="wm-join" data-hold="0.3" data-pose={pose({ lift: 1, side: 0, bright: 1, up: 0.2, zoom: 0.78 })} aria-labelledby="wm-join">
          <div className="wm-join-head">
            <h2 id="wm-join" className="wm-title wm-join-title">{JOIN.title}</h2>
            <p className="wm-join-lead">{JOIN.lead}</p>
          </div>
          <div className="wm-join-body">
            <ol className="wm-paths">
              {JOIN.paths.map((p, i) => (
                <li key={p.id}>
                  <A href={p.href} className="wm-path" onFocus={aim(i - 1)} onBlur={aim(null)} onEnter={aim(i - 1)} onLeave={aim(null)}>
                    <span className="wm-path-name">{p.name}</span>
                    <span className="wm-path-line">{p.line}</span>
                  </A>
                  <ul className="wm-path-text">
                    {p.text.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                </li>
              ))}
            </ol>
            <div className="wm-after">
              <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A></p>
              <p>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A></p>
              <p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
              <p>{JOIN.discord}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="wm-foot" data-pose={pose({ lift: 0, side: 0, up: 0.2, zoom: 0.75 })}>
        <p className="wm-foot-line">{FOOTER.line}</p>
        <div className="wm-foot-cols">
          <ul aria-label="Elsewhere">
            {FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}
          </ul>
          <ul aria-label="Pages">
            {FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}
          </ul>
        </div>
        <p className="wm-small">Draft 2, version 93. Not the live site. Paper, lamp and mark drawn in code for this page.</p>
      </footer>
    </div>
  );
}
