// Version 22: the redaction. The live mark censors the head's eyes with question
// marks; this page does that to a whole file on the team. Lift the bars, and your
// clearance rises. The bar over what is in the drive never lifts.
import { useEffect, useRef } from 'react';
import '@fontsource/courier-prime/400.css';
import '@fontsource/courier-prime/700.css';
import '@fontsource/anton/400.css';
import './redaction.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { Bar } from './Bar';
import { Fight } from './Fight';
import { Q } from './Q';
import { LEVELS, useFile, useLevel, useFrac } from './store';

const PAPER = ['#ecebe6', '#eee9de', '#f0e6d3', '#f1e2c8', '#f2ddbb'];

function Stamp({ at, word, className }: { at: number; word: string; className?: string }) {
  const level = useLevel();
  return (
    <span className={'stamp ' + (level >= at ? 'on ' : '') + (className ?? '')} aria-hidden="true">
      {word}
    </span>
  );
}

/** A typed reference in the margin. It appears once your clearance allows it. */
function Note({ at, children, className }: { at: number; children: React.ReactNode; className?: string }) {
  const level = useLevel();
  return (
    <aside className={'note ' + (level >= at ? 'on ' : '') + (className ?? '')} aria-hidden={level >= at ? undefined : true}>
      <span className="note-k" aria-hidden="true">Ref.</span>
      {children}
    </aside>
  );
}

function Clearance() {
  const level = useLevel();
  const frac = useFrac();
  const setFlash = useFile((s) => s.setFlash);
  const classify = useFile((s) => s.classify);
  const declassify = useFile((s) => s.declassify);
  const t = useRef(0);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== 'x' && e.key !== 'X') return;
      setFlash(true);
      clearTimeout(t.current);
      t.current = window.setTimeout(() => setFlash(false), 1000);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [setFlash]);
  return (
    <header className={'clear lv' + level}>
      <a className="clear-home" href="#main">Skeptical<span aria-hidden="true">?</span></a>
      {frac < 1 && <button type="button" className="clear-act act-lift" onClick={declassify}>Lift all</button>}
      {frac > 0.02 && <button type="button" className="clear-act" onClick={classify}>Classify</button>}
      <p className="clear-stamp" aria-live="polite">
        <span className="sr-only-x">Your clearance: </span>
        <span key={level} className="clear-word">{LEVELS[level].word}</span>
      </p>
    </header>
  );
}

// the cover again, barred again: only the one line you could read at the start stays readable
const CLOSE_LINES = [HERO.pitch[0], HERO.pitch[1], HERO.statement[0], HERO.statement[1], HERO.statement[2]];

