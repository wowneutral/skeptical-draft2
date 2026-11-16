// Version 54: the pull. A dish of black ferrofluid on a pale sweep. Left
// alone it is a flat mirror with no position of its own, like a tab judge;
// it only takes a shape when something pulls on it.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/standard.css';
import './pull.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap, scroll } from '@/lib/scroll';
import { Split, useRise } from '@/lib/motion';
import { clamp, coarse, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { field, N_PTS } from './store';

const Fluid = lazy(() => import('./Fluid'));

const A = ({ href, className, children, ...rest }: { href: string; className?: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined} {...rest}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

type Sec = 'hero' | 'say' | 'record' | 'drive' | 'people' | 'join' | 'end';

/** Where the hidden magnets go for each section. Coordinates are on the dish, radius 1; z is toward you. */
function place(sec: Sec, opts: { drive: number; trace: number; way: number }) {
  const P = field.pts;
  for (const p of P) p.s = 0;
  const put = (i: number, x: number, z: number, s: number, r: number) => { const p = P[i]; p.x = x; p.z = z; p.s = s; p.r = r; };
  field.glyphOn = 0;
  if (sec === 'say') {
    // The mark: the hook first, then the dot, then it lies down again.
    field.glyph = clamp((opts.trace - 0.06) / 0.72);
    field.glyphOn = opts.trace > 0.02 && opts.trace < 0.95 ? 1 : 0;
  } else if (sec === 'record') {
    // Two results, two crowns. Nothing else stands up.
    put(0, -0.4, 0.02, 1.05, 0.25); put(1, 0.42, -0.02, 1.05, 0.25);
  } else if (sec === 'drive') {
    // Seven things in the drive, seven small pulls around the pool.
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i / 7) * Math.PI * 2, on = i === opts.drive;
      put(i, Math.cos(a) * 0.56, Math.sin(a) * 0.56, on ? 1.25 : 0.42, on ? 0.24 : 0.15);
    }
  } else if (sec === 'people') {
    // Two coaches in the middle, eight debaters around them.
    put(0, -0.24, 0, 1.0, 0.2); put(1, 0.24, 0, 1.0, 0.2);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2; put(2 + i, Math.cos(a) * 0.7, Math.sin(a) * 0.7, 0.62, 0.1); }
  } else if (sec === 'end') {
    // A full stop.
    put(0, 0, 0.02, 1.9, 0.22);
  }
  void N_PTS; void opts.way;
}

