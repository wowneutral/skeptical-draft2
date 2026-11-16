// Version 62: the vein. A block of white marble on a black plinth. Every section cuts one slice off,
// and the black vein inside gathers into a question mark. At Join the block opens at the centre cut.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/index.css';
import './vein.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import MARKS from '@/lib/marks.json';
import { gsap } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { nudge, resetVs, vs } from './state';

const Scene = lazy(() => import('./Scene'));
const ext = (href: string) => (href.startsWith('http') ? { rel: 'noopener' } : {});

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const Arrow = () => (
  <svg className="arr" viewBox="0 0 24 12" aria-hidden="true"><path d="M0 6h22M17 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
);

/** Without WebGL: the block drawn flat, open at the centre cut. */
function Flat() {
  const M = MARKS.roman;
  return (
    <svg className="flat" viewBox="-1300 -1150 2600 1700" aria-hidden="true">
      <rect x="-1220" y="-1080" width="1180" height="1500" fill="#e2ddd3" />
      <rect x="40" y="-1080" width="1180" height="1500" fill="#e2ddd3" />
      <path d={M.d} transform="translate(-630 -300) scale(-0.62 0.62)" fill="#111" />
      <path d={M.d} transform="translate(630 -300) scale(0.62 0.62)" fill="#111" />
      <rect x="-1300" y="420" width="2600" height="130" fill="#161615" />
    </svg>
  );
}

