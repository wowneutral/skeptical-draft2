// Version 14: the site as a cross-examination. The visitor asks, the team answers
// in lines lifted from content.ts, and at "No further questions" the page asks back.
import { useCallback, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/courier-prime/400.css';
import '@fontsource/courier-prime/700.css';
import './crossex.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, FOOTER, NAV } from '@/content';
import { gsap, ScrollTrigger, SplitText, useGSAP, scrollToY } from '@/lib/scroll';
import { coarse, lerp, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { answer, tidy, FALLBACK, NAME_PARTS, RULE_PARTS } from './bank';
import { Ask, type Entry } from './Ask';
import { Turn } from './Turn';
import { A, Beat, Gutter, Out, Q, Rule } from './parts';

const BAR = 56;
const pad = (n: number) => String(n).padStart(2, '0');
/** A content line as its sentences, so the one that lands hardest can be set largest. Nothing is reworded. */
const sentences = (s: string) => s.split(/(?<=\.)\s+/);

export default function CrossEx() {
  useVersion('crossex', { anchorOffset: -BAR });
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const [log, setLog] = useState<Entry[]>([]);
  const [over, setOver] = useState(false);
  const [passed, setPassed] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const ids = useRef(0);
  const isOver = useRef(false);

  const topOf = (sel: string) => {
    const el = root.current?.querySelector<HTMLElement>(sel);
    return el ? el.getBoundingClientRect().top + window.scrollY - BAR + 1 : 0;
  };

  /** "No further questions": the questioner's colour takes the screen, then the page is on the other side of it. */
  const end = useCallback(() => {
    const el = root.current!;
    const turn = el.querySelector<HTMLElement>('.turn')!;
    if (!isOver.current) {
      isOver.current = true;
      setOver(true);
      setLog((l) => [...l, { id: ++ids.current, q: 'No further questions.', topic: null, again: false }]);
    }
    const land = () => { scrollToY(topOf('.turn'), true); ScrollTrigger.update(); };
    if (still) { requestAnimationFrame(() => { land(); turn.focus({ preventScroll: true }); }); return; }
    const slam = el.querySelector<HTMLElement>('.slam')!;
    const words = slam.querySelectorAll('span');
    gsap.killTweensOf([slam, words]);
    gsap.timeline()
      .set(slam, { display: 'grid', opacity: 1, clipPath: 'inset(0 100% 0 0)' })
      .set(words, { opacity: 0, yPercent: 0 })
      .to(slam, { clipPath: 'inset(0 0% 0 0)', duration: 0.4, ease: 'expo.inOut' })
      .fromTo(words, { opacity: 0, scale: 1.22, yPercent: 14 }, { opacity: 1, scale: 1, yPercent: 0, duration: 0.18, ease: 'power4.out', stagger: 0.19 }, 0.26)
      .add(land, 1.0)
      .to(words, { yPercent: -70, opacity: 0, duration: 0.28, ease: 'power3.in', stagger: 0.05 }, 1.42)
      .to(slam, { opacity: 0, duration: 0.3, ease: 'power1.out' }, 1.72)
      .set(slam, { display: 'none' })
      .add(() => turn.focus({ preventScroll: true }));
  }, []);

  const reopen = useCallback(() => {
    isOver.current = false;
    setOver(false);
    requestAnimationFrame(() => { scrollToY(topOf('.ask'), true); input.current?.focus({ preventScroll: true }); });
  }, []);

  const ask = useCallback((q: string) => {
    if (/ no (further|more|other) questions? /.test(tidy(q))) { end(); return; }
    const topic = answer(q);
    setLog((l) => [...l, { id: ++ids.current, q, topic, again: topic !== FALLBACK && l.some((e) => e.topic === topic) }]);
  }, [end]);

  const toggle = useCallback((id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])), []);

  // Cutting in: start typing anywhere on the page and the question lands in the witness's box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isOver.current || !/^[a-zA-Z]$/.test(e.key)) return;
      if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return;
      const el = input.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top < BAR + 8 || r.bottom > window.innerHeight * 0.7) scrollToY(topOf('.ask'), true);
      el.focus({ preventScroll: true });
      el.select();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { ScrollTrigger.refresh(); }, [over, picked]);

  useGSAP(() => {
    const el = root.current!;
    // The tally in the bar counts every question that has gone by.
    gsap.utils.toArray<HTMLElement>('.cross .say.q', el).forEach((q) => {
      ScrollTrigger.create({ trigger: q, start: 'top 82%', once: true, onEnter: () => setPassed((n) => n + 1) });
    });

    // The hinge: the questioner's colour runs out of the margin and across the page.
    const hinge = el.querySelector<HTMLElement>('.hinge')!;
    const place = () => {
      const b = hinge.querySelector<HTMLElement>('.nfq-big')!;
      hinge.style.setProperty('--l', `${b.getBoundingClientRect().left}px`);
    };
    place();
    window.addEventListener('resize', place);
    if (still) return () => window.removeEventListener('resize', place);

    gsap.fromTo(hinge, { '--fv': 0 }, {
      '--fv': 100, ease: 'none',
      scrollTrigger: { trigger: hinge, start: 'top 78%', end: 'top 12%', scrub: true, onUpdate: (s) => hinge.classList.toggle('is-wet', s.progress > 0.06) },
    });

    // Every exchange is a short timeline: the question is said, the rule is drawn, the answer lands word by word.
    // `data-h` is the pressure on it; the higher it is, the faster the cuts.
    const split = (node: Element, type: 'words' | 'words,chars') => SplitText.create(node, { type, aria: 'none' });
    const build = (beat: HTMLElement, tl: gsap.core.Timeline, typed = false) => {
      const s = lerp(1, 0.46, +(beat.dataset.h ?? 0));
      let t = 0;
      let prev: { at: number; len: number; node: HTMLElement } | null = null;
      gsap.utils.toArray<HTMLElement>('.say.q, [data-rule], .say.a > .mk, [data-a], [data-land]', beat).forEach((node) => {
        if (node.matches('.say.q')) {
          const chars = split(node.querySelector('[data-q]')!, 'words,chars').chars;
          if (node.hasAttribute('data-cut') && prev) {
            // The interruption: the next question arrives while the answer is still coming out.
            t = prev.at + prev.len * 0.52;
            tl.from(node, { opacity: 0, xPercent: -14, duration: 0.16, ease: 'power4.out' }, t);
            tl.fromTo(prev.node, { x: 0 }, { x: 22, duration: 0.07, ease: 'power2.out', yoyo: true, repeat: 1 }, t);
            t += 0.5;
            return;
          }
          tl.from(node.querySelector('.mk'), { opacity: 0, scale: 0.4, duration: 0.3 * s, ease: 'back.out(2)' }, t);
          if (typed) {
            const caret = node.querySelector<HTMLElement>('.caret')!, box = caret.parentElement!;
            const follow = (c: Element | null) => {
              const r = (c ?? box).getBoundingClientRect(), b = box.getBoundingClientRect();
              gsap.set(caret, { x: (c ? r.right : r.left) - b.left, y: r.top - b.top + r.height * 0.14, height: r.height * 0.72, opacity: 1 });
            };
            tl.call(follow, [null], t);
            chars.forEach((c, i) => {
              const at = t + 0.45 + i * 0.066 + (c.previousElementSibling ? 0 : 0.05);
              tl.from(c, { opacity: 0, duration: 0.01 }, at);
              tl.call(follow, [c], at);
            });
            t += 0.45 + chars.length * 0.066 + 0.34;
            tl.set(caret, { opacity: 0 }, t - 0.05);
          } else {
            tl.from(chars, { opacity: 0, yPercent: 38, rotate: 5, duration: 0.34 * s, ease: 'power3.out', stagger: 0.017 * s }, t + 0.04);
            t += chars.length * 0.017 * s + 0.16 * s;
          }
        } else if (node.matches('[data-rule]')) {
          tl.from(node, { scaleX: 0, duration: 0.46 * s, ease: 'expo.inOut' }, t - 0.06 * s);
          t += 0.26 * s;
        } else if (node.matches('.mk')) {
          tl.from(node, { opacity: 0, scale: 1.9, duration: 0.2 * s, ease: 'power4.out' }, t);
        } else if (node.matches('[data-a]')) {
          const words = split(node, 'words').words as HTMLElement[];
          const step = (node.hasAttribute('data-slow') ? 0.2 : Math.min(0.06, 0.8 / words.length)) * s;
          tl.from(words, { opacity: 0, yPercent: -40, scale: 1.32, transformOrigin: '0% 85%', duration: 0.27 * s, ease: 'back.out(2.4)', stagger: step }, t);
          prev = { at: t, len: words.length * step, node };
          t += words.length * step + 0.07 * s;
        } else {
          tl.from(node, { opacity: 0, y: 16, duration: 0.36, ease: 'power3.out' }, t);
          t += 0.07;
        }
      });
      return tl;
    };

    gsap.utils.toArray<HTMLElement>('[data-beat]', el).forEach((beat) => {
      const tl = build(beat, gsap.timeline({ paused: true }));
      ScrollTrigger.create({ trigger: beat, start: 'top 74%', once: true, onEnter: () => tl.play() });
    });
    gsap.utils.toArray<HTMLElement>('.cap', el).forEach((cap) => {
      gsap.from(cap.querySelector('span'), { yPercent: 105, duration: 0.7, ease: 'expo.out', scrollTrigger: { trigger: cap, start: 'top 88%', once: true } });
    });

    // The opening: the first question is typed, the rule is drawn, and the pitch comes down on it.
    const hero = el.querySelector<HTMLElement>('.hero')!;
    const open = gsap.timeline({ delay: 0.75 });
    build(hero, open, true);
    open.from(el.querySelectorAll('.bar > *'), { opacity: 0, y: -10, duration: 0.5, ease: 'power3.out', stagger: 0.05 }, 0.1);

    return () => window.removeEventListener('resize', place);
  }, { scope: root });

  const tally = passed + log.filter((e) => e.topic).length;
  useEffect(() => {
    if (still || !tally) return;
    gsap.fromTo(root.current!.querySelector('.tally'), { scale: 1.45 }, { scale: 1, duration: 0.35, ease: 'power3.out', overwrite: 'auto' });
  }, [tally]);

  return (
    <div className="v-crossex" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>

      <header className="bar">
        <a className="wm" href="#top" aria-label="Skeptical, back to the top">{SITE.name}</a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
          <a href="#ask">Ask</a>
        </nav>
        <span className="tally" aria-hidden="true"><i>Q.</i>{pad(tally)}</span>
        <button className="nfq-s" type="button" onClick={over ? reopen : end}>{over ? 'Reopen the cross-ex' : 'No further questions'}</button>
      </header>

      <main id="main">
        <div className="cross">
          <Gutter squeeze />

          <section className="hero" id="top" data-h="0">
            <p className="say q q-hero">
              <span className="mk">Q.</span> <span className="qt"><span data-q><span className="l1">Who are </span><span className="l2">you?</span></span><i className="caret" aria-hidden="true" /></span>
            </p>
            <Rule />
            <div className="say a a-hero">
              <span className="mk" data-mk>A.</span>
              <h1 className="ab"><span className="sr-only-x">{SITE.name}. </span>{HERO.pitch.map((l) => <span className="hl" data-a key={l}>{l} </span>)}</h1>
            </div>
            <div className="hero-foot">
              {!coarse && <p className="rep" data-land>Start typing to cut in.</p>}
              <a className="skip-ask" href="#ask" data-land>Ask your own</a>
            </div>
          </section>

          <Beat h={0.05} kind="stack" className="b-catch">
            <Q>What’s the catch?</Q>
            <Rule />
            <A>
              {HERO.statement.map((s) => <p className="at xl" data-a key={s}>{s}</p>)}
              <p className="outs">{HERO.doors.map((d) => <Out key={d.href} href={d.href} land>{d.label}</Out>)}</p>
            </A>
          </Beat>

          <Beat h={0.12}>
            <Q>Which school is this?</Q>
            <Rule />
            <A><p className="at" data-a>{sentences(MANIFESTO[0]).map((t, i) => <span className={i ? 'pt xl' : 'pt lg'} key={t}>{t} </span>)}</p></A>
          </Beat>

          <Beat h={0.2}>
            <Q>How many of you?</Q>
            <Rule />
            <A><p className="at" data-a>{sentences(MANIFESTO[1]).map((t, i) => <span className={i ? 'pt lg' : 'pt xl'} key={t}>{t} </span>)}</p></A>
          </Beat>

          <Beat h={0.28}>
            <Q>Who writes the prep?</Q>
            <Rule />
            <A><p className="at xl" data-a>{MANIFESTO[2]}</p></A>
          </Beat>

          <Beat h={0.36} kind="cut">
            <Q>Is the name a position?</Q>
            <Rule />
            <A className="a-first"><p className="at xl" data-a data-slow>{NAME_PARTS[0]}</p></A>
            <Q cut className="q-cut">So I have to run it?</Q>
            <A className="a-last"><p className="at xxl" data-a>{NAME_PARTS[1]}</p></A>
          </Beat>

          <section id="record" className="part">
            <h2 className="cap"><span>{RECORD.title}</span></h2>
            <Beat h={0.44}>
              <Q>What have you won?</Q>
              <Rule />
              <A>
                <p className="at md" data-a>{RULE_PARTS[0]}</p>
                <p className="at xl" data-a>{RULE_PARTS[1]}</p>
              </A>
            </Beat>
            <Beat h={0.5}>
              <Q>Where?</Q>
              <Rule />
              <A>
                <p className="at lg" data-a>{RECORD.name}</p>
                <p className="rep tag" data-land>{RECORD.where}</p>
                <p className="rep tag" data-land>{RECORD.when}</p>
              </A>
            </Beat>
            {RECORD.results.map((r, i) => (
              <Beat h={0.56 + i * 0.05} key={r.who}>
                <Q>{i ? 'Who else?' : 'Who?'}</Q>
                <Rule />
                <A>
                  <p className="rep tag" data-land>{r.who}</p>
                  <p className="at xl" data-a>{r.what}</p>
                  <p className="at md" data-a>{r.more}</p>
                </A>
              </Beat>
            ))}
            <Beat h={0.64}>
              <Q>That’s all?</Q>
              <Rule />
              <A><Out href={RECORD.more.href} className="at lg" land>{RECORD.more.label}</Out></A>
            </Beat>
          </section>

          <section id="drive" className="part">
            <h2 className="cap"><span>{DRIVE.title}</span></h2>
            <Beat h={0.66}>
              <Q>Where’s the prep?</Q>
              <Rule />
              <A><p className="at" data-a>{sentences(DRIVE.lead).map((t, i) => <span className={i ? 'pt xl' : 'pt lg'} key={t}>{t} </span>)}</p></A>
            </Beat>
            {DRIVE.items.map((d, i) => (
              <Beat h={0.68 + i * 0.03} key={d.term} className="b-and" style={{ '--i': i }}>
                <Q>{i ? 'And?' : 'What’s in it?'}</Q>
                <Rule />
                <A>
                  <p className="at xl" data-a>{d.term}</p>
                  <p className="at md" data-a>{d.text}</p>
                </A>
              </Beat>
            ))}
            <Beat h={0.88}>
              <Q>Can I see it?</Q>
              <Rule />
              <A><Out href={DRIVE.more.href} className="at lg" land>{DRIVE.more.label}</Out></A>
            </Beat>
          </section>

          <section id="people" className="part">
            <h2 className="cap"><span>{PEOPLE.title}</span></h2>
            {PEOPLE.coaches.map((c, i) => (
              <Beat h={0.9 + i * 0.04} key={c.name}>
                <Q>{i ? 'Who else?' : 'Who coaches?'}</Q>
                <Rule />
                <A>
                  <p className="at xl" data-a>{c.name}</p>
                  <p className="rep tag" data-land>{c.role}</p>
                  <p className="at md" data-a>{c.bio}</p>
                </A>
              </Beat>
            ))}
            <Beat h={1}>
              <Q>How many debaters?</Q>
              <Rule />
              <A>
                <p className="at xl" data-a>{PEOPLE.count}</p>
                <Out href={PEOPLE.more.href} className="at md" land>{PEOPLE.more.label}</Out>
              </A>
            </Beat>
          </section>
        </div>

        <Ask log={log} over={over} onAsk={ask} onEnd={end} onReopen={reopen} input={input} />

        <section className="hinge" aria-label="End the cross-examination">
          <Gutter />
          <button className="nfq-big" type="button" onClick={end}>
            <span>No</span> <span>further</span> <span>questions.</span>
          </button>
          <p className="rep">Press it. The tables turn.</p>
        </section>

        <Turn picked={picked} toggle={toggle} />
      </main>

      <footer className="foot">
        <Gutter />
        <p className="rep fin">End of transcript.</p>
        <p className="fl">{FOOTER.line}</p>
        <ul className="f-links">{FOOTER.links.map((l) => <li key={l.href}><a href={l.href} rel={l.href.startsWith('http') ? 'noopener' : undefined}>{l.label}</a></li>)}</ul>
        <ul className="f-pages">{FOOTER.pages.map((l) => <li key={l.href}><a href={l.href} rel="noopener">{l.label}</a></li>)}</ul>
        <small>Draft 2, version 14. Not the live site.</small>
      </footer>

      <div className="slam" aria-hidden="true"><p><span>No</span><span>further</span><span>questions.</span></p></div>
    </div>
  );
}
