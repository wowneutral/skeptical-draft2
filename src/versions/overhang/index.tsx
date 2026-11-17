// Version 88: the overhang. Eight blocks of bone marble lean out past the edge of
// a black plinth, each as far as the weight above allows. Every argument rests on
// the ones under it; push one a hair too far and the stack comes down, then rebuilds.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/wdth.css';
import './overhang.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { useRise } from '@/lib/motion';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { H, L, S, centreX } from './stack';

const Scene = lazy(() => import('./Scene'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** The stack as a flat elevation, for a browser without WebGL. */
function FlatStack() {
  const k = 60;
  return (
    <svg className="ov-flat" viewBox="-260 -540 520 600" role="img" aria-label="Eight blocks stacked past the edge of a plinth">
      <rect x={-900} y={0} width={900} height={60} className="pl" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={(centreX(i, 8) - L / 2) * k} y={-(i + 1) * H * k} width={L * k - 1} height={H * k - 1} className="bk" />
      ))}
    </svg>
  );
}

export default function Overhang() {
  useVersion('overhang');
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  useRise(root);
  useEffect(() => { (window as unknown as { __overhang: typeof S }).__overhang = S; }, []);

  useEffect(() => {
    S.phone = phone;
    const measure = () => {
      const p = isPhone();
      S.phone = p; setPhone(p);
      const els = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-stop]') ?? []);
      const vh = window.innerHeight, max = document.documentElement.scrollHeight - vh;
      let last = 0;
      S.anchors = els.map((el, i) => {
        const r = el.getBoundingClientRect(), top = r.top + window.scrollY;
        const a = i === 0 ? 0 : Math.min(max, Math.max(last + 1, top + Math.min(r.height, vh * 1.2) / 2 - vh / 2));
        last = a; return a;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (root.current) ro.observe(root.current);
    window.addEventListener('resize', measure);
    const t = setTimeout(measure, 600);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); clearTimeout(t); };
  }, [phone]);

  const push = () => { S.push = performance.now(); };

  return (
    <div className="v-overhang" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <aside className="ov-stage" aria-label="The stack">
        <div className="ov-fill" role="img" aria-label="Eight blocks of bone marble stacked past the edge of a black plinth, the top one entirely over empty air.">
          {webgl ? (
            <Suspense fallback={null}><Scene phone={phone} /></Suspense>
          ) : <FlatStack />}
        </div>
      </aside>

      <header className="ov-top">
        <a className="ov-mark" href="#main" aria-label="Skeptical, top of the page">Skeptical<i>?</i></a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </header>

      <main id="main">
        <section className="ov-sec ov-hero" data-stop>
          <div className="ov-col">
            <h1 className="ov-h1">
              <span className="w">{SITE.name}</span>
              <span className="sr-only-x">{SITE.heading.slice(SITE.name.length)}</span>
            </h1>
            <p className="ov-pitch">{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</p>
            <p className="ov-state">{HERO.statement.map((l) => <span key={l}>{l}</span>)}</p>
            <div className="ov-doors">
              {HERO.doors.map((d, i) => <A key={d.href} href={d.href} className={i === 0 ? 'ov-door on' : 'ov-door'}>{d.label}</A>)}
            </div>
            {webgl && !still && (
              <button type="button" className="ov-try" onClick={push}>
                Drag a block. Or push one too far.
              </button>
            )}
          </div>
        </section>

        <section className="ov-sec ov-man" data-stop aria-label="What we are">
          <div className="ov-col">
            <ol className="ov-lines">
              {MANIFESTO.map((l, i) => <li key={l} data-rise className={i === 1 ? 'hi' : undefined}>{l}</li>)}
            </ol>
          </div>
        </section>

        <section className="ov-sec ov-rec" id="record" data-stop>
          <div className="ov-col">
            <h2 className="ov-kick" data-rise>{RECORD.title}</h2>
            <p className="ov-rule" data-rise>{RECORD.rule}</p>
            <p className="ov-event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ul className="ov-results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <span className="who">{r.who}</span>
                  <span className="what">{r.what}</span>
                  <span className="more">{r.more}</span>
                </li>
              ))}
            </ul>
            <A className="ov-more" href={RECORD.more.href}>{RECORD.more.label}</A>
          </div>
        </section>

        <section className="ov-sec ov-drive" id="drive" data-stop>
          <div className="ov-col">
            <h2 className="ov-kick" data-rise>{DRIVE.title}</h2>
            <p className="ov-lead" data-rise>{DRIVE.lead}</p>
            <dl className="ov-items">
              {DRIVE.items.map((d) => (
                <div key={d.term} data-rise>
                  <dt>{d.term}</dt>
                  <dd>{d.text}</dd>
                </div>
              ))}
            </dl>
            <A className="ov-more" href={DRIVE.more.href}>{DRIVE.more.label}</A>
          </div>
        </section>

        <section className="ov-sec ov-ppl" id="people" data-stop>
          <div className="ov-col">
            <h2 className="ov-kick" data-rise>{PEOPLE.title}</h2>
            {PEOPLE.coaches.map((c) => (
              <article key={c.name} className="ov-coach" data-rise>
                <h3>{c.name}</h3>
                <p className="role">{c.role}</p>
                <p className="bio">{c.bio}</p>
              </article>
            ))}
            <p className="ov-count" data-rise>{PEOPLE.count}</p>
            <A className="ov-more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A>
          </div>
        </section>

        <section className="ov-sec ov-join" id="join" data-stop>
          <div className="ov-wide">
            <div className="ov-joinhead">
              <h2 className="ov-big" data-rise>{JOIN.title}</h2>
              <p className="ov-lead" data-rise>{JOIN.lead}</p>
            </div>
            <div className="ov-paths">
              {JOIN.paths.map((p) => (
                <article key={p.id} className="ov-path" data-rise>
                  <h3><A href={p.href}>{p.name}</A></h3>
                  <p className="line">{p.line}</p>
                  <ul>{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
                  <A className="ov-go" href={p.href}>{p.name}<span aria-hidden="true"> &#8594;</span></A>
                </article>
              ))}
            </div>
            <div className="ov-after" data-rise>
              <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A></p>
              <p>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A></p>
              <p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
              <p>{JOIN.discord}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="ov-sec ov-foot" data-stop>
        <div className="ov-wide">
          <p className="ov-last">{FOOTER.line}</p>
          <ul className="ov-links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul className="ov-pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <p className="ov-draft">Draft 2, version 88. Not the live site. Set in Bodoni Moda and Instrument Sans.</p>
        </div>
      </footer>
    </div>
  );
}
