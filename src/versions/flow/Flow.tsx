// Version 4: the site as a flow, the sheet a debater keeps during a round.
// The opening is pinned and the round plays out as you scroll.
import { useRef, type ReactNode } from 'react';
import '@fontsource/reenie-beanie';
import '@fontsource/kalam/400.css';
import '@fontsource/kalam/700.css';
import './flow.css';
import { annotate } from 'rough-notation';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { useVersion } from '@/lib/version';

type RA = ReturnType<typeof annotate>;
const RESP = ['no answer', 'conceded', 'dropped'];
const EXT = [MANIFESTO[0], MANIFESTO[2], MANIFESTO[1]];
const INK = { red: '#c4241f', blue: '#1a36a8', lead: '#33312c' } as const;

const Arrow = () => <svg className="scr arrow" viewBox="0 0 120 40" preserveAspectRatio="none" aria-hidden="true"><path d="M4,22 C30,14 70,28 110,20" /><path d="M94,8 L112,20 L93,33" /></svg>;
const Tick = () => <svg className="scr tick" viewBox="0 0 40 40" aria-hidden="true"><path d="M5,22 L15,33 L36,5" /></svg>;
const Box = () => <svg className="scr box" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M4,7 L96,4 L97,95 L5,96 L3,5" /></svg>;
const A = ({ href, children }: { href: string; children: ReactNode }) => <a href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>;
/** A pen mark made by rough-notation when its line has been written. */
const N = ({ t, c = 'red', children }: { t: 'circle' | 'underline' | 'box' | 'bracket'; c?: keyof typeof INK; children: ReactNode }) => <span className="note" data-note={t} data-ink={c}>{children}</span>;

