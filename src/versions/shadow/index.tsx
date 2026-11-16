// Version 34: the shadow. A bronze of bent bars on a plinth under one light.
// Turn it, by hand or by scrolling, and at one angle its shadow on the wall
// is a question mark. The rest of the page turns it back into a tangle, and
// the last screen brings the mark round again.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './shadow.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap } from '@/lib/scroll';
import { clamp, isPhone, smooth, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { markShapes } from './geo';
import { START, TAU, nearest, st } from './stage';

const Stage = lazy(() => import('./Stage'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** The mark itself, flat, for a browser with no WebGL. */
function FlatMark() {
  const d = markShapes().map((s) => {
    const pts = s.getPoints(48);
    return 'M' + pts.map((p) => `${p.x.toFixed(3)},${(-p.y).toFixed(3)}`).join('L') + 'Z';
  }).join('');
  return <svg className="flat" viewBox="-1.2 -1.7 2.4 3.2" role="img" aria-label="A question mark"><path d={d} /></svg>;
}

const Lines = ({ lines, as: Tag = 'span' }: { lines: string[]; as?: 'span' }) => (
  <>{lines.map((l, i) => <span className="ln" key={l} style={{ '--i': i } as React.CSSProperties}><Tag className="in">{l}</Tag></span>)}</>
);

export default function Shadow() {
  useVersion('shadow');
  const root = useRef<HTMLDivElement>(null), stageEl = useRef<HTMLDivElement>(null), hero = useRef<HTMLElement>(null), end = useRef<HTMLElement>(null);
  const [webgl] = useState(hasWebGL);
  const [phone, setPhone] = useState(isPhone);
  const [said, setSaid] = useState(still || !webgl);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // The mark appearing: the first time, the pitch is said; every time, the room marks it.
  useEffect(() => {
    st.base = START; st.user = 0; st.uv = 0; st.angle = still ? 0 : START + 0.9; st.av = 0; st.resolved = false; st.hot = -1;
    st.onResolve = (on) => {
      const el = root.current; if (!el) return;
      el.classList.toggle('is-q', on);
      if (on) setSaid(true);
    };
    return () => { st.onResolve = null; };
  }, []);

  // Every frame: the scroll sets the turn. The opening brings it to the mark; the rest of the page takes it once round again.
  useEffect(() => {
    let lastY = window.scrollY, lastDeg = -1;
    const tick = () => {
      const vh = window.innerHeight, y = window.scrollY;
      const h = hero.current, e = end.current;
      const heroEnd = h ? h.offsetTop + h.offsetHeight - vh : vh;
      const solveAt = heroEnd * 0.62;
      const max = Math.max(heroEnd + 1, document.documentElement.scrollHeight - vh);
      const endAt = e ? Math.min(max, e.offsetTop + e.offsetHeight - vh) : max;
      let base: number;
      if (still) base = 0;
      else if (y <= solveAt) base = START * (1 - smooth(clamp(y / solveAt)));
      else base = -TAU * smooth(clamp((y - heroEnd) / Math.max(1, endAt - heroEnd)));
      st.base = base;
      // Scrolling settles any turn the hand added, so the page and the light agree again.
      const dy = Math.abs(y - lastY); lastY = y;
      if (dy > 0 && !st.dragging) { const k = Math.round(st.user / TAU) * TAU; st.user += (k - st.user) * (1 - Math.exp(-dy / 260)); }
      st.side = phone ? 0 : smooth(clamp((y - heroEnd + vh * 0.4) / (vh * 0.7)));
      root.current?.style.setProperty('--side', st.side.toFixed(3));
      root.current?.classList.toggle('at-end', y > endAt - vh * 0.35);
      const deg = Math.round(((nearest(st.angle).d / TAU) * 360 + 360) % 360);
      if (deg !== lastDeg && stageEl.current) { lastDeg = deg; stageEl.current.setAttribute('aria-valuenow', String(deg)); stageEl.current.setAttribute('aria-valuetext', deg === 0 ? 'The shadow is a question mark' : `Turned ${deg} degrees`); }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [phone]);

  // The hand: drag across the room to turn the bronze. Vertical swipes still scroll the page.
  useEffect(() => {
    const el = stageEl.current; if (!el || !webgl) return;
    let id = -1, x0 = 0, lastX = 0, lastT = 0;
    const down = (e: PointerEvent) => { id = e.pointerId; x0 = lastX = e.clientX; lastT = performance.now(); st.dragging = true; st.uv = 0; el.classList.add('is-held'); };
    const move = (e: PointerEvent) => {
      st.px = (e.clientX / window.innerWidth) * 2 - 1; st.py = (e.clientY / window.innerHeight) * 2 - 1;
      if (e.pointerId !== id) return;
      const now = performance.now(), dx = e.clientX - lastX, k = (phone ? 7.5 : 5.2) / window.innerWidth;
      st.user += dx * k;
      const v = (dx * k) / Math.max(0.008, (now - lastT) / 1000);
      st.uv = st.uv * 0.6 + v * 0.4;
      lastX = e.clientX; lastT = now;
      if (Math.abs(e.clientX - x0) > 6) el.classList.add('is-turning');
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1; st.dragging = false; el.classList.remove('is-held', 'is-turning');
      if (performance.now() - lastT > 90) st.uv = 0;
      st.uv = clamp(st.uv, -6, 6);
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, [webgl, phone]);

  const key = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.6 : 0.24;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { st.user -= step; e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { st.user += step; e.preventDefault(); }
    else if (e.key === 'Home') { st.user = -st.base + Math.round((st.base + st.user) / TAU) * TAU; st.uv = 0; e.preventDefault(); }
  };

  const hot = (i: number) => () => { st.hot = i; };
  const cold = () => { st.hot = -1; };

  return (
    <div className={`v-shadow${said ? ' is-said' : ''}${phone ? ' is-phone' : ''}${webgl ? '' : ' no-gl'}${still ? ' is-still' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>

      <aside className="room" aria-label="The sculpture">
      <div className="stage" ref={stageEl} tabIndex={webgl ? 0 : -1} role={webgl ? 'slider' : undefined}
        aria-label={webgl ? 'Turn the sculpture' : undefined} aria-valuemin={webgl ? 0 : undefined} aria-valuemax={webgl ? 359 : undefined} aria-valuenow={webgl ? 76 : undefined}
        aria-hidden={webgl ? undefined : true} onKeyDown={key}>
        {webgl ? <Suspense fallback={null}><Stage key={phone ? 'p' : 'd'} /></Suspense> : <FlatMark />}
        <div className="dark" aria-hidden="true" />
      </div>
      </aside>

      <header className="top">
        <a className="brand" href="#top" aria-label="Skeptical, back to the top">Skeptical<span aria-hidden="true">?</span></a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
      </header>

      <main id="main">
        <section className="hero" id="top" ref={hero} aria-label={SITE.heading}>
          <div className="pin">
            <div className="say">
              <p className="hint" aria-hidden="true"><span>{phone ? 'Drag it round.' : 'Turn it.'}</span><span>{phone ? 'Or keep scrolling.' : 'Drag, or scroll.'}</span></p>
              <h1 className="pitch"><Lines lines={HERO.pitch} /></h1>
              <div className="under">
                <p className="statement">{HERO.statement.map((s, i) => <span key={s} style={{ '--i': i } as React.CSSProperties}>{s}</span>)}</p>
                <p className="doors">{HERO.doors.map((d) => <A key={d.href} href={d.href}>{d.label}</A>)}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="col">
          <section className="manifesto" aria-label="How the team works">
            {MANIFESTO.map((m, i) => <p key={m} className={`m m${i}`}>{m}</p>)}
          </section>

          <section className="sec record" id="record">
            <h2 className="title">{RECORD.title}</h2>
            <p className="lead">{RECORD.rule}</p>
            <p className="event"><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ul className="results">
              {RECORD.results.map((r) => <li key={r.who}><h3>{r.what}</h3><p><b>{r.who}</b> {r.more}</p></li>)}
            </ul>
            <p><A className="more" href={RECORD.more.href}>{RECORD.more.label}</A></p>
          </section>

          <section className="sec drive" id="drive">
            <h2 className="title">{DRIVE.title}</h2>
            <p className="lead">{DRIVE.lead}</p>
            <ol className="kit" onPointerLeave={cold}>
              {DRIVE.items.map((d, i) => (
                <li key={d.term} tabIndex={0} onPointerEnter={hot(i)} onFocus={hot(i)} onBlur={cold} onClick={hot(i)}>
                  <h3>{d.term}</h3><p>{d.text}</p>
                </li>
              ))}
            </ol>
            <p><A className="more" href={DRIVE.more.href}>{DRIVE.more.label}</A></p>
          </section>

          <section className="sec people" id="people">
            <h2 className="title">{PEOPLE.title}</h2>
            <ul className="coaches">
              {PEOPLE.coaches.map((c) => <li key={c.name}><h3>{c.name}</h3><p className="role">{c.role}</p><p>{c.bio}</p></li>)}
            </ul>
            <p className="count">{PEOPLE.count}</p>
            <p><A className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>
          </section>

          <section className="sec join" id="join">
            <h2 className="title">{JOIN.title}</h2>
            <p className="lead">{JOIN.lead}</p>
            <ol className="ways">
              {JOIN.paths.map((p) => (
                <li key={p.id}>
                  <a href={p.href} rel="noopener"><span className="name">{p.name}</span><span className="what">{p.line}</span><span className="go" aria-hidden="true" /></a>
                  <ul>{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
                </li>
              ))}
            </ol>
            <p className="after">{JOIN.discord}</p>
            <p className="after">{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
            <p className="after">{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
          </section>

          <footer className="end" ref={end}>
            <p className="last"><Lines lines={FOOTER.line.split('. ').map((s, i, a) => (i < a.length - 1 ? s + '.' : s))} /></p>
            <ul>{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
            <ul className="pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
            <small>Draft 2, version 34. Not the live site.</small>
          </footer>
        </div>
      </main>
    </div>
  );
}
