// Version 50: the vase. A thrown porcelain vase shot like a product on black.
// Its profile is two people facing each other: press it and the light goes
// behind it, the vase turns into a silhouette, and the two doors sit in the
// two faces. At Join it goes backlit again and the three ways in run under it.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/wdth.css';
import './vase.css';
import { DRIVE, FOOTER, HERO, JOIN, MANIFESTO, NAV, PEOPLE, RECORD, SITE } from '@/content';
import { gsap } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { useVersion } from '@/lib/version';
import { still } from '@/lib/utils';
import { H, PROFILE, RS, frameFor, onScreen, type Shot } from './frame';
import { st } from './store';

const Stage = lazy(() => import('./Stage'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** Without WebGL: the same profile as a flat silhouette. */
function FlatVase() {
  const pts = PROFILE.map(([t, r]) => [r * RS, t * H] as const);
  const right = pts.map(([x, y]) => `${(x + 1).toFixed(3)},${(H - y).toFixed(3)}`);
  const left = [...pts].reverse().map(([x, y]) => `${(1 - x).toFixed(3)},${(H - y).toFixed(3)}`);
  return (
    <svg className="flatvase" viewBox={`0 0 2 ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
      <polygon points={[...right, ...left].join(' ')} />
    </svg>
  );
}

const px = (v: number) => `${Math.round(v)}px`;

export default function Vase() {
  useVersion('vase');
  const root = useRef<HTMLDivElement>(null), zone = useRef<HTMLButtonElement>(null);
  const [webgl] = useState(hasWebGL);
  const [back, setBack] = useState(false);
  useRise(root);

  // Layout numbers from the same frames the scene uses: the band, the axis, the fields.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const set = () => {
      const w = window.innerWidth, h = window.innerHeight, s = el.style;
      s.setProperty('--vh', px(h));
      const put = (p: string, shot: Shot) => {
        const o = onScreen(frameFor(shot, w, h), w, h);
        s.setProperty(`--${p}-rim`, px(o.rim)); s.setProperty(`--${p}-foot`, px(o.foot)); s.setProperty(`--${p}-bot`, px(o.bandBot));
        s.setProperty(`--${p}-cx`, px(o.cx)); s.setProperty(`--${p}-half`, px(o.half(0.0, 1)));
        s.setProperty(`--${p}-up`, px(o.at(0.93))); s.setProperty(`--${p}-mid`, px(o.at(0.6))); s.setProperty(`--${p}-low`, px(o.at(0.36)));
        s.setProperty(`--${p}-uphalf`, px(o.half(0.66, 1))); s.setProperty(`--${p}-midhalf`, px(o.half(0.3, 0.7)));
        s.setProperty(`--${p}-left`, px(o.cx - o.half(0, 1)));
      };
      put('h', 'hero'); put('j', 'join'); put('s', 'side'); put('e', 'end');
    };
    set();
    window.addEventListener('resize', set);
    return () => window.removeEventListener('resize', set);
  }, []);

  // Which part of the page is being read decides where the vase stands and where its light is.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const parts = Array.from(el.querySelectorAll<HTMLElement>('[data-shot]'));
    let last: Shot | '' = '';
    const tick = () => {
      const line = window.innerHeight * 0.5;
      let shot: Shot = 'hero';
      for (const p of parts) { const r = p.getBoundingClientRect(); if (r.top <= line && r.bottom > line) shot = p.dataset.shot as Shot; }
      if (window.scrollY < 4) shot = 'hero';
      if (shot !== last) {
        if (last) st.backT = shot === 'join' ? 1 : 0;
        // arriving at the end, the vase gives one last slow turn under the light
        if (shot === 'end' && last && last !== 'end' && !still) st.vel += 1.1;
        last = shot; st.shot = shot; el.dataset.shot = shot;
      }
    };
    tick();
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  // The hit area follows the vase; the page's colour follows the light.
  useEffect(() => {
    const el = root.current, z = zone.current; if (!el || !z) return;
    let dark = false;
    st.onFrame = (f, bp) => {
      const o = onScreen(f, window.innerWidth, window.innerHeight), hw = o.half(0, 1);
      z.style.transform = `translate(${px(o.cx - hw)}, ${px(o.rim)})`;
      z.style.width = px(hw * 2); z.style.height = px(o.foot - o.rim);
      const d = bp > 0.5;
      if (d !== dark) { dark = d; el.dataset.back = d ? '1' : '0'; setBack(d); }
    };
    return () => { st.onFrame = null; };
  }, []);

  // Without WebGL, still put the zone over the drawn vase and flip the colours.
  useEffect(() => {
    if (webgl) return;
    const el = root.current; if (!el) return;
    el.dataset.back = back ? '1' : '0';
  }, [webgl, back]);

  // Drag to turn it, press to change the light.
  const drag = useRef({ id: -1, x: 0, t: 0, moved: 0, lx: 0, lt: 0 });
  const down = (e: React.PointerEvent) => {
    const d = drag.current; d.id = e.pointerId; d.x = d.lx = e.clientX; d.t = d.lt = performance.now(); d.moved = 0;
    st.drag = true; st.vel = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current; if (d.id !== e.pointerId) return;
    const now = performance.now(), dx = e.clientX - d.lx, dt = Math.max(1, now - d.lt) / 1000;
    d.moved += Math.abs(dx); d.lx = e.clientX; d.lt = now;
    const k = 0.009;
    st.rot += dx * k;
    st.vel = st.vel * 0.6 + (dx * k / dt) * 0.4;
  };
  const up = (e: React.PointerEvent) => {
    const d = drag.current; if (d.id !== e.pointerId) return;
    d.id = -1; st.drag = false;
    if (performance.now() - d.lt > 90) st.vel = 0;
  };
  const toggle = () => {
    if (drag.current.moved > 6) { drag.current.moved = 0; return; }
    st.backT = st.backT > 0.5 ? 0 : 1;
    if (!webgl) setBack(st.backT > 0.5);
  };
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); st.vel += e.key === 'ArrowLeft' ? -2.4 : 2.4; }
  };

  return (
    <div className="v-vase" ref={root} data-back="0" data-gl={webgl ? '1' : '0'}>
      <a className="skip-x" href="#main">Skip to content</a>
      {webgl ? <Suspense fallback={null}><Stage /></Suspense> : <FlatVase />}
      <button
        ref={zone}
        type="button"
        className="vz"
        aria-pressed={back}
        aria-label={back ? 'The vase, backlit. Press to light it again.' : 'The vase. Press to put the light behind it. Arrow keys turn it.'}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onClick={toggle} onKeyDown={keys}
      />

      <header className="top">
        <a className="mark" href="#main" aria-label="Skeptical, top of the page">Skeptical</a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </header>

      <main id="main">
        <section className="hero" data-shot="hero" aria-labelledby="h1">
          <h1 id="h1" className="sr-only-x">{SITE.heading}</h1>
          <p className="pitch pl inband">{HERO.pitch[0]}</p>
          <p className="pitch pr inband">{HERO.pitch[1]}</p>
          <A className="door dl inband" href={HERO.doors[0].href}><span>{HERO.doors[0].label}</span></A>
          <A className="door dr inband" href={HERO.doors[1].href}><span>{HERO.doors[1].label}</span></A>
          <p className="hint" aria-live="polite">{back ? 'Two debaters, one question.' : 'Press the vase. Drag to turn it.'}</p>
          <ul className="statement" aria-label="The short version">
            {HERO.statement.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </section>

        <section className="part manifesto" data-shot="side" aria-label="What we are">
          <div className="win" aria-hidden />
          <div className="col">
            {MANIFESTO.map((m, i) => <p key={i} className="mline" data-rise>{m}</p>)}
          </div>
        </section>

        <section className="part record" id="record" data-shot="side" aria-labelledby="rec-t">
          <div className="win" aria-hidden />
          <div className="col">
            <h2 id="rec-t" className="title" data-rise>{RECORD.title}</h2>
            <p className="rule" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ol className="results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <span className="what">{r.what}</span>
                  <span className="who">{r.who}</span>
                  <span className="more">{r.more}</span>
                </li>
              ))}
            </ol>
            <A className="go" href={RECORD.more.href}>{RECORD.more.label}</A>
          </div>
        </section>

        <section className="part drive" id="drive" data-shot="side" aria-labelledby="drv-t">
          <div className="win" aria-hidden />
          <div className="col">
            <h2 id="drv-t" className="title" data-rise>{DRIVE.title}</h2>
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <dl className="items">
              {DRIVE.items.map((it) => (
                <div key={it.term} className="item" data-rise>
                  <dt>{it.term}</dt>
                  <dd>{it.text}</dd>
                </div>
              ))}
            </dl>
            <A className="go" href={DRIVE.more.href}>{DRIVE.more.label}</A>
          </div>
        </section>

        <section className="part people" id="people" data-shot="side" aria-labelledby="ppl-t">
          <div className="win" aria-hidden />
          <div className="col">
            <h2 id="ppl-t" className="title" data-rise>{PEOPLE.title}</h2>
            {PEOPLE.coaches.map((c) => (
              <div key={c.name} className="coach" data-rise>
                <p className="role">{c.role}</p>
                <h3 className="name">{c.name}</h3>
                <p className="bio">{c.bio}</p>
              </div>
            ))}
            <p className="count" data-rise>{PEOPLE.count}</p>
            <A className="go" href={PEOPLE.more.href}>{PEOPLE.more.label}</A>
          </div>
        </section>

        <section className="join" id="join" data-shot="join" aria-labelledby="join-t">
          <div className="pin">
            <h2 id="join-t" className="jt inband">{JOIN.title}</h2>
            <p className="jl inband">{JOIN.lead}</p>
          </div>
          <ol className="ways">
            {JOIN.paths.map((p) => (
              <li key={p.id} className="way">
                <h3><A href={p.href}><span className="wn">{p.name}</span><span className="arr" aria-hidden>→</span></A></h3>
                <p className="wl">{p.line}</p>
                <p className="wt">{p.text[0]}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="after" data-shot="end" aria-label="Other ways in">
          <div className="col">
            <p className="aline">{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A></p>
            <p className="aline">{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A></p>
            <p className="also">{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
            <p className="also">{JOIN.discord}</p>
          </div>
        </section>
      </main>

      <footer className="foot" data-shot="end">
        <div className="win" aria-hidden />
        <div className="col">
          <p className="fline">{FOOTER.line}</p>
          <ul className="links">
            {FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}
          </ul>
          <ul className="pages">
            {FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}
          </ul>
          <p className="draft">Draft 2, version 50. Not the live site. The vase and its light are drawn in code.</p>
        </div>
      </footer>
    </div>
  );
}

