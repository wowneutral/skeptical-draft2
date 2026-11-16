// The specimen: the site set as a type specimen for one display serif, family
// name SKEPTICAL. One object (the question mark, in solid black lacquer) and
// then sheet after sheet, each section set at a ladder of sizes and weights.
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/wght.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { useVersion } from '@/lib/version';
import { gsap, ScrollTrigger, SplitText, useGSAP } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { still } from '@/lib/utils';
import { D } from './geo';
import { turn } from './Mark';
import './specimen.css';

const Mark = lazy(() => import('./Mark'));

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** A tiny factual label: the size this line is really set at, in points, measured live. */
function Pt({ of, pre }: { of: React.RefObject<HTMLElement | null>; pre: string }) {
  const [pt, setPt] = useState<number | null>(null);
  useEffect(() => {
    const read = () => { const el = of.current; if (el) setPt(Math.round(parseFloat(getComputedStyle(el).fontSize) * 0.75)); };
    read();
    const id = requestAnimationFrame(read);
    const ro = new ResizeObserver(read);
    if (of.current) ro.observe(of.current);
    if (document.fonts) document.fonts.ready.then(read).catch(() => {});
    return () => { cancelAnimationFrame(id); ro.disconnect(); };
  }, [of]);
  return <span className="lab">{pre}{pt !== null ? `, ${pt} pt` : ''}</span>;
}

