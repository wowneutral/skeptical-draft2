import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './entry.css';
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useVersion } from '@/lib/version';
import { gsap, scrollToY, ScrollTrigger } from '@/lib/scroll';
import { clamp, isPhone, smooth, still } from '@/lib/utils';
import { HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, SITE } from '@/content';
import { Headword } from './Headword';

const IDS = ['pitch', 'position', 'statement', 'record', 'drive', 'people', 'join'] as const;
type Id = (typeof IDS)[number];
const LETTERS = 'abcd';

/** One phase of the scroll track: a sense held at full size, or the hand-over to the next. */
type Phase = { kind: 'hold' | 'pass'; i: number; at: number; len: number; pan: number };

export default function Entry() {
  useVersion('entry');
  const [solo, setSolo] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const col = useRef<HTMLDivElement>(null);
  const senses = useRef<(HTMLElement | null)[]>([]);
  const starts = useRef<number[]>([]);
  const pendingJump = useRef<number | null>(null);
  const swell = !still && solo === null;

  // The swell: the current sense grows to display size, the rest drop to dictionary size.
  useEffect(() => {
    const T = track.current, S = stage.current, Col = col.current;
    const els = senses.current.filter(Boolean) as HTMLElement[];
    if (!swell || !T || !S || !Col || els.length !== IDS.length) return;
    let phases: Phase[] = [];
    let total = 1;
    let anchor = 120;
    const sVals = els.map(() => -1);
    const setS = (i: number, v: number) => {
      if (Math.abs(sVals[i] - v) < 0.0005) return;
      sVals[i] = v;
      els[i].style.setProperty('--s', v.toFixed(4));
    };
    const measure = () => {
      const vh = window.innerHeight;
      const phone = isPhone();
      anchor = vh * (phone ? 0.1 : 0.14);
      Col.style.transform = 'none';
      const tops: number[] = [], hs: number[] = [];
      els.forEach((_, i) => setS(i, 0));
      els.forEach((el, i) => {
        setS(i, 1);
        tops.push(el.offsetTop); hs.push(el.offsetHeight);
        setS(i, 0);
      });
      const room = vh * 0.9 - anchor;
      const hold = vh * (phone ? 0.5 : 0.42);
      const pass = vh * (phone ? 0.5 : 0.6);
      phases = []; let at = 0;
      const st: number[] = [];
      els.forEach((_, i) => {
        const pan = i === 0 ? Math.max(0, tops[0] + hs[0] - vh * 0.94) : Math.max(0, hs[i] - room);
        st.push(at);
        phases.push({ kind: 'hold', i, at, len: hold + pan, pan });
        at += hold + pan;
        if (i < els.length - 1) { phases.push({ kind: 'pass', i, at, len: pass, pan: 0 }); at += pass; }
      });
      total = at;
      starts.current = st;
      T.style.height = `${Math.round(total + vh)}px`;
      frame(true);
      ScrollTrigger.refresh();
    };
    let lastActive = -1;
    const place = (k: number, p: number) => (k === 0 ? -p : anchor - els[k].offsetTop - p);
    const frame = (force = false) => {
      const local = clamp(window.scrollY - T.offsetTop, 0, total);
      let ph = phases[phases.length - 1];
      for (const x of phases) if (local < x.at + x.len) { ph = x; break; }
      if (!ph) return;
      const t = clamp((local - ph.at) / ph.len);
      let y: number, act: number;
      if (ph.kind === 'hold') {
        els.forEach((_, i) => setS(i, i === ph.i ? 1 : 0));
        const lead = window.innerHeight * 0.12;
        const p = clamp(local - ph.at - lead, 0, ph.pan);
        y = place(ph.i, p);
        act = ph.i;
      } else {
        const e = smooth(t);
        els.forEach((_, i) => setS(i, i === ph.i ? 1 - e : i === ph.i + 1 ? e : 0));
        const prev = phases.find((x) => x.kind === 'hold' && x.i === ph.i)!;
        y = place(ph.i, prev.pan) * (1 - e) + place(ph.i + 1, 0) * e;
        act = e < 0.5 ? ph.i : ph.i + 1;
      }
      Col.style.transform = `translate3d(0,${Math.min(0, y).toFixed(1)}px,0)`;
      if (act !== lastActive || force) { lastActive = act; setActive(act); }
    };
    const tick = () => frame();
    const onStageScroll = () => { if (S.scrollTop) S.scrollTop = 0; };
    const onFocus = (e: FocusEvent) => {
      const i = els.findIndex((el) => el.contains(e.target as Node));
      if (i >= 0 && i !== lastActive) scrollToY(T.offsetTop + starts.current[i] + 4, true);
      requestAnimationFrame(onStageScroll);
    };
    let rt = 0;
    const onResize = () => { clearTimeout(rt); rt = window.setTimeout(measure, 120); };
    measure();
    document.fonts?.ready.then(measure);
    if (pendingJump.current !== null) {
      const j = pendingJump.current; pendingJump.current = null;
      scrollToY(T.offsetTop + starts.current[j] + 4, true);
    }
    gsap.ticker.add(tick);
    window.addEventListener('resize', onResize);
    S.addEventListener('scroll', onStageScroll);
    Col.addEventListener('focusin', onFocus);
    return () => {
      gsap.ticker.remove(tick);
      clearTimeout(rt);
      window.removeEventListener('resize', onResize);
      S.removeEventListener('scroll', onStageScroll);
      Col.removeEventListener('focusin', onFocus);
      T.style.height = '';
      Col.style.transform = '';
      els.forEach((el) => el.style.removeProperty('--s'));
      requestAnimationFrame(() => ScrollTrigger.refresh());
    };
  }, [swell]);

  // Press a number: the entry collapses to that sense. Press again: it opens.
  const toggle = useCallback((i: number) => {
    const others = senses.current.filter((el, k) => el && k !== i) as HTMLElement[];
    if (still) { setSolo((s) => (s === i ? null : i)); return; }
    if (solo === null) {
      gsap.to(others, {
        opacity: 0, y: (k: number) => (k < i ? -24 : 24), duration: 0.32, ease: 'power2.in', stagger: 0.02,
        onComplete: () => {
          gsap.set(others, { clearProps: 'opacity,transform' });
          setSolo(i);
          scrollToY(0, true);
          requestAnimationFrame(() => {
            const el = senses.current[i];
            if (el) gsap.fromTo(el, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'out', clearProps: 'all' });
            el?.querySelector<HTMLButtonElement>('.e-num')?.focus({ preventScroll: true });
          });
        },
      });
    } else {
      pendingJump.current = i;
      setSolo(null);
      requestAnimationFrame(() => {
        const all = senses.current.filter((el, k) => el && k !== i) as HTMLElement[];
        gsap.fromTo(all, { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.04, ease: 'out', clearProps: 'opacity' });
        senses.current[i]?.querySelector<HTMLButtonElement>('.e-num')?.focus({ preventScroll: true });
      });
    }
  }, [solo]);

  // The italic see references.
  const see = (id: Id) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const i = IDS.indexOf(id);
    if (solo !== null) { setSolo(i); scrollToY(0, true); return; }
    if (swell && track.current) { scrollToY(track.current.offsetTop + (starts.current[i] ?? 0) + 4); return; }
    const el = document.getElementById(id);
    if (el) scrollToY(el.getBoundingClientRect().top + window.scrollY - 24);
  };
  const See = (id: Id, children: ReactNode) => (
    <a className="e-see" href={`#${id}`} onClick={see(id)}><i>see</i> <span className="e-sc">{children}</span></a>
  );

  const Sense = (i: number, label: string | undefined, children: ReactNode) => {
    const id = IDS[i];
    const on = solo === i;
    const hide = solo !== null && !on;
    return (
      <section
        id={id}
        className="e-sense"
        data-k={id}
        data-on={swell ? (active === i ? '1' : '0') : '1'}
        hidden={hide}
        aria-labelledby={`${id}-h`}
        ref={(el) => { senses.current[i] = el; }}
      >
        <button
          type="button"
          className="e-num"
          aria-pressed={on}
          aria-label={on ? 'Show the whole entry' : `Sense ${i + 1}: show it alone`}
          onClick={() => toggle(i)}
        >
          {i + 1}
        </button>
        <div className="e-body">
          {label ? <h2 id={`${id}-h`} className="e-label">{label}</h2> : <h2 id={`${id}-h`} className="sr-only-x">Sense {i + 1}</h2>}
          {children}
        </div>
      </section>
    );
  };

  // The opening and the ending: the definition settles in under the headword; the question mark drops onto the last word.
  useEffect(() => {
    const r = root.current;
    if (!r || still) return;
    const ctx = gsap.context(() => {
      gsap.from(['.e-gram', '#pitch .e-def .e-ln', '#pitch .e-also'], { opacity: 0, y: 28, duration: 1, ease: 'out', stagger: 0.09, delay: 0.75 });
      gsap.fromTo('.e-end-q', { yPercent: -160, rotate: -28, opacity: 0 }, {
        yPercent: 0, rotate: 0, opacity: 1, duration: 1.3, ease: 'elastic.out(1, 0.38)',
        scrollTrigger: { trigger: '.e-foot', start: 'top 70%', toggleActions: 'play none none reverse' },
      });
    }, r);
    return () => ctx.revert();
  }, []);
  const year = 'Draft 2, version 72. Not the live site.';

  return (
    <div ref={root} className={`v-entry${swell ? ' is-swell' : ' is-static'}${solo !== null ? ' is-solo' : ''}`}>
      <a className="skip-x" href="#main">Skip to the entry</a>
      <main id="main">
        <div className="e-track" ref={track}>
          <div className="e-stage" ref={stage}>
            <div className="e-col" ref={col}>
              <Headword />

              {Sense(0, undefined, (<>
                <p className="e-def">{HERO.pitch.map((l, k) => <span key={k} className="e-ln">{l} </span>)}</p>
                <p className="e-also">
                  {HERO.doors.map((d) => (
                    <a key={d.href} className="e-door" href={d.href}>{d.label}<span aria-hidden="true" className="e-arr"> ›</span></a>
                  ))}
                  {See("join", "Join")}
                </p>
              </>))}

              {Sense(1, undefined, (<>
                <ol className="e-subs e-subs-big">
                  {MANIFESTO.map((l, k) => (
                    <li key={k} className="e-sub">
                      <b className="e-let" aria-hidden="true">{LETTERS[k]}</b>
                      <span className="e-mid">
                        {l}
                        {k === 1 && <> {See("people", "People")}</>}
                        {k === 2 && <> {See("drive", "Drive")}</>}
                      </span>
                    </li>
                  ))}
                </ol>
              </>))}

              {Sense(2, undefined, (<>
                <p className="e-def e-stack">{HERO.statement.map((l, k) => <span key={k} className="e-ln">{l} </span>)}</p>
              </>))}

              {Sense(3, RECORD.title, (<>
                <p className="e-def">{RECORD.rule}</p>
                <div className="e-ex">
                  <p className="e-mid e-when"><b>{RECORD.when}.</b> <i>{RECORD.name}, {RECORD.where}.</i></p>
                  <ul className="e-results">
                    {RECORD.results.map((r) => (
                      <li key={r.who} className="e-mid"><span className="e-sc e-who">{r.who}</span> <i>{r.what}.</i> {r.more}</li>
                    ))}
                  </ul>
                  <p className="e-fine"><a className="e-more" href={RECORD.more.href}>{RECORD.more.label}<span aria-hidden="true" className="e-arr"> ›</span></a></p>
                </div>
              </>))}

              {Sense(4, DRIVE.title, (<>
                <p className="e-def">{DRIVE.lead}</p>
                <p className="e-mid e-runon">
                  {DRIVE.items.map((d, k) => (
                    <Fragment key={d.term}>
                      <span className="e-run"><b className="e-sc e-term">{d.term}</b> {d.text}</span>
                      {k < DRIVE.items.length - 1 && <span className="e-sep" aria-hidden="true"> ▪ </span>}
                    </Fragment>
                  ))}
                </p>
                <p className="e-fine"><a className="e-more" href={DRIVE.more.href}>{DRIVE.more.label}<span aria-hidden="true" className="e-arr"> ›</span></a> {See("join", "Join")}</p>
              </>))}

              {Sense(5, PEOPLE.title, (<>
                <p className="e-def">{PEOPLE.count}</p>
                <dl className="e-coaches">
                  {PEOPLE.coaches.map((c) => (
                    <div key={c.name} className="e-coach">
                      <dt className="e-mid"><b className="e-sc">{c.name}</b> <i>{c.role}.</i></dt>
                      <dd className="e-mid">{c.bio}</dd>
                    </div>
                  ))}
                </dl>
                <p className="e-fine"><a className="e-more" href={PEOPLE.more.href}>{PEOPLE.more.label}<span aria-hidden="true" className="e-arr"> ›</span></a></p>
              </>))}

              {Sense(6, JOIN.title, (<>
                <p className="e-def">{JOIN.lead}</p>
                <ol className="e-subs e-paths">
                  {JOIN.paths.map((p, k) => (
                    <li key={p.id} className="e-sub e-path">
                      <b className="e-let" aria-hidden="true">{LETTERS[k]}</b>
                      <div className="e-mid">
                        <h3 className="e-pname"><span className="e-sc">{p.name}</span> <a className="e-go" href={p.href}><i>{p.line}</i><span aria-hidden="true" className="e-arr"> ›</span></a></h3>
                        <p className="e-ptext">{p.text.join(' ')}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="e-fine e-small">
                  <p>{JOIN.already.before}<a className="e-more" href={JOIN.already.href}>{JOIN.already.label}</a>. {JOIN.coach.before}<a className="e-more" href={JOIN.coach.href}>{JOIN.coach.label}</a>.</p>
                  <p>{JOIN.also} <a className="e-more" href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
                  <p>{JOIN.discord}</p>
                </div>
              </>))}
            </div>
          </div>
        </div>

        <footer className="e-foot">
          <p className="e-end-word" aria-hidden="true">skep·ti·cal<span className="e-end-q">?</span></p>
          <p className="e-end-line">{FOOTER.line}</p>
          <nav className="e-links" aria-label="Elsewhere">
            {FOOTER.links.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
          </nav>
          <nav className="e-pages" aria-label="Pages">
            {FOOTER.pages.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
          </nav>
          <div className="e-colophon">
            <button type="button" className="e-top" onClick={() => { if (solo !== null) setSolo(null); scrollToY(0); }}>Back to the headword</button>
            <p>{year}</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
