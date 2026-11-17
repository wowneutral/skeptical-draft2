// Version 92: the turn. A winged figure turns on an invisible turntable as a flat black silhouette,
// so it can be read turning either way. Hold it and the light comes up; scroll and it stops in
// profile at the record, turns its back at the drive, and faces you, lit for good, at Join.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/index.css';
import './turn.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap, ScrollTrigger } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { rig } from './store';

const Scene = lazy(() => import('./Scene'));
const ext = (href: string) => (href.startsWith('http') ? { rel: 'noopener' } : {});

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch { return false; }
}

const Arrow = () => (
  <svg className="arr" viewBox="0 0 26 12" aria-hidden="true"><path d="M0 6h24M19 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
);

function Stage({ phone }: { phone: boolean }) {
  const hit = useRef<HTMLButtonElement>(null);
  const hint = useRef<HTMLSpanElement>(null);
  const press = useRef<{ id: number; x: number; moved: number; t: number } | null>(null);

  useEffect(() => {
    rig.hit = hit.current; rig.hint = hint.current;
    return () => { rig.hit = null; rig.hint = null; };
  }, []);

  const end = () => {
    if (press.current) clearTimeout(press.current.t);
    press.current = null; rig.drag = false; rig.hold = false;
  };

  return (
    <div className="stage" aria-hidden={false}>
      <Suspense fallback={null}>
        <Scene lo={phone} dpr={phone ? [1.5, 2.5] : [1.25, 2]} />
      </Suspense>
      <button
        ref={hit}
        type="button"
        className="hit"
        aria-label="The figure. Hold Space to switch the light on. Arrow keys turn it."
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (rig.still) { rig.hold = true; return; }
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          const t = window.setTimeout(() => { if (press.current && press.current.moved < 7) rig.hold = true; }, 130);
          press.current = { id: e.pointerId, x: e.clientX, moved: 0, t };
        }}
        onPointerMove={(e) => {
          const p = press.current; if (!p || p.id !== e.pointerId) return;
          const dx = e.clientX - p.x; p.x = e.clientX; p.moved += Math.abs(dx);
          if (p.moved >= 7) { rig.drag = true; rig.hold = false; rig.dragDx += dx; }
        }}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') rig.over = true; }}
        onPointerLeave={() => { rig.over = false; }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); rig.hold = true; }
          else if (e.key === 'ArrowRight') { e.preventDefault(); rig.kick += 0.9; }
          else if (e.key === 'ArrowLeft') { e.preventDefault(); rig.kick -= 0.9; }
        }}
        onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') rig.hold = false; }}
        onBlur={() => { rig.hold = false; }}
      />
      <span ref={hint} className="hint" aria-hidden="true">Press and hold.</span>
      <span className="base" aria-hidden="true" />
    </div>
  );
}

