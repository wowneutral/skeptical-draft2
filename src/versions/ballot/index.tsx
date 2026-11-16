// Version 19: the ballot. The visitor is the judge; the site is the round on the form.
// The pitch is inked in the Affirmative box, the sections fill in as you scroll,
// and the judge's part (points, decision, reason, signature) tears away to the carbon: Join.
import { useEffect, useRef, useState } from 'react';
import '../../../node_modules/@fontsource-variable/big-shoulders-display/wght.css';
import '@fontsource/courier-prime/400.css';
import '@fontsource/courier-prime/700.css';
import '@fontsource/caveat/500.css';
import '@fontsource/caveat/700.css';
import './ballot.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE } from '@/content';
import { gsap, ScrollTrigger, SplitText, useGSAP } from '@/lib/scroll';
import { still, coarse } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { Judge } from './Judge';
import { Clip, Coffee, Defs, Pen, Stamp, Tally } from './parts';

export default function Ballot() {
  useVersion('ballot');
  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const tearRef = useRef<(() => void) | null>(null);
  const [name, setName] = useState('');
  const [lift, setLift] = useState(false);

  /* The corner lifts as the pointer comes near it. */
  useEffect(() => {
    const h = hero.current!, s = sheet.current!;
    if (coarse) return;
    const onMove = (e: PointerEvent) => {
      const r = s.getBoundingClientRect();
      const d = Math.hypot(e.clientX - r.right, e.clientY - r.top);
      const c = Math.max(34, Math.min(150, 190 - d * 0.55));
      s.style.setProperty('--curl', `${c}px`);
    };
    h.addEventListener('pointermove', onMove);
    return () => h.removeEventListener('pointermove', onMove);
  }, []);
  useEffect(() => { if (coarse || lift) sheet.current!.style.setProperty('--curl', lift ? '150px' : '44px'); }, [lift]);

  useGSAP((_ctx, contextSafe) => {
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    if (still) return;
    const q = gsap.utils.selector(root);

    // Opening: the sheet drops onto the desk, then the pen writes the pitch:
    // its nib follows each written line as the ink appears, and then it is set down.
    gsap.from(q('.bl-sheet-a'), { y: -80, opacity: 0, duration: 1.0, delay: 0.25, ease: 'power3.out' });
    const pen = q('.bl-pen')[0] as HTMLElement, aff = q('.bl-aff')[0] as HTMLElement, hand = q('.bl-aff .bl-hand')[0] as HTMLElement;
    gsap.set([pen, hand], { autoAlpha: 0 });
    const write = contextSafe!(() => {
      const sp = SplitText.create(q('.bl-hero .bl-hand-l'), { type: 'lines', linesClass: 'bl-hl', aria: 'none' });
      const lines = sp.lines as HTMLElement[];
      gsap.set(hand, { autoAlpha: 1 });
      gsap.set(lines, { clipPath: 'inset(-30% 100% -40% -4%)' });
      const off = (el: HTMLElement) => { let x = 0, y = 0, e: HTMLElement | null = el; while (e && e !== aff) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent as HTMLElement | null; } return { x, y }; };
      const k = pen.offsetWidth / 520, a28 = (-28 * Math.PI) / 180, arm = -(pen.offsetWidth / 2 - 4 * k);
      const rest = { x: pen.offsetLeft + pen.offsetWidth / 2 + arm * Math.cos(a28), y: pen.offsetTop + pen.offsetHeight / 2 + arm * Math.sin(a28) };
      const open = gsap.timeline({ delay: 0.5 });
      open.fromTo(pen, { x: 320, y: -140, autoAlpha: 0 }, { x: 180, y: -80, autoAlpha: 1, duration: 0.5, ease: 'power2.out' }, 0);
      let t = 0.75;
      lines.forEach((l, i) => {
        const o = off(l), base = o.y + l.offsetHeight * 0.74, w = l.offsetWidth, d = Math.max(0.45, w / 900);
        open.to(pen, { x: o.x - rest.x, y: base - rest.y, duration: i ? 0.22 : 0.35, ease: 'power2.inOut' }, t - (i ? 0.22 : 0.35))
          .to(l, { clipPath: 'inset(-30% 0% -40% -4%)', duration: d, ease: 'none' }, t)
          .to(pen, { x: o.x + w - rest.x, duration: d, ease: 'none' }, t)
          .to(pen, { y: base - rest.y - l.offsetHeight * 0.12, duration: 0.07, repeat: Math.max(1, Math.round(d / 0.07)) | 1, yoyo: true, ease: 'sine.inOut' }, t);
        t += d + 0.25;
      });
      open.to(pen, { x: 0, y: 0, duration: 0.8, ease: 'power3.inOut' }, t)
        .from(q('.bl-stamp-orig'), { scale: 2.4, opacity: 0, rotate: -30, duration: 0.35, ease: 'power4.in' }, t + 0.15);
    });
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => write());

    // The form straightens and comes up to meet you as you start.
    const mm = gsap.matchMedia();
    mm.add({ wide: '(min-width: 821px)', narrow: '(max-width: 820px)' }, (c) => {
      const wide = c.conditions!.wide;
      gsap.timeline({ scrollTrigger: { trigger: hero.current, start: 'top top', end: wide ? '+=85%' : '+=55%', scrub: 0.6, pin: true, anticipatePin: 1 } })
        .fromTo(sheet.current, { rotateX: wide ? 26 : 16, rotateZ: wide ? -4.5 : -2.5, scale: wide ? 0.82 : 0.9, y: wide ? 10 : 0 }, { rotateX: 0, rotateZ: 0, scale: 1, y: 0, ease: 'none' })
        .to(q('.bl-desk-shadow'), { opacity: 0.25, ease: 'none' }, 0)
        .to(q('.bl-sheen'), { opacity: 0.2, ease: 'none' }, 0);
    });

    // Typewriter: each line strikes in a key at a time.
    q('[data-type]').forEach((el) => {
      const sp = SplitText.create(el, { type: 'words,chars', aria: 'none' });
      gsap.from(sp.chars, { opacity: 0, duration: 0.01, stagger: 0.022, ease: 'none', scrollTrigger: { trigger: el, start: 'top 86%' } });
    });
    // Handwriting: written left to right in pen.
    q('.bl-fill .bl-hand-l').forEach((el) => {
      gsap.from(el, { clipPath: 'inset(-30% 100% -40% -4%)', duration: 1.1, ease: 'power1.inOut', scrollTrigger: { trigger: el, start: 'top 85%' } });
    });
    // Stamps land with weight.
    q('.bl-part .bl-stamp').forEach((el) => {
      gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 75%' } })
        .from(el, { scale: 2.8, opacity: 0, rotate: -28, duration: 0.38, ease: 'power4.in' })
        .to(el.closest('.bl-part'), { y: 3, duration: 0.05, yoyo: true, repeat: 1 });
    });
    // Tally marks, one stroke at a time.
    q('.bl-tally path').forEach((p, i) => {
      gsap.from(p, { drawSVG: '0%', duration: 0.22, delay: i * 0.16, ease: 'power1.in', scrollTrigger: { trigger: '.bl-tally', start: 'top 85%' } });
    });
    // The judge underlines each result.
    q('.bl-uline path').forEach((p, i) => {
      gsap.from(p, { drawSVG: '0%', duration: 0.7, delay: 0.9 + i * 0.3, ease: 'power2.inOut', scrollTrigger: { trigger: p.closest('table'), start: 'top 75%' } });
    });
    // Rules are ruled in.
    q('.bl-band').forEach((b) => gsap.from(b, { scaleX: 0, transformOrigin: '0 50%', duration: 0.8, ease: 'out', scrollTrigger: { trigger: b, start: 'top 90%' } }));
  }, { scope: root });

  return (
    <div className="v-ballot" ref={root}>
      <a className="skip-x" href="#main">Skip to the ballot</a>
      <Defs />

      <main id="main">
        <section className="bl-hero" ref={hero} aria-labelledby="bl-h1">
          <div className="bl-desk-shadow" aria-hidden="true" />
          <div className="bl-stage">
            <div className="bl-sheet bl-sheet-a" ref={sheet}>
              <Clip />
              <Coffee className="bl-coffee-hero" id="bl-cof-a" />
              <div className="bl-sheen" aria-hidden="true" />
              <button type="button" className={`bl-curl${lift ? ' is-up' : ''}`} aria-pressed={lift} aria-label="Lift the corner of the ballot" onClick={() => setLift((v) => !v)}>
                <span className="bl-curl-under" aria-hidden="true">Carbon</span>
              </button>
              <div className="bl-grid bl-head">
                <div className="bl-cell bl-title">
                  <p className="bl-lab">{SITE.name} · Lincoln-Douglas</p>
                  <h1 id="bl-h1" className="bl-h1"><span className="sr-only-x">{SITE.heading}</span><span aria-hidden="true">Ballot.</span></h1>
                  <Stamp className="bl-stamp-orig" text="Original" />
                </div>
                <div className="bl-cell bl-fields">
                  <label className="bl-field bl-field-judge">
                    <span className="bl-lab">Judge</span>
                    <input className="bl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="your name" maxLength={28} autoComplete="off" />
                  </label>
                  <div className="bl-field"><span className="bl-lab">Event</span><span className="bl-type">Lincoln-Douglas</span></div>
                  <div className="bl-field"><span className="bl-lab">Round</span><span className="bl-blank" /></div>
                  <div className="bl-field"><span className="bl-lab">Room</span><span className="bl-blank" /></div>
                </div>
              </div>
              <div className="bl-grid bl-sides">
                <div className="bl-cell bl-aff">
                  <p className="bl-lab"><span className="bl-k">Aff</span> Affirmative. Code: {SITE.name}</p>
                  <p className="bl-hand">
                    {HERO.pitch.map((l) => <span key={l} className="bl-hand-l">{l}</span>)}
                  </p>
                  <Pen />
                </div>
                <div className="bl-cell bl-state">
                  <p className="bl-lab">Statement</p>
                  <ol className="bl-state-l">
                    {HERO.statement.map((l, i) => <li key={l}><span className="bl-num">{i + 1}</span><span className="bl-type">{l}</span></li>)}
                  </ol>
                </div>
              </div>
              <div className="bl-grid bl-doors">
                {HERO.doors.map((d) => (
                  <a key={d.href} className="bl-door" href={d.href}><span className="bl-box-tick" aria-hidden="true" /> {d.label} <span aria-hidden="true">→</span></a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="bl-sheet bl-sheet-b bl-fill">
          <section className="bl-part" aria-labelledby="bl-b">
            <header className="bl-band"><span className="bl-band-k">B</span><h2 id="bl-b">Constructive.</h2></header>
            <ol className="bl-case">
              {MANIFESTO.map((m, i) => (
                <li key={m}><span className="bl-num">{i + 1}</span><span className="bl-case-t" data-type>{m}</span></li>
              ))}
            </ol>
          </section>

          <section className="bl-part" id="record" aria-labelledby="bl-c">
            <header className="bl-band"><span className="bl-band-k">C</span><h2 id="bl-c">{RECORD.title}</h2></header>
            <p className="bl-rule bl-type" data-type>{RECORD.rule}</p>
            <div className="bl-grid bl-event">
              <div className="bl-cell"><p className="bl-lab">Tournament</p><p className="bl-type bl-big" data-type>{RECORD.name}</p></div>
              <div className="bl-cell"><p className="bl-lab">Date</p><p className="bl-type bl-big" data-type>{RECORD.when}</p></div>
              <div className="bl-cell"><p className="bl-lab">Place</p><p className="bl-type bl-big" data-type>{RECORD.where}</p></div>
            </div>
            <table className="bl-table">
              <caption className="sr-only-x">{RECORD.title} {RECORD.name}</caption>
              <thead><tr><th scope="col">Debater</th><th scope="col">Result</th><th scope="col">Notes</th></tr></thead>
              <tbody>
                {RECORD.results.map((r) => (
                  <tr key={r.who}>
                    <th scope="row"><span className="bl-hand-l">{r.who}</span></th>
                    <td><span className="bl-hand-l bl-hand-big">{r.what}</span><svg className="bl-uline" viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true"><path d="M3 11 C60 5 120 9 170 8 S260 4 297 7" /></svg></td>
                    <td><span className="bl-hand-l">{r.more}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="bl-more"><a href={RECORD.more.href}>{RECORD.more.label} <span aria-hidden="true">→</span></a></p>
          </section>

          <section className="bl-part bl-drive" id="drive" aria-labelledby="bl-d">
            <header className="bl-band"><span className="bl-band-k">D</span><h2 id="bl-d">{DRIVE.title}</h2></header>
            <div className="bl-drive-box">
              <Stamp className="bl-stamp-priv" text="Private" />
              <p className="bl-type bl-lead" data-type>{DRIVE.lead}</p>
              <dl className="bl-items">
                {DRIVE.items.map((d, i) => (
                  <div key={d.term} className="bl-item">
                    <dt><span className="bl-num">{String(i + 1).padStart(2, '0')}</span>{d.term}</dt>
                    <dd className="bl-type">{d.text}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="bl-more"><a href={DRIVE.more.href}>{DRIVE.more.label} <span aria-hidden="true">→</span></a></p>
          </section>

          <section className="bl-part" id="people" aria-labelledby="bl-e">
            <header className="bl-band"><span className="bl-band-k">E</span><h2 id="bl-e">{PEOPLE.title}</h2></header>
            <div className="bl-grid bl-coaches">
              {PEOPLE.coaches.map((c) => (
                <article key={c.name} className="bl-cell bl-coach">
                  <p className="bl-lab">{c.role}</p>
                  <h3 className="bl-coach-n">{c.name}</h3>
                  <p className="bl-type bl-bio" data-type>{c.bio}</p>
                </article>
              ))}
              <div className="bl-cell bl-count">
                <p className="bl-lab">Head count</p>
                <Tally n={8} />
                <p className="bl-hand"><span className="bl-hand-l">{PEOPLE.count}</span></p>
              </div>
            </div>
            <p className="bl-more"><a href={PEOPLE.more.href}>{PEOPLE.more.label} <span aria-hidden="true">→</span></a></p>
          </section>

          <Judge name={name} tearRef={tearRef} />
        </div>
      </main>
    </div>
  );
}