function Arrow() {
  return (
    <svg className="arw" viewBox="0 0 40 16" aria-hidden="true" focusable="false">
      <path d="M0 8h37M30 1.5L37.5 8 30 14.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function FlatMark() {
  return (
    <svg className="flatmark" viewBox="40 -780 550 810" role="img" aria-label="The question mark of the specimen">
      <path d={D} fill="currentColor" />
    </svg>
  );
}

/* ---------- The opening: header beside the object ---------- */

function Opening({ webgl }: { webgl: boolean }) {
  const h1 = useRef<HTMLSpanElement>(null), sample = useRef<HTMLParagraphElement>(null), text = useRef<HTMLParagraphElement>(null);
  const guides = useRef<(HTMLElement | null)[]>([]);
  const stage = useRef<HTMLDivElement>(null);
  const moved = useRef(0);

  useEffect(() => {
    if (!webgl || still) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      turn.px = (e.clientX / window.innerWidth) * 2 - 1;
      turn.py = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [webgl]);

  const down = (e: React.PointerEvent) => {
    if (still) return;
    turn.drag = true; moved.current = 0;
    let lx = e.clientX;
    const el = e.currentTarget as HTMLElement;
    try { el.setPointerCapture(e.pointerId); } catch { /* fine */ }
    const mv = (ev: PointerEvent) => { const d = ev.clientX - lx; lx = ev.clientX; turn.dx += d; moved.current += Math.abs(d); };
    const up = () => { turn.drag = false; el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
    el.addEventListener('pointermove', mv);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };
  const flick = () => { if (still) return; if (moved.current > 6) { moved.current = 0; return; } turn.kick += 15; };
  const key = (e: React.KeyboardEvent) => {
    if (still) return;
    if (e.key === 'ArrowRight') { turn.kick += 4; e.preventDefault(); }
    if (e.key === 'ArrowLeft') { turn.kick -= 4; e.preventDefault(); }
  };

  return (
    <header className="open" id="top">
      <div className="open-bar">
        <span className="lab">Specimen</span>
        <span className="lab">Display serif. Roman and italic, 400 to 900.</span>
        <nav aria-label="Sections" className="open-nav">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </div>

      <div className="open-grid">
        <div className="open-copy">
          <div className="row-lab"><span className="lab">Family name</span><Pt of={h1} pre="Black 900" /></div>
          <h1 className="fam">
            <span ref={h1} className="fam-word" aria-hidden="true">SKEPTICAL</span>
            <span className="sr-only-x">{SITE.heading}</span>
          </h1>
          <div className="row-lab"><span className="lab">Sample</span><Pt of={sample} pre="Italic 400" /></div>
          <p ref={sample} className="sample">{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</p>
          <div className="row-lab"><Pt of={text} pre="Roman 500" /></div>
          <p ref={text} className="statement">{HERO.statement.map((l) => <span key={l}>{l}</span>)}</p>
          <div className="doors">
            {HERO.doors.map((d) => <a key={d.href} href={d.href}><span>{d.label}</span><Arrow /></a>)}
          </div>
        </div>

        <div className="open-stage" ref={stage}>
          <span className="guide g-cap" ref={(el) => { guides.current[0] = el; }} aria-hidden="true"><span className="lab">Cap height</span></span>
          <span className="guide g-dot" ref={(el) => { guides.current[1] = el; }} aria-hidden="true"><span className="lab">Dot</span></span>
          <span className="guide g-base" ref={(el) => { guides.current[2] = el; }} aria-hidden="true"><span className="lab">Baseline</span></span>
          {webgl ? (
            <>
              <div className="canvas" aria-hidden="true"><Suspense fallback={null}><Mark guides={guides} /></Suspense></div>
              <button type="button" className="turner" aria-label="Turn the question mark" onPointerDown={down} onClick={flick} onKeyDown={key} />
            </>
          ) : <FlatMark />}
          <div className="stage-foot">
            <span className="lab">U+003F, question mark. Black 900, in depth.</span>
            {webgl && !still && <span className="lab hint">Drag it. Flick it. It comes back.</span>}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ---------- Sheet 1: the manifesto as a waterfall ---------- */

function Fall({ m, i, lines, wl }: { m: string; i: number; lines: React.RefObject<(HTMLParagraphElement | null)[]>; wl: React.RefObject<(HTMLSpanElement | null)[]> }) {
  const p = useRef<HTMLParagraphElement>(null);
  return (
    <li className={`fall f${i}`}>
      <div className="fall-lab">
        <Pt of={p} pre="Roman" />
        <span className="lab" ref={(el) => { wl.current[i] = el; }}>{still ? 'Weight 900' : 'Weight 400'}</span>
      </div>
      <p ref={(el) => { p.current = el; lines.current[i] = el; }} style={{ fontWeight: still ? 900 : 400 }}>{m}</p>
    </li>
  );
}

function Waterfall() {
  const lines = useRef<(HTMLParagraphElement | null)[]>([]);
  const wl = useRef<(HTMLSpanElement | null)[]>([]);
  useGSAP(() => {
    if (still) return;
    lines.current.forEach((el, i) => {
      if (!el) return;
      const o = { w: 400 };
      gsap.to(o, {
        w: 900, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 92%', end: 'center 42%', scrub: 0.6 },
        onUpdate: () => {
          el.style.fontWeight = String(Math.round(o.w));
          const l = wl.current[i]; if (l) l.textContent = `Weight ${Math.round(o.w)}`;
        },
      });
    });
  });
  return (
    <section className="sheet water" aria-labelledby="h-water">
      <div className="sheet-head">
        <h2 id="h-water" className="sr-only-x">What we are.</h2>
        <span className="lab">Waterfall</span>
        <span className="lab">Scroll sets the weight</span>
      </div>
      <ol className="falls">
        {MANIFESTO.map((m, i) => <Fall key={m} m={m} i={i} lines={lines} wl={wl} />)}
      </ol>
    </section>
  );
}

/* ---------- Sheet 2: the record as the big sample ---------- */

function Record() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(() => {
    if (still) return;
    ref.current?.querySelectorAll<HTMLElement>('.big-what').forEach((el) => {
      const s = SplitText.create(el, { type: 'chars,words', mask: 'chars' });
      gsap.from(s.chars, { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.025, scrollTrigger: { trigger: el, start: 'top 85%' } });
    });
  }, { scope: ref });
  return (
    <section className="sheet record" id="record" ref={ref} aria-labelledby="h-record">
      <div className="sheet-head">
        <h2 id="h-record" className="title">{RECORD.title}</h2>
        <span className="lab">Big sample</span>
      </div>
      <p className="rule" data-rise>{RECORD.rule}</p>
      <p className="event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
      <div className="bigs">
        {RECORD.results.map((r, i) => (
          <article key={r.who} className={`big b${i}`}>
            <div className="row-lab"><span className="lab">{i === 0 ? 'Roman 900' : 'Italic 700'}</span><span className="lab red">{r.who}</span></div>
            <h3 className="big-what">{r.what}.</h3>
            <p className="big-more" data-rise><span className="who">{r.who}</span> {r.more}</p>
          </article>
        ))}
      </div>
      <a className="more" href={RECORD.more.href}><span>{RECORD.more.label}</span><Arrow /></a>
    </section>
  );
}

/* ---------- Sheet 3: the drive as the character set ---------- */

const STYLES: { w: number; it: boolean; name: string }[] = [
  { w: 900, it: false, name: 'Black 900' },
  { w: 400, it: true, name: 'Italic 400' },
  { w: 700, it: false, name: 'Bold 700' },
  { w: 500, it: true, name: 'Medium italic 500' },
  { w: 800, it: false, name: 'Extra bold 800' },
  { w: 400, it: false, name: 'Regular 400' },
  { w: 900, it: true, name: 'Black italic 900' },
];

function Drive() {
  const [on, setOn] = useState(0);
  const it = DRIVE.items[on], st = STYLES[on];
  const big = useRef<HTMLParagraphElement>(null);
  return (
    <section className="sheet drive" id="drive" aria-labelledby="h-drive">
      <div className="sheet-head">
        <h2 id="h-drive" className="title">{DRIVE.title}</h2>
        <span className="lab">Character set, seven words</span>
      </div>
      <p className="lead" data-rise>{DRIVE.lead}</p>
      <div className="charset">
        <div className="inspect" aria-live="polite">
          <div className="row-lab"><span className="lab red">{on + 1} of {DRIVE.items.length}</span><Pt of={big} pre={st.name} /></div>
          <p ref={big} key={on} className="inspect-word" style={{ fontWeight: st.w, fontStyle: st.it ? 'italic' : 'normal' }}>{it.term}</p>
          <p className="inspect-text">{it.text}</p>
        </div>
        <ul className="cells">
          {DRIVE.items.map((d, i) => (
            <li key={d.term}>
              <button
                type="button" className={`cell${i === on ? ' is-on' : ''}`} aria-pressed={i === on}
                onClick={() => setOn(i)} onPointerEnter={(e) => { if (e.pointerType === 'mouse') setOn(i); }} onFocus={() => setOn(i)}
              >
                <span className="cell-n" aria-hidden="true">{i + 1}</span>
                <span className="cell-w" style={{ fontWeight: STYLES[i].w, fontStyle: STYLES[i].it ? 'italic' : 'normal' }}>{d.term}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <a className="more" href={DRIVE.more.href}><span>{DRIVE.more.label}</span><Arrow /></a>
    </section>
  );
}

/* ---------- Sheet 4: the people as roman and italic ---------- */

function People() {
  return (
    <section className="sheet people" id="people" aria-labelledby="h-people">
      <div className="sheet-head">
        <h2 id="h-people" className="title">{PEOPLE.title}</h2>
        <span className="lab">Roman and italic, a pairing</span>
      </div>
      <div className="pair">
        {PEOPLE.coaches.map((c, i) => (
          <article key={c.name} className={`coach c${i}`} data-rise>
            <div className="row-lab"><span className="lab">{i === 0 ? 'Roman 800' : 'Italic 500'}</span><span className="lab red">{c.role}</span></div>
            <h3 className="coach-name">{c.name}</h3>
            <p className="coach-bio">{c.bio}</p>
          </article>
        ))}
      </div>
      <p className="count" data-rise>{PEOPLE.count}</p>
      <a className="more" href={PEOPLE.more.href}><span>{PEOPLE.more.label}</span><Arrow /></a>
    </section>
  );
}

/* ---------- Sheet 5: join as three weights ---------- */

const WEIGHTS = [{ w: 900, name: 'Black 900' }, { w: 400, name: 'Regular 400' }, { w: 650, name: 'Semibold 650' }];

function PathBody({ i }: { i: number }) {
  const p = JOIN.paths[i];
  return (
    <div className="path-body">
      <p className="path-line">{p.line}</p>
      <ul className="path-text">{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
      <a className="path-go" href={p.href}><span>{p.name}, start here</span><Arrow /></a>
    </div>
  );
}

function Join() {
  const [on, setOn] = useState(0);
  return (
    <section className="sheet join" id="join" aria-labelledby="h-join">
      <div className="sheet-head">
        <h2 id="h-join" className="title">{JOIN.title}</h2>
        <span className="lab">Three ways in, three weights</span>
      </div>
      <p className="lead" data-rise>{JOIN.lead}</p>
      <div className="weights">
        {JOIN.paths.map((p, i) => (
          <div key={p.id} className={`way${i === on ? ' is-on' : ''}`}>
            <button type="button" className="way-btn" aria-expanded={i === on} aria-controls={`path-${p.id}`} onClick={() => setOn(i)}>
              <span className="lab">{WEIGHTS[i].name}</span>
              <span className="way-word" style={{ fontWeight: WEIGHTS[i].w }}>{p.name}</span>
            </button>
            <div className="way-inline" id={`path-${p.id}`}><PathBody i={i} /></div>
          </div>
        ))}
      </div>
      <div className="join-foot" data-rise>
        <p>{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a>.</p>
        <p>{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a>.</p>
        <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
        <p>{JOIN.discord}</p>
      </div>
    </section>
  );
}

/* ---------- The ending: a type tester, then the colophon ---------- */

function Ending() {
  const [val, setVal] = useState(FOOTER.line);
  const ta = useRef<HTMLTextAreaElement>(null);
  const fit = useCallback(() => { const t = ta.current; if (!t) return; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }, []);
  useLayoutEffect(fit, [val, fit]);
  useEffect(() => { window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit); }, [fit]);
  return (
    <footer className="end">
      <div className="sheet-head">
        <span className="lab">Tester</span>
        <Pt of={ta} pre="Black 900" />
      </div>
      <label htmlFor="tester" className="sr-only-x">Set your own line in the specimen</label>
      <textarea id="tester" ref={ta} className="tester" value={val} rows={1} spellCheck={false} onChange={(e) => setVal(e.target.value)} />
      <div className="tester-foot">
        <span className="lab">Type over it. It is your line now.</span>
        {val !== FOOTER.line && <button type="button" className="reset" onClick={() => setVal(FOOTER.line)}>Set it back</button>}
      </div>
      <div className="colophon">
        <svg className="endmark" viewBox="40 -780 550 810" aria-hidden="true" focusable="false"><path d={D} fill="currentColor" /></svg>
        <ul className="links">{FOOTER.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
        <ul className="pages">{FOOTER.pages.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
        <p className="lab small">Set in Bodoni Moda and Instrument Sans. Draft 2, version 42. Not the live site.</p>
      </div>
    </footer>
  );
}

export default function Specimen() {
  useVersion('specimen');
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  useRise(root);

  useGSAP(() => {
    if (still) return;
    const r = root.current!;
    const word = r.querySelector('.fam-word');
    const tl = gsap.timeline({ delay: 0.15 });
    if (word) {
      const s = SplitText.create(word, { type: 'chars', mask: 'chars' });
      tl.from(s.chars, { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.045 }, 0);
    }
    tl.from(r.querySelectorAll('.guide'), { scaleX: 0, duration: 1.4, ease: 'expo.out', stagger: 0.12 }, 0.2)
      .from(r.querySelectorAll('.open .row-lab, .open-bar > *, .stage-foot'), { autoAlpha: 0, duration: 0.8, stagger: 0.04 }, 0.5)
      .from(r.querySelectorAll('.sample > span, .statement > span, .doors > a'), { yPercent: 40, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.07 }, 0.55);
    const t = setTimeout(() => ScrollTrigger.refresh(), 800);
    return () => clearTimeout(t);
  }, { scope: root });

  return (
    <div className={`v-specimen${webgl ? '' : ' no-gl'}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <Opening webgl={webgl} />
      <main id="main">
        <Waterfall />
        <Record />
        <Drive />
        <People />
        <Join />
      </main>
      <Ending />
    </div>
  );
}
