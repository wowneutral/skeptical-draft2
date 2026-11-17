import '@fontsource-variable/eb-garamond/wght.css';
import '@fontsource-variable/schibsted-grotesk/wght.css';
import './rubbing.css';
import { useRef, useState } from 'react';
import { useVersion } from '@/lib/version';
import { useRise } from '@/lib/motion';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { Tablet, type Handle } from './Tablet';

const up = (s: string) => s.toUpperCase();
/** Break a result into two carved lines: everything but the last word, then the last word. */
const carve = (s: string) => { const w = up(s).split(' '); return [w.slice(0, -1).join(' '), w[w.length - 1]]; };

export default function Rubbing() {
  useVersion('rubbing');
  const root = useRef<HTMLDivElement>(null);
  useRise(root);
  const [touched, setTouched] = useState(false);
  const [heroUp, setHeroUp] = useState(0);
  const [driveUp, setDriveUp] = useState<number[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const joinTabs = useRef<Record<string, Handle>>({});
  const choosing = useRef(false);
  const mani = useRef<HTMLElement>(null);
  const driveTab = useRef<Handle | null>(null);

  // the manifesto darkens line by line as it passes the middle of the screen
  useGSAP(() => {
    if (still || !mani.current) return;
    mani.current.querySelectorAll('li').forEach((li) => {
      ScrollTrigger.create({ trigger: li, start: 'top 72%', end: 'bottom 28%', toggleClass: { targets: li, className: 'is-on' } });
    });
  }, { scope: mani });

  const choose = async (id: string, rubbed: boolean) => {
    if (choosing.current) return;
    choosing.current = true;
    setChosen(id);
    const others = Object.entries(joinTabs.current).filter(([k]) => k !== id);
    const me = joinTabs.current[id];
    await Promise.all([...(rubbed || !me ? [] : [me.pass(900)]), ...others.map(([, h]) => (h.coverage() > 0.02 ? h.fade() : Promise.resolve()))]);
    choosing.current = false;
  };

  return (
    <div className="v-rubbing" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="rb-top">
        <a href="#main" className="rb-mark">{SITE.name}</a>
        <nav aria-label="Sections">
          <ul>{NAV.map((n) => <li key={n.id}><a href={`#${n.id}`}>{n.label}</a></li>)}</ul>
        </nav>
      </header>

      <main id="main">
        <section className="rb-hero" aria-labelledby="rb-h1">
          <h1 id="rb-h1" className="sr-only-x">{SITE.heading}</h1>
          <div className="rb-hero-sheet">
            <Tablet
              lines={['SKEPTICAL?']}
              narrow={['SKEP', 'TICAL?']}
              narrowAt={620}
              maxFont={300}
              weight={540}
              track={0.05}
              padY={0.52}
              tease
              seed={11}
              className="rb-tab-hero"
              onTouched={() => setTouched(true)}
              onCover={(c) => setHeroUp(c)}
            />
            {!still && <p className="rb-invite" data-gone={touched || heroUp > 0.25 ? '' : undefined}>
              <span className="rb-desk">Move across the sheet to rub it.</span>
              <span className="rb-phone">Rub the sheet side to side.</span>
            </p>}
          </div>
          <div className="rb-hero-foot">
            <p className="rb-pitch">{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</p>
            <ul className="rb-state">{HERO.statement.map((l) => <li key={l}>{l}</li>)}</ul>
            <div className="rb-doors">
              {HERO.doors.map((d) => <a key={d.href} href={d.href} className="rb-door">{d.label}</a>)}
            </div>
          </div>
        </section>

        <section className="rb-mani" aria-label="What we are" ref={mani}>
          <ol>
            {MANIFESTO.map((l, i) => <li key={i}>{l}</li>)}
          </ol>
        </section>

        <section id="record" className="rb-sec rb-record" aria-labelledby="rb-record-h">
          <h2 id="rb-record-h" className="sr-only-x">{RECORD.title}</h2>
          <Tablet lines={['THE·RECORD.']} narrow={['THE', 'RECORD.']} maxFont={210} auto seed={21} />
          <div className="rb-record-body">
            <p className="rb-rule" data-rise>{RECORD.rule}</p>
            <div className="rb-event" data-rise>
              <p className="rb-when">{RECORD.when}</p>
              <p className="rb-ev-name">{RECORD.name}</p>
              <p className="rb-where">{RECORD.where}</p>
            </div>
            <ul className="rb-results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <p className="sr-only-x">{r.what}</p>
                  <Tablet lines={carve(r.what)} maxFont={96} lead={1.16} padY={0.36} hint={0.13} auto autoDelay={2400} seed={r.who.length * 13} />
                  <p className="rb-who">{r.who}</p>
                  <p className="rb-more-t">{r.more}</p>
                </li>
              ))}
            </ul>
            <a className="rb-more" href={RECORD.more.href}>{RECORD.more.label}</a>
          </div>
        </section>

        <section id="drive" className="rb-sec rb-drive" aria-labelledby="rb-drive-h">
          <div className="rb-drive-head">
            <h2 id="rb-drive-h" className="rb-h2">{DRIVE.title}</h2>
            <p className="rb-lead">{DRIVE.lead}</p>
          </div>
          <Tablet
            lines={['FILES  KS  THEORY', 'PHILOSOPHY  DRILLS', 'RECORDINGS  BRIEFS']}
            narrow={['FILES  KS', 'THEORY', 'PHILOSOPHY', 'DRILLS', 'RECORDINGS', 'BRIEFS']}
            narrowAt={700}
            maxFont={150}
            lead={1.18}
            padY={0.42}
            hint={0.13}
            seed={31}
            onCover={(_, w) => setDriveUp(w)}
            onReady={(h) => { driveTab.current = h; }}
          />
          {!still && <div className="rb-drive-act">
            <p className="rb-invite rb-drive-invite" data-gone={driveUp.filter((v) => v > 0.45).length > 2 ? '' : undefined}>Seven words are cut here. Rub them up.</p>
            <button type="button" className="rb-quiet" onClick={() => driveTab.current?.pass(1600)} disabled={driveUp.length > 0 && driveUp.every((v) => v > 0.45)}>Rub them all</button>
          </div>}
          <ul className="rb-items">
            {DRIVE.items.map((it, i) => (
              <li key={it.term} data-up={(driveUp[i] ?? 0) > 0.45 ? '' : undefined}>
                <span className="rb-term">{it.term}</span>
                <span className="rb-def">{it.text}</span>
              </li>
            ))}
          </ul>
          <a className="rb-more" href={DRIVE.more.href}>{DRIVE.more.label}</a>
        </section>

        <section id="people" className="rb-sec rb-people" aria-labelledby="rb-people-h">
          <h2 id="rb-people-h" className="sr-only-x">{PEOPLE.title}</h2>
          <Tablet lines={['THE·PEOPLE.']} narrow={['THE', 'PEOPLE.']} maxFont={210} auto seed={41} />
          <ul className="rb-coaches">
            {PEOPLE.coaches.map((c) => (
              <li key={c.name} data-rise>
                <p className="rb-role">{c.role}</p>
                <p className="rb-name">{c.name}</p>
                <p className="rb-bio">{c.bio}</p>
              </li>
            ))}
          </ul>
          <div className="rb-people-foot">
            <p className="rb-count">{PEOPLE.count}</p>
            <a className="rb-more" href={PEOPLE.more.href}>{PEOPLE.more.label}</a>
          </div>
        </section>

        <section id="join" className="rb-sec rb-join" aria-labelledby="rb-join-h">
          <h2 id="rb-join-h" className="sr-only-x">{JOIN.title}</h2>
          <div className="rb-join-head">
            <Tablet lines={['JOIN.']} maxFont={230} auto seed={51} className="rb-tab-join" />
            <p className="rb-lead rb-join-lead">{JOIN.lead} <span className="rb-hint">Rub a stone to choose it.</span></p>
          </div>
          <ul className="rb-paths">
            {JOIN.paths.map((p, i) => (
              <li key={p.id} className="rb-path" data-on={chosen === p.id ? '' : undefined} data-off={chosen && chosen !== p.id ? '' : undefined}>
                <button type="button" className="rb-pick" aria-pressed={chosen === p.id} aria-label={`Choose ${p.name}`} onClick={() => choose(p.id, false)}>
                  <Tablet
                    lines={[up(p.name)]}
                    maxFont={96}
                    padY={0.4}
                    padX={0.1}
                    hint={0.17}
                    seed={60 + i}
                    onReady={(h) => { joinTabs.current[p.id] = h; }}
                    onCover={(c) => { if (c > 0.5 && chosen !== p.id && !choosing.current) choose(p.id, true); }}
                  />
                </button>
                <div className="rb-path-text">
                  <p className="rb-path-name">{p.name}</p>
                  <p className="rb-path-line"><a href={p.href}>{p.line}</a></p>
                  <p className="rb-path-first">{p.text[0]}</p>
                  <div className="rb-path-rest" aria-hidden={chosen !== p.id && !still}>
                    <div className="rb-path-rest-in">
                      {p.text.slice(1).map((t) => <p key={t}>{t}</p>)}
                      <a className="rb-go" href={p.href} tabIndex={chosen === p.id || still ? 0 : -1}>{p.line}</a>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="rb-join-foot">
            <p>{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a></p>
            <p>{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a></p>
            <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
            <p>{JOIN.discord}</p>
          </div>
        </section>
      </main>

      <End />
    </div>
  );
}

function End() {
  const sheetEl = useRef<HTMLDivElement>(null);
  const stoneEl = useRef<HTMLCanvasElement>(null);
  const h = useRef<Handle | null>(null);
  const [phase, setPhase] = useState<'on' | 'lifting' | 'off' | 'dropping'>('on');
  const [again, setAgain] = useState(false);

  const lift = () => {
    const tab = h.current;
    if (!tab || phase !== 'on') return;
    tab.sheet.stone(stoneEl.current!);
    if (!sheetEl.current) return;
    if (still) {
      setPhase('off');
      gsap.set(sheetEl.current, { autoAlpha: 0 });
      setTimeout(() => { tab.sheet.acc.fill(0); tab.sheet.all(); tab.sheet.flush(); gsap.set(sheetEl.current, { autoAlpha: 1 }); setPhase('on'); setAgain(true); }, 2400);
      return;
    }
    setPhase('lifting');
    const tl = gsap.timeline();
    tl.to(sheetEl.current, { yPercent: -8, rotation: -1.2, boxShadow: '0 30px 60px -20px rgba(22,21,20,.35)', duration: 0.45, ease: 'power2.out' })
      .to(sheetEl.current, { yPercent: -125, rotation: -5, duration: 0.9, ease: 'power3.in' })
      .add(() => { setPhase('off'); tab.sheet.acc.fill(0); tab.sheet.front = 0; tab.sheet.all(); tab.sheet.flush(); })
      .to({}, { duration: 1.9 })
      .add(() => setPhase('dropping'))
      .fromTo(sheetEl.current, { yPercent: -125, rotation: 3 }, { yPercent: 0, rotation: 0, duration: 1.1, ease: 'expo.out' })
      .to(sheetEl.current, { boxShadow: '0 0px 0px 0px rgba(22,21,20,0)', duration: 0.4 }, '-=0.5')
      .add(() => { setPhase('on'); setAgain(true); });
  };

  return (
    <footer className="rb-end" aria-labelledby="rb-end-h">
      <h2 id="rb-end-h" className="sr-only-x">{FOOTER.line}</h2>
      <div className="rb-end-frame">
        <canvas ref={stoneEl} className="rb-stone" aria-hidden="true" />
        <div ref={sheetEl} className="rb-end-sheet">
          <Tablet lines={['THE PREP IS PRIVATE.', 'THIS PAGE ISN’T.']} narrow={['THE PREP', 'IS PRIVATE.', 'THIS PAGE', 'ISN’T.']} narrowAt={640} maxFont={130} lead={1.12} auto seed={81} onReady={(x) => { h.current = x; }} />
        </div>
      </div>
      <div className="rb-end-act">
        <p className="rb-again" data-on={again && phase === 'on' ? '' : undefined} aria-live="polite">{again && phase === 'on' ? 'A fresh sheet. Rub it again.' : ''}</p>
        <button type="button" className="rb-lift" onClick={lift} disabled={phase !== 'on'}>
          {phase === 'on' ? 'Lift the sheet.' : phase === 'off' ? 'The stone.' : 'A fresh sheet.'}
        </button>
      </div>
      <div className="rb-foot">
        <ul className="rb-links">{FOOTER.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
        <ul className="rb-pages">{FOOTER.pages.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
        <p className="rb-fine">{FOOTER.line} <small>Draft 2, version 71. Not the live site.</small></p>
      </div>
    </footer>
  );
}
