// Version 17: the look. A pair of eyes that does not believe you. Every claim on
// the page has a "Prove it" next to it; check them all and the look finally changes.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource-variable/bricolage-grotesque/standard.css';
import '@fontsource/gloock/400.css';
import './look.css';
import { DRIVE, FOOTER, HERO, JOIN, NAV, PEOPLE, RECORD, SITE } from '@/content';
import { gsap, useGSAP, ScrollTrigger } from '@/lib/scroll';
import { cn, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { Eyes, LocalEyes, type Slots } from './Eyes';
import { Claim } from './Claim';
import { TEXT, TOTAL, WORDS } from './claims';
import { act, brain, now } from './rig';
import { Squint } from './parts';

export default function Look() {
  useVersion('look');
  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLButtonElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLButtonElement>(null);
  const dockEyes = useRef<HTMLSpanElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const slots = useMemo<Slots>(() => ({ hero, end, dock, dockEyes }), []);
  const [checked, setChecked] = useState<string[]>([]);
  const [approved, setApproved] = useState<'' | 'proved' | 'skipped'>('');
  const [poked, setPoked] = useState(0);
  const pokes = useRef<number[]>([]);

  const left = TOTAL - checked.length;

  // ---- pointer and finger: the eyes follow whichever moved last ----
  useEffect(() => {
    brain.doubt = 1; brain.approved = false; brain.base = 'skeptic'; brain.peek = false; brain.hover = false;
    const mouse = (e: PointerEvent) => { if (e.pointerType === 'mouse') Object.assign(brain.pointer, { x: e.clientX, y: e.clientY, t: now(), touch: false }); };
    const touch = (e: TouchEvent) => { const p = e.touches[0]; if (p) Object.assign(brain.pointer, { x: p.clientX, y: p.clientY, t: now(), touch: true }); };
    const leave = () => { brain.pointer.t = -1e9; };
    window.addEventListener('pointermove', mouse, { passive: true });
    window.addEventListener('touchstart', touch, { passive: true });
    window.addEventListener('touchmove', touch, { passive: true });
    document.documentElement.addEventListener('mouseleave', leave);
    return () => {
      window.removeEventListener('pointermove', mouse);
      window.removeEventListener('touchstart', touch);
      window.removeEventListener('touchmove', touch);
      document.documentElement.removeEventListener('mouseleave', leave);
    };
  }, []);

  // ---- which section is being read sets the base mood ----
  useEffect(() => {
    const secs = [...root.current!.querySelectorAll<HTMLElement>('[data-mood]')];
    const tick = () => {
      const mid = window.innerHeight * 0.45;
      for (const s of secs) {
        const r = s.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) { brain.base = s.dataset.mood as typeof brain.base; break; }
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  // ---- the doubt meter ----
  useEffect(() => {
    brain.doubt = left / TOTAL;
  }, [left]);

  const approve = useCallback((how: 'proved' | 'skipped') => {
    setApproved(how);
    brain.approved = true;
    brain.nodAt = now() + (how === 'skipped' ? 1.3 : 0.2);
    if (how === 'proved') act('approve', 2.4);
  }, []);

  const onCheck = useCallback((id: string) => {
    setChecked((c) => (c.includes(id) ? c : [...c, id]));
  }, []);
  useEffect(() => {
    if (checked.length === TOTAL && !approved) {
      const id = setTimeout(() => approve('proved'), 1500);
      return () => clearTimeout(id);
    }
  }, [checked, approved, approve]);

  const skip = () => { act('roll', 1.3); approve('skipped'); };

  const poke = () => {
    const t = now();
    pokes.current = [...pokes.current.filter((p) => t - p < 2.4), t];
    brain.shake = 1;
    if (pokes.current.length >= 4) { act('annoyed', 2.4); setPoked(2); }
    else { act('flinch', 0.45); setPoked(1); setTimeout(() => { if (brain.over === 'flinch' || !brain.over) act('wide', 0.6); }, 460); }
  };
  useEffect(() => {
    if (!poked) return;
    const id = setTimeout(() => setPoked(0), poked === 2 ? 2600 : 1400);
    return () => clearTimeout(id);
  }, [poked]);

  // ---- the opening: the pitch sets as the brow goes up ----
  useGSAP(() => {
    if (still) return;
    const el = root.current!;
    gsap.from(el.querySelectorAll('.pitch .claim-t span'), { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.12, delay: 0.9 });
    gsap.from(el.querySelectorAll('.pitch .prove, .state .claim, .doors a, .bar > *'), { opacity: 0, y: 18, duration: 0.8, ease: 'out', stagger: 0.06, delay: 1.3 });
    // big type that arrives as it is read
    gsap.utils.toArray<HTMLElement>(el.querySelectorAll('[data-in]')).forEach((n) => {
      gsap.from(n, { y: 70, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: n, start: 'top 92%', once: true } });
    });
    // the name slides across as you pass it
    gsap.fromTo(el.querySelector('.name-w'), { xPercent: 4 }, { xPercent: -6, ease: 'none', scrollTrigger: { trigger: el.querySelector('.name'), start: 'top bottom', end: 'bottom top', scrub: true } });
    const id = setTimeout(() => ScrollTrigger.refresh(), 800);
    return () => clearTimeout(id);
  }, { scope: root });

  // ---- Join opens ----
  useGSAP(() => {
    if (!approved || still) return;
    const el = root.current!;
    gsap.fromTo(el.querySelectorAll('.fold'), { height: 0 }, { height: 'auto', duration: 1, ease: 'expo.out', stagger: 0.12, delay: 0.3, clearProps: 'height' });
    gsap.from(el.querySelectorAll('.verdict'), { scale: 1.4, opacity: 0, duration: 0.6, ease: 'back.out(2.2)' });
  }, { scope: root, dependencies: [approved] });

  const dockText = poked === 2 ? 'Stop that.' : poked === 1 ? 'Hey.' : approved ? 'Fine.' : left === 0 ? 'Hm.' : `${left} to prove`;
  const peek = (on: boolean) => () => { brain.peek = on; };

  return (
    <div ref={root} className={cn('v-look', approved && 'is-approved')}>
      <a className="skip-x" href="#main">Skip to content</a>

      <Eyes slots={slots} />
      <button ref={dock} type="button" className="dock" onClick={poke} aria-label="Poke the eyes">
        <span ref={dockEyes} className="dock-eyes" />
        <span ref={label} className="dock-l" aria-hidden="true">{dockText}</span>
      </button>

      <header className="bar">
        <a className="wm" href="#top">{SITE.name}.</a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
      </header>

      <main id="main">
        {/* ---------- the look ---------- */}
        <section id="top" className="hero" data-mood="skeptic">
          <h1 className="sr-only-x">{SITE.heading}</h1>
          <button ref={hero} type="button" className="hero-slot" onClick={poke} aria-label="Poke the eyes" />
          <div className="pitch">
            <Claim id="indep" onCheck={onCheck} className="pl"><span>{TEXT.indep}</span></Claim>
            <Claim id="coaches" onCheck={onCheck} className="pl"><span>{TEXT.coaches}</span></Claim>
          </div>
          <div className="state">
            <Claim id="free" onCheck={onCheck}>{TEXT.free}</Claim>
            <Claim id="private" onCheck={onCheck}>{TEXT.private}</Claim>
            <Claim id="everyone" onCheck={onCheck}>{TEXT.everyone}</Claim>
          </div>
          <div className="doors">
            {HERO.doors.map((d, i) => <a key={d.href} className={cn('door', i === 0 && 'is-main')} href={d.href}>{d.label}<span aria-hidden="true">{i === 0 ? ' →' : ' ↗'}</span></a>)}
          </div>
          <p className="hint" aria-hidden="true"><Squint /> Every claim gets the look. Press Prove it.</p>
        </section>

        {/* ---------- the name ---------- */}
        <section className="name" data-mood="side" aria-label="The name">
          <p className="kick" data-in>About the name.</p>
          <Claim id="name" onCheck={onCheck} tone="red"><span className="name-w">{TEXT.name}</span></Claim>
        </section>

        {/* ---------- the record ---------- */}
        <section id="record" className="rec" data-mood="impressed">
          <LocalEyes mood="impressed" className="rec-eyes" />
          <div className="rec-head">
            <h2 className="h2" data-in>{RECORD.title}</h2>
            <p className="rule">{RECORD.rule}</p>
          </div>
          <p className="event" data-in><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
          <div className="results">
            {RECORD.results.map((r, i) => (
              <article key={r.who} className="res">
                <p className="who"><span>{r.who}</span></p>
                <Claim id={i === 0 ? 'shong' : 'nina'} onCheck={onCheck}><span className="what">{r.what}.</span></Claim>
              </article>
            ))}
          </div>
          <a className="more" href={RECORD.more.href}>{RECORD.more.label}<span aria-hidden="true"> {'↗'}</span></a>
        </section>

        {/* ---------- the drive ---------- */}
        <section id="drive" className="drive" data-mood="shut">
          <div className="drive-head">
            <LocalEyes mood="shut" className="drive-eyes" />
            <h2 className="h2" data-in>{DRIVE.title}</h2>
            <p className="lead">{DRIVE.lead}</p>
            <p className="aside">It is private. They will not look.</p>
          </div>
          <ol className="items">
            {DRIVE.items.map((it, i) => {
              const id = i === 0 ? 'files' : i === 5 ? 'recordings' : null;
              const body = <><span className="term">{it.term}</span><span className="txt">{it.text}</span></>;
              return (
                <li key={it.term} className="item" onPointerEnter={peek(true)} onPointerLeave={peek(false)} onFocus={peek(true)} onBlur={peek(false)}>
                  <span className="num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  {id ? <Claim id={id} onCheck={onCheck} tone="paper">{body}</Claim> : <div className="claim-t">{body}</div>}
                </li>
              );
            })}
          </ol>
          <a className="more" href={DRIVE.more.href}>{DRIVE.more.label}<span aria-hidden="true"> {'↗'}</span></a>
        </section>

        {/* ---------- the people ---------- */}
        <section id="people" className="ppl" data-mood="soft">
          <div className="ppl-head">
            <h2 className="h2" data-in>{PEOPLE.title}</h2>
            <LocalEyes mood="soft" className="ppl-eyes" />
          </div>
          <div className="coaches">
            {PEOPLE.coaches.map((c, i) => (
              <article key={c.name} className="coach">
                <p className="role">{c.role}</p>
                <h3 className="cname" data-in>{c.name}</h3>
                {i === 1
                  ? <Claim id="nathan" onCheck={onCheck}><p className="bio">{c.bio}</p></Claim>
                  : <p className="bio">{c.bio}</p>}
              </article>
            ))}
          </div>
          <Claim id="count" onCheck={onCheck} className="count-c"><p className="count">{PEOPLE.count}</p></Claim>
          <a className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}<span aria-hidden="true"> {'↗'}</span></a>
        </section>

        {/* ---------- the answer ---------- */}
        <section id="join" className="join" data-mood="straight">
          <div ref={end} className="end-slot" />
          <h2 className="h2 join-h">{JOIN.title}</h2>
          <div className="verdict-row">
            <p className="verdict" role="status">
              {approved === 'proved' ? `Fine. All ${WORDS[TOTAL].toLowerCase()} check out.` : approved === 'skipped' ? 'Suit yourself. Come in.' : left === 0 ? 'Hm.' : `${WORDS[left]} claim${left === 1 ? '' : 's'} still unproven.`}
            </p>
            {!approved && <button type="button" className="prove skip" onClick={skip}>Skip the proving</button>}
          </div>
          <p className="lead">{JOIN.lead}</p>
          <div className="paths">
            {JOIN.paths.map((p) => (
              <article key={p.id} className="path">
                <h3 className="pname">{p.name}.</h3>
                <p className="pline">{p.line}</p>
                <p className="ptext">{p.text[0]}</p>
                <div className={cn('fold', 'act', (approved || still) && 'is-on')} hidden={!approved && !still}>
                  {p.text.slice(1).map((t) => <p key={t} className="ptext">{t}</p>)}
                </div>
                <a className="go" href={p.href}>{p.line}<span aria-hidden="true"> {'→'}</span></a>
              </article>
            ))}
          </div>
          <div className="after">
            <p>{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a></p>
            <p>{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a></p>
            <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
            <p>{JOIN.discord}</p>
          </div>
        </section>
      </main>

      <footer className="foot">
        <p className="foot-line">{FOOTER.line}</p>
        <ul className="foot-links">{FOOTER.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
        <ul className="foot-pages">{FOOTER.pages.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
        <p className="draft">Draft 2, version 17. Not the live site.</p>
      </footer>
    </div>
  );
}