export default function Flow() {
  useVersion('flow', { anchorOffset: -58 });
  const root = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = root.current!;
    // Every pen mark, made once. rough-notation draws them with a real hand-drawn wobble.
    const marks = new Map<Element, RA>();
    gsap.utils.toArray<HTMLElement>('[data-note]', el).forEach((n) => {
      const type = n.dataset.note as 'circle' | 'underline' | 'box' | 'bracket';
      marks.set(n, annotate(n, { type, color: INK[n.dataset.ink as keyof typeof INK], strokeWidth: type === 'box' ? 2.2 : 2.6, padding: type === 'circle' ? 9 : type === 'box' ? 7 : 2, iterations: type === 'underline' ? 2 : 1, animationDuration: still ? 0 : 650, multiline: true, brackets: ['left'] }));
    });
    const showAll = () => marks.forEach((a) => a.show());
    if (still) { document.fonts.ready.then(showAll); return () => marks.forEach((a) => a.remove()); }

    // A line is written left to right, then whatever pen marks sit on it are drawn.
    const write = (line: HTMLElement, at: number, tl: gsap.core.Timeline) => {
      const len = Math.min(0.6, 0.22 + (line.textContent ?? '').trim().length * 0.006);
      tl.to(line, { clipPath: 'inset(-25% -6% -25% -6%)', duration: len, ease: 'power1.inOut' }, at);
      const paths = gsap.utils.toArray<SVGPathElement>('.scr path', line).filter((p) => !p.closest('.sq .tick'));
      if (paths.length) tl.from(paths, { drawSVG: '0%', duration: 0.4, ease: 'power2.inOut', stagger: 0.1 }, at + len * 0.7);
      const notes = [line, ...gsap.utils.toArray<HTMLElement>('[data-note]', line)].filter((n) => marks.has(n));
      notes.forEach((n) => tl.to({}, { duration: 0.02, onStart: () => marks.get(n)!.show(), onReverseComplete: () => marks.get(n)!.hide() }, at + len * 0.85));
      return len;
    };

    // The case writes itself on arrival. The rest of the round waits for the scroll.
    const hero = el.querySelector<HTMLElement>('.hero')!;
    const intro = gsap.timeline({ delay: 0.9 });
    let t = 0;
    gsap.utils.toArray<HTMLElement>('[data-step="0"]', hero).forEach((l) => { t += write(l, t, intro) * 0.55; });
    const round = gsap.timeline({ paused: true });
    let r = 0;
    [1, 2, 3].forEach((step) => {
      r += 0.2;
      gsap.utils.toArray<HTMLElement>(`[data-step="${step}"] [data-write]`, hero).forEach((l) => { r += write(l, r, round) * 0.7; });
    });
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      ScrollTrigger.create({ trigger: el.querySelector('.round'), start: 'top 60', end: '+=150%', pin: true, scrub: 0.5, animation: round, anticipatePin: 1 });
    });
    mm.add('(max-width: 900px)', () => {
      ScrollTrigger.create({ trigger: hero, start: 'top 40%', once: true, onEnter: () => round.play() });
    });

    // Everything below writes itself in as it comes into view.
    gsap.utils.toArray<HTMLElement>('section, footer', el).forEach((sec) => {
      const lines = gsap.utils.toArray<HTMLElement>('[data-write]', sec);
      if (!lines.length) return;
      ScrollTrigger.batch(lines, { start: 'top 88%', once: true, onEnter: (batch) => { const b = gsap.timeline(); let at = 0; (batch as HTMLElement[]).forEach((l) => { at += write(l, at, b) * 0.3; }); } });
    });
    return () => { mm.revert(); marks.forEach((a) => a.remove()); };
  }, { scope: root });

  return (
    <div className="vf" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <div className="sheet">
        <header className="top">
          <a className="mark" href="#top" aria-label="Skeptical, back to the top">skeptical</a>
          <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
        </header>

        <main id="main">
          <div className="round" id="top">
            <div className="cols speeches" aria-hidden="true"><span>1AC</span><span>1NC</span><span>1AR</span><span>2NR</span><span>2AR</span></div>
            <div className="cols hero">
              <h1 aria-label={SITE.heading}><span data-write data-step="0">An independent</span> <span data-write data-step="0"><N t="circle">LD team.</N></span></h1>
              <p className="aside note-t" data-write data-step="0">{HERO.pitch[1]}</p>
              <div className="args">
              {HERO.statement.flatMap((st, i) => [
                  <p className="claim" data-write data-step="0" key={`c${i}`}><b>{i + 1}.</b>{st}</p>,
                  <p className="resp" data-step="1" key={`r${i}`}><span className="tag">1NC</span><span className="has-arrow" data-write><Arrow />{RESP[i]}</span></p>,
                  <p className="ext" data-step="2" key={`e${i}`}><span className="tag">1AR</span><span data-write><i>extend.</i>{EXT[i]}</span></p>,
                  <div className="hr" key={`h${i}`} />,
                ])}
              </div>
              <div className="last" data-step="3">
                <p className="q" aria-hidden="true" data-write>?</p>
                <p data-write><N t="bracket" c="blue">{MANIFESTO[3]}</N></p>
                {HERO.doors.map((d) => <a href={d.href} rel="noopener" data-write data-note="box" data-ink="blue" key={d.href}>{d.label}</a>)}
              </div>
            </div>
          </div>

          <section className="cols" id="record">
            <h2 data-write><N t="underline">{RECORD.title}</N></h2>
            <div className="c12">
              <p className="note-t" data-write>{RECORD.rule}</p>
              <p className="more" data-write><A href={RECORD.more.href}>{RECORD.more.label}</A></p>
            </div>
            <div className="c3"><p className="where" data-write><span className="b">{RECORD.name}</span><br />{RECORD.where}.<br />{RECORD.when}.</p></div>
            <div className="c45">
              {RECORD.results.map((r) => <div className="won" key={r.who}><h3 data-write><N t="circle">{r.what}</N></h3><p data-write><span className="b">{r.who}</span> {r.more}</p></div>)}
            </div>
          </section>

          <section className="cols" id="drive">
            <h2 data-write><N t="underline">{DRIVE.title}</N></h2>
            <div className="c12">
              <p className="note-t" data-write>Link from a coach, pinned in the Discord. <N t="underline">None of it is public.</N></p>
              <p className="more" data-write><A href={DRIVE.more.href}>{DRIVE.more.label}</A></p>
            </div>
            <dl className="stuff c35">{DRIVE.items.map((d) => <div data-write key={d.term}><Tick /><dt>{d.term}</dt><dd>{d.text}</dd></div>)}</dl>
          </section>

          <section className="cols" id="people">
            <h2 data-write><N t="underline">{PEOPLE.title}</N></h2>
            <div className="c1">
              <p className="note-t" data-write>{PEOPLE.count}</p>
              <p className="more" data-write><A href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>
            </div>
            {PEOPLE.coaches.map((c, i) => <div className={`who ${i ? 'c45' : 'c23'}`} key={c.name}><h3 data-write>{c.name}</h3><p className="role" data-write><N t="box">{c.role}</N></p><p data-write>{c.bio}</p></div>)}
          </section>

          <section className="cols" id="join">
            <h2 data-write><N t="underline">{JOIN.title}</N></h2>
            <div className="c12">
              <p className="note-t" data-write>{JOIN.lead}</p>
              <p className="fine" data-write>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
              <p className="fine" data-write>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
            </div>
            <ul className="ways c35">
              {JOIN.paths.map((p) => <li data-write key={p.id}><a href={p.href} rel="noopener"><span className="sq" aria-hidden="true"><Box /><Tick /></span><b>{p.name}</b><span className="t">{p.line} {p.text[0]}</span></a></li>)}
            </ul>
          </section>
        </main>

        <footer>
          <p className="line">{FOOTER.line}</p>
          <ul>{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul>{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <small>Draft 2, version 4. Not the live site.</small>
        </footer>
      </div>
    </div>
  );
}
