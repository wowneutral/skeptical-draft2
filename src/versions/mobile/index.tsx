// Version 70: the mobile. A hanging sculpture of painted steel, its top hook
// bent as a question mark and its lowest weight the dot. Each section hangs one
// more weight on the next arm down, and the whole thing finds its balance again.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/wdth.css';
import './mobile.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { gsap } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { S, WAYS, PIECES, settle, swing, gust, push, redraw } from './sim';
import { svgPath } from './shapes';

const Scene = lazy(() => import('./Scene'));

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

/** A link with a fine steel rod under it that draws across on hover. */
const Rod = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <A href={href} className="m-rod"><span>{children}</span><svg aria-hidden="true" viewBox="0 0 40 12" className="m-rod-end"><path d="M0 6 H34" /><circle cx="36" cy="6" r="3" /></svg></A>
);

const Mark = ({ kind }: { kind: Parameters<typeof svgPath>[0] }) => {
  const { d, vb } = svgPath(kind, 40);
  return <svg className="m-mark" viewBox={vb} aria-hidden="true"><path d={d} /></svg>;
};

/** The weight a section hangs, drawn small beside its title, on its own wire. */
const Hang = ({ stage }: { stage: number }) => {
  const p = PIECES.find((x) => x.stage === stage)!;
  const { d, vb } = svgPath(p.kind, 30);
  const [, , w, h] = vb.split(' ').map(Number);
  return (
    <svg className={`m-hang m-hang-${p.tone}`} viewBox={`${-w / 2 - 4} -36 ${w + 8} ${h + 40}`} aria-hidden="true">
      <path className="m-hang-wire" d="M0 -36 V0" />
      <path className="m-hang-shape" d={d} transform={`translate(${-w / 2} 0)`} />
    </svg>
  );
};

const STAGES = ['top', 'manifesto', 'record', 'drive', 'people', 'join', 'end'];

