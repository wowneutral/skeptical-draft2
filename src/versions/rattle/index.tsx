// Version 83: the rattleback. A polished black stone that looks as if it has
// no side. Spin it the way it likes and it turns for ages; spin it the other
// way and it rocks, stops dead and goes back. Yes, the name is a position.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/index.css';
import './rattle.css';
import { HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV, SITE } from '@/content';
import MARKS from '@/lib/marks.json';
import { gsap, scroll } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { clamp, isPhone, smooth, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { S } from './sim';

const Scene = lazy(() => import('./Scene'));

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const A = ({ href, className, children, ...rest }: { href: string; className?: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined} {...rest}>{children}</a>
);

/** The stone drawn flat, for a browser without WebGL. */
function FlatStone() {
  const m = MARKS.italic;
  return (
    <svg className="flat" viewBox="-400 -170 800 340" role="img" aria-label="A black rattleback stone with a white question mark inlaid in its top.">
      <ellipse cx="0" cy="110" rx="330" ry="34" fill="rgba(20,19,17,.18)" />
      <ellipse cx="0" cy="0" rx="320" ry="96" fill="#141311" />
      <path d={m.d} fill="#ebe5d6" transform={`translate(0 0) rotate(90) scale(${150 / m.h})`} />
    </svg>
  );
}

const reset = () => {
  Object.assign(S, { touched: false, yaw: 0.02, w: 0, a: 0, va: 0, b: 0, vb: 0, held: false, handW: 0, raw: 0, f: 0, marks: [], aimAt: null, rest: 0, over: false, lit: 0, t: 0 });
  S.cmds.length = 0;
};

export default function Rattle() {
  const [phone, setPhone] = useState(isPhone);
  useVersion('rattle', { anchorOffset: phone ? -Math.round(window.innerHeight * 0.44) : 0 });
  const root = useRef<HTMLDivElement>(null), grip = useRef<HTMLButtonElement>(null), fourth = useRef<HTMLElement>(null);
  const [webgl] = useState(hasWebGL);
  useRise(root);

  useEffect(() => {
    reset();
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    // The opening: as the light comes up, a small tap at one end. It rocks, then turns its own way.
    const t = still ? 0 : window.setTimeout(() => { S.va += -1.45; }, 1900);
    return () => { window.removeEventListener('resize', on); clearTimeout(t); };
  }, []);

  // Where each camera stop sits on the page; the camera moves in weighted steps between them.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const measure = () => {
      const vh = window.innerHeight, sy = window.scrollY, ph = isPhone();
      const all = Array.from(el.querySelectorAll<HTMLElement>('[data-stop]'));
      // The last stop (join) is reached when its field is a little past half way up, so the stone sits above it.
      S.marks = all.map((s, i) => (i === 0 ? 0 : s.getBoundingClientRect().top + sy - vh * (ph ? 0.52 : i === all.length - 1 ? 0.56 : 0.3)));
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    document.fonts.ready.then(measure);
    const tick = () => {
      const m = S.marks, y = scroll.y, win = window.innerHeight * 0.55;
      let raw = 0;
      for (let i = 1; i < m.length; i++) raw += smooth(clamp((y - (m[i] - win)) / win));
      S.raw = raw;
      S.rest = smooth(clamp((raw - 5.4) / 0.6));
      const g = grip.current;
      if (g) g.style.transform = `translate(${S.sx.toFixed(1)}px, ${S.sy.toFixed(1)}px) translate(-50%, -50%)`;
    };
    gsap.ticker.add(tick);
    return () => { ro.disconnect(); gsap.ticker.remove(tick); };
  }, [phone]);

  // The fourth line: as it arrives, the stone turns against itself and goes back.
  useEffect(() => {
    const el = fourth.current; if (!el || still) return;
    let last = -1e9;
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting && performance.now() - last > 7000) { last = performance.now(); S.cmds.push({ type: 'reverse' }); }
    }, { threshold: 0.55 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const key = (e: React.KeyboardEvent) => {
    if (still) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); S.cmds.push({ type: 'flick', w: 3.2 }); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); S.cmds.push({ type: 'flick', w: -3.2 }); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); S.cmds.push({ type: 'tap', end: S.a > 0 ? -0.8 : 0.8 }); }
  };
  const aim = (e: React.SyntheticEvent<HTMLElement>) => { const r = e.currentTarget.getBoundingClientRect(); S.aimAt = { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 60) }; };
  const unaim = () => { S.aimAt = null; };

  const [yes, no] = MANIFESTO[3].split(/(?<=\.) /);
  const live = webgl && !still;

  return (
    <div className="v-rattle" ref={root}>
      <a className="skip-x" href="#main">Skip to the page</a>
      <div className="stage" aria-hidden="true">
        {webgl ? <Suspense fallback={null}><Scene phone={phone} /></Suspense> : <FlatStone />}
      </div>
      {live && (
        <button ref={grip} type="button" className="grip" onKeyDown={key} aria-label="The stone. Arrow keys spin it either way; Enter taps one end.">
          <span className="sr-only-x">Spin it. Either way.</span>
        </button>
      )}

      <header className="top">
        <a className="mark" href="#main" aria-label="Skeptical, top of the page">Skeptical<span aria-hidden="true">?</span></a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </header>

      <main id="main">
        <section className="sec hero" data-stop aria-labelledby="pitch">
          <div className="field">
            <h1 id="pitch" className="pitch">
              <span className="sr-only-x">{SITE.name}. </span>
              <span className="ln">{HERO.pitch[0]}</span>
              <span className="ln it">{HERO.pitch[1]}</span>
            </h1>
            <p className="statement">
              {HERO.statement.map((s) => <span key={s} className="ln">{s}</span>)}
            </p>
            <div className="doors">
              {HERO.doors.map((d) => <A key={d.label} className="door" href={d.href}>{d.label}</A>)}
            </div>
          </div>
          <p className="hint" aria-hidden="true">{live ? 'Spin it. Either way.' : ''}</p>
        </section>

        <section className="sec manifesto" data-stop aria-label="What we are">
          <div className="field">
            <ol className="lines">
              {MANIFESTO.slice(0, 3).map((l) => <li key={l} data-rise>{l}</li>)}
            </ol>
          </div>
        </section>

        <section className="sec fourth" data-stop ref={fourth} aria-label="The name">
          <div className="field">
            <p className="big">
              <span className="yes" data-rise>{yes}</span>
              <span className="no" data-rise>{no}</span>
            </p>
          </div>
        </section>

        <section className="sec record" id="record" data-stop aria-labelledby="record-h">
          <div className="field">
            <h2 id="record-h" className="title" data-rise>{RECORD.title}</h2>
            <p className="rule" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise><span>{RECORD.when}</span><span className="it">{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ul className="results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <span className="what">{r.what}</span>
                  <span className="who">{r.who}</span>
                  <span className="more">{r.more}</span>
                </li>
              ))}
            </ul>
            <A className="more-link" href={RECORD.more.href}>{RECORD.more.label}</A>
          </div>
        </section>

        <section className="sec drive" id="drive" data-stop aria-labelledby="drive-h">
          <div className="field">
            <h2 id="drive-h" className="title" data-rise>{DRIVE.title}</h2>
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <dl className="items">
              {DRIVE.items.map((it) => (
                <div key={it.term} className="item" onPointerEnter={aim} onPointerLeave={unaim} data-rise>
                  <dt>{it.term}</dt>
                  <dd>{it.text}</dd>
                </div>
              ))}
            </dl>
            <A className="more-link" href={DRIVE.more.href}>{DRIVE.more.label}</A>
          </div>
        </section>

        <section className="sec people" id="people" data-stop aria-labelledby="people-h">
          <div className="field">
            <h2 id="people-h" className="title" data-rise>{PEOPLE.title}</h2>
            <ul className="coaches">
              {PEOPLE.coaches.map((c) => (
                <li key={c.name} data-rise>
                  <span className="name">{c.name}</span>
                  <span className="role">{c.role}</span>
                  <span className="bio">{c.bio}</span>
                </li>
              ))}
            </ul>
            <p className="count" data-rise>{PEOPLE.count}</p>
            <A className="more-link" href={PEOPLE.more.href}>{PEOPLE.more.label}</A>
          </div>
        </section>

        <section className="sec join" id="join" aria-labelledby="join-h">
          <div className="window" aria-hidden="true" />
          <div className="field wide" data-stop>
            <div className="join-head">
              <h2 id="join-h" className="title">{JOIN.title}</h2>
              <p className="lead">{JOIN.lead}</p>
            </div>
            <ol className="paths">
              {JOIN.paths.map((p) => (
                <li key={p.id} className="path" onPointerEnter={aim} onPointerLeave={unaim}>
                  <A className="path-name" href={p.href} onFocus={aim} onBlur={unaim}>{p.name}</A>
                  <p className="path-line">{p.line}</p>
                  {p.text.map((t) => <p key={t} className="path-text">{t}</p>)}
                </li>
              ))}
            </ol>
            <div className="after">
              <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A></p>
              <p>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A></p>
              <p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
              <p>{JOIN.discord}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="foot-in">
          <p className="foot-line">{FOOTER.line}</p>
          <svg className="foot-q" viewBox="-500 -800 1000 1600" aria-hidden="true"><path d={MARKS.italic.d} /></svg>
          <ul className="foot-links">
            {FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}
          </ul>
          <ul className="foot-pages">
            {FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}
          </ul>
          <p className="small">Draft 2, version 83. Not the live site.</p>
        </div>
      </footer>
    </div>
  );
}
