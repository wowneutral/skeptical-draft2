// Version 55: The cut. Every headline is set enormous and sliced clean through;
// the halves part and what the claim rests on is printed in the gap.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/instrument-sans/wdth.css';
import './cut.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/scroll';
import { coarse, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { Word } from './Word';

function Arrow() {
  return (
    <svg className="door-arr" width="18" height="12" viewBox="0 0 18 12" aria-hidden="true" focusable="false">
      <path d="M0 6h16M11 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

const title = (w: number, h: number) => Math.min(h * 0.4, w < 700 ? 200 : 330);

function usePhone() {
  const q = '(max-width: 700px)';
  const [p, setP] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const f = () => setP(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return p;
}

/** A manifesto line: two clipped copies that slide back together as you read it. */
function Line({ text, i }: { text: string; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  // The cut sits just above the baseline of the first line, found from the text itself.
  useLayoutEffect(() => {
    const el = ref.current!;
    const set = () => {
      const m = el.querySelector<HTMLElement>('.mf-mark');
      if (!m) return;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      el.style.setProperty('--cut', `${m.getBoundingClientRect().bottom - el.getBoundingClientRect().top - fs * 0.1}px`);
    };
    set();
    document.fonts?.ready.then(set);
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useGSAP(() => {
    if (still) return;
    const el = ref.current!;
    const top = el.querySelector('.mf-a');
    const bot = el.querySelector('.mf-b');
    const red = el.querySelector('.mf-r');
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 98%', end: 'center 52%', scrub: 0.6 } });
    const d = i % 2 ? -1 : 1;
    tl.fromTo(top, { xPercent: -14 * d }, { xPercent: 0, ease: 'power2.out', duration: 1 }, 0)
      .fromTo(bot, { xPercent: 14 * d }, { xPercent: 0, ease: 'power2.out', duration: 1 }, 0)
      .fromTo(red, { opacity: 1 }, { opacity: 0, ease: 'power1.in', duration: 0.5 }, 0.4);
  }, { scope: ref });
  return (
    <div className="mf-line" ref={ref} data-i={i}>
      <p className="mf-a"><span className="mf-mark" aria-hidden="true" />{text}</p>
      <p className="mf-b" aria-hidden="true">{text}</p>
      <i className="mf-r" aria-hidden="true" />
    </div>
  );
}

export default function Cut() {
  useVersion('cut');
  const phone = usePhone();
  const [item, setItem] = useState(-1);
  const drive = useRef<HTMLUListElement>(null);
  const foot = useRef<HTMLElement>(null);

  // The last line is scored underneath, never through.
  useGSAP(() => {
    const r = foot.current!.querySelector('.foot-rule');
    if (still) { gsap.set(r, { scaleX: 1 }); return; }
    gsap.fromTo(r, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: r, start: 'top 95%', end: 'top 55%', scrub: 0.8 } });
  }, { scope: foot });

  // The first drive item opens itself when the list reaches the middle of the screen.
  useEffect(() => {
    if (still) return;
    const st = ScrollTrigger.create({
      trigger: drive.current, start: 'top 55%', once: true,
      onEnter: () => setItem((v) => (v < 0 ? 0 : v)),
    });
    return () => st.kill();
  }, []);
  // The drive grows and shrinks as items open: tell the triggers below once it settles.
  useEffect(() => {
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 1300);
    return () => window.clearTimeout(t);
  }, [item]);

  const heroGap = (
    <div className="hero-gap">
      <p className="hero-pitch">
        {HERO.pitch.map((l) => <span key={l}>{l}</span>)}
      </p>
      <p className="hero-state">
        {HERO.statement.map((l) => <span key={l}>{l}</span>)}
      </p>
      <div className="hero-doors">
        {HERO.doors.map((d) => (
          <a key={d.href} className="door" href={d.href}>{d.label}<Arrow /></a>
        ))}
      </div>
    </div>
  );

  return (
    <div className="v-cut">
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="top">
        <a className="top-name" href="#main">Skeptical<span className="cx-q">?</span></a>
        <nav aria-label="Sections">
          <ul className="top-nav">
            {NAV.map((n) => <li key={n.id}><a href={`#${n.id}`}>{n.label}</a></li>)}
          </ul>
        </nav>
      </header>

      <main id="main">
        <section className="hero" aria-labelledby="h1">
          <h1 id="h1" className="sr-only-x">{SITE.heading}</h1>
          {phone ? (
            <div className="hero-stack">
              <Word text="SKEP" cut={null} trigger="load" label="Cut the word: Skep" max={(w, h) => Math.min(h * 0.3, 260)} />
              <Word text="TICAL?" cut={0.07} bias={1} trigger="load" delay={0.15} label="Cut the word: Tical" max={(w, h) => Math.min(h * 0.3, 260)}>
                {heroGap}
              </Word>
            </div>
          ) : (
            <Word text="SKEPTICAL?" cut={0.07} bias={1} trigger="load" align="center" label="Cut the word Skeptical" max={(w, h) => Math.min(h * 0.46, 520)}>
              {heroGap}
            </Word>
          )}
          <p className="hero-hint" aria-hidden="true">{coarse ? 'Swipe a big word to cut it.' : 'Drag across any big word to cut it.'}</p>
        </section>

        <section className="mf" aria-label="What we are">
          {MANIFESTO.map((m, i) => <Line key={m} text={m} i={i} />)}
        </section>

        <section className="sec rec" id="record" aria-labelledby="t-record">
          <h2 id="t-record" className="sr-only-x">{RECORD.title}</h2>
          <Word text={RECORD.title} cut={0.22} label="Cut the title: The record" max={title}>
            <div className="rec-in">
              <p className="rec-rule">{RECORD.rule}</p>
              <div className="rec-event">
                <span className="rec-when">{RECORD.when}</span>
                <span className="rec-name">{RECORD.name}</span>
                <span className="rec-where">{RECORD.where}</span>
              </div>
              <ul className="rec-res">
                {RECORD.results.map((r) => (
                  <li key={r.who}>
                    <span className="rec-who">{r.who}</span>
                    <span className="rec-what">{r.what}</span>
                    <span className="rec-more">{r.more}</span>
                  </li>
                ))}
              </ul>
              <a className="more" href={RECORD.more.href}>{RECORD.more.label}</a>
            </div>
          </Word>
        </section>

        <section className="sec drv" id="drive" aria-labelledby="t-drive">
          <h2 id="t-drive" className="sr-only-x">{DRIVE.title}</h2>
          <Word text={DRIVE.title} cut={0.22} label="Cut the title: The drive" max={title}>
            <div className="gap-in">
              <p className="lead">{DRIVE.lead}</p>
              <a className="more" href={DRIVE.more.href}>{DRIVE.more.label}</a>
            </div>
          </Word>
          <ul className="drv-list" ref={drive}>
            {DRIVE.items.map((d, i) => (
              <li key={d.term} data-open={still || item === i}>
                <span className="drv-state" aria-hidden="true">{still || item === i ? 'Close' : 'Open'}</span>
                <Word
                  text={d.term}
                  cut={0.24}
                  mode="flow"
                  trigger="manual"
                  open={still || item === i}
                  expanded={still || item === i}
                  onPress={() => setItem((v) => (v === i ? -1 : i))}
                  label={d.term}
                  max={(w) => Math.min(w * 0.15, 200)}
                >
                  <p className="drv-text">{d.text}</p>
                </Word>
              </li>
            ))}
          </ul>
        </section>

        <section className="sec ppl" id="people" aria-labelledby="t-people">
          <h2 id="t-people" className="sr-only-x">{PEOPLE.title}</h2>
          <Word text={PEOPLE.title} cut={0.22} label="Cut the title: The people" max={title}>
            <div className="ppl-in">
              <ul className="ppl-list">
                {PEOPLE.coaches.map((c) => (
                  <li key={c.name}>
                    <h3 className="ppl-name">{c.name}</h3>
                    <p className="ppl-role">{c.role}</p>
                    <p className="ppl-bio">{c.bio}</p>
                  </li>
                ))}
              </ul>
              <div className="ppl-foot">
                <p className="ppl-count">{PEOPLE.count}</p>
                <a className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</a>
              </div>
            </div>
          </Word>
        </section>

        <section className="sec join" id="join" aria-labelledby="t-join">
          <h2 id="t-join" className="sr-only-x">{JOIN.title}</h2>
          <Word text={JOIN.title} cut={0.3} label="Cut the title: Join" max={(w, h) => Math.min(h * 0.4, w < 700 ? 220 : 300)}>
            <div className="gap-in"><p className="lead">{JOIN.lead}</p></div>
          </Word>
          <div className="join-paths">
            {JOIN.paths.map((p, i) => (
              <div className="path" id={`p-${p.id}`} key={p.id} data-i={i}>
                <h3 className="sr-only-x">{p.name}</h3>
                <Word text={p.name} cut={[0.58, 0.34, 0.1][i]} bias={[0.75, 0.5, 0.25][i]} label={`Cut the word: ${p.name}`} max={(w) => Math.min(w * 0.22, 300)}>
                  <div className="path-in">
                    <a className="path-line" href={p.href}>{p.line}<Arrow /></a>
                    <ul className="path-text">
                      {p.text.map((t) => <li key={t}>{t}</li>)}
                    </ul>
                  </div>
                </Word>
              </div>
            ))}
          </div>
          <div className="join-also">
            <p>{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a></p>
            <p>{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a></p>
            <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
            <p>{JOIN.discord}</p>
          </div>
        </section>
      </main>

      <footer className="foot" ref={foot}>
        <p className="sr-only-x">{FOOTER.line}</p>
        <div className="foot-line">
          {FOOTER.line.split(/(?<=\.)\s+/).map((l) => (
            <Word key={l} text={l} cut={null} whole trigger="scroll" label={`${l} This one stays whole.`} max={(w, h) => Math.min(h * 0.3, 260)} />
          ))}
          <i className="foot-rule" aria-hidden="true" />
        </div>
        <div className="foot-cols">
          <ul className="foot-links">
            {FOOTER.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
          </ul>
          <ul className="foot-pages">
            {FOOTER.pages.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
          </ul>
        </div>
        <p className="foot-note">Draft 2, version 55. Not the live site.</p>
      </footer>
    </div>
  );
}
