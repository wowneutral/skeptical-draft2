// Version 84: the impression. You never see the thing itself, only the
// impression it leaves. A pinscreen holds the right of the page; each section
// changes what presses from behind, and your hand presses back.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './pins.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { clamp, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { stage } from './stage';
import { MARK_D, MARK_H, MARK_W } from './fields';

const Scene = lazy(() => import('./Scene'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** The mark as a flat engraving, when there is no WebGL. */
function FlatMark() {
  return (
    <svg className="flatmark" viewBox={`${-MARK_W / 2 - 80} ${-MARK_H / 2 - 80} ${MARK_W + 160} ${MARK_H + 160}`} aria-hidden="true">
      <path d={MARK_D} />
    </svg>
  );
}

/** Each section and what presses from behind while you read it. */
const SECTIONS: [string, number][] = [['top', 0], ['manifesto', 1], ['record', 2], ['drive', 3], ['people', 4], ['join', 5], ['end', 5]];

export default function Pins() {
  useVersion('pins');
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const [fonts, setFonts] = useState(false);
  const [leveled, setLeveled] = useState(0);
  useRise(root);

  useEffect(() => {
    stage.mode = 0; stage.focus = -1; stage.key.on = false;
    const on = () => setPhone(isPhone());
    const look = (e: PointerEvent) => { stage.look.x = (e.clientX / innerWidth) * 2 - 1; stage.look.y = (e.clientY / innerHeight) * 2 - 1; };
    window.addEventListener('resize', on);
    window.addEventListener('pointermove', look, { passive: true });
    let live = true;
    const done = () => { if (live) setFonts(true); };
    document.fonts.load('500 200px "Bodoni Moda Variable"').then(done, done);
    const t = setTimeout(done, 2500);
    return () => { live = false; clearTimeout(t); window.removeEventListener('resize', on); window.removeEventListener('pointermove', look); };
  }, []);

  // what presses from behind follows the section you are reading
  useGSAP(() => {
    const line = phone ? 'top 78%' : 'top 55%', lineEnd = phone ? 'bottom 78%' : 'bottom 55%';
    SECTIONS.forEach(([id, mode]) => {
      const el = document.getElementById(id === 'end' ? 'end' : id);
      if (!el) return;
      ScrollTrigger.create({
        trigger: el, start: line, end: lineEnd,
        onToggle: (self) => { if (self.isActive) { stage.mode = mode; stage.focus = -1; } },
        onUpdate: id === 'people' ? (self) => { stage.headP = self.progress; } : undefined,
      });
    });
    // the item you are reading lifts its own slab or plaque
    gsap.utils.toArray<HTMLElement>('[data-lift]', root.current).forEach((el) => {
      ScrollTrigger.create({
        trigger: el, start: phone ? 'top 88%' : 'top 62%', end: phone ? 'bottom 70%' : 'bottom 48%',
        onToggle: (self) => { if (self.isActive) stage.focus = Number(el.dataset.lift); else if (stage.focus === Number(el.dataset.lift)) stage.focus = -1; },
      });
    });
  }, { scope: root, dependencies: [phone] });

  const lift = (i: number) => ({
    'data-lift': i,
    tabIndex: 0,
    onPointerEnter: () => { stage.focus = i; },
    onFocus: () => { stage.focus = i; },
    onPointerDown: () => { stage.focus = i; },
  });

  // the keyboard path: arrows move a press point across the pins, space presses hard
  const onKey = (e: React.KeyboardEvent) => {
    const k = stage.key, step = 0.045;
    if (e.key === 'ArrowLeft') k.x -= step; else if (e.key === 'ArrowRight') k.x += step;
    else if (e.key === 'ArrowUp') k.y += step; else if (e.key === 'ArrowDown') k.y -= step;
    else if (e.key === ' ' || e.key === 'Enter') { k.down = true; setTimeout(() => { k.down = false; }, 260); }
    else return;
    e.preventDefault();
    k.x = clamp(k.x, 0.03, 0.97); k.y = clamp(k.y, 0.03, 0.97);
  };

  const manifestoLine = (s: string) => {
    const i = s.indexOf('Eight');
    if (i < 0) return s;
    return <>{s.slice(0, i)}<em>Eight</em>{s.slice(i + 5)}</>;
  };

  return (
    <div ref={root} className="v-pins">
      <a className="skip-x" href="#main">Skip to content</a>

      <aside className="stage-wrap" aria-label="The pinscreen">
      <div
        className="stage"
        role="img"
        aria-label="A pinscreen of steel pins in a black frame. Something hidden presses up from behind; the pins rise into its shape. Use the arrow keys and space to press the pins."
        tabIndex={0}
        onKeyDown={onKey}
        onFocus={() => { stage.key.on = true; }}
        onBlur={() => { stage.key.on = false; stage.key.down = false; }}
      >
        {webgl && fonts ? (
          <Suspense fallback={null}><Scene phone={phone} /></Suspense>
        ) : !webgl ? <FlatMark /> : null}
      </div>
      </aside>

      <main id="main" className="col">
        <nav className="nav" aria-label="Sections">
          <a className="home" href="#top">{SITE.name}</a>
          <ul>{NAV.map((n) => <li key={n.id}><a href={`#${n.id}`}>{n.label}</a></li>)}</ul>
        </nav>

        <section id="top" className="sec hero" aria-labelledby="h1">
          <h1 id="h1" className="word" data-rise>
            {SITE.name}<span className="q" aria-hidden="true">?</span>
            <span className="sr-only-x">{SITE.heading.slice(SITE.name.length)}</span>
          </h1>
          <p className="pitch" data-rise>{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</p>
          <ul className="statement" data-rise>{HERO.statement.map((l) => <li key={l}>{l}</li>)}</ul>
          <div className="doors" data-rise>
            {HERO.doors.map((d, i) => <A key={d.label} className={i ? 'door alt' : 'door'} href={d.href}>{d.label}</A>)}
          </div>
          <p className="hint" data-rise><span className="pin" aria-hidden="true" />Press the pins. They come back slowly.</p>
        </section>

        <section id="manifesto" className="sec manifesto" aria-label="What we are">
          <ol>
            {MANIFESTO.map((l) => <li key={l} data-rise>{manifestoLine(l)}</li>)}
          </ol>
        </section>

        <section id="record" className="sec record" aria-labelledby="record-h">
          <h2 id="record-h" className="title" data-rise>{RECORD.title}</h2>
          <p className="rule" data-rise>{RECORD.rule}</p>
          <p className="event" data-rise>
            <span className="when">{RECORD.when}</span>
            <span className="name">{RECORD.name}</span>
            <span className="where">{RECORD.where}</span>
          </p>
          <div className="results">
            {RECORD.results.map((r, i) => (
              <article key={r.who} className="result" data-rise {...lift(i)} aria-label={`${r.who}, ${r.what}`}>
                <p className="what">{r.what}</p>
                <p className="who">{r.who}</p>
                <p className="more">{r.more}</p>
              </article>
            ))}
          </div>
          <A className="link" href={RECORD.more.href}>{RECORD.more.label}</A>
        </section>

        <section id="drive" className="sec drive" aria-labelledby="drive-h">
          <h2 id="drive-h" className="title" data-rise>{DRIVE.title}</h2>
          <p className="lead" data-rise>{DRIVE.lead}</p>
          <dl className="items">
            {DRIVE.items.map((it, i) => (
              <div key={it.term} className="item" data-rise {...lift(i)}>
                <dt>{it.term}</dt>
                <dd>{it.text}</dd>
              </div>
            ))}
          </dl>
          <A className="link" href={DRIVE.more.href}>{DRIVE.more.label}</A>
        </section>

        <section id="people" className="sec people" aria-labelledby="people-h">
          <h2 id="people-h" className="title" data-rise>{PEOPLE.title}</h2>
          {PEOPLE.coaches.map((c) => (
            <article key={c.name} className="coach" data-rise>
              <h3>{c.name}</h3>
              <p className="role">{c.role}</p>
              <p className="bio">{c.bio}</p>
            </article>
          ))}
          <p className="count" data-rise>{PEOPLE.count}</p>
          <A className="link" href={PEOPLE.more.href}>{PEOPLE.more.label}</A>
        </section>

        <section id="join" className="sec join" aria-labelledby="join-h">
          <h2 id="join-h" className="title" data-rise>{JOIN.title}</h2>
          <p className="lead" data-rise>{JOIN.lead}</p>
          <div className="paths">
            {JOIN.paths.map((p) => (
              <article key={p.id} className="path" data-rise>
                <h3><A href={p.href}>{p.name}<span className="arrow" aria-hidden="true" /></A></h3>
                <p className="line">{p.line}</p>
                <ul>{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
              </article>
            ))}
          </div>
          <div className="small" data-rise>
            <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A></p>
            <p>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A></p>
            <p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
            <p>{JOIN.discord}</p>
          </div>
          {webgl && (
            <div className="leave" data-rise>
              <p>The surface is level. Leave yours.</p>
              <button type="button" className="level" onClick={() => { stage.level++; setLeveled((n) => n + 1); }}>
                {leveled ? 'Level it again' : 'Level the pins'}
              </button>
            </div>
          )}
        </section>

        <footer id="end" className="sec foot">
          <p className="last" data-rise>{FOOTER.line}</p>
          <ul className="links">{FOOTER.links.map((l) => <li key={l.label}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul className="pages">{FOOTER.pages.map((l) => <li key={l.label}><A href={l.href}>{l.label}</A></li>)}</ul>
          <p className="draft">Draft 2, version 84. Not the live site.</p>
        </footer>
      </main>
    </div>
  );
}