export default function Turn() {
  useVersion('turn');
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [phone, setPhone] = useState(isPhone);
  useRise(root);
  rig.phone = phone;
  rig.still = still;

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // Which section has arrived: the last one whose top has passed the line.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const secs = [...el.querySelectorAll<HTMLElement>('[data-sec]')];
    const tick = () => {
      const line = innerHeight * (rig.phone ? 0.7 : 0.42);
      let at = 0;
      secs.forEach((s, i) => { if (s.getBoundingClientRect().top < line) at = i; });
      rig.sec = at;
      rig.joinTop = secs[5].getBoundingClientRect().top;
      el.dataset.sec = String(at);
    };
    tick();
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  // The opening: the pitch sets itself while the figure rises through the floor.
  useEffect(() => {
    if (still || !root.current) return;
    const q = gsap.utils.selector(root.current);
    const tl = gsap.timeline({ delay: 0.25 });
    tl.from(q('.pitch .ln > span'), { yPercent: 108, duration: 1.3, ease: 'expo.out', stagger: 0.12 })
      .from(q('.hero .after, .top'), { opacity: 0, y: 14, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, 0.6);
    return () => { tl.kill(); };
  }, []);

  // The manifesto's last line is a turn: as it arrives, so does the figure's.
  useEffect(() => {
    if (still || !root.current) return;
    const el = root.current.querySelector('.the-turn'); if (!el) return;
    const st = ScrollTrigger.create({ trigger: el, start: 'top 70%', onEnter: () => { rig.flip = true; }, onLeaveBack: () => { rig.flip = true; } });
    return () => st.kill();
  }, []);

  const lean = (i: number) => ({
    onPointerEnter: () => { rig.lean = i - 1; },
    onPointerLeave: () => { rig.lean = 0; },
    onFocus: () => { rig.lean = i - 1; },
    onBlur: () => { rig.lean = 0; },
  });

  const [yes, no] = MANIFESTO[3].split(/(?<=\.)\s/);

  return (
    <div ref={root} className={`v-turn${webgl ? '' : ' flat'}${still ? ' still' : ''}`}>
      <a className="skip-x" href="#main">Skip to content</a>
      {webgl && <Stage phone={phone} />}

      <main id="main">
        <section className="sec hero" data-sec="hero" aria-labelledby="t-hero">
          <header className="top">
            <a className="mark" href="#main">Skeptical</a>
            <nav aria-label="Sections">
              {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
            </nav>
          </header>
          <div className="col left">
            <h1 id="t-hero" className="sr-only-x">{SITE.heading}</h1>
            <p className="pitch">
              {HERO.pitch.map((l) => <span className="ln" key={l}><span>{l}</span></span>)}
            </p>
            <p className="statement after">
              {HERO.statement.map((l) => <span key={l}>{l}</span>)}
            </p>
            <div className="doors after">
              {HERO.doors.map((d) => (
                <a key={d.href} className="door" href={d.href} {...ext(d.href)}>{d.label}<Arrow /></a>
              ))}
            </div>
          </div>
        </section>

        <section className="sec manifesto" data-sec="manifesto" aria-label="What we are">
          <div className="col left">
            <ol className="lines">
              {MANIFESTO.slice(0, 3).map((l) => <li key={l} data-rise>{l}</li>)}
              <li className="the-turn" data-rise>
                <span>{yes}</span> <em>{no}</em>
              </li>
            </ol>
          </div>
        </section>

        <section className="sec record" id="record" data-sec="record" aria-labelledby="t-record">
          <div className="col right">
            <h2 id="t-record" className="title" data-rise>{RECORD.title}</h2>
            <p className="rule" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise>
              <span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span>
            </p>
            <ul className="results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <span className="who">{r.who}</span>
                  <span className="what">{r.what}</span>
                  <span className="more">{r.more}</span>
                </li>
              ))}
            </ul>
            <a className="link" href={RECORD.more.href} {...ext(RECORD.more.href)} data-rise>{RECORD.more.label}<Arrow /></a>
          </div>
        </section>

        <section className="sec drive" id="drive" data-sec="drive" aria-labelledby="t-drive">
          <div className="col left wide">
            <h2 id="t-drive" className="title" data-rise>{DRIVE.title}</h2>
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <dl className="items">
              {DRIVE.items.map((it) => (
                <div key={it.term} className="item" data-rise>
                  <dt>{it.term}</dt>
                  <dd>{it.text}</dd>
                </div>
              ))}
            </dl>
            <a className="link" href={DRIVE.more.href} {...ext(DRIVE.more.href)} data-rise>{DRIVE.more.label}<Arrow /></a>
          </div>
        </section>

        <section className="sec people" id="people" data-sec="people" aria-labelledby="t-people">
          <div className="col right">
            <h2 id="t-people" className="title" data-rise>{PEOPLE.title}</h2>
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
            <a className="link" href={PEOPLE.more.href} {...ext(PEOPLE.more.href)} data-rise>{PEOPLE.more.label}<Arrow /></a>
          </div>
        </section>

        <section className="sec join" id="join" data-sec="join" aria-labelledby="t-join">
          <div className="join-head">
            <h2 id="t-join" className="title">{JOIN.title}</h2>
            <p className="lead">{JOIN.lead}</p>
          </div>
          <ol className="paths">
            {JOIN.paths.map((p, i) => (
              <li key={p.id} className="path" {...lean(i)}>
                <a href={p.href} {...ext(p.href)}>
                  <span className="pname">{p.name}<Arrow /></span>
                  <span className="pline">{p.line}</span>
                  <span className="ptext">{p.text[0]}</span>
                </a>
              </li>
            ))}
          </ol>
          <div className="also">
            <p>{JOIN.already.before}<a href={JOIN.already.href} {...ext(JOIN.already.href)}>{JOIN.already.label}</a></p>
            <p>{JOIN.coach.before}<a href={JOIN.coach.href} {...ext(JOIN.coach.href)}>{JOIN.coach.label}</a></p>
            <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
            <p>{JOIN.discord}</p>
          </div>
        </section>
      </main>

      <footer className="foot">
        <p className="fline">{FOOTER.line.split(/(?<=\.)\s/).map((l, i) => i ? <em key={l}>{l}</em> : <span key={l}>{l}</span>)}</p>
        <div className="frow">
          <ul>
            {FOOTER.links.map((l) => <li key={l.href}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}
          </ul>
          <ul>
            {FOOTER.pages.map((l) => <li key={l.href}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}
          </ul>
        </div>
        <p className="small">Draft 2, version 92. Not the live site. The figure is the Stanford Lucy scan, used under its research licence.</p>
      </footer>
    </div>
  );
}
