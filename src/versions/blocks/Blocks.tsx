// Version 7: no centrepiece. Four flat colours and one typeface that changes
// width with the scroll and bends toward the pointer.
import { useRef, type ReactNode } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import './blocks.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { coarse, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import Magnet from '@/components/bits/Magnet';
import VariableProximity from '@/components/bits/VariableProximity';
import { Pit } from './Pit';

const A = ({ href, className, children }: { href: string; className?: string; children: ReactNode }) => <a href={href} className={className} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>;

export default function Blocks() {
  useVersion('blocks');
  const root = useRef<HTMLDivElement>(null), says = useRef<HTMLElement>(null), people = useRef<HTMLDivElement>(null);
  useRise(root);

  useGSAP(() => {
    const el = root.current!;
    // The header takes the ink of whichever block is under it, and steps aside on the way down.
    const tones = gsap.utils.toArray<HTMLElement>('[data-tone]', el), links = gsap.utils.toArray<HTMLAnchorElement>('.top nav a', el), top = el.querySelector<HTMLElement>('.top')!;
    const tone = () => {
      let t = tones[0], id = '';
      for (const s of tones) if (s.getBoundingClientRect().top <= 34) { t = s; if (s.id) id = s.id; }
      el.dataset.tone = t.dataset.tone === 'dark' ? 'dark' : 'light';
      links.forEach((l) => l.setAttribute('aria-current', l.getAttribute('href') === `#${id}` && id !== 'top' ? 'true' : 'false'));
    };
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => { tone(); top.classList.toggle('is-away', self.direction === 1 && window.scrollY > 240); } });
    tone();
    if (still) return;

    // The opening: the name widens from extra-condensed until it fills the line.
    const word = el.querySelector<HTMLElement>('#word')!;
    gsap.fromTo(word, { '--w': 62 }, { '--w': 125, duration: 1.8, ease: 'expo.inOut', delay: 0.9 });
    gsap.to(word, { '--w': 62, ease: 'none', immediateRender: false, scrollTrigger: { trigger: word, start: 'bottom 85%', end: 'bottom 5%', scrub: 0.4 } });
    // Titles are condensed at the edges of the screen and wide in the middle of it.
    gsap.utils.toArray<HTMLElement>('[data-stretch]', el).forEach((t) => {
      gsap.timeline({ scrollTrigger: { trigger: t, start: 'top 100%', end: 'bottom 0%', scrub: 0.4 } })
        .fromTo(t, { '--w': 62 }, { '--w': 122, ease: 'power1.out', duration: 1 })
        .to(t, { '--w': 62, ease: 'power1.in', duration: 1 });
    });
    // Each block comes in with a curved top edge that flattens as it rises.
    gsap.utils.toArray<HTMLElement>('.blk + .blk, .blk + .pit', el).forEach((b) => {
      gsap.fromTo(b, { '--r': '50%', '--rv': '9vh' }, { '--r': '0%', '--rv': '0vh', ease: 'none', scrollTrigger: { trigger: b, start: 'top 100%', end: 'top 35%', scrub: true } });
    });
  }, { scope: root });

  const prox = { fromFontVariationSettings: "'wght' 900, 'wdth' 75", toFontVariationSettings: "'wght' 900, 'wdth' 125", radius: 190, falloff: 'gaussian' as const };

  return (
    <div className="vb" ref={root} data-tone="light">
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="top">
        <a className="mark" href="#top" aria-label="Skeptical, back to the top">Skeptical</a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
      </header>

      <main id="main">
        <section className="blk b-blue hero" id="top" data-tone="light">
          <div className="hero-row">
            <p className="pitch">{HERO.pitch.map((l) => <span data-rise key={l}>{l}</span>)}</p>
            <div className="btns" data-rise>
              <Magnet padding={50} magnetStrength={3} disabled={coarse || still}><A href={HERO.doors[0].href} className="btn">{HERO.doors[0].label}</A></Magnet>
              <Magnet padding={50} magnetStrength={3} disabled={coarse || still}><A href={HERO.doors[1].href} className="btn alt">{HERO.doors[1].label}</A></Magnet>
            </div>
          </div>
          <h1 className="word" id="word" aria-label={SITE.heading}>Skeptical</h1>
        </section>

        <section className="blk b-paper says" data-tone="dark" aria-label="How the team works" ref={says}>
          {MANIFESTO.map((m) => <p data-rise key={m}><VariableProximity label={m} containerRef={says} {...prox} /></p>)}
        </section>

        <section className="blk b-red" id="record" data-tone="dark">
          <h2 className="title" data-stretch>{RECORD.title}</h2>
          <p className="lede mt" data-rise>{RECORD.rule}</p>
          <p className="mt strong" data-rise>{RECORD.when}. {RECORD.name}, {RECORD.where}.</p>
          <div className="grid2 mt">
            {RECORD.results.map((r) => <div className="res" data-rise key={r.who}><h3>{r.what}</h3><p>{r.who} {r.more}</p></div>)}
          </div>
          <p className="mt" data-rise><A href={RECORD.more.href}>{RECORD.more.label}</A></p>
        </section>

        <section className="blk b-ink" id="drive" data-tone="light">
          <h2 className="title" data-stretch>{DRIVE.title}</h2>
          <p className="lede mt" data-rise>{DRIVE.lead}</p>
          <dl className="rows mt">{DRIVE.items.map((d) => <div className="rowi" data-rise key={d.term}><dt>{d.term}</dt><dd>{d.text}</dd></div>)}</dl>
          <p className="mt" data-rise><A href={DRIVE.more.href}>{DRIVE.more.label}</A></p>
        </section>

        <section className="blk b-paper" id="people" data-tone="dark">
          <h2 className="title" data-stretch>{PEOPLE.title}</h2>
          <div className="grid2 mt" ref={people}>
            {PEOPLE.coaches.map((c) => (
              <div data-rise key={c.name}>
                <h3 className="name">{c.name.split(' ').map((w) => <span key={w}><VariableProximity label={w} containerRef={people} fromFontVariationSettings="'wght' 900, 'wdth' 70" toFontVariationSettings="'wght' 900, 'wdth' 122" radius={170} falloff="gaussian" /></span>)}</h3>
                <p className="role">{c.role}</p>
                <p className="mt-s">{c.bio}</p>
              </div>
            ))}
          </div>
          <p className="mt" data-rise>{PEOPLE.count} <A href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>
        </section>

        <section className="blk b-blue" id="join" data-tone="light">
          <h2 className="title" data-stretch>{JOIN.title}</h2>
          <p className="lede mt" data-rise>{JOIN.lead}</p>
          <ul className="ways mt">
            {JOIN.paths.map((p) => <li data-rise key={p.id}><a href={p.href} rel="noopener"><span><b>{p.name}</b><span>{p.line} {p.text[0]}</span></span><i aria-hidden="true">&rarr;</i></a></li>)}
          </ul>
          <p className="fine mt" data-rise>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>. {JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
        </section>

        <Pit />
      </main>

      <footer data-tone="light">
        <p className="lede">{FOOTER.line}</p>
        <ul>{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <ul>{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <small>Draft 2, version 7. Not the live site.</small>
      </footer>
    </div>
  );
}