export default function Vein() {
  useVersion('vein');
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [shown, setShown] = useState(false);
  useRise(root);

  // The stone fades up once its first frame is drawn.
  useEffect(() => {
    resetVs();
    vs.onReady = () => setShown(true);
    const t = setTimeout(() => setShown(true), 6000);
    return () => { clearTimeout(t); vs.onReady = null; };
  }, []);

  // Which part of the site is being read decides how far the stone is cut.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const secs = Array.from(el.querySelectorAll<HTMLElement>('[data-stop]'));
    let last = -1;
    const tick = () => {
      const vh = window.innerHeight, phone = isPhone();
      let cur = 0;
      secs.forEach((s) => {
        const n = Number(s.dataset.stop);
        const line = n === 5 ? vh * (phone ? 0.75 : 0.62) : n === 6 ? vh * (phone ? 0.8 : 0.55) : vh * (phone ? 0.72 : 0.5);
        if (s.getBoundingClientRect().top < line) cur = n;
      });
      if (cur !== last) { last = cur; vs.stop = cur; vs.delta = 0; el.dataset.stop = String(cur); }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <div className="v-vein" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>

      <aside className={'stone' + (shown || !webgl ? ' on' : '')} aria-label="The stone">
        {webgl ? (
          <Suspense fallback={null}><Scene /></Suspense>
        ) : <Flat />}
        {webgl && !still && (
          <div className="keys">
            <button type="button" onClick={() => nudge(1)}>Cut the next slice</button>
            <button type="button" onClick={() => nudge(-1)}>Put a slice back</button>
          </div>
        )}
      </aside>

      <main id="main">
        <section className="sec hero" data-stop="0" aria-labelledby="pitch">
          <div className="col">
            <header className="mast">
              <a className="word" href="#main" aria-label="Skeptical, top of the page">Skeptical<span aria-hidden="true">?</span></a>
              <nav aria-label="Sections">
                {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
              </nav>
            </header>
            <h1 id="pitch" className="pitch">
              <span className="sr-only-x">{SITE.heading}. </span>
              {HERO.pitch.map((l, i) => <span key={i} className={'pl pl' + i}>{l}</span>)}
            </h1>
            <ul className="statement">
              {HERO.statement.map((l) => <li key={l}>{l}</li>)}
            </ul>
            <div className="doors">
              {HERO.doors.map((d, i) => (
                <a key={d.href} className={i === 0 ? 'door first' : 'door'} href={d.href} {...ext(d.href)}>
                  <span>{d.label}</span><Arrow />
                </a>
              ))}
            </div>
            {webgl && !still && <p className="hint">{isPhone() ? 'Swipe the stone to cut it.' : 'Drag the stone to cut it.'}</p>}
          </div>
        </section>

        <section className="sec mani" data-stop="1" aria-label="What we are">
          <div className="col">
            {MANIFESTO.map((l, i) => <p key={i} className="ml" data-rise>{l}</p>)}
          </div>
        </section>

        <section className="sec record" id="record" data-stop="2" aria-labelledby="record-h">
          <div className="col">
            <h2 id="record-h" className="big" data-rise>{RECORD.title}</h2>
            <p className="rule" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise>
              <span>{RECORD.when}</span>
              <span className="ev-name">{RECORD.name}</span>
              <span>{RECORD.where}</span>
            </p>
            <ol className="results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <span className="what">{r.what}</span>
                  <span className="who">{r.who}</span>
                  <span className="more">{r.more}</span>
                </li>
              ))}
            </ol>
            <a className="link" href={RECORD.more.href} {...ext(RECORD.more.href)} data-rise><span>{RECORD.more.label}</span><Arrow /></a>
          </div>
        </section>

        <section className="sec drive" id="drive" data-stop="3" aria-labelledby="drive-h">
          <div className="col">
            <h2 id="drive-h" className="big" data-rise>{DRIVE.title}</h2>
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <dl className="items">
              {DRIVE.items.map((it) => (
                <div key={it.term} className="item" data-rise>
                  <dt>{it.term}</dt>
                  <dd>{it.text}</dd>
                </div>
              ))}
            </dl>
            <a className="link" href={DRIVE.more.href} {...ext(DRIVE.more.href)} data-rise><span>{DRIVE.more.label}</span><Arrow /></a>
          </div>
        </section>

        <section className="sec people" id="people" data-stop="4" aria-labelledby="people-h">
          <div className="col">
            <h2 id="people-h" className="big" data-rise>{PEOPLE.title}</h2>
            {PEOPLE.coaches.map((c) => (
              <article key={c.name} className="coach" data-rise>
                <p className="role">{c.role}</p>
                <h3>{c.name}</h3>
                <p className="bio">{c.bio}</p>
              </article>
            ))}
            <p className="count" data-rise>{PEOPLE.count}</p>
            <a className="link" href={PEOPLE.more.href} {...ext(PEOPLE.more.href)} data-rise><span>{PEOPLE.more.label}</span><Arrow /></a>
          </div>
        </section>

        <section className="sec join" id="join" data-stop="5" aria-labelledby="join-h">
          <div className="gap" aria-hidden="true" />
          <div className="panel">
            <div className="join-head">
              <h2 id="join-h" className="big" data-rise>{JOIN.title}</h2>
              <p className="lead" data-rise>{JOIN.lead}</p>
            </div>
            <ol className="paths">
              {JOIN.paths.map((p, i) => (
                <li key={p.id} className="path" data-rise>
                  <a className="path-a" href={p.href} {...ext(p.href)}>
                    <span className="pn">0{i + 1}</span>
                    <span className="pname">{p.name}</span>
                    <span className="pline">{p.line}</span>
                    <Arrow />
                  </a>
                  <ul className="ptext">
                    {p.text.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                </li>
              ))}
            </ol>
            <div className="after" data-rise>
              <p>{JOIN.already.before}<a href={JOIN.already.href} {...ext(JOIN.already.href)}>{JOIN.already.label}</a></p>
              <p>{JOIN.coach.before}<a href={JOIN.coach.href} {...ext(JOIN.coach.href)}>{JOIN.coach.label}</a></p>
              <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
              <p>{JOIN.discord}</p>
            </div>
          </div>
        </section>

        <footer className="sec end" data-stop="6">
          <div className="gap" aria-hidden="true" />
          <div className="panel">
            <p className="fline">{FOOTER.line}</p>
            <ul className="flinks">
              {FOOTER.links.map((l) => <li key={l.href}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}
            </ul>
            <ul className="fpages">
              {FOOTER.pages.map((l) => <li key={l.href}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}
            </ul>
            <p className="draft">Draft 2, version 62. Not the live site. The stone and its vein are drawn in the browser.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
