// Version 3: one glass question mark, and what happens to it when you join.
import { useCallback, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/schibsted-grotesk';
import './question.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/scroll';
import { Split, useRise } from '@/lib/motion';
import { coarse, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { Loader } from '@/components/Loader';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Magnet from '@/components/bits/Magnet';
import QuestionScene, { glFx, qstage } from './Scene';

const ext = (href: string) => (href.startsWith('http') ? { rel: 'noopener' } : {});
const PITCH = [['An independent', 'LD team.'], ['Coaches who', 'still compete.']];

export default function Question() {
  useVersion('question');
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const onDone = useCallback(() => setReady(true), []);
  const [gl] = useState(() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } });

  useEffect(() => { qstage.reveal = still ? 1 : 0; return () => { glFx.clear(); }; }, []);
  useEffect(() => { if (ready && !still) gsap.to(qstage, { reveal: 1, duration: 2.2, ease: 'expo.out' }); }, [ready]);
  useRise(root);

  // The WebGL headings arrive like the rest: each rises into place the first time it is seen.
  useGSAP(() => {
    if (!gl) return;
    const els = gsap.utils.toArray<HTMLElement>('[data-gl]', root.current!);
    els.forEach((el) => glFx.set(el, { o: still ? 1 : 0, y: still ? 0 : 0.7 }));
    if (still || !ready) return;
    els.forEach((el, i) => {
      const hero = !!el.closest('.hero');
      const play = () => gsap.to(glFx.get(el)!, { o: 1, y: 0, duration: 1.3, ease: 'expo.out', delay: hero ? 0.25 + i * 0.09 : 0 });
      if (hero) play(); else ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: play });
    });
  }, { scope: root, dependencies: [ready, gl] });

  // Coach cards: a soft light follows the pointer across each one.
  const spot = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <div className={`vq${gl ? ' gl' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <Loader onDone={onDone} bg="#07060b" ink="#f3f0ea" font='800 clamp(5rem, 17vw, 16rem)/0.85 "Schibsted Grotesk Variable", sans-serif' />
      {gl && <div className="stage" aria-hidden="true"><QuestionScene /></div>}

      <header className="top">
        <a className="mark" href="#top" aria-label="Skeptical, back to the top">skeptical</a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
      </header>

      <main id="main">
        <section className="hero" id="top" data-key="hero" aria-label={SITE.heading}>
          <h1 className="giant">
            {PITCH.map((pair, i) => <span className="row" key={i}>{pair.map((t) => <span data-gl="" key={t}>{t}</span>)}</span>)}
          </h1>
          <div className="hero-foot">
            <p className="lede" data-rise>{HERO.statement.join(' ')}</p>
            <div className="doors" data-rise>
              <Magnet padding={60} magnetStrength={3} disabled={coarse || still}>
                <Button asChild size="lg" className="q-btn"><a href={HERO.doors[0].href} {...ext(HERO.doors[0].href)}>{HERO.doors[0].label}</a></Button>
              </Magnet>
              <Magnet padding={60} magnetStrength={3} disabled={coarse || still}>
                <Button asChild size="lg" variant="outline" className="q-btn q-btn-o"><a href={HERO.doors[1].href} {...ext(HERO.doors[1].href)}>{HERO.doors[1].label}</a></Button>
              </Magnet>
            </div>
          </div>
        </section>

        <section className="why" id="why" data-key="why" aria-label="How the team works">
          {MANIFESTO.map((m) => <Split as="p" key={m} className="say">{m}</Split>)}
        </section>

        <section id="record" data-key="record">
          <h2 className="giant"><span data-gl="">{RECORD.title}</span></h2>
          <div className="grid2">
            <div>
              <p className="lede" data-rise>{RECORD.rule}</p>
              <p className="dim mt" data-rise>{RECORD.when}. {RECORD.name}, {RECORD.where}.</p>
              <p className="mt" data-rise><a href={RECORD.more.href} rel="noopener">{RECORD.more.label}</a></p>
            </div>
            <div className="rows">
              {RECORD.results.map((r) => (
                <div className="row-r" data-rise key={r.who}>
                  <h3>{r.what}</h3>
                  <p><b>{r.who}</b> <span className="dim">{r.more}</span></p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="drive" data-key="drive">
          <div className="grid2 rev">
            <dl className="kit">
              {DRIVE.items.map((d) => <div data-rise key={d.term}><dt>{d.term}</dt><dd>{d.text}</dd></div>)}
            </dl>
            <div className="stick">
              <h2 className="giant"><span data-gl="">{DRIVE.title}</span></h2>
              <p className="lede mt" data-rise>{DRIVE.lead}</p>
              <p className="mt" data-rise><a href={DRIVE.more.href} rel="noopener">{DRIVE.more.label}</a></p>
            </div>
          </div>
        </section>

        <section id="people" data-key="people">
          <h2 className="giant"><span data-gl="">{PEOPLE.title}</span></h2>
          <div className="cards">
            {PEOPLE.coaches.map((c) => (
              <article className="card" data-rise key={c.name} onPointerMove={spot}>
                <p className="role">{c.role}</p>
                <h3>{c.name}</h3>
                <p>{c.bio}</p>
              </article>
            ))}
          </div>
          <p className="mt" data-rise>{PEOPLE.count} <a href={PEOPLE.more.href} rel="noopener">{PEOPLE.more.label}</a></p>
        </section>

        <section className="join" id="join" data-key="join">
          <h2 className="giant huge"><span data-gl="">Join</span><span className="dot-slot" aria-hidden="true" /><span className="sr-only-x">.</span></h2>
          <div className="grid2">
            <div>
              <p className="lede" data-rise>{JOIN.lead}</p>
              <p className="mt" data-rise>{JOIN.already.before}<a href={JOIN.already.href} rel="noopener">{JOIN.already.label}</a>. {JOIN.coach.before}<a href={JOIN.coach.href} rel="noopener">{JOIN.coach.label}</a>.</p>
              <p className="mt-s" data-rise>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
            </div>
            <Accordion type="single" collapsible defaultValue="compete" className="paths" data-rise>
              {JOIN.paths.map((p) => (
                <AccordionItem value={p.id} key={p.id} className="path">
                  <AccordionTrigger className="path-t"><span><b>{p.name}</b><i>{p.line}</i></span></AccordionTrigger>
                  <AccordionContent className="path-c">
                    <ul>{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
                    <Button asChild className="q-btn mt-4"><a href={p.href} rel="noopener">The application</a></Button>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>

      <footer>
        <p className="big">{FOOTER.line}</p>
        <ul>{FOOTER.links.map((l) => <li key={l.href}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}</ul>
        <ul>{FOOTER.pages.map((l) => <li key={l.href}><a href={l.href} rel="noopener">{l.label}</a></li>)}</ul>
        <small>Draft 2, version 3. Not the live site.</small>
      </footer>
    </div>
  );
}
