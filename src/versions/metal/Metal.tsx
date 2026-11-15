// Version 14: the wordmark poured in liquid metal (React Bits MetallicPaint),
// and the drive as one long line of words you scroll sideways through.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import '@fontsource-variable/bodoni-moda';
import '@fontsource/bodoni-moda/400-italic.css';
import '@fontsource-variable/instrument-sans';
import italicUrl from '@fontsource/bodoni-moda/files/bodoni-moda-latin-400-italic.woff2?url';
import './metal.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/scroll';
import { Split, useRise } from '@/lib/motion';
import { coarse, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import MetallicPaint from '@/components/bits/MetallicPaint';

const A = ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => <a className={className ?? 'u'} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>;

export default function Metal() {
  useVersion('metal');
  const root = useRef<HTMLDivElement>(null);
  useRise(root);
  // The component takes a family and a weight, not a style, so the italic is registered under its own name.
  const [font, setFont] = useState(false);
  useEffect(() => {
    let on = true;
    new FontFace('Skeptical Mark', `url(${italicUrl})`).load().then((f) => { document.fonts.add(f); if (on) setFont(true); }).catch(() => on && setFont(true));
    return () => { on = false; };
  }, []);

  useGSAP(() => {
    const el = root.current!;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 861px) and (prefers-reduced-motion: no-preference)', () => {
      // The drive: pinned, and the scroll pulls the line of words across. The word nearest the middle is lit.
      const pin = el.querySelector<HTMLElement>('.strip')!, track = pin.querySelector<HTMLElement>('.track')!;
      const items = gsap.utils.toArray<HTMLElement>('.item', track);
      const light = () => { const mid = window.innerWidth / 2; items.forEach((it) => { const r = it.getBoundingClientRect(); it.style.setProperty('--lit', String(Math.max(0, 1 - Math.abs(r.left + r.width / 2 - mid) / (window.innerWidth * 0.42)))); }); };
      const tween = gsap.to(track, { x: () => -(track.scrollWidth - window.innerWidth), ease: 'none', scrollTrigger: { trigger: pin, start: 'top top', end: () => `+=${track.scrollWidth}`, pin: true, scrub: 0.5, invalidateOnRefresh: true, onUpdate: light, onRefresh: light } });
      light();
      return () => { tween.kill(); };
    });
    return () => mm.revert();
  }, { scope: root });

  return (
    <div className="vm" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="top">
        <a className="mark" href="#top" aria-label="Skeptical, back to the top">skeptical</a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
      </header>

      <main id="main">
        <section className="hero" id="top" aria-label={SITE.heading}>
          <div className="pour" aria-hidden="true">
            {font && <MetallicPaint text="skeptical" fontFamily="Skeptical Mark" fontWeight={400} color="#f0f0ec" backgroundColor="#050505" scale={0.92} speed={still ? 0 : 0.35} mouseTilt={coarse || still ? 0 : 0.6} paused={still} intro={!still} />}
          </div>
          <div className="foot">
            <Split as="h1" on="load" delay={0.9}>{HERO.pitch.join(' ')}</Split>
            <div>
              <p className="lede" data-rise>{HERO.statement.join(' ')}</p>
              <p className="doors" data-rise>{HERO.doors.map((d) => <A key={d.href} href={d.href}>{d.label}</A>)}</p>
            </div>
          </div>
        </section>

        <section className="why" aria-label="How the team works">
          {MANIFESTO.map((m) => <Split as="p" key={m}>{m}</Split>)}
        </section>

        <section id="record" className="cols">
          <div>
            <Split as="h2">{RECORD.title}</Split>
            <p className="lede" data-rise>{RECORD.rule}</p>
            <p className="mute" data-rise>{RECORD.when}. {RECORD.name}, {RECORD.where}.</p>
            <p data-rise><A href={RECORD.more.href}>{RECORD.more.label}</A></p>
          </div>
          <div className="results">{RECORD.results.map((r) => <div data-rise key={r.who}><h3>{r.what}</h3><p>{r.who} {r.more}</p></div>)}</div>
        </section>

        <section id="drive" className="strip">
          <div className="strip-head">
            <h2>{DRIVE.title}</h2>
            <p className="lede">{DRIVE.lead}</p>
          </div>
          <dl className="track">
            {DRIVE.items.map((d) => <div className="item" key={d.term}><dt>{d.term}</dt><dd>{d.text}</dd></div>)}
            <div className="item end"><dt><A href={DRIVE.more.href}>{DRIVE.more.label}</A></dt></div>
          </dl>
        </section>

        <section id="people" className="cols">
          <div><Split as="h2">{PEOPLE.title}</Split><p className="lede" data-rise>{PEOPLE.count}</p><p data-rise><A href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p></div>
          <div className="results">{PEOPLE.coaches.map((c) => <div data-rise key={c.name}><h3>{c.name}</h3><p><span className="mute">{c.role}.</span> {c.bio}</p></div>)}</div>
        </section>

        <section id="join" className="cols">
          <div>
            <Split as="h2">{JOIN.title}</Split>
            <p className="lede" data-rise>{JOIN.lead}</p>
            <p data-rise>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
            <p data-rise>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
          </div>
          <ul className="paths">{JOIN.paths.map((p) => <li data-rise key={p.id}><a href={p.href} rel="noopener"><b>{p.name}</b><span>{p.line} {p.text[0]}</span></a></li>)}</ul>
        </section>
      </main>

      <footer>
        <p className="line">{FOOTER.line}</p>
        <ul>{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <ul>{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <small>Draft 2, version 14. Not the live site.</small>
      </footer>
    </div>
  );
}