export default function Redaction() {
  useVersion('redaction');
  const root = useRef<HTMLDivElement>(null);
  const level = useLevel();
  const flash = useFile((s) => s.flash);

  useEffect(() => {
    document.documentElement.style.background = PAPER[level];
  }, [level]);

  useGSAP(() => {
    if (still) return;
    // the sheet comes off the copier, line by line
    gsap.from('.cover .typed > *', { opacity: 0, y: 18, duration: 0.7, stagger: 0.08, ease: 'expo.out', delay: 0.15 });
    // the file closes: every line is barred again except one, then the stamp lands
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.close', start: 'top top', end: 'bottom bottom', scrub: 0.5 } });
    tl.fromTo('.close-sheet', { y: '6vh', rotate: 0.6 }, { y: 0, rotate: -0.4, duration: 1, ease: 'none' }, 0);
    gsap.utils.toArray<HTMLElement>('.close-bar').forEach((b, i) => {
      tl.fromTo(b, { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: 'power3.inOut' }, 0.05 + i * 0.22);
    });
    tl.fromTo('.final', { scale: 2.8, opacity: 0, rotate: -24 }, { scale: 1, opacity: 1, rotate: -8, duration: 0.2, ease: 'power4.in' }, 1.2)
      .to('.close-sheet', { x: 6, y: 4, duration: 0.04, yoyo: true, repeat: 1, ease: 'none' }, 1.4)
      .to({}, { duration: 1.1 });
    ScrollTrigger.refresh();
  }, { scope: root });

  let n = 0;
  const id = (k: string) => `${k}-${n++}`;

  return (
    <div ref={root} className={'v-redaction lv' + level + (flash ? ' flash' : '')} style={{ ['--paper' as string]: PAPER[level] }}>
      <a className="skip-x" href="#main">Skip to the file</a>
      <Clearance />
      <main id="main" tabIndex={-1}>
        {/* ---------- cover ---------- */}
        <section className="cover sheet" aria-labelledby="h1">
          <div className="typed">
            <h1 id="h1" className="subj"><span className="lab">Subject.</span> {SITE.heading}</h1>
            <div className="pitch">
              <Bar id={id('p')} auto={1600} className="big">{HERO.pitch[0]}</Bar>
              <Bar id={id('p')} className="big">{HERO.pitch[1]}</Bar>
            </div>
            <div className="state">
              <Bar id={id('s')} className="mid">{HERO.statement[0]}</Bar>
              <p className="mid open">{HERO.statement[1]}</p>
              <Bar id={id('s')} className="mid">{HERO.statement[2]}</Bar>
            </div>
            <div className="doors">
              {HERO.doors.map((d, i) => (
                <a key={d.href} className={'door' + (i ? ' alt' : '')} href={d.href}>{d.label}</a>
              ))}
            </div>
            <p className="how">Drag across a bar. Hold to see through. Press X.</p>
          </div>
          <Stamp at={1} word="Confidential" className="s1" />
          <Note at={1} className="n-cover">{MANIFESTO[0]}</Note>
        </section>

        {/* ---------- manifesto ---------- */}
        <section className="sec sheet man" aria-labelledby="h-man">
          <h2 id="h-man" className="tab">Statement of the subject.</h2>
          <ol className="man-list">
            {MANIFESTO.map((m, i) => (
              <li key={m}><span className="pil" aria-hidden="true">{i + 1}.</span><Bar id={id('m')} as="span" className="lg">{m}</Bar></li>
            ))}
          </ol>
          <Stamp at={2} word="Secret" className="s2" />
          <Note at={2} className="n-man">{PEOPLE.count}</Note>
        </section>

        {/* ---------- record ---------- */}
        <section id="record" className="sec sheet rec" aria-labelledby="h-rec">
          <p className="exh" aria-hidden="true">Exhibit A</p>
          <h2 id="h-rec" className="title">{RECORD.title}</h2>
          <p className="rule">{RECORD.rule}</p>
          <p className="event"><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
          <div className="results">
            {RECORD.results.map((r, i) => (
              <div key={r.who} className="row">
                <span className="rown" aria-hidden="true">A.{i + 1}</span>
                <Bar id={id('r')} className="what">{r.what}</Bar>
                <Bar id={id('r')} className="who">{r.who}</Bar>
                <Bar id={id('r')} className="more">{r.more}</Bar>
              </div>
            ))}
          </div>
          <a className="go" href={RECORD.more.href}>{RECORD.more.label}</a>
          <Note at={2} className="n-rec">{SITE.description}</Note>
        </section>

        {/* ---------- drive ---------- */}
        <section id="drive" className="sec sheet drv" aria-labelledby="h-drv">
          <p className="exh red" aria-hidden="true">Withheld</p>
          <h2 id="h-drv" className="title">{DRIVE.title}</h2>
          <p className="lead">{DRIVE.lead}</p>
          <ol className="entries">
            {DRIVE.items.map((it, i) => (
              <li key={it.term} className="entry">
                <Bar id={id('d')} as="h3" className="term">{it.term}</Bar>
                <Bar id={id('d')} className="desc">{it.text}</Bar>
                <Fight term={it.term} answer={i === 3 ? FOOTER.line : DRIVE.lead} />
              </li>
            ))}
          </ol>
          <a className="go" href={DRIVE.more.href}>{DRIVE.more.label}</a>
          <Stamp at={3} word="Top secret" className="s3" />
          <Note at={3} className="n-drv">{JOIN.discord}</Note>
        </section>

        {/* ---------- people ---------- */}
        <section id="people" className="sec sheet ppl" aria-labelledby="h-ppl">
          <p className="exh" aria-hidden="true">Personnel</p>
          <h2 id="h-ppl" className="title">{PEOPLE.title}</h2>
          {PEOPLE.coaches.map((c) => (
            <div key={c.name} className="person">
              <p className="prole">{c.role}</p>
              <Bar id={id('c')} as="h3" className="pname">{c.name}</Bar>
              <Bar id={id('c')} className="pbio">{c.bio}</Bar>
            </div>
          ))}
          <p className="count">{PEOPLE.count}</p>
          <a className="go" href={PEOPLE.more.href}>{PEOPLE.more.label}</a>
          <Note at={3} className="n-ppl">{HERO.pitch[1]}</Note>
        </section>

        {/* ---------- join ---------- */}
        <section id="join" className="sec sheet jn" aria-labelledby="h-jn">
          <p className="exh" aria-hidden="true">Request for clearance</p>
          <h2 id="h-jn" className="title">{JOIN.title}</h2>
          <p className="lead">{JOIN.lead}</p>
          <div className="paths">
            {JOIN.paths.map((p) => (
              <article key={p.id} className="path">
                <h3><span className="box" aria-hidden="true" />{p.name}</h3>
                <p className="pline">{p.line}</p>
                <ul>
                  {p.text.map((t) => <li key={t}>{t}</li>)}
                </ul>
                <a className="door" href={p.href}>Request: {p.name}</a>
              </article>
            ))}
          </div>
          <div className="jn-foot">
            <p>{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a></p>
            <p>{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a></p>
            <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
            <p>{JOIN.discord}</p>
          </div>
          <Stamp at={4} word="Cleared" className="s4" />
          <Note at={4} className="n-jn">{HERO.statement[0]}</Note>
        </section>

        {/* ---------- the file closes ---------- */}
        <section className="close" aria-label="End of file">
          <div className="close-stage">
            <div className="close-sheet" aria-hidden="true">
              <p className="close-hd">Skeptical<span>?</span></p>
              {CLOSE_LINES.map((l, i) => (
                i === 3 ? <p key={l} className="close-line keep">{l}</p> : (
                  <p key={l} className={'close-line' + (i < 2 ? ' big2' : '')}>
                    <span className="close-t">{l}</span>
                    <span className="close-bar"><Q className="close-q" /><Q className="close-q" /></span>
                  </p>
                )
              ))}
              <p className="final">File closed.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <p className="foot-line">{FOOTER.line}</p>
        <ul className="foot-links">
          {FOOTER.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
        </ul>
        <ul className="foot-pages">
          {FOOTER.pages.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
        </ul>
        <p className="foot-small">Draft 2, version 22. Not the live site.</p>
      </footer>
    </div>
  );
}