export default function Pull() {
  useVersion('pull');
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [ready, setReady] = useState(false);
  const [phone, setPhone] = useState(isPhone);
  const [drive, setDrive] = useState(0);
  const [way, setWay] = useState(-1);
  const hoverWay = useRef(-1);
  useRise(root);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  useEffect(() => { const t = setTimeout(() => setReady(true), 7000); return () => clearTimeout(t); }, []);

  // Every frame: which section holds the reading line, and what it asks the pool to do.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const secs = Array.from(el.querySelectorAll<HTMLElement>('[data-sec]'));
    const items = Array.from(el.querySelectorAll<HTMLElement>('[data-item]'));
    const ways = Array.from(el.querySelectorAll<HTMLElement>('[data-way]'));
    let lastDrive = -1, lastWay = -2;
    const tick = () => {
      const vh = window.innerHeight, ph = isPhone(), line = vh * 0.5;
      let sec: Sec = 'hero', cur: HTMLElement | null = null;
      for (const s of secs) { const r = s.getBoundingClientRect(); if (r.top <= line) { sec = s.dataset.sec as Sec; cur = s; } }
      // The mark is drawn across the manifesto (on a phone, across its open window).
      let trace = 0;
      if (sec === 'say' && cur) {
        const t = (ph ? cur.querySelector<HTMLElement>('.win') : cur) ?? cur;
        const r = t.getBoundingClientRect();
        trace = ph ? clamp((vh * 0.85 - r.top) / (r.height + vh * 0.2)) : clamp((line - r.top) / (r.height - vh * 0.3));
      }
      // The drive item nearest the reading line.
      let d = 0;
      if (sec === 'drive') {
        let best = Infinity;
        items.forEach((it, i) => { const r = it.getBoundingClientRect(), k = Math.abs(r.top + r.height / 2 - vh * (ph ? 0.4 : 0.5)); if (k < best) { best = k; d = i; } });
      }
      if (d !== lastDrive) { lastDrive = d; setDrive(d); }
      place(sec, { drive: d, trace, way: 0 });
      field.side = sec === 'hero' ? 0 : 1;
      field.top = sec === 'say' ? 1 : sec === 'hero' ? 0 : sec === 'end' ? 0.25 : 0.42;
      field.strip = scroll.p;
      // At Join the pool leans toward the way in you point at, or the one you are reading.
      let w = -1;
      if (sec === 'join' || sec === 'end') {
        w = hoverWay.current;
        if (w < 0 && sec === 'join') {
          let best = Infinity;
          ways.forEach((it, i) => { const r = it.getBoundingClientRect(), k = Math.abs(r.top + r.height * 0.3 - line); if (k < best && k < vh * 0.4) { best = k; w = i; } });
        }
      }
      if (w >= 0) {
        const r = ways[w].querySelector('h3')!.getBoundingClientRect();
        field.lean.x = r.left + Math.min(r.width, 260) * 0.5; field.lean.z = r.top + r.height / 2; field.lean.s = hoverWay.current >= 0 ? 1.15 : 0.8;
      } else field.lean.s = 0;
      if (w !== lastWay) { lastWay = w; setWay(w); }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  // The keyboard magnet: focus the line under the dish, then the arrow keys pull.
  const keyMag = (e: React.KeyboardEvent) => {
    const H = field.hand, k = 0.12;
    const m: Record<string, [number, number]> = { ArrowLeft: [-k, 0], ArrowRight: [k, 0], ArrowUp: [0, -k], ArrowDown: [0, k] };
    const v = m[e.key]; if (!v) return;
    e.preventDefault();
    H.seen = true; H.on = 1; H.x = clamp(H.x + v[0], -0.85, 0.85); H.z = clamp(H.z + v[1], -0.85, 0.85);
  };
  const magOn = () => { const H = field.hand; H.seen = true; H.on = 1; };
  const magOff = () => { const H = field.hand; H.seen = false; H.on = 0; };
  const magPress = () => {
    // A pass from one side to the other, for anyone without a pointer.
    const H = field.hand; H.seen = true; H.on = 1;
    gsap.fromTo(H, { x: -0.8, z: 0.3 }, { x: 0.8, z: -0.3, duration: 1.8, ease: 'sine.inOut', onComplete: () => { if (document.activeElement?.classList.contains('mag')) { H.x = 0; H.z = 0; } else magOff(); } });
  };

  const lean = (i: number) => () => { hoverWay.current = i; };
  const unlean = () => { hoverWay.current = -1; };
  const play = webgl && !still;

  return (
    <div ref={root} className={`v-pull${ready ? ' is-ready' : ''}${webgl ? '' : ' no-gl'}${phone ? ' is-phone' : ''}`}>
      <a className="skip-x" href="#main">Skip to content</a>
      {webgl && <div className="stage" aria-hidden="true"><Suspense fallback={null}><Fluid onReady={() => setReady(true)} /></Suspense></div>}

      <header className="top">
        <a className="brand" href="#top" aria-label="Skeptical, back to the top">Skeptical<i>?</i></a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
      </header>

      <main id="main">
        <section className="hero" data-sec="hero" id="top" aria-label={SITE.heading}>
          <h1 className="pitch">
            {HERO.pitch.map((l, i) => <span className="ln" key={l}><span style={{ animationDelay: `${0.15 + i * 0.12}s` }}>{l}</span></span>)}
          </h1>
          <p className="statement">{HERO.statement.map((s) => <span key={s}>{s}</span>)}</p>
          <div className="doors">
            {HERO.doors.map((d) => <A key={d.href} href={d.href}>{d.label}</A>)}
            {play && (
              <button type="button" className="mag" onFocus={magOn} onBlur={magOff} onKeyDown={keyMag} onClick={magPress}>
                {coarse ? 'Drag across the dish.' : 'Bring the pointer to the dish.'}
              </button>
            )}
          </div>
          {!webgl && (
            <svg className="flatdish" viewBox="0 0 400 140" role="img" aria-label="A dish of black ferrofluid, lying flat">
              <ellipse cx="200" cy="78" rx="196" ry="58" fill="#f3efe6" stroke="#cfc8b8" />
              <ellipse cx="200" cy="74" rx="170" ry="46" fill="#0b0b0b" />
            </svg>
          )}
        </section>

        <section className="say" data-sec="say" aria-label="How the team works">
          <div className="win" aria-hidden="true" />
          <div className="plate">
            {MANIFESTO.map((m) => <div className="row" key={m}><Split as="p" className="line">{m}</Split></div>)}
          </div>
        </section>

        <section className="sec record" data-sec="record" id="record">
          <div className="win" aria-hidden="true" />
          <div className="plate">
            <Split as="h2" className="title">{RECORD.title}</Split>
            <p className="lead" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise><span>{RECORD.when}</span> {RECORD.name}, {RECORD.where}</p>
            <ul className="results">
              {RECORD.results.map((r) => (
                <li data-rise key={r.who}><h3>{r.what}</h3><p><b>{r.who}</b> {r.more}</p></li>
              ))}
            </ul>
            <p data-rise><A className="more" href={RECORD.more.href}>{RECORD.more.label}</A></p>
          </div>
        </section>

        <section className="sec drive" data-sec="drive" id="drive">
          <div className="win" aria-hidden="true" />
          <div className="plate">
            <Split as="h2" className="title">{DRIVE.title}</Split>
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <dl className="items">
              {DRIVE.items.map((it, i) => (
                <div className={`item${i === drive ? ' on' : ''}`} data-item key={it.term} data-rise>
                  <dt>{it.term}</dt><dd>{it.text}</dd>
                </div>
              ))}
            </dl>
            <p data-rise><A className="more" href={DRIVE.more.href}>{DRIVE.more.label}</A></p>
          </div>
        </section>

        <section className="sec people" data-sec="people" id="people">
          <div className="win" aria-hidden="true" />
          <div className="plate">
            <Split as="h2" className="title">{PEOPLE.title}</Split>
            <div className="coaches">
              {PEOPLE.coaches.map((c) => (
                <article className="coach" key={c.name} data-rise>
                  <h3>{c.name}</h3><p className="role">{c.role}</p><p>{c.bio}</p>
                </article>
              ))}
            </div>
            <p className="count" data-rise>{PEOPLE.count}</p>
            <p data-rise><A className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>
          </div>
        </section>

        <section className="sec join" data-sec="join" id="join">
          <div className="win" aria-hidden="true" />
          <div className="plate">
            <Split as="h2" className="title">{JOIN.title}</Split>
            <p className="lead" data-rise>{JOIN.lead}</p>
            <ol className="ways">
              {JOIN.paths.map((p, i) => (
                <li key={p.id} data-way className={way === i ? 'on' : ''} data-rise>
                  <A href={p.href} className="way" onPointerEnter={lean(i)} onPointerLeave={unlean} onFocus={lean(i)} onBlur={unlean}>
                    <h3>{p.name}</h3><span className="wline">{p.line}</span>
                  </A>
                  {p.text.map((t) => <p key={t}>{t}</p>)}
                </li>
              ))}
            </ol>
            <p className="aside" data-rise>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
            <p className="aside" data-rise>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
            <p className="aside" data-rise>{JOIN.discord}</p>
          </div>
        </section>

        <footer className="end" data-sec="end">
          <div className="win" aria-hidden="true" />
          <div className="plate">
            <Split as="p" className="last">{FOOTER.line}</Split>
            <ul className="links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
            <ul className="pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
            <p className="small">Draft 2, version 54. Not the live site.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
