// Version 60: the loop. A porcelain band with one side, the line printed round it.
// Drag the band to run the line; scroll and it turns to each section and prints its sentence.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/wdth.css';
import './loop.css';
import { DRIVE, FOOTER, HERO, JOIN, MANIFESTO, NAV, PEOPLE, RECORD, SITE } from '@/content';
import MARKS from '@/lib/marks.json';
import { gsap } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { clamp, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { S } from './band';

const Scene = lazy(() => import('./Scene'));

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

const Mark = () => (
  <svg className="qm" viewBox={`-470 -770 ${MARKS.italic.w} ${MARKS.italic.h}`} aria-hidden="true"><path d={MARKS.italic.d} /></svg>
);

/** Without WebGL, or before it: the statement set round a plain ring. */
function FlatRing() {
  return (
    <svg className="flat" viewBox="0 0 400 400" role="img" aria-label={HERO.statement.join(' ')}>
      <defs><path id="loop-ring" d="M200,60 a140,140 0 1,1 -0.1,0" /></defs>
      <circle cx="200" cy="200" r="140" fill="none" stroke="currentColor" strokeWidth="44" opacity="0.92" />
      <text><textPath href="#loop-ring" startOffset="0">{HERO.statement.join('  ')}</textPath></text>
    </svg>
  );
}

export default function Loop() {
  useVersion('loop');
  const root = useRef<HTMLDivElement>(null), stageEl = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  useRise(root);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // Where each stop sits on the page, and which one is being read.
  useEffect(() => {
    const el = root.current; if (!el) return;
    let tops: number[] = [], hs: number[] = [];
    const stops = Array.from(el.querySelectorAll<HTMLElement>('[data-stop]'));
    const mani = el.querySelector<HTMLElement>('[data-mani]');
    const measure = () => {
      tops = stops.map((s) => s.getBoundingClientRect().top + window.scrollY);
      hs = stops.map((s) => s.getBoundingClientRect().height);
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    document.fonts.ready.then(measure);
    let lastOn = -1, lastStop = -1;
    const tick = () => {
      const vh = window.innerHeight, y = window.scrollY, read = y + vh * (isPhone() ? 0.42 : 0.5);
      let i = 0;
      for (let k = 0; k < tops.length; k++) if (read >= tops[k]) i = k;
      const local = clamp((read - tops[i]) / Math.max(1, hs[i]));
      // The very top holds the opening pose; the last stop holds once it is reached.
      S.f = still ? 0 : i === 0 ? Math.min(local, 0.79) : i + local;
      if (i === tops.length - 1) S.f = Math.max(S.f, i + 0.2);
      if (!still) S.line = i;
      // The camera moves while the next section's top crosses the lower half of the screen.
      let pf = 0;
      const T = vh * 0.3;
      for (let k = 1; k < tops.length; k++) {
        const c = tops[k] - vh * 0.2;
        if (read >= c + T) pf = k;
        else { if (read > c - T) { const u = (read - (c - T)) / (2 * T); pf = k - 1 + u * u * (3 - 2 * u); } break; }
      }
      S.pf = still ? 0 : pf;
      const mi = 1;
      S.follow = clamp((y - tops[mi]) / Math.max(1, hs[mi] - vh));
      if (still) S.follow = 0;
      const on = Math.min(3, Math.floor(clamp((y - tops[mi] + vh * 0.35) / Math.max(1, hs[mi] - vh * 0.5)) * 4));
      if (mani && on !== lastOn) { lastOn = on; mani.dataset.on = String(still ? 3 : on); }
      if (i !== lastStop) { lastStop = i; el.dataset.at = String(i); }
      {
        S.track = stops.map((s, k) => {
          if (k < 5) return null;
          const w = s.querySelector<HTMLElement>('.win'); if (!w) return null;
          const b = w.getBoundingClientRect();
          return { x: (b.left + b.width / 2) / window.innerWidth, y: (b.top + b.height / 2) / vh };
        });
      }
      if (isPhone()) {
        // The band lives in whichever window is nearest the top third of the screen.
        let best = Infinity, by = 0.27;
        for (const s of stops) {
          const w = s.querySelector<HTMLElement>('.win'); if (!w) continue;
          const b = w.getBoundingClientRect(); const c = b.top + b.height / 2;
          const d = Math.abs(c - vh * 0.3); if (d < best) { best = d; by = c / vh; }
        }
        S.phoneY = by;
      } else S.phoneY = -9;
      const r = S.screen.r;
      el.style.setProperty('--bx', `${(S.screen.x * 100).toFixed(2)}vw`);
      el.style.setProperty('--by', `${(S.screen.y * vh + r + 18).toFixed(1)}px`);
    };
    gsap.ticker.add(tick);
    tick();
    return () => { ro.disconnect(); gsap.ticker.remove(tick); };
  }, [phone]);

  // The drag: round the band on a desktop, sideways on a phone. It has weight and coasts.
  useEffect(() => {
    const st = stageEl.current; if (!st || still) return;
    let id = -1, lastA = 0, lastX = 0, lastT = 0, v = 0;
    const centre = () => ({ x: S.screen.x * window.innerWidth, y: S.screen.y * window.innerHeight });
    const angle = (e: PointerEvent) => { const c = centre(); return Math.atan2(e.clientY - c.y, e.clientX - c.x); };
    const down = (e: PointerEvent) => {
      id = e.pointerId; S.dragging = true; S.target = S.run; S.vel = 0; v = 0;
      lastA = angle(e); lastX = e.clientX; lastT = performance.now();
      st.classList.add('is-grab');
    };
    const move = (e: PointerEvent) => {
      const c = centre();
      S.tilt.x = clamp((e.clientX - c.x) / (window.innerWidth * 0.5), -1, 1);
      S.tilt.y = clamp((e.clientY - c.y) / (window.innerHeight * 0.5), -1, 1);
      if (e.pointerId !== id) return;
      const now = performance.now(), dt = Math.max(1, now - lastT) / 1000;
      let d = 0;
      if (isPhone() || e.pointerType === 'touch') d = (e.clientX - lastX) / window.innerWidth * 0.32;
      else {
        const a = angle(e); let da = a - lastA; lastA = a;
        if (da > Math.PI) da -= Math.PI * 2; if (da < -Math.PI) da += Math.PI * 2;
        const dist = Math.hypot(e.clientX - c.x, e.clientY - c.y);
        d = dist < S.screen.r * 0.25 ? (e.clientX - lastX) / window.innerWidth * 0.3 : (-da / (Math.PI * 2)) * 0.5;
      }
      lastX = e.clientX; lastT = now;
      S.target += d;
      v = v * 0.7 + (d / dt) * 0.3;
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1; S.dragging = false; S.vel = clamp(v, -0.9, 0.9);
      st.classList.remove('is-grab');
    };
    st.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { st.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, [webgl]);

  const runOnce = () => { S.vel += 0.42; };
  const runKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { S.vel += 0.14; e.preventDefault(); }
    if (e.key === 'ArrowLeft') { S.vel -= 0.14; e.preventDefault(); }
  };

  const play = webgl && !still;
  return (
    <div ref={root} className={`v-loop${webgl ? '' : ' no-gl'}${still ? ' is-still' : ''}${phone ? ' is-phone' : ''}`} data-at="0">
      <a className="skip-x" href="#main">Skip to content</a>
      {webgl && (
        <div ref={stageEl} className="stage" aria-hidden="true">
          <Suspense fallback={null}><Scene phone={phone} key={phone ? 'p' : 'd'} /></Suspense>
        </div>
      )}
      {play && (
        <button type="button" className="run" onClick={runOnce} onKeyDown={runKey}>
          <span>Run the line round</span>
          <svg viewBox="0 0 40 16" aria-hidden="true"><path d="M2 8h34M30 2l6 6-6 6" /></svg>
        </button>
      )}

      <header className="top">
        <a className="brand" href="#top" aria-label="Skeptical, back to the top">Skeptical<Mark /></a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
      </header>

      <main id="main">
        <section className="stop hero" data-stop="0" id="top" aria-labelledby="loop-h1">
          <div className="win" aria-hidden="true">{!webgl && <FlatRing />}</div>
          <div className="col">
            <h1 id="loop-h1" className="pitch">
              <span className="sr-only-x">{SITE.heading}. </span>
              {HERO.pitch.map((l) => <span key={l} className="ln" aria-hidden="true">{l}</span>)}
            </h1>
            <p className="statement">{HERO.statement.map((s) => <span key={s}>{s}</span>)}</p>
            <p className="doors">{HERO.doors.map((d) => <A key={d.href} href={d.href}>{d.label}</A>)}</p>
          </div>
        </section>

        <section className="stop mani" data-stop="1" aria-label="How the team works">
          <div className="pin">
            <div className="win" aria-hidden="true" />
            <div className="col">
              <ol className="lines" data-mani data-on="0">
                {MANIFESTO.map((m, i) => <li key={m} data-i={i}>{m}</li>)}
              </ol>
            </div>
          </div>
        </section>

        <section className="stop sec side-r" data-stop="2" id="record" aria-labelledby="loop-record">
          <div className="win" aria-hidden="true" />
          <div className="col">
            <h2 id="loop-record" className="title">{RECORD.title}</h2>
            <p className="lead" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ul className="results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise><h3>{r.what}</h3><p><b>{r.who}</b> {r.more}</p></li>
              ))}
            </ul>
            <p data-rise><A className="more" href={RECORD.more.href}>{RECORD.more.label}</A></p>
          </div>
        </section>

        <section className="stop sec" data-stop="3" id="drive" aria-labelledby="loop-drive">
          <div className="win" aria-hidden="true" />
          <div className="col">
            <h2 id="loop-drive" className="title">{DRIVE.title}</h2>
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <dl className="items">
              {DRIVE.items.map((it) => <div key={it.term} data-rise><dt>{it.term}</dt><dd>{it.text}</dd></div>)}
            </dl>
            <p data-rise><A className="more" href={DRIVE.more.href}>{DRIVE.more.label}</A></p>
          </div>
        </section>

        <section className="stop sec side-r" data-stop="4" id="people" aria-labelledby="loop-people">
          <div className="win" aria-hidden="true" />
          <div className="col">
            <h2 id="loop-people" className="title">{PEOPLE.title}</h2>
            <p className="lead" data-rise>{PEOPLE.count}</p>
            <ul className="coaches">
              {PEOPLE.coaches.map((c) => (
                <li key={c.name} data-rise><h3>{c.name}</h3><p className="role">{c.role}</p><p>{c.bio}</p></li>
              ))}
            </ul>
            <p data-rise><A className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>
          </div>
        </section>

        <section className="stop join" data-stop="5" id="join" aria-labelledby="loop-join">
          <div className="head">
            <h2 id="loop-join" className="title">{JOIN.title}</h2>
            <p className="lead">{JOIN.lead}</p>
          </div>
          <div className="win" aria-hidden="true" />
          <div className="ways">
            {JOIN.paths.map((p, i) => (
              <article key={p.id} className={`way w${i}`} data-rise>
                <h3>{p.name}</h3>
                <p className="line"><A href={p.href}>{p.line}</A></p>
                {p.text.map((t) => <p key={t}>{t}</p>)}
                {i === 0 && <p className="also">{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>.</p>}
                {i === 1 && <p className="also">{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>}
                {i === 2 && <p className="also">{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>}
                {i === 2 && <p className="also">{JOIN.discord}</p>}
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="stop foot" data-stop="6">
        <div className="win" aria-hidden="true" />
        <div className="col">
          <p className="fline">{FOOTER.line}</p>
          <ul className="links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul className="pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <p className="draft">Draft 2, version 60. Not the live site.</p>
        </div>
      </footer>
    </div>
  );
}
