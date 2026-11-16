// The dither. A plaster head in the dark, printed live through an 8x8 Bayer
// matrix in two colours; the visitor holds the lamp. The type stays crisp
// and sits on its own black, never on the print.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/wdth.css';
import { DRIVE, FOOTER, HERO, JOIN, MANIFESTO, NAV, PEOPLE, RECORD, SITE } from '@/content';
import { useVersion } from '@/lib/version';
import { gsap, scroll, ScrollTrigger } from '@/lib/scroll';
import { clamp, coarse, still } from '@/lib/utils';
import { stage } from './state';
import { Dev, Veil } from './Veil';
import './dither.css';

const Scene = lazy(() => import('./Scene'));

function hasGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** A pose for the head, read by the scene: x and height in half-screens, turn in radians, scale. */
function K({ at, p, m }: { at: string; p: string; m?: string }) {
  return <i className="dm-k" style={{ top: at }} data-p={p} data-m={m} aria-hidden="true" />;
}

function Manifesto() {
  const ref = useRef<HTMLElement>(null);
  const [on, setOn] = useState(still ? -1 : 0);
  useEffect(() => {
    if (still) return;
    const st = ScrollTrigger.create({
      trigger: ref.current, start: 'top top', end: 'bottom bottom',
      onUpdate: (s) => setOn(Math.min(3, Math.floor(s.progress * 4.4))),
    });
    return () => st.kill();
  }, []);
  return (
    <section ref={ref} className="dm-man" aria-label="What we are">
      <K at="0%" p="0.42,-0.04,-0.2,1" m="0,0.44,-0.1,0.55" />
      <K at="10%" p="-0.48,0,0.25,1.02" m="0,0.46,0.25,0.55" />
      <K at="78%" p="-0.48,0,1.35,1.02" m="0,0.46,1.35,0.55" />
      <div className="dm-man-pin">
        <ol className="dm-man-lines">
          {MANIFESTO.map((l, i) => (
            <li key={i} className={on === -1 || on === i ? 'is-on' : on > i ? 'is-past' : ''}>{l}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Drive() {
  const [open, setOpen] = useState<boolean[]>(() => DRIVE.items.map(() => still));
  const flip = (i: number) => setOpen((o) => o.map((v, j) => (j === i ? !v : v)));
  return (
    <section id="drive" className="dm-sec dm-drive" aria-labelledby="drive-h">
      <K at="0%" p="-0.56,0,2.4,0.85" m="0,0.4,2.6,0.62" />
      <K at="60%" p="-0.56,0,3.3,0.85" m="0,0.4,3.3,0.62" />
      <div className="dm-col dm-col-r">
        <Dev><h2 id="drive-h" className="dm-h2">{DRIVE.title}</h2></Dev>
        <p className="dm-lead">{DRIVE.lead}</p>
        <p className="dm-hint">Press a folder to develop it.</p>
        <ul className="dm-drive-list">
          {DRIVE.items.map((it, i) => (
            <li key={it.term}>
              <button type="button" className="dm-drive-row" aria-pressed={open[i]} onClick={() => flip(i)}>
                <span className="dm-drive-term">{it.term}</span>
                <span className="dm-drive-text">
                  <span>{it.text}</span>
                  <Veil open={open[i]} cell={4} density={0.42} />
                </span>
              </button>
            </li>
          ))}
        </ul>
        <a className="dm-more" href={DRIVE.more.href}>{DRIVE.more.label}</a>
      </div>
    </section>
  );
}

function Join() {
  const [open, setOpen] = useState<boolean[]>(() => JOIN.paths.map((_, i) => still || i === 0));
  return (
    <section id="join" className="dm-sec dm-join" aria-labelledby="join-h">
      <K at="0%" p="-0.6,0,0.75,0.8" m="0,0.4,0.6,0.62" />
      <K at="70%" p="-0.6,-0.05,0.35,0.8" m="0,0.4,0.3,0.62" />
      <div className="dm-col dm-col-r">
        <Dev><h2 id="join-h" className="dm-h2">{JOIN.title}</h2></Dev>
        <p className="dm-lead">{JOIN.lead}</p>
        <p className="dm-hint">Press a way in to develop it.</p>
        <div className="dm-paths">
          {JOIN.paths.map((p, i) => (
            <article key={p.id} className={'dm-path' + (open[i] ? ' is-open' : '')}>
              <h3>
                <button type="button" aria-expanded={open[i]} aria-controls={`dm-p-${p.id}`} onClick={() => setOpen((o) => o.map((v, j) => (j === i ? true : v)))}>
                  <span className="dm-path-name">{p.name}.</span>
                  <span className="dm-path-line">{p.line}</span>
                </button>
              </h3>
              <div className="dm-path-body" id={`dm-p-${p.id}`}>
                {p.text.map((t) => <p key={t}>{t}</p>)}
                <a className="dm-door" href={p.href}>{p.name}, start here</a>
                <Veil open={open[i]} cell={5} density={0.38} />
              </div>
            </article>
          ))}
        </div>
        <div className="dm-join-foot">
          <p>{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a></p>
          <p>{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a></p>
          <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
          <p>{JOIN.discord}</p>
        </div>
      </div>
    </section>
  );
}

function End() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const st = ScrollTrigger.create({
      trigger: ref.current, start: 'top 60%', end: 'bottom bottom',
      onUpdate: (s) => { stage.end = still ? 0 : clamp(s.progress); },
    });
    return () => { st.kill(); stage.end = 0; };
  }, []);
  return (
    <section ref={ref} className="dm-end" aria-label="The end">
      <K at="0%" p="0,0.36,-0.1,0.92" m="0,0.42,-0.1,0.85" />
      <K at="60%" p="0,0.36,0,0.98" m="0,0.42,0,0.9" />
      <div className="dm-end-pin">
        <Dev cell={8}><p className="dm-end-line">{FOOTER.line}</p></Dev>
      </div>
    </section>
  );
}

export default function Dither() {
  useVersion('dither');
  const [gl] = useState(hasGL);
  const [ready, setReady] = useState(false);

  // The opening: the print sharpens in steps once the head is in, then the
  // question mark on the eyes lets go. Scrolling or pressing drops it early.
  useEffect(() => {
    stage.cell = still ? 1 : 30; stage.censor = still ? 1 : 0; stage.end = 0; stage.touched = false;
    if (still || !gl) { setReady(true); return; }
    let dropped = false, tl: gsap.core.Timeline | null = null;
    const drop = (delay = 0) => {
      if (dropped) return; dropped = true;
      gsap.to(stage, { censor: 1, duration: 1.5, delay, ease: 'back.in(1.4)' });
    };
    const wait = () => {
      if (!stage.ready) { id = window.setTimeout(wait, 80); return; }
      const o = { t: 0 };
      tl = gsap.timeline()
        .to(o, { t: 1, duration: 1.9, ease: 'steps(10)', onUpdate: () => { stage.cell = Math.pow(30, 1 - o.t); } })
        .add(() => setReady(true), 0.3)
        .add(() => drop(), '+=12');
    };
    let id = window.setTimeout(wait, 80);
    const fast = () => { if (scroll.y > 60 && stage.ready) drop(); };
    const press = (e: PointerEvent) => { if (stage.ready && (e.target as HTMLElement).closest('.dm-hero')) drop(); };
    gsap.ticker.add(fast);
    window.addEventListener('pointerdown', press);
    const safety = window.setTimeout(() => setReady(true), 6000);
    return () => { clearTimeout(id); clearTimeout(safety); tl?.kill(); gsap.ticker.remove(fast); window.removeEventListener('pointerdown', press); gsap.killTweensOf(stage); };
  }, [gl]);

  return (
    <div className="v-dither" data-ready={ready ? '' : undefined}>
      <a className="skip-x" href="#main">Skip to content</a>
      {gl && (
        <div className="dm-stage" aria-hidden="true">
          <Suspense fallback={null}><Scene /></Suspense>
        </div>
      )}
      <header className="dm-top">
        <a className="dm-mark" href="#main">Skeptical<em>?</em></a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </header>

      <main id="main">
        <section className="dm-hero" aria-labelledby="dm-h1">
          <K at="0%" p="0.42,-0.04,-0.2,1" m="0,0.44,-0.1,0.55" />
          <div className="dm-hero-copy">
            <h1 id="dm-h1" className="dm-h1">
              <span className="dm-h1-word" aria-hidden="true">Skeptical<em>?</em></span>
              <span className="sr-only-x">{SITE.heading}</span>
            </h1>
            <p className="dm-pitch">{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</p>
            <ul className="dm-state">{HERO.statement.map((l) => <li key={l}>{l}</li>)}</ul>
            <div className="dm-doors">
              {HERO.doors.map((d, i) => <a key={d.href} className={'dm-door' + (i ? ' is-ghost' : '')} href={d.href}>{d.label}</a>)}
            </div>
          </div>
          {gl && <p className="dm-lamp">{coarse ? 'Tap anywhere to move the lamp.' : 'Move the lamp.'}</p>}
        </section>

        <Manifesto />

        <section id="record" className="dm-sec dm-record" aria-labelledby="record-h">
          <K at="0%" p="0.5,0,-0.7,0.95" m="0,0.4,-0.7,0.62" />
          <K at="70%" p="0.5,0,-1.15,0.95" m="0,0.4,-1.1,0.62" />
          <div className="dm-col">
            <Dev><h2 id="record-h" className="dm-h2">{RECORD.title}</h2></Dev>
            <p className="dm-lead">{RECORD.rule}</p>
            <p className="dm-event"><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ol className="dm-results">
              {RECORD.results.map((r) => (
                <li key={r.who}>
                  <Dev cell={6}><p className="dm-res-what">{r.what}.</p></Dev>
                  <p className="dm-res-who">{r.who}</p>
                  <p className="dm-res-more">{r.more}</p>
                </li>
              ))}
            </ol>
            <a className="dm-more" href={RECORD.more.href}>{RECORD.more.label}</a>
          </div>
        </section>

        <Drive />

        <section id="people" className="dm-sec dm-people" aria-labelledby="people-h">
          <K at="0%" p="0.5,0,-1.45,0.95" m="0,0.4,-1.45,0.62" />
          <K at="70%" p="0.5,0,-0.95,0.95" m="0,0.4,-0.95,0.62" />
          <div className="dm-col">
            <Dev><h2 id="people-h" className="dm-h2">{PEOPLE.title}</h2></Dev>
            <ul className="dm-coaches">
              {PEOPLE.coaches.map((c) => (
                <li key={c.name}>
                  <Dev cell={6}><p className="dm-coach-name">{c.name}</p></Dev>
                  <p className="dm-coach-role">{c.role}</p>
                  <p className="dm-coach-bio">{c.bio}</p>
                </li>
              ))}
            </ul>
            <p className="dm-count">{PEOPLE.count}</p>
            <a className="dm-more" href={PEOPLE.more.href}>{PEOPLE.more.label}</a>
          </div>
        </section>

        <Join />
        <End />
      </main>

      <footer className="dm-foot">
        <nav className="dm-foot-links" aria-label="Elsewhere">
          {FOOTER.links.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
        </nav>
        <nav className="dm-foot-pages" aria-label="Pages">
          {FOOTER.pages.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
        </nav>
        <p className="dm-small">Draft 2, version 35. Not the live site. The head is the Lee Perry-Smith scan by Infinite Realities, CC BY 3.0, as shipped with three.js.</p>
      </footer>
    </div>
  );
}
