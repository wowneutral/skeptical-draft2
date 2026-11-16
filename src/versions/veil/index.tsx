// Version 44: the veil. The moment before an unveiling. A question mark in
// black stone stands under a heavy silk sheet; you pull the sheet off.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './veil.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import MARKS from '@/lib/marks.json';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { veil } from './cloth';

const Scene = lazy(() => import('./Scene'));

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

const Arrow = () => (
  <svg className="arr" viewBox="0 0 28 12" aria-hidden="true"><path d="M0 6h26M21 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
);

const Mark = ({ className }: { className?: string }) => {
  const m = MARKS.italic;
  return (
    <svg className={className} viewBox={`-480 -740 ${m.w + 20} ${m.h + 20}`} aria-hidden="true"><path d={m.d} fill="currentColor" /></svg>
  );
};

export default function Veil() {
  useVersion('veil');
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const [covered, setCovered] = useState(!still);
  const [way, setWay] = useState(0);
  useRise(root);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    veil.covered = !still; veil.house = 1; veil.want = null; veil.busy = false;
    veil.onCovered = (c) => setCovered(c);
    return () => { window.removeEventListener('resize', on); veil.onCovered = null; };
  }, []);

  useGSAP(() => {
    const born = performance.now();
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    if (!still) {
      gsap.from('.v-veil [data-open]', { yPercent: 40, opacity: 0, duration: 1.4, ease: 'out', stagger: 0.12, delay: 0.5 });
      gsap.from('.v-veil .stage', { opacity: 0, duration: 1.6, ease: 'power2.out', delay: 0.1 });
    }
    // The drive is sealed: each line sits under a strip of the same silk until it comes into view.
    if (!still) {
      root.current?.classList.add('sealing');
      ScrollTrigger.batch('.v-veil .sealed li', { start: 'top 82%', once: true, onEnter: (els) => els.forEach((el, i) => setTimeout(() => el.classList.add('open'), i * 140)) });
    }
    // While the drive is read, the house light closes down to a narrow pool.
    ScrollTrigger.create({ trigger: '#drive', start: 'top 55%', end: 'bottom 45%', onToggle: (st) => { veil.house = st.isActive ? 0.45 : 1; } });
    // At Join the sheet lifts on a draught of its own and settles back.
    ScrollTrigger.create({
      trigger: '#join', start: 'top 75%',
      onEnter: () => { if (!still && window.scrollY > 400 && performance.now() - born > 2500) veil.want = 'draught'; },
    });
  }, { scope: root });

  const pull = () => { veil.want = covered ? 'unveil' : 'cover'; setCovered(!covered); };

  return (
    <div className="v-veil" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>

      <aside className="stage" aria-label="The object">
        {webgl ? (
          <div className="canvas" role="img" aria-label="A question mark in black stone on a low plinth, under a white silk sheet.">
            <Suspense fallback={null}><Scene phone={phone} /></Suspense>
          </div>
        ) : (
          <div className="flat" role="img" aria-label="A question mark in black stone."><Mark /></div>
        )}
      </aside>

      <main id="main" className="col">
        <section className="hero" aria-labelledby="pitch">
          <div className="window hero-window">
            {webgl && !still && (
              <div className="ctl">
                <button type="button" className="pull" onClick={pull} data-off={covered ? undefined : ''}>{covered ? 'Unveil' : 'Cover it'}</button>
                <p className="hint">Or take hold of the sheet.</p>
              </div>
            )}
          </div>
          <div className="panel hero-panel">
            <header className="top" data-open>
              <a className="word" href="#main"><Mark className="wm" /><span>{SITE.name}</span></a>
              <nav aria-label="Sections">
                {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
              </nav>
            </header>
            <h1 id="pitch">
              <span className="sr-only-x">{SITE.name}. </span>
              <span className="l1" data-open>{HERO.pitch[0]}</span>
              <span className="l2" data-open>{HERO.pitch[1]}</span>
            </h1>
            <p className="statement" data-open>
              {HERO.statement.map((s) => <span key={s}>{s}</span>)}
            </p>
            <div className="doors" data-open>
              {HERO.doors.map((d) => <A key={d.href} className="door" href={d.href}><span>{d.label}</span><Arrow /></A>)}
            </div>
          </div>
        </section>

        <div className="window" aria-hidden="true" />

        <section className="panel manifesto" aria-label="What we are">
          <ol>
            {MANIFESTO.map((m) => <li key={m} data-rise><Mark className="bullet" /><span>{m}</span></li>)}
          </ol>
        </section>

        <div className="window" aria-hidden="true" />

        <section className="panel record" id="record" aria-labelledby="record-h">
          <h2 id="record-h" data-rise>{RECORD.title}</h2>
          <p className="rule" data-rise>{RECORD.rule}</p>
          <p className="event" data-rise><span>{RECORD.when}</span><span className="ev-name">{RECORD.name}</span><span>{RECORD.where}</span></p>
          <ul className="results">
            {RECORD.results.map((r) => (
              <li key={r.who} data-rise>
                <span className="who">{r.who}</span>
                <span className="what">{r.what}</span>
                <span className="more">{r.more}</span>
              </li>
            ))}
          </ul>
          <A className="more-link" href={RECORD.more.href}><span>{RECORD.more.label}</span><Arrow /></A>
        </section>

        <section className="panel drive" id="drive" aria-labelledby="drive-h">
          <h2 id="drive-h" data-rise>{DRIVE.title}</h2>
          <p className="lead" data-rise>{DRIVE.lead}</p>
          <ol className="sealed">
            {DRIVE.items.map((d, i) => (
              <li key={d.term} data-rise>
                <span className="no" aria-hidden="true">{String(i + 1)}</span>
                <span className="term">{d.term}</span>
                <span className="txt">{d.text}</span>
              </li>
            ))}
          </ol>
          <A className="more-link" href={DRIVE.more.href}><span>{DRIVE.more.label}</span><Arrow /></A>
        </section>

        <div className="window" aria-hidden="true" />

        <section className="panel people" id="people" aria-labelledby="people-h">
          <h2 id="people-h" data-rise>{PEOPLE.title}</h2>
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
          <A className="more-link" href={PEOPLE.more.href}><span>{PEOPLE.more.label}</span><Arrow /></A>
        </section>

        <div className="window join-window" aria-hidden="true" />

        <section className="panel join" id="join" aria-labelledby="join-h">
          <h2 id="join-h" data-rise>{JOIN.title}</h2>
          <p className="lead" data-rise>{JOIN.lead}</p>
          <div className="ways">
            {JOIN.paths.map((p, i) => (
              <article key={p.id} className="way" data-on={way === i ? '' : undefined} data-rise>
                <h3>
                  <button type="button" aria-expanded={way === i} aria-controls={`way-${p.id}`} onClick={() => setWay(i)}>
                    <span className="nm">{p.name}</span>
                    <span className="ln">{p.line}</span>
                  </button>
                </h3>
                <div className="body" id={`way-${p.id}`}>
                  <p className="first">{p.text[0]}</p>
                  {way === i && p.text.slice(1).map((t) => <p key={t}>{t}</p>)}
                  <A className="go" href={p.href}><span>{p.name}</span><Arrow /></A>
                </div>
              </article>
            ))}
          </div>
          <div className="after" data-rise>
            <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A></p>
            <p>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A></p>
            <p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
            <p>{JOIN.discord}</p>
          </div>
        </section>

        <div className="window end-window" aria-hidden="true" />

        <footer className="panel foot">
          <p className="fline">{FOOTER.line}</p>
          <ul className="links">
            {FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}
          </ul>
          <ul className="pages">
            {FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}
          </ul>
          <p className="draft">Draft 2, version 44. Not the live site.</p>
        </footer>
      </main>
    </div>
  );
}
