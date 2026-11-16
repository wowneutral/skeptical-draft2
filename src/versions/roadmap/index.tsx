import { useCallback, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/big-shoulders-display/wght';
import '@fontsource-variable/archivo/wdth.css';
import './roadmap.css';
import { HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, SITE } from '@/content';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/scroll';
import { still, isPhone } from '@/lib/utils';
import { useVersion } from '@/lib/version';

const ITEMS = [
  { id: 'manifesto', word: 'Manifesto' },
  { id: 'record', word: 'Record' },
  { id: 'drive', word: 'Drive' },
  { id: 'people', word: 'People' },
  { id: 'join', word: 'Join' },
] as const;

const JOIN_LINK: Record<string, string> = { compete: 'Apply to compete', lecture: 'Offer to lecture', coach: 'Apply to coach' };

/** Offset of an element inside an ancestor, ignoring transforms. */
function offsetIn(el: HTMLElement, root: HTMLElement) {
  let x = 0, y = 0, n: HTMLElement | null = el;
  while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent as HTMLElement | null; }
  return { x, y };
}

function Strike() { return <span className="strike" aria-hidden="true" />; }

export default function Roadmap() {
  useVersion('roadmap');
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(-1);
  const [done, setDone] = useState<boolean[]>([false, false, false, false, false]);
  const [driveAt, setDriveAt] = useState(-1);
  const [driveDone, setDriveDone] = useState<boolean[]>(() => DRIVE.items.map(() => false));
  const [ended, setEnded] = useState(false);
  const railRef = useRef<HTMLOListElement>(null);

  const markDone = useCallback((i: number, v: boolean) => setDone((d) => { if (d[i] === v) return d; const n = d.slice(); n[i] = v; return n; }), []);
  const markDrive = useCallback((i: number, v: boolean) => setDriveDone((d) => { if (d[i] === v) return d; const n = d.slice(); n[i] = v; return n; }), []);

  // The word leaves the stack and grows into the headline (FLIP from wherever it sat).
  const fly = useCallback((i: number) => {
    if (still || !root.current) return;
    const to = root.current.querySelector<HTMLElement>(`#${ITEMS[i].id} .head-w`);
    if (!to) return;
    const heroW = root.current.querySelector<HTMLElement>(`.hero-stack li:nth-child(${i + 1}) .sw`);
    const railW = root.current.querySelector<HTMLElement>(`.rail li:nth-child(${i + 1}) .rw`);
    let from: HTMLElement | null = null;
    if (heroW) { const r = heroW.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) from = heroW; }
    if (!from) from = railW;
    if (!from) return;
    gsap.set(to, { clearProps: 'transform' });
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    if (a.height < 6 || b.height < 6) return;
    gsap.fromTo(to, { x: a.left - b.left, y: a.top - b.top, scale: a.height / b.height, transformOrigin: '0 0' },
      { x: 0, y: 0, scale: 1, duration: 1.15, ease: 'out', overwrite: true });
  }, []);

  useGSAP(() => {
    const r = root.current!;
    // Opening: the roadmap is read out, word by word.
    if (!still) {
      const tl = gsap.timeline({ delay: 0.15 });
      tl.from('.hero-off', { autoAlpha: 0, y: 12, duration: 0.6, ease: 'out' })
        .from('.hero-stack .sw', { yPercent: 105, duration: 1.1, ease: 'out', stagger: 0.09 }, 0.2)
        .from('.band > *', { autoAlpha: 0, y: 18, duration: 0.8, ease: 'out', stagger: 0.07 }, 0.75);
    }

    // Sections: active / done.
    ITEMS.forEach((it, i) => {
      const el = r.querySelector<HTMLElement>(`#${it.id}`);
      if (!el) return;
      ScrollTrigger.create({
        trigger: el, start: 'top 62%', end: 'bottom 38%',
        onEnter: () => { fly(i); setActive(i); markDone(i, false); },
        onEnterBack: () => { setActive(i); markDone(i, false); },
        onLeave: () => { markDone(i, true); setActive((a) => (a === i ? -1 : a)); },
        onLeaveBack: () => { setActive((a) => (a === i ? -1 : a)); },
      });
    });

    // The footer: the speaker sits down.
    ScrollTrigger.create({ trigger: '.end', start: 'top 70%', onEnter: () => setEnded(true), onLeaveBack: () => setEnded(false) });

    // The drive's own roadmap.
    r.querySelectorAll<HTMLElement>('.d-item').forEach((el, i) => {
      ScrollTrigger.create({
        trigger: el, start: 'top 58%', end: 'bottom 42%',
        onToggle: (s) => { if (s.isActive) setDriveAt(i); },
        onLeave: () => markDrive(i, true),
        onEnterBack: () => markDrive(i, false),
      });
    });

    if (still) return;

    // Manifesto: each line lights up as it is said.
    r.querySelectorAll<HTMLElement>('.m-line').forEach((line) => {
      gsap.fromTo(line.querySelectorAll('.mw'), { color: 'var(--dim)' }, {
        color: 'var(--ink)', stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: line, start: 'top 82%', end: 'bottom 52%', scrub: true },
      });
    });

    // Results and people rise into place.
    r.querySelectorAll<HTMLElement>('[data-up]').forEach((el) => {
      gsap.from(el, { y: 60, autoAlpha: 0, duration: 1, ease: 'out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });

    // Join: the stack is all struck but Join, which takes the screen and opens.
    const wrap = r.querySelector<HTMLElement>('.j-wrap');
    const stage = r.querySelector<HTMLElement>('.j-stage');
    const jw = r.querySelector<HTMLElement>('.j-word');
    if (wrap && stage && jw) {
      const geo = () => {
        const o = offsetIn(jw, stage);
        const w = jw.offsetWidth, h = jw.offsetHeight;
        const sw = stage.clientWidth, sh = stage.clientHeight;
        const s = Math.min((sw * 0.94) / w, (sh * 0.78) / h);
        return { dx: sw / 2 - (o.x + w / 2), dy: sh / 2 - (o.y + h / 2), s, sh };
      };
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: wrap, start: 'top top', end: 'bottom bottom', scrub: 0.7, invalidateOnRefresh: true },
      });
      tl.to('.j-row.gone', { yPercent: -140, autoAlpha: 0, stagger: 0.035, duration: 0.22, ease: 'power2.in' }, 0.06)
        .to(jw, { x: () => geo().dx, y: () => geo().dy, scale: () => geo().s, duration: 0.3, ease: 'power2.inOut' }, 0.12)
        .to('.j-half.t', { y: () => -geo().sh * 0.8 / geo().s, duration: 0.3, ease: 'power2.inOut' }, 0.5)
        .to('.j-half.b', { y: () => geo().sh * 0.8 / geo().s, duration: 0.3, ease: 'power2.inOut' }, 0.5)
        .to('.j-half', { autoAlpha: 0, duration: 0.12 }, 0.66)
        .fromTo('.j-gap', { scaleX: 0 }, { scaleX: 1, duration: 0.1, ease: 'power2.out' }, 0.42)
        .to('.j-gap', { autoAlpha: 0, duration: 0.08 }, 0.6)
        .fromTo('.ways', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.22, ease: 'power2.out' }, 0.62)
        .fromTo('.way', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, stagger: 0.05, duration: 0.16, ease: 'power2.out' }, 0.66)
        .to({}, { duration: 0.12 });
    }
  }, { scope: root });

  // Phone: keep the current word in view on the one-line roadmap.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !isPhone()) return;
    const i = Math.max(0, active === -1 ? done.lastIndexOf(true) + 1 : active);
    const li = rail.children[Math.min(i, 4)] as HTMLElement | undefined;
    if (li) rail.scrollTo({ left: Math.max(0, li.offsetLeft - 16), behavior: still ? 'auto' : 'smooth' });
  }, [active, done]);

  // Tabbing into the ways while the stage is still closed opens it.
  const openWays = () => {
    const wrap = root.current?.querySelector<HTMLElement>('.j-wrap');
    if (!wrap || still) return;
    const end = wrap.getBoundingClientRect().bottom + scrollY - innerHeight;
    if (Math.abs(scrollY - end) > 40) window.scrollTo(0, end);
  };

  const railShow = (active >= 0 && active < 4) || (active === -1 && done.some(Boolean) && !done[4] && !ended);

  return (
    <div ref={root} className={`v-roadmap${still ? ' is-still' : ''}`}>
      <a className="skip-x" href="#main">Skip to content</a>

      {/* The stack that travels with you */}
      <nav className={`rail${railShow ? ' on' : ''}`} aria-label="Roadmap">
        <ol ref={railRef}>
          {ITEMS.map((it, i) => (
            <li key={it.id} className={`${!still && active === i ? 'is-out' : ''}${!still && done[i] ? ' is-done' : ''}`}>
              <a href={`#${it.id}`} aria-current={active === i ? 'location' : undefined}>
                <span className="rw">{it.word}<Strike /></span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <header className="hero">
        <p className="hero-off">Off-time roadmap.</p>
        <nav className="hero-nav" aria-label="Order of the page">
          <ol className="hero-stack">
            {ITEMS.map((it, i) => (
              <li key={it.id}>
                <a href={`#${it.id}`} className={i === 4 ? 'is-join' : ''}>
                  <span className="sw">{it.word}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="band">
          <h1><span aria-hidden="true">Skeptical</span><span className="sr-only-x">{SITE.heading}</span></h1>
          <p className="pitch">{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</p>
          <p className="statement">{HERO.statement.map((l) => <span key={l}>{l}</span>)}</p>
          <div className="doors">
            {HERO.doors.map((d, i) => (
              <a key={d.href} href={d.href} className={`door${i === 0 ? ' main' : ''}`}>{d.label}</a>
            ))}
          </div>
        </div>
      </header>

      <main id="main">
        <section id="manifesto" className="sec" aria-labelledby="h-manifesto">
          <h2 id="h-manifesto" className="head"><span className="head-w">Manifesto<i>.</i></span></h2>
          <div className="m-lines">
            {MANIFESTO.map((l) => (
              <p className="m-line" key={l}>{l.split(' ').map((w, j) => <span className="mw" key={j}>{w} </span>)}</p>
            ))}
          </div>
        </section>

        <section id="record" className="sec" aria-labelledby="h-record">
          <h2 id="h-record" className="head"><span className="head-w">Record<i>.</i></span></h2>
          <p className="rule">{RECORD.rule}</p>
          <div className="event" data-up>
            <p className="ev-when">{RECORD.when}</p>
            <p className="ev-name">{RECORD.name}</p>
            <p className="ev-where">{RECORD.where}</p>
          </div>
          <ol className="results">
            {RECORD.results.map((res) => (
              <li key={res.who} className="result" data-up>
                <p className="res-what">{res.what}</p>
                <p className="res-who">{res.who}</p>
                <p className="res-more">{res.more}</p>
              </li>
            ))}
          </ol>
          <a className="more" href={RECORD.more.href}>{RECORD.more.label}</a>
        </section>

        <section id="drive" className="sec" aria-labelledby="h-drive">
          <h2 id="h-drive" className="head"><span className="head-w">Drive<i>.</i></span></h2>
          <p className="lead">{DRIVE.lead}</p>
          <div className="d-grid">
            <ol className="d-map" aria-hidden="true">
              {DRIVE.items.map((d, i) => (
                <li key={d.term} className={`${driveDone[i] && !still ? 'is-done' : ''}${driveAt === i && !driveDone[i] && !still ? ' is-at' : ''}`}>
                  <span className="dm">{d.term}<Strike /></span>
                </li>
              ))}
            </ol>
            <ol className="d-items">
              {DRIVE.items.map((d, i) => (
                <li key={d.term} className={`d-item${driveDone[i] && !still ? ' is-done' : ''}`}>
                  <h3 className="d-term"><span>{d.term}<Strike /></span></h3>
                  <p className="d-text">{d.text}</p>
                </li>
              ))}
            </ol>
          </div>
          <a className="more" href={DRIVE.more.href}>{DRIVE.more.label}</a>
        </section>

        <section id="people" className="sec" aria-labelledby="h-people">
          <h2 id="h-people" className="head"><span className="head-w">People<i>.</i></span></h2>
          <div className="coaches">
            {PEOPLE.coaches.map((c) => (
              <article key={c.name} className="coach" data-up>
                <h3 className="c-name">{c.name}</h3>
                <p className="c-role">{c.role}</p>
                <p className="c-bio">{c.bio}</p>
              </article>
            ))}
          </div>
          <p className="count" data-up>{PEOPLE.count}</p>
          <a className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</a>
        </section>

        <section id="join" className="sec-join" aria-labelledby="h-join">
          <h2 id="h-join" className={still ? 'head' : 'sr-only-x'}>{still ? <span className="head-w">Join<i>.</i></span> : JOIN.title}</h2>
          <div className="j-wrap">
            <div className="j-stage">
              {!still && (
                <ol className="j-stack" aria-hidden="true">
                  {ITEMS.slice(0, 4).map((it) => (
                    <li key={it.id} className="j-row gone"><span className="sw">{it.word}<Strike /></span></li>
                  ))}
                  <li className="j-row">
                    <span className="j-word">
                      <span className="j-size">Join</span>
                      <span className="j-half t">Join</span>
                      <span className="j-half b">Join</span>
                    </span>
                  </li>
                </ol>
              )}
              {!still && <span className="j-gap" aria-hidden="true" />}
              <div className="ways" onFocus={openWays}>
                <p className="j-lead">{JOIN.lead}</p>
                <ol className="ways-row">
                  {JOIN.paths.map((p) => (
                    <li key={p.id} className="way">
                      <h3 className="w-name">{p.name}</h3>
                      <p className="w-line">{p.line}</p>
                      <p className="w-first">{p.text[0]}</p>
                      <a className="w-go" href={p.href}>{JOIN_LINK[p.id]}</a>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
          <div className="j-more">
            <div className="j-detail">
              {JOIN.paths.map((p) => (
                <div key={p.id} className="jd">
                  <p className="jd-name">{p.name}</p>
                  <ul>{p.text.map((t, k) => <li key={t} className={k === 0 ? 'jd-first' : undefined}>{t}</li>)}</ul>
                </div>
              ))}
            </div>
            <div className="j-lines">
              <p>{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a></p>
              <p>{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a></p>
              <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
              <p>{JOIN.discord}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className={`end${ended || still ? ' is-ended' : ''}`}>
        <ol className="end-stack" aria-hidden="true">
          {ITEMS.map((it) => <li key={it.id}><span className="sw">{it.word}<Strike /></span></li>)}
        </ol>
        <p className="end-line">{FOOTER.line}</p>
        <ul className="end-links">
          {FOOTER.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
        </ul>
        <ul className="end-pages">
          {FOOTER.pages.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
        </ul>
        <p className="draft">Draft 2, version 57. Not the live site.</p>
      </footer>
    </div>
  );
}
