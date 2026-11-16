// Version 65: the link. A heavy steel chain coiled into a question mark on a paper sweep.
// Every argument is a chain of links; open one and everything after it falls.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/archivo/wdth.css';
import './link.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import MARKS from '@/lib/marks.json';
import { useRise } from '@/lib/motion';
import { gsap } from '@/lib/scroll';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { link } from './store';

const Scene = lazy(() => import('./Scene'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

function FlatMark() {
  const m = MARKS.italic;
  return (
    <svg className="flat" viewBox={`0 0 ${m.w} ${m.h}`} role="img" aria-label="A question mark">
      <path d={m.d} />
    </svg>
  );
}

export default function Link() {
  useVersion('link');
  const root = useRef<HTMLDivElement>(null);
  const heroSlot = useRef<HTMLDivElement>(null), joinSlot = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLParagraphElement>(null);
  const [webgl] = useState(hasWebGL);
  const [low] = useState(() => isPhone());
  const [open, setOpen] = useState(still || !webgl);
  const [said, setSaid] = useState('');
  useRise(root);

  useEffect(() => {
    link.heroSlot = heroSlot.current; link.joinSlot = joinSlot.current; link.joinSec = document.getElementById('join'); link.phone = isPhone();
    const onResize = () => { link.phone = isPhone(); };
    window.addEventListener('resize', onResize);
    const t = setTimeout(() => setOpen(true), still || !webgl ? 0 : 700);
    link.onHover = (on) => root.current?.classList.toggle('is-hot', on);
    link.onOpen = (x, y) => {
      setSaid('No link.');
      const el = flash.current; if (!el) return;
      el.style.left = `${Math.min(Math.max(x, 90), window.innerWidth - 120)}px`;
      el.style.top = `${Math.max(y - 30, 70)}px`;
      el.classList.add('on');
      window.setTimeout(() => el.classList.remove('on'), 1900);
    };
    // As the hook takes the chain up, the opening words step aside for it.
    const heroText = root.current?.querySelector<HTMLElement>('.hero-text');
    const fade = () => {
      if (!heroText || still || !webgl) return;
      const f = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.55)));
      heroText.style.opacity = f > 0 ? String(1 - f) : '';
    };
    gsap.ticker.add(fade);
    return () => { gsap.ticker.remove(fade); clearTimeout(t); window.removeEventListener('resize', onResize); link.onOpen = null; link.onHover = null; link.heroSlot = link.joinSlot = link.joinSec = null; };
  }, [webgl]);

  const live3d = webgl;

  return (
    <div ref={root} className={`v-link${open ? ' is-open' : ''}${live3d ? ' has-3d' : ''}${still ? ' is-still' : ''}`}>
      <a className="skip-x" href="#main">Skip to the page</a>
      <div className="stage" aria-hidden={live3d ? true : undefined}>
        {live3d && <Suspense fallback={null}><Scene low={low} /></Suspense>}
      </div>
      <p ref={flash} className="nolink" aria-hidden>No link.</p>
      <p className="sr-only-x" aria-live="polite">{said}</p>

      <header className="top">
        <a className="brand" href="#main" aria-label="Skeptical, top of the page">{SITE.name}<span aria-hidden>?</span></a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </header>

      <main id="main">
        <section className="sec hero" aria-labelledby="l-h1">
          <div className="slot hero-slot" ref={heroSlot}>{!live3d && <FlatMark />}</div>
          <div className="hero-text">
            <h1 id="l-h1" className="h1">
              <span className="sr-only-x">{SITE.heading}</span>
              <span aria-hidden className="word">{SITE.name}</span>
            </h1>
            <p className="pitch">{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</p>
            <ul className="statement">{HERO.statement.map((l) => <li key={l}>{l}</li>)}</ul>
            <div className="doors">
              {HERO.doors.map((d) => <A key={d.label} href={d.href} className="door"><span>{d.label}</span><svg aria-hidden viewBox="0 0 40 16" className="arr"><path d="M0 8h36M29 1l7 7-7 7" /></svg></A>)}
            </div>
            {live3d && !still && (
              <div className="keys" role="group" aria-label="The chain">
                <button type="button" onClick={() => { link.openReq = -1; }}>Open a link</button>
                <button type="button" onClick={() => { link.shakeReq = true; }}>Shake the chain</button>
              </div>
            )}
          </div>
        </section>

        <section className="sec manifesto" aria-label="What we are">
          <div className="col">
            {MANIFESTO.map((l) => <p key={l} className="mline" data-rise>{l}</p>)}
          </div>
        </section>

        <section className="sec record" id="record" aria-labelledby="l-record">
          <div className="col">
            <h2 id="l-record" className="h2" data-rise>{RECORD.title}</h2>
            <p className="rule" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise><span>{RECORD.when}</span><span className="ename">{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ol className="results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <span className="what">{r.what}</span>
                  <span className="who">{r.who}</span>
                  <span className="more">{r.more}</span>
                </li>
              ))}
            </ol>
            <A href={RECORD.more.href} className="more-link">{RECORD.more.label}</A>
          </div>
        </section>

        <section className="sec drive" id="drive" aria-labelledby="l-drive">
          <div className="col">
            <h2 id="l-drive" className="h2" data-rise>{DRIVE.title}</h2>
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <dl className="items">
              {DRIVE.items.map((it) => (
                <div key={it.term} className="item" data-rise><dt>{it.term}</dt><dd>{it.text}</dd></div>
              ))}
            </dl>
            <A href={DRIVE.more.href} className="more-link">{DRIVE.more.label}</A>
          </div>
        </section>

        <section className="sec people" id="people" aria-labelledby="l-people">
          <div className="col">
            <h2 id="l-people" className="h2" data-rise>{PEOPLE.title}</h2>
            {PEOPLE.coaches.map((c) => (
              <article key={c.name} className="coach" data-rise>
                <h3 className="cname">{c.name}</h3>
                <p className="role">{c.role}</p>
                <p className="bio">{c.bio}</p>
              </article>
            ))}
            <p className="count" data-rise>{PEOPLE.count}</p>
            <A href={PEOPLE.more.href} className="more-link">{PEOPLE.more.label}</A>
          </div>
        </section>

        <section className="sec join" id="join" aria-labelledby="l-join">
          <div className="join-top">
            <div className="slot join-slot" ref={joinSlot}>{!live3d && <FlatMark />}</div>
            <div className="join-head">
              <h2 id="l-join" className="h2 jtitle">{JOIN.title}</h2>
              <p className="lead">{JOIN.lead}</p>
            </div>
          </div>
          <ol className="paths">
            {JOIN.paths.map((p) => (
              <li key={p.id} className="path">
                <A href={p.href} className="pname"><span>{p.name}</span><svg aria-hidden viewBox="0 0 40 16" className="arr"><path d="M0 8h36M29 1l7 7-7 7" /></svg></A>
                <p className="pline">{p.line}</p>
                <ul className="ptext">{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
              </li>
            ))}
          </ol>
          <div className="small">
            <p>{JOIN.already.before}<A href={JOIN.already.href} className="inl">{JOIN.already.label}</A></p>
            <p>{JOIN.coach.before}<A href={JOIN.coach.href} className="inl">{JOIN.coach.label}</A></p>
            <p>{JOIN.also} <A href={`mailto:${SITE.email}`} className="inl">{SITE.email}</A></p>
            <p>{JOIN.discord}</p>
          </div>
        </section>
      </main>

      <footer className="foot">
        <p className="fline">{FOOTER.line}</p>
        <div className="frow">
          <ul className="flinks">{FOOTER.links.map((l) => <li key={l.label}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul className="fpages">{FOOTER.pages.map((l) => <li key={l.label}><A href={l.href}>{l.label}</A></li>)}</ul>
        </div>
        <p className="draft">Draft 2, version 65. Not the live site.</p>
      </footer>
    </div>
  );
}
