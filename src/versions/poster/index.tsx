// Version 36: the poster. A run of tournament posters in four flat inks.
// Each section is a full screen sheet pasted over the last one as you scroll;
// its type slides in from the edges and lands as the sheet covers the screen.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import './poster.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap, scrollToY } from '@/lib/scroll';
import { coarse, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';

// The four inks, and the pairs they are printed in.
const INK = { b: '#f1ede4', k: '#121212', r: '#ef3b24', u: '#1b2fa6' } as const;
type Pair = 'bk' | 'kb' | 'rk' | 'kr' | 'ub' | 'bu';
const PAIR: Record<Pair, [string, string]> = {
  bk: [INK.b, INK.k], kb: [INK.k, INK.b], rk: [INK.r, INK.k], kr: [INK.k, INK.r], ub: [INK.u, INK.b], bu: [INK.b, INK.u],
};
const REPRINT: Pair[] = ['bk', 'rk', 'ub', 'kr', 'bu', 'kb'];

const A = ({ href, className, children }: { href: string; className?: string; children: ReactNode }) => (
  <a href={href} className={className} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

/** A line of type that is sized to fill its column. On a phone each word fills the width on its own. */
function Fit({ text, k = 1, kp, max, split = false, slide, className }: { text: string; k?: number; kp?: number; max?: number; split?: boolean; slide?: 'l' | 'r' | 'u'; className?: string }) {
  const words = text.split(' ');
  return (
    <span className={`fit${split ? ' split' : ''}${className ? ' ' + className : ''}`} data-k={k} data-kp={kp} data-max={max} data-slide={slide}>
      {split ? words.map((w, i) => <span className="fw" key={i}>{w}{i < words.length - 1 ? ' ' : ''}</span>) : text}
    </span>
  );
}

const phone = () => window.innerWidth <= 760;

export default function Poster() {
  useVersion('poster');
  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const wipe = useRef<HTMLDivElement>(null);
  const [print, setPrint] = useState(0);
  const [drive, setDrive] = useState(0);
  const [join, setJoin] = useState(0);
  const pair = REPRINT[print % REPRINT.length];

  // Type fitting and the paste-up: every sheet sticks once its bottom edge reaches the bottom of the screen.
  useLayoutEffect(() => {
    const el = root.current!;
    let lastW = 0;
    const fitOne = (n: HTMLElement, width: number, max?: number) => {
      n.style.fontSize = '100px';
      const w = n.offsetWidth || 1;
      let s = (100 * width) / w;
      if (max) s = Math.min(s, max * window.innerHeight);
      n.style.fontSize = s.toFixed(2) + 'px';
    };
    const fit = () => {
      const tall = phone();
      el.querySelectorAll<HTMLElement>('.fit').forEach((f) => {
        const box = f.parentElement!.clientWidth;
        const k = Number((tall && f.dataset.kp) || f.dataset.k || 1), max = f.dataset.max ? Number(f.dataset.max) : undefined;
        const ws = f.querySelectorAll<HTMLElement>('.fw');
        if (tall && ws.length) {
          f.style.fontSize = '';
          ws.forEach((w) => fitOne(w, box * k, max));
        } else {
          ws.forEach((w) => (w.style.fontSize = ''));
          fitOne(f, box * k, max);
        }
      });
      // The question mark sits on the baseline right after TICAL, at the same size.
      const n2 = el.querySelector<HTMLElement>('.n2'), q = el.querySelector<HTMLElement>('.q');
      if (n2 && q) {
        q.style.fontSize = n2.style.fontSize;
        q.style.left = n2.offsetLeft + n2.offsetWidth + 'px';
        q.style.top = (n2.parentElement as HTMLElement).offsetTop + 'px';
      }
    };
    const stick = () => {
      el.querySelectorAll<HTMLElement>('.pst').forEach((p) => (p.style.top = Math.min(0, window.innerHeight - p.offsetHeight) + 'px'));
    };
    const all = (force = false) => {
      if (force || window.innerWidth !== lastW) { lastW = window.innerWidth; fit(); }
      stick();
    };
    all(true);
    document.fonts?.ready.then(() => all(true));
    const on = () => all();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // The header takes the inks of the sheet under it. The type of each sheet slides in as the sheet rises.
  useLayoutEffect(() => {
    const el = root.current!;
    const sheets = Array.from(el.querySelectorAll<HTMLElement>('.pst'));
    const lines = sheets.map((s) => Array.from(s.querySelectorAll<HTMLElement>('[data-slide]')).filter((n) => !n.closest('.hero')));
    let cur = '';
    const tick = () => {
      const vh = window.innerHeight;
      let under = sheets[0];
      sheets.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        if (r.top <= 40) under = s;
        if (still || i === 0) return;
        const t = Math.min(1, Math.max(0, 1 - r.top / (vh * 0.92)));
        const e = 1 - Math.pow(1 - t, 3);
        lines[i].forEach((n, j) => {
          const d = n.dataset.slide, lag = Math.min(1, Math.max(0, e * (1 + j * 0.12) - j * 0.12));
          const o = (1 - lag) * 100;
          n.style.transform = d === 'u' ? `translate3d(0, ${o * 0.6}vh, 0)` : `translate3d(${d === 'r' ? o : -o}vw, 0, 0)`;
        });
      });
      const c = under.dataset.c || 'bk';
      if (c !== cur) {
        cur = c;
        const [bg, fg] = PAIR[c as Pair];
        el.style.setProperty('--hd-bg', bg);
        el.style.setProperty('--hd-fg', fg);
      }
    };
    gsap.ticker.add(tick);
    tick();
    return () => gsap.ticker.remove(tick);
  }, []);

  // The opening: the name is pasted up in three strokes.
  useLayoutEffect(() => {
    if (still) return;
    const h = hero.current!;
    const ctx = gsap.context(() => {
      // The print run: black, blue and red pass over the sheet before the bone one is pasted.
      const tl = gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.1 }, delay: 0.15 });
      tl.to('.run i', { yPercent: -101, duration: 0.75, ease: 'expo.inOut', stagger: { each: 0.11, from: 'end' } })
        .set('.run', { display: 'none' })
        .from('.n1', { xPercent: -110 }, '-=0.45')
        .from('.n2', { xPercent: 110 }, '<0.08')
        .from('.q', { yPercent: -140, rotate: -14, ease: 'back.out(1.6)', duration: 0.9 }, '<0.35')
        .from('[data-rise]', { y: 26, opacity: 0, stagger: 0.07, duration: 0.8 }, '<0.1');
    }, h);
    return () => ctx.revert();
  }, []);

  const reprint = () => {
    const [bg] = PAIR[pair];
    const w = wipe.current, h = hero.current;
    setPrint((p) => p + 1);
    if (still || !w || !h) return;
    // The old sheet is pulled off upward; the new type re-sets from the edges.
    gsap.fromTo(w, { backgroundColor: bg, yPercent: 0, autoAlpha: 1 }, { yPercent: -100, duration: 0.7, ease: 'expo.inOut', onComplete: () => { gsap.set(w, { autoAlpha: 0 }); } });
    gsap.fromTo(h.querySelector('.n1'), { xPercent: -18 }, { xPercent: 0, duration: 0.9, ease: 'expo.out', delay: 0.15 });
    gsap.fromTo(h.querySelector('.n2'), { xPercent: 18 }, { xPercent: 0, duration: 0.9, ease: 'expo.out', delay: 0.18 });
    gsap.fromTo(h.querySelector('.q'), { rotate: 0 }, { rotate: 360, duration: 0.9, ease: 'expo.out' });
  };

  const [line1, line2] = FOOTER.line.split(/(?<=\.)\s/);
  const heroInk = PAIR[pair];

  return (
    <div className="v-poster" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="top">
        <a className="mark" href="#top" aria-label="Skeptical, back to the first poster">Skeptical</a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
      </header>

      <main id="main">
        {/* 1. The name. */}
        <section className="pst hero" id="top" ref={hero} data-c={pair} style={{ ['--bg' as string]: heroInk[0], ['--fg' as string]: heroInk[1] }}>
          <div className="wipe" ref={wipe} aria-hidden="true" />
          {!still && <div className="run" aria-hidden="true"><i className="r-k" /><i className="r-u" /><i className="r-r" /></div>}
          <div className="hero-top">
            <p className="pitch">{HERO.pitch.map((l) => <span data-rise key={l}>{l}</span>)}</p>
          </div>
          <div className="name">
            <h1 aria-label={SITE.heading}>
              <span className="nrow"><Fit text="Skep" className="n1" k={0.74} kp={1.02} /></span>
              <span className="nrow r2"><Fit text="tical" className="n2" k={0.79} kp={0.8} /></span>
            </h1>
            <button className="q" type="button" onClick={reprint} aria-label="Reprint the poster in the next inks"><span className="qg">?</span></button>
          </div>
          <div className="hero-foot">
            <div className="doors" data-rise>
              {HERO.doors.map((d, i) => <A key={d.href} href={d.href} className={i ? 'btn alt' : 'btn'}>{d.label}</A>)}
            </div>
            <p className="hint" data-rise>{coarse ? 'Tap' : 'Press'} the question mark.</p>
          </div>
        </section>

        {/* 2. The statement. */}
        <section className="pst c-rk stmt" data-c="rk" aria-label="Free to join">
          <div className="rot">
            {HERO.statement.map((l, i) => <p className="srow" key={l}><Fit text={l} slide={i % 2 ? 'r' : 'l'} /></p>)}
          </div>
        </section>

        {/* 3 to 6. The manifesto, one line a sheet. */}
        {MANIFESTO.map((m, i) => {
          const c = (['ub', 'bk', 'kr', 'bu'] as Pair[])[i];
          return (
            <section className={`pst c-${c} man m${i}`} data-c={c} key={m} aria-label={i === 0 ? 'How the team works' : undefined}>
              <p className="mline" data-slide={i % 2 ? 'r' : 'l'}>{m}</p>
            </section>
          );
        })}

        {/* 7. The record. */}
        <section className="pst c-rk rec" id="record" data-c="rk">
          <div className="rec-head">
            <h2 className="h2" data-slide="l">{RECORD.title}</h2>
            <p className="ev" data-slide="r"><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
          </div>
          <ol className="results">
            {RECORD.results.map((r, i) => (
              <li key={r.who}>
                <p className="who" data-slide={i ? 'r' : 'l'}>{r.who}</p>
                <p className="what"><Fit text={r.what} split slide={i ? 'r' : 'l'} max={0.3} /></p>
                <p className="more" data-slide={i ? 'r' : 'l'}>{r.more}</p>
              </li>
            ))}
          </ol>
          <div className="rec-foot">
            <p className="rule">{RECORD.rule}</p>
            <A href={RECORD.more.href} className="lnk">{RECORD.more.label}</A>
          </div>
        </section>

        {/* 8. The drive: seven words. */}
        <section className="pst c-kb drv" id="drive" data-c="kb">
          <div className="words" role="group" aria-label="What is in the drive">
            {DRIVE.items.map((d, i) => (
              <button key={d.term} type="button" className="word" aria-pressed={drive === i} data-slide={i % 2 ? 'r' : 'l'}
                onClick={() => setDrive(i)} onMouseEnter={() => setDrive(i)} onFocus={() => setDrive(i)}
                onKeyDown={(e) => {
                  const d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
                  if (!d) return;
                  e.preventDefault();
                  const next = (i + d + DRIVE.items.length) % DRIVE.items.length;
                  (e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
                }}>
                <span className="wt">{d.term}</span>
                <span className="wx">{d.text}</span>
              </button>
            ))}
          </div>
          <div className="fine">
            <h2 className="h2" data-slide="r">{DRIVE.title}</h2>
            <p className="lead">{DRIVE.lead}</p>
            <dl className="list">
              {DRIVE.items.map((d, i) => (
                <div key={d.term} className={drive === i ? 'on' : undefined} onMouseEnter={() => setDrive(i)}>
                  <dt>{d.term}</dt><dd>{d.text}</dd>
                </div>
              ))}
            </dl>
            <A href={DRIVE.more.href} className="lnk">{DRIVE.more.label}</A>
          </div>
        </section>

        {/* 9. The people. */}
        <section className="pst c-bu ppl" id="people" data-c="bu">
          <h2 className="h2" data-slide="l">{PEOPLE.title}</h2>
          {PEOPLE.coaches.map((c, i) => (
            <article className="coach" key={c.name}>
              <h3 className="cname"><Fit text={c.name} split slide={i ? 'r' : 'l'} k={1.01} /></h3>
              <div className="cbody" data-slide={i ? 'r' : 'l'}>
                <p className="role">{c.role}</p>
                <p className="bio">{c.bio}</p>
              </div>
            </article>
          ))}
          <div className="ppl-foot">
            <p className="count" data-slide="u">{PEOPLE.count}</p>
            <A href={PEOPLE.more.href} className="lnk">{PEOPLE.more.label}</A>
          </div>
        </section>

        {/* 10. Join: three posters side by side. */}
        <section className="pst c-bk jn" id="join" data-c="bk">
          <div className="jn-head">
            <h2 className="jt" data-slide="l">{JOIN.title}</h2>
            <div className="jn-side" data-slide="r">
              <p className="lead">{JOIN.lead}</p>
              <p className="small">{JOIN.discord}</p>
            </div>
          </div>
          <div className="trip">
            {JOIN.paths.map((p, i) => {
              const c = (['rk', 'ub', 'kb'] as Pair[])[i];
              const open = join === i;
              return (
                <article key={p.id} className={`sheet c-${c}${open ? ' open' : ''}`} id={`p-${p.id}`} data-slide="u">
                  <h3 className="sname">
                    <button type="button" aria-expanded={open} aria-controls={`t-${p.id}`} onClick={() => setJoin(i)} onMouseEnter={() => setJoin(i)} style={{ ['--n' as string]: p.name.length }}>
                      {p.name}
                    </button>
                  </h3>
                  <p className="sline">{p.line}</p>
                  <div className="stext" id={`t-${p.id}`}>
                    {p.text.map((t, j) => <p key={j} className={j ? 'rest' : 'first'}>{t}</p>)}
                  </div>
                  <A href={p.href} className="sgo">{p.name}<span aria-hidden="true"> &#8594;</span></A>
                </article>
              );
            })}
          </div>
          <div className="jn-foot">
            <p>{JOIN.already.before}<A href={JOIN.already.href} className="lnk">{JOIN.already.label}</A></p>
            <p>{JOIN.coach.before}<A href={JOIN.coach.href} className="lnk">{JOIN.coach.label}</A></p>
            <p>{JOIN.also} <A href={`mailto:${SITE.email}`} className="lnk">{SITE.email}</A></p>
          </div>
        </section>

        {/* 11. The last sheet. */}
        <footer className="pst c-ub end" data-c="ub">
          <p className="eline"><Fit text={line1} slide="l" /></p>
          <p className="eline"><Fit text={line2} slide="r" k={0.86} /></p>
          <div className="end-row">
            <nav aria-label="Elsewhere" className="links">{FOOTER.links.map((l) => <A key={l.href} href={l.href}>{l.label}</A>)}</nav>
            <nav aria-label="Pages" className="links">{FOOTER.pages.map((l) => <A key={l.href} href={l.href}>{l.label}</A>)}</nav>
          </div>
          <div className="end-low">
            <button type="button" className="btn back" onClick={() => scrollToY(0)}>Back to the first poster</button>
            <p className="draft">Draft 2, version 36. Not the live site. Set in Archivo.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
