// Version 99: the tablet. Two bone leaves of black wax on dark stone. What is
// cut into the wax gets smoothed away and cut again, section by section.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/index.css';
import './tablet.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { ScrollTrigger } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { T, cutWay, goTo, initWax, smoothAll, tug, userCut } from './director';
import { CH, CW } from './wax';

const Scene = lazy(() => import('./Scene'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

export default function Tablet() {
  useVersion('tablet');
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(() => { const ok = hasWebGL(); if (ok) initWax(); return ok; });
  const [open, setOpen] = useState<boolean[]>([false, false, false]);
  const [sec, setSec] = useState(0);
  const pen = useRef({ x: CW / 2, y: CH / 2 });
  useRise(root);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // Each section takes the tablet somewhere: opened, smoothed, cut, closed and tied.
  useEffect(() => {
    const el = root.current; if (!el) return;
    if (webgl && T.section === -1) {
      goTo(0);
      if (!still) T.jobs.unshift({ k: 'wait', t: 0, d: 0.8 });
    }
    const line = phone ? '72%' : '55%';
    const st = Array.from(el.querySelectorAll<HTMLElement>('[data-sec]')).map((s) =>
      ScrollTrigger.create({
        trigger: s, start: `top ${line}`, end: `bottom ${line}`,
        onToggle: (self) => {
          if (!self.isActive) return;
          const n = Number(s.dataset.sec);
          setSec(n);
          if (webgl && n !== T.section) { goTo(n); setOpen([false, false, false]); }
        },
      }),
    );
    return () => st.forEach((t) => t.kill());
  }, [phone, webgl]);

  const press = (i: number) => {
    setOpen((o) => o.map((v, k) => (k === i ? true : v)));
    if (webgl) cutWay(i);
  };

  // The keyboard path to the wax: arrows cut a line, Enter tries the cord.
  const onKey = (e: React.KeyboardEvent) => {
    if (!webgl) return;
    if (e.key === 'Enter' || e.key === ' ') { if (T.h < 0.05) { e.preventDefault(); tug(); } return; }
    const d = ({ ArrowLeft: [-40, 0], ArrowRight: [40, 0], ArrowUp: [0, -40], ArrowDown: [0, 40] } as Record<string, [number, number]>)[e.key];
    if (!d || T.h < 0.98) return;
    e.preventDefault();
    const p = pen.current;
    const nx = Math.min(CW - 30, Math.max(30, p.x + d[0])), ny = Math.min(CH - 30, Math.max(30, p.y + d[1]));
    userCut(1, p.x, p.y, nx, ny);
    p.x = nx; p.y = ny;
    T.ptr.on = true; T.ptr.leaf = 1; T.ptr.x = nx; T.ptr.y = ny; T.ptr.down = true;
  };

  const closed = sec === 3 || sec === 4;

  return (
    <div className={`v-tablet${phone ? ' is-phone' : ''}${webgl ? '' : ' no-gl'}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>

      {webgl && (
        <aside
          className={`stage${closed && !still ? ' shut' : ''}`}
          aria-label={closed && !still ? 'The wax tablet, tied shut with a cord' : 'The wax tablet. Drag across the wax, or use the arrow keys, to cut it.'}
          tabIndex={0}
          onKeyDown={onKey}
          onKeyUp={() => { T.ptr.down = false; }}
          onBlur={() => { T.ptr.on = false; T.ptr.down = false; }}
          onPointerUp={() => { T.ptr.down = false; }}
          onClick={() => { if (closed) tug(); }}
        >
          <Suspense fallback={null}><Scene phone={phone} /></Suspense>
        </aside>
      )}

      <main id="main" className="col">
        <header className="sec hero" data-sec="0">
          <p className="mark" aria-hidden="true">{SITE.name}<span>?</span></p>
          <h1 className="pitch">
            <span className="sr-only-x">{SITE.name}. </span>
            {HERO.pitch.map((l) => <span key={l} className="ln">{l}</span>)}
          </h1>
          <p className="statement" data-rise>{HERO.statement.map((l) => <span key={l}>{l}</span>)}</p>
          <nav className="doors" aria-label="Ways in" data-rise>
            {HERO.doors.map((d) => <A key={d.label} className="door" href={d.href}>{d.label}<i aria-hidden="true" /></A>)}
          </nav>
          {webgl && !phone && <p className="hint" data-rise>The pointer is the stylus. Cut the wax.</p>}
          {webgl && phone && <p className="hint" data-rise>Drag across the wax to cut it.</p>}
        </header>

        <section className="sec manifesto" data-sec="1" aria-label="What we are">
          {MANIFESTO.map((l) => <p key={l} data-rise>{l}</p>)}
        </section>

        <section className="sec record" id="record" data-sec="2" aria-labelledby="h-record">
          <h2 id="h-record" className="title">{RECORD.title}</h2>
          <p className="lede" data-rise>{RECORD.rule}</p>
          <p className="event" data-rise>
            <span className="ev-name">{RECORD.name}</span>
            <span className="ev-meta">{RECORD.when}. {RECORD.where}.</span>
          </p>
          <ol className="results">
            {RECORD.results.map((r) => (
              <li key={r.who} data-rise>
                <span className="who">{r.who}</span>
                <span className="what">{r.what}</span>
                <span className="more">{r.more}</span>
              </li>
            ))}
          </ol>
          <A className="more-link" href={RECORD.more.href}>{RECORD.more.label}</A>
        </section>

        <section className="sec drive" id="drive" data-sec="3" aria-labelledby="h-drive">
          <h2 id="h-drive" className="title">{DRIVE.title}</h2>
          <p className="lede" data-rise>{DRIVE.lead}</p>
          <dl className="items">
            {DRIVE.items.map((d) => (
              <div key={d.term} data-rise>
                <dt>{d.term}</dt>
                <dd>{d.text}</dd>
              </div>
            ))}
          </dl>
          <A className="more-link" href={DRIVE.more.href}>{DRIVE.more.label}</A>
        </section>

        <section className="sec people" id="people" data-sec="4" aria-labelledby="h-people">
          <h2 id="h-people" className="title">{PEOPLE.title}</h2>
          {PEOPLE.coaches.map((c) => (
            <article key={c.name} className="coach" data-rise>
              <h3>{c.name}</h3>
              <p className="role">{c.role}</p>
              <p>{c.bio}</p>
            </article>
          ))}
          <p className="count" data-rise>{PEOPLE.count}</p>
          <A className="more-link" href={PEOPLE.more.href}>{PEOPLE.more.label}</A>
        </section>

        <section className="sec join" id="join" data-sec="5" aria-labelledby="h-join">
          <h2 id="h-join" className="title">{JOIN.title}</h2>
          <p className="lede" data-rise>{JOIN.lead}</p>
          <div className="paths">
            {JOIN.paths.map((p, i) => (
              <article key={p.id} className={`path${open[i] ? ' is-open' : ''}`} data-rise>
                <h3>
                  <button type="button" className="cut-btn" aria-expanded={open[i]} aria-controls={`way-${p.id}`} onClick={() => press(i)}>
                    {p.name}<span className="sr-only-x">: cut it into the wax</span>
                  </button>
                </h3>
                <A className="path-line" href={p.href}>{p.line}</A>
                <p className="first">{p.text[0]}</p>
                <div className="rest" id={`way-${p.id}`} hidden={!open[i]}>
                  {p.text.slice(1).map((t) => <p key={t}>{t}</p>)}
                </div>
              </article>
            ))}
          </div>
          <p className="small" data-rise>
            {JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>.{' '}
            {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.
          </p>
          <p className="small" data-rise>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
          <p className="small" data-rise>{JOIN.discord}</p>
        </section>

        <footer className="sec end" data-sec="6">
          <p className="last">{FOOTER.line}</p>
          {webgl && <button type="button" className="smooth-btn" onClick={smoothAll}>Smooth the wax</button>}
          <ul className="links">
            {FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}
          </ul>
          <ul className="pages">
            {FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}
          </ul>
          <p className="draft">Draft 2, version 99. Not the live site.</p>
        </footer>
      </main>
    </div>
  );
}