export default function Mobile() {
  useVersion('mobile');
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [ready, setReady] = useState(false);
  const [way, setWay] = useState(-1);
  const [stage, setStage] = useState(0);

  // Which section is being read: one weight per section, on the next arm down.
  useEffect(() => {
    const els = STAGES.map((id) => document.getElementById(id));
    let last = -1;
    const tick = () => {
      const line = window.innerHeight * (window.innerWidth <= 820 ? 0.72 : 0.6);
      let k = 0;
      els.forEach((el, i) => { if (el && el.getBoundingClientRect().top < line) k = i; });
      if (k !== last) {
        last = k; S.stage = k; setStage(k);
        if (still) { settle(); redraw.fn(); }
      }
    };
    gsap.ticker.add(tick);
    tick();
    return () => { gsap.ticker.remove(tick); };
  }, []);

  // Pointing at a way in stirs the shape it hangs from.
  const nudge = (i: number) => push(PIECES.indexOf(WAYS[i]), 0.25, 0.1, -0.5);
  const choose = (i: number) => {
    setWay((w) => (w === i ? -1 : i));
    swing(WAYS[i].arm);
  };

  return (
    <div className={`v-mobile${ready ? ' is-ready' : ''}`} ref={root} data-stage={stage}>
      <a className="skip-x" href="#main">Skip to content</a>
      {webgl && (
        <div className="m-stage" aria-hidden="true">
          <Suspense fallback={null}><Scene onReady={() => setReady(true)} /></Suspense>
        </div>
      )}

      <main id="main">
        <section id="top" className="m-sec m-hero">
          <div className="m-col">
            <h1 className="m-name"><span className="m-name-w">Skeptical</span><span className="sr-only-x">: an independent Lincoln-Douglas debate team</span></h1>
            <p className="m-pitch">{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</p>
            <p className="m-statement">{HERO.statement.map((l) => <span key={l}>{l}</span>)}</p>
            <div className="m-doors">
              {HERO.doors.map((d) => <Rod key={d.href} href={d.href}>{d.label}</Rod>)}
            </div>
            {webgl && <p className="m-hint"><button type="button" className="m-gust" onClick={gust}>Touch a shape. Everything answers.</button></p>}
          </div>
        </section>

        <section id="manifesto" className="m-sec" aria-label="What we are">
          <div className="m-col">
            <Hang stage={1} />
            <ol className="m-manifesto">
              {MANIFESTO.map((l) => <li key={l}>{l}</li>)}
            </ol>
          </div>
        </section>

        <section id="record" className="m-sec" aria-labelledby="record-h">
          <div className="m-col">
            <Hang stage={2} />
            <h2 id="record-h" className="m-title">{RECORD.title}</h2>
            <p className="m-rule">{RECORD.rule}</p>
            <p className="m-event"><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ul className="m-results">
              {RECORD.results.map((r) => (
                <li key={r.who}>
                  <span className="m-who">{r.who}</span>
                  <span className="m-what">{r.what}</span>
                  <span className="m-more">{r.more}</span>
                </li>
              ))}
            </ul>
            <Rod href={RECORD.more.href}>{RECORD.more.label}</Rod>
          </div>
        </section>

        <section id="drive" className="m-sec" aria-labelledby="drive-h">
          <div className="m-col">
            <Hang stage={3} />
            <h2 id="drive-h" className="m-title">{DRIVE.title}</h2>
            <p className="m-lead">{DRIVE.lead}</p>
            <dl className="m-drive">
              {DRIVE.items.map((it) => (
                <div key={it.term}><dt>{it.term}</dt><dd>{it.text}</dd></div>
              ))}
            </dl>
            <Rod href={DRIVE.more.href}>{DRIVE.more.label}</Rod>
          </div>
        </section>

        <section id="people" className="m-sec" aria-labelledby="people-h">
          <div className="m-col">
            <Hang stage={4} />
            <h2 id="people-h" className="m-title">{PEOPLE.title}</h2>
            <ul className="m-people">
              {PEOPLE.coaches.map((c) => (
                <li key={c.name}>
                  <span className="m-pname">{c.name}</span>
                  <span className="m-role">{c.role}</span>
                  <span className="m-bio">{c.bio}</span>
                </li>
              ))}
            </ul>
            <p className="m-count">{PEOPLE.count}</p>
            <Rod href={PEOPLE.more.href}>{PEOPLE.more.label}</Rod>
          </div>
        </section>

        <section id="join" className="m-sec" aria-labelledby="join-h">
          <div className="m-col">
            <Hang stage={5} />
            <h2 id="join-h" className="m-title">{JOIN.title}</h2>
            <p className="m-lead">{JOIN.lead}</p>
            <ul className="m-ways">
              {JOIN.paths.map((p, i) => (
                <li key={p.id} className={way === i ? 'is-open' : undefined}>
                  <button type="button" className="m-way" aria-expanded={way === i} aria-controls={`way-${p.id}`} onClick={() => choose(i)} onPointerEnter={() => nudge(i)} onFocus={() => nudge(i)}>
                    <Mark kind={WAYS[i].kind} />
                    <span className="m-way-name">{p.name}</span>
                    <span className="m-way-line">{p.line}</span>
                  </button>
                  <div className="m-way-body" id={`way-${p.id}`}>
                    <p className="m-way-first">{p.text[0]}</p>
                    <div className="m-way-rest" hidden={way !== i}>
                      {p.text.slice(1).map((t) => <p key={t}>{t}</p>)}
                    </div>
                    <Rod href={p.href}>{p.name}, on the live site</Rod>
                  </div>
                </li>
              ))}
            </ul>
            <p className="m-small">{JOIN.already.before}<A className="m-inline" href={JOIN.already.href}>{JOIN.already.label}</A>.</p>
            <p className="m-small">{JOIN.coach.before}<A className="m-inline" href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
            <p className="m-small">{JOIN.also} <A className="m-inline" href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
            <p className="m-small">{JOIN.discord}</p>
          </div>
        </section>

        <footer id="end" className="m-sec m-end">
          <div className="m-col">
            <p className="m-endline">{FOOTER.line}</p>
            <ul className="m-links">
              {FOOTER.links.map((l) => <li key={l.href}><A className="m-inline" href={l.href}>{l.label}</A></li>)}
            </ul>
            <ul className="m-pages">
              {FOOTER.pages.map((l) => <li key={l.href}><A className="m-inline" href={l.href}>{l.label}</A></li>)}
            </ul>
            <p className="m-draft">Draft 2, version 70. Not the live site.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
