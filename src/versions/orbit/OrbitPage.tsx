// Versions 1 and 2: the Laocoön structure as Skeptical. Six acts take turns
// in front of one fixed stage; the page still has real sections and anchors.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import '@fontsource-variable/bodoni-moda';
import '@fontsource/bodoni-moda/400-italic.css';
import '@fontsource-variable/instrument-sans';
import './orbit.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap, SplitText, useGSAP, scrollToY } from '@/lib/scroll';
import { clamp, smooth, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { Loader } from '@/components/Loader';
import { stage } from './stage';

const U = ({ href, children }: { href: string; children: ReactNode }) => (
  <a className="u" href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

export function OrbitPage({ slug, scene, credit }: { slug: 'head' | 'statue'; scene: ReactNode; credit: string }) {
  useVersion(slug, { anchorOffset: 2 });
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const onDone = useCallback(() => setReady(true), []);

  useEffect(() => {
    stage.ready = false; stage.reveal = still ? 1 : 0; stage.act = 0; stage.k = 0; stage.side = 1;
    return () => { stage.ready = false; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    stage.ready = true;
    if (!still) gsap.to(stage, { reveal: 1, duration: 2.4, ease: 'power2.inOut' });
  }, [ready]);

  useGSAP(() => {
    const el = root.current!;
    const acts = gsap.utils.toArray<HTMLElement>('.act', el);
    const navLinks = gsap.utils.toArray<HTMLAnchorElement>('.top nav a', el);
    const dashes = gsap.utils.toArray<HTMLElement>('.dashes b', el);

    const enter = acts.map((act) => {
      const inner = act.querySelector<HTMLElement>('.act-in')!;
      const tl = gsap.timeline({ paused: true });
      if (still) return { tl, inner };
      const heads = gsap.utils.toArray<HTMLElement>('[data-letters]', act);
      const chars = heads.flatMap((h) => SplitText.create(h, { type: 'words,chars', aria: h.tagName === 'SPAN' ? 'none' : 'auto' }).chars);
      const rises = gsap.utils.toArray<HTMLElement>('[data-rise]', act);
      if (chars.length) tl.from(chars, { opacity: 0, filter: 'blur(14px)', yPercent: 45, duration: 0.9, ease: 'power3.out', stagger: 0.02 }, 0);
      if (rises.length) tl.from(rises, { opacity: 0, y: 26, duration: 0.85, ease: 'power3.out', stagger: 0.07 }, chars.length ? 0.25 : 0);
      return { tl, inner };
    });
    const maniWords = gsap.utils.toArray<HTMLElement>('.mani p', el).flatMap((p) => SplitText.create(p, { type: 'words', aria: 'none', wordsClass: 'mw' }).words as HTMLElement[]);
    const terms = gsap.utils.toArray<HTMLElement>('.dv dt', el), defs = gsap.utils.toArray<HTMLElement>('.dv dd', el);

    let current = -1, driveAt = -1, lastY = -1;
    const show = (i: number) => {
      if (i === current) return;
      const prev = enter[current];
      if (prev) {
        acts[current].classList.remove('is-on');
        gsap.killTweensOf(prev.inner);
        gsap.to(prev.inner, { opacity: 0, duration: still ? 0 : 0.3, ease: 'power1.out' });
      }
      const first = current === -1;
      current = i;
      acts[i].classList.add('is-on');
      gsap.killTweensOf(enter[i].inner);
      gsap.set(enter[i].inner, { opacity: 1 });
      if (!still) { if (first) { enter[i].tl.pause(0); gsap.delayedCall(1.0, () => { if (current === i) enter[i].tl.play(0); }); } else enter[i].tl.restart(); }
      navLinks.forEach((l) => l.setAttribute('aria-current', l.getAttribute('href') === `#${acts[i].id}` ? 'true' : 'false'));
    };
    const scrub = (act: HTMLElement, k: number) => {
      if (act.dataset.scrub === 'words') {
        const lit = Math.round(smooth(clamp((k - 0.06) / 0.8)) * maniWords.length);
        maniWords.forEach((w, n) => w.classList.toggle('is-lit', still || n < lit));
      } else if (act.dataset.scrub === 'drive') {
        const at = Math.min(terms.length - 1, Math.floor(clamp((k - 0.08) / 0.84) * terms.length));
        if (at !== driveAt) {
          driveAt = at;
          terms.forEach((t, n) => t.classList.toggle('is-on', n === at));
          defs.forEach((d, n) => d.classList.toggle('is-on', n === at));
        }
      }
    };
    scrub(acts[1], 0); scrub(acts[3], 0);

    const frame = () => {
      if (!stage.ready) return;
      const y = window.scrollY, vh = window.innerHeight;
      let i = 0;
      for (let n = 0; n < acts.length; n++) if (y >= acts[n].offsetTop - 2) i = n;
      show(i);
      const act = acts[i];
      const k = clamp((y - act.offsetTop) / Math.max(1, act.offsetHeight - vh));
      scrub(act, k);
      stage.act = i; stage.k = k; stage.side = act.dataset.side === 'left' ? 1 : -1;
      if (y !== lastY) { lastY = y; dashes.forEach((d, n) => { d.style.transform = `scaleX(${n < i ? 1 : n === i ? k : 0})`; }); }
    };
    gsap.ticker.add(frame);

    // A link that takes focus while its act is hidden brings that act on stage.
    const onFocus = (e: FocusEvent) => {
      const act = (e.target as HTMLElement).closest<HTMLElement>('.act');
      if (!act || acts.indexOf(act) === current) return;
      scrollToY(act.offsetTop + Math.min(window.innerHeight * 0.3, (act.offsetHeight - window.innerHeight) * 0.3), true);
    };
    el.addEventListener('focusin', onFocus);
    return () => { gsap.ticker.remove(frame); el.removeEventListener('focusin', onFocus); };
  }, { scope: root });

  return (
    <div className="orbit" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <Loader onDone={onDone} bg="#050505" ink="#f0f0ec" font='400 clamp(5rem, 16vw, 15rem)/0.85 "Bodoni Moda Variable", Didot, serif' />
      <div className="stage" aria-hidden="true">{scene}</div>
      <div className="veil t" aria-hidden="true" /><div className="veil b" aria-hidden="true" />

      <header className="top">
        <a className="mark" href="#top" aria-label="Skeptical, back to the top">skeptical</a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
      </header>

      <main id="main">
        <section className="act" id="top" data-side="left" aria-label={SITE.heading}>
          <div className="act-in"><div className="act-col">
            <h1><span className="sr-only-x">{HERO.pitch.join(' ')}</span>{HERO.pitch.map((l) => <span className="l" data-letters aria-hidden="true" key={l}>{l}</span>)}</h1>
            <p className="lead gap" data-rise>{HERO.statement.join(' ')}</p>
            <p className="doors gap">{HERO.doors.map((d) => <span data-rise key={d.href}><U href={d.href}>{d.label}</U></span>)}</p>
          </div></div>
        </section>

        <section className="act" id="why" data-side="right" data-scrub="words" aria-label="How the team works">
          <div className="act-in"><div className="act-col mani">{MANIFESTO.map((m) => <p key={m}>{m}</p>)}</div></div>
        </section>

        <section className="act" id="record" data-side="left">
          <div className="act-in"><div className="act-col">
            <h2 data-letters>{RECORD.title}</h2>
            <p className="lead gap-s" data-rise>{RECORD.rule}</p>
            <p className="gap mute" data-rise>{RECORD.when}. {RECORD.name}, {RECORD.where}.</p>
            {RECORD.results.map((r) => <div className="result" data-rise key={r.who}><h3>{r.what}</h3><p>{r.who} {r.more}</p></div>)}
            <p className="gap" data-rise><U href={RECORD.more.href}>{RECORD.more.label}</U></p>
          </div></div>
        </section>

        <section className="act" id="drive" data-side="right" data-long data-scrub="drive">
          <div className="act-in"><div className="act-col">
            <h2 data-letters>{DRIVE.title}</h2>
            <p className="lead gap-s" data-rise>{DRIVE.lead}</p>
            <dl className="dv gap" data-rise>{DRIVE.items.flatMap((d) => [<dt key={d.term}>{d.term}</dt>, <dd key={d.term + 'd'}>{d.text}</dd>])}</dl>
            <p className="gap" data-rise><U href={DRIVE.more.href}>{DRIVE.more.label}</U></p>
          </div></div>
        </section>

        <section className="act" id="people" data-side="left">
          <div className="act-in"><div className="act-col">
            <h2 data-letters>{PEOPLE.title}</h2>
            <div className="gap">{PEOPLE.coaches.map((c) => <div className="coach" data-rise key={c.name}><h3>{c.name}</h3><p><span className="mute">{c.role}.</span> {c.bio}</p></div>)}</div>
            <p className="gap" data-rise>{PEOPLE.count} <U href={PEOPLE.more.href}>{PEOPLE.more.label}</U></p>
          </div></div>
        </section>

        <section className="act" id="join" data-side="right">
          <div className="act-in"><div className="act-col">
            <h2 data-letters>{JOIN.title}</h2>
            <p className="lead gap-s" data-rise>{JOIN.lead}</p>
            <ul className="paths gap">{JOIN.paths.map((p) => <li data-rise key={p.id}><a href={p.href} rel="noopener"><b>{p.name}</b><span>{p.line}</span></a></li>)}</ul>
            <p className="gap" data-rise>{JOIN.already.before}<U href={JOIN.already.href}>{JOIN.already.label}</U>. {JOIN.coach.before}<U href={JOIN.coach.href}>{JOIN.coach.label}</U>.</p>
            <p className="gap-s" data-rise>{JOIN.also} <U href={`mailto:${SITE.email}`}>{SITE.email}</U></p>
          </div></div>
        </section>
      </main>

      <footer>
        <p className="line">{FOOTER.line}</p>
        <ul>{FOOTER.links.map((l) => <li key={l.href}><U href={l.href}>{l.label}</U></li>)}</ul>
        <ul>{FOOTER.pages.map((l) => <li key={l.href}><U href={l.href}>{l.label}</U></li>)}</ul>
        <small>{credit}</small>
      </footer>

      <div className="dashes" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <i key={i}><b /></i>)}</div>
    </div>
  );
}
