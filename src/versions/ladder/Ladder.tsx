// Version 6: the skeptic's ladder. You climb it from night to morning, then it goes.
import { useCallback, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/newsreader';
import '@fontsource-variable/newsreader/wght-italic.css';
import '@fontsource/ibm-plex-mono/400.css';
import './ladder.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap } from '@/lib/scroll';
import { Split, useRise } from '@/lib/motion';
import { clamp, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { Loader } from '@/components/Loader';
import LadderScene, { lstage, RUNGS } from './Scene';

const A = ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>;

export default function Ladder() {
  useVersion('ladder');
  const root = useRef<HTMLDivElement>(null), rung = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);
  const onDone = useCallback(() => setReady(true), []);
  useRise(root);

  useEffect(() => { lstage.reveal = still ? 1 : 0; lstage.at = 0; }, []);
  useEffect(() => { if (ready && !still) gsap.to(lstage, { reveal: 1, duration: 2.6, ease: 'expo.out' }); }, [ready]);
  useEffect(() => {
    // The page reads the climb back from the scene: the rung counter, and dark ink once the sky is light.
    let day = false;
    const tick = () => {
      if (rung.current) rung.current.textContent = String(Math.round(clamp(lstage.climb) * RUNGS)).padStart(3, '0');
      const now = lstage.inCloud > 0.4 || lstage.day > 0.5;
      if (now !== day) { day = now; root.current?.classList.toggle('is-day', day); }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <div className="vl" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <Loader onDone={onDone} bg="#05060c" ink="#f1ece1" font='italic 400 clamp(5rem, 16vw, 15rem)/0.85 "Newsreader Variable", Georgia, serif' extra={false} />
      <div className="stage" aria-hidden="true"><LadderScene /></div>
      <header className="top">
        <a className="mark" href="#top" aria-label="Skeptical, back to the top">skeptical</a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
      </header>
      <p className="gauge" aria-hidden="true">rung <b ref={rung}>000</b> of {RUNGS}</p>

      <main id="main">
        <section className="hero" id="top" aria-label={SITE.heading}>
          <div className="col">
            <Split as="h1" className="huge" on={ready ? 'load' : 'none'} delay={0.3} key={String(ready)}>{HERO.pitch.join(' ')}</Split>
            <p className="mid mt" data-rise>{HERO.statement.join(' ')}</p>
            <p className="doors mt" data-rise>{HERO.doors.map((d) => <A key={d.href} href={d.href}>{d.label}</A>)}</p>
          </div>
        </section>

        <section className="why" aria-label="How the team works">
          <div className="col">{MANIFESTO.slice(0, 3).map((m) => <Split as="p" className="big" key={m}>{m}</Split>)}</div>
        </section>

        <section id="record">
          <div className="col">
            <Split as="h2" className="huge">{RECORD.title}</Split>
            <p className="mid mt-s" data-rise>{RECORD.rule}</p>
            <p className="soft mt" data-rise>{RECORD.when}. {RECORD.name}, {RECORD.where}.</p>
            <div className="mt-s">
              {RECORD.results.map((r) => <div className="res" data-rise key={r.who}><h3 className="big">{r.what}</h3><p className="mt-s">{r.who} <span className="soft">{r.more}</span></p></div>)}
            </div>
            <p className="mt" data-rise><A href={RECORD.more.href}>{RECORD.more.label}</A></p>
          </div>
        </section>

        <section id="drive">
          <div className="col">
            <Split as="h2" className="huge">{DRIVE.title}</Split>
            <p className="mid mt-s" data-rise>{DRIVE.lead}</p>
            <dl className="kit mt">{DRIVE.items.map((d) => <div data-rise key={d.term}><dt>{d.term}</dt><dd>{d.text}</dd></div>)}</dl>
            <p className="mt" data-rise><A href={DRIVE.more.href}>{DRIVE.more.label}</A></p>
          </div>
        </section>

        <section id="people">
          <div className="col">
            <Split as="h2" className="huge">{PEOPLE.title}</Split>
            <div className="mt">
              {PEOPLE.coaches.map((c) => <div className="coach" data-rise key={c.name}><h3 className="big">{c.name}</h3><p className="mt-s"><span className="soft">{c.role}.</span> {c.bio}</p></div>)}
            </div>
            <p className="mt" data-rise>{PEOPLE.count} <A href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>
          </div>
        </section>

        <section className="summit" id="join">
          <div className="col">
            <Split as="p" className="big">{MANIFESTO[3]}</Split>
            <Split as="h2" className="huge mt">{JOIN.title}</Split>
            <p className="mid mt-s" data-rise>{JOIN.lead}</p>
            <ul className="paths mt">{JOIN.paths.map((p) => <li data-rise key={p.id}><a href={p.href} rel="noopener"><b>{p.name}</b><span>{p.line}</span></a></li>)}</ul>
            <p className="mt" data-rise>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
            <p className="mt-s" data-rise>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
          </div>
        </section>
      </main>

      <footer>
        <p className="big">{FOOTER.line}</p>
        <ul>{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <ul>{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <small>The ladder is Sextus Empiricus’s picture of the skeptic’s argument: you climb it, then you kick it away. Draft 2, version 6. Not the live site.</small>
      </footer>
    </div>
  );
}
