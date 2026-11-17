// Version 80: the mend. A frontline, as a bowl. Press it and it breaks; it
// comes back together, and every break is filled with a thin line of gold.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/index.css';
import './mend.css';
import { HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV, SITE } from '@/content';
import { gsap } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { clamp, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { bowl } from './store';

const Bowl = lazy(() => import('./Bowl'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const DRIVE_SEC = 3;

export default function Mend() {
  useVersion('mend');
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [phone, setPhone] = useState(isPhone);
  useRise(root);

  useEffect(() => { bowl.reset(); bowl.phone = isPhone(); const on = () => { setPhone(isPhone()); bowl.phone = isPhone(); }; window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, []);

  // Where we are on the page: one break per section, held apart at the drive.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const secs = Array.from(el.querySelectorAll<HTMLElement>('[data-sec]'));
    let tops: number[] = [];
    const measure = () => { const sy = window.scrollY; tops = secs.map((s) => s.getBoundingClientRect().top + sy); };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    let last = 0;
    const tick = () => {
      const vh = window.innerHeight, line = window.scrollY + vh * (isPhone() ? 0.72 : 0.55);
      const max = document.documentElement.scrollHeight - vh;
      let i = 0; while (i < tops.length - 1 && line >= tops[i + 1]) i++;
      if (window.scrollY >= max - 4) i = tops.length - 1;
      const a = tops[i], b = i < tops.length - 1 ? tops[i + 1] : a + vh;
      const fr = clamp((line - a) / Math.max(1, b - a));
      // Hold on each section, then travel over the last part of it.
      bowl.f = i + clamp((fr - 0.62) / 0.38) ** 2;
      if (window.scrollY >= max - 4) bowl.f = tops.length - 1;
      bowl.hold = i === DRIVE_SEC;
      if (i !== last) {
        if (i > 0 && i < tops.length - 2 && i !== DRIVE_SEC && bowl.asks.length < 1) bowl.asks.push({ hold: false });
        last = i; bowl.sec = i;
      }
    };
    gsap.ticker.add(tick);
    return () => { ro.disconnect(); gsap.ticker.remove(tick); };
  }, []);

  // The opening: the pitch arrives as the light comes up.
  useEffect(() => {
    const el = root.current; if (!el || still) return;
    const ctx = gsap.context(() => {
      gsap.from('.pitch .ln > span', { yPercent: 105, duration: 1.4, ease: 'expo.out', stagger: 0.14, delay: 0.5 });
      gsap.from('.hero .after', { autoAlpha: 0, y: 14, duration: 1, ease: 'out', stagger: 0.1, delay: 1.3 });
      gsap.from('.cue', { autoAlpha: 0, duration: 1.2, delay: 3.6 });
    }, el);
    return () => ctx.revert();
  }, []);

  // Turning by hand: drag anywhere on the stage, sideways.
  useEffect(() => {
    if (!webgl || still) return;
    const stage = root.current?.querySelector<HTMLElement>('.stage'); if (!stage) return;
    let down = false, x0 = 0, lx = 0, lt = 0;
    const pd = (e: PointerEvent) => { down = true; x0 = lx = e.clientX; lt = performance.now(); };
    const pm = (e: PointerEvent) => {
      if (!down) return;
      if (Math.abs(e.clientX - x0) > 6) bowl.dragging = true;
      if (!bowl.dragging) return;
      const now = performance.now(), dx = e.clientX - lx, k = isPhone() ? 0.012 : 0.007;
      bowl.yaw += dx * k;
      bowl.yawV = (dx * k) / Math.max(0.008, (now - lt) / 1000);
      lx = e.clientX; lt = now;
    };
    const pu = () => { down = false; bowl.dragging = false; bowl.yawV = clamp(bowl.yawV, -6, 6); };
    stage.addEventListener('pointerdown', pd);
    window.addEventListener('pointermove', pm);
    window.addEventListener('pointerup', pu);
    window.addEventListener('pointercancel', pu);
    return () => { stage.removeEventListener('pointerdown', pd); window.removeEventListener('pointermove', pm); window.removeEventListener('pointerup', pu); window.removeEventListener('pointercancel', pu); };
  }, [webgl]);

  const press = () => bowl.asks.length < 2 && bowl.asks.push({ hold: false });
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { bowl.yawV -= 2.4; e.preventDefault(); }
    if (e.key === 'ArrowRight') { bowl.yawV += 2.4; e.preventDefault(); }
  };

  return (
    <div className={`v-mend${webgl ? '' : ' no-gl'}${phone ? ' is-phone' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      {webgl && <div className="stage" aria-hidden="true"><Suspense fallback={null}><Bowl /></Suspense></div>}

      <header className="top">
        <a className="brand" href="#top" aria-label="Skeptical, back to the top">Skeptical<i>?</i></a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
      </header>

      {webgl && (
        <aside className="cue" aria-label="The bowl">
          <span className="cue-line">Stronger where it was answered.</span>
          <button type="button" onClick={press} onKeyDown={keys}>{phone ? 'Tap the bowl' : 'Press the bowl'}<span className="sr-only-x"> to break it and mend it. Arrow keys turn it.</span></button>
        </aside>
      )}

      <main id="main">
        <section className="sec hero" data-sec id="top" aria-label={SITE.heading}>
          <div className="col">
            <h1 className="pitch">{HERO.pitch.map((l) => <span className="ln" key={l}><span>{l}</span></span>)}</h1>
            <p className="statement after">{HERO.statement.map((s) => <span key={s}>{s}</span>)}</p>
            <p className="doors after">{HERO.doors.map((d) => <A key={d.href} className="door" href={d.href}>{d.label}</A>)}</p>
          </div>
        </section>

        <section className="sec manifesto" data-sec aria-label="How the team works">
          <div className="col">
            {MANIFESTO.map((m, i) => <p key={m} className={`m-line${i === 2 ? ' is-key' : ''}`} data-rise>{m}</p>)}
          </div>
        </section>

        <section className="sec record" data-sec id="record">
          <div className="col">
            <h2 className="title" data-rise>{RECORD.title}</h2>
            <p className="lead" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ul className="results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <h3>{r.what}</h3>
                  <p><b>{r.who}</b> {r.more}</p>
                </li>
              ))}
            </ul>
            <p data-rise><A className="more" href={RECORD.more.href}>{RECORD.more.label}</A></p>
          </div>
        </section>

        <section className="sec drive" data-sec id="drive">
          <div className="col">
            <h2 className="title" data-rise>{DRIVE.title}</h2>
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <dl className="items">
              {DRIVE.items.map((d) => (
                <div key={d.term} data-rise><dt>{d.term}</dt><dd>{d.text}</dd></div>
              ))}
            </dl>
            <p data-rise><A className="more" href={DRIVE.more.href}>{DRIVE.more.label}</A></p>
          </div>
        </section>

        <section className="sec people" data-sec id="people">
          <div className="col">
            <h2 className="title" data-rise>{PEOPLE.title}</h2>
            <ul className="coaches">
              {PEOPLE.coaches.map((c) => (
                <li key={c.name} data-rise>
                  <h3>{c.name}</h3>
                  <p className="role">{c.role}</p>
                  <p>{c.bio}</p>
                </li>
              ))}
            </ul>
            <p className="count" data-rise>{PEOPLE.count}</p>
            <p data-rise><A className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>
          </div>
        </section>

        <section className="sec join" data-sec id="join">
          <div className="col">
            <h2 className="title" data-rise>{JOIN.title}</h2>
            <p className="lead" data-rise>{JOIN.lead}</p>
            <ol className="paths">
              {JOIN.paths.map((p) => (
                <li key={p.id} data-rise>
                  <h3><A href={p.href}>{p.name}<span className="arrow" aria-hidden="true" /></A></h3>
                  <p className="line">{p.line}</p>
                  {p.text.map((t) => <p key={t} className="txt">{t}</p>)}
                </li>
              ))}
            </ol>
            <div className="side" data-rise>
              <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A></p>
              <p>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A></p>
              <p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
              <p>{JOIN.discord}</p>
            </div>
          </div>
        </section>

        <footer className="sec end" data-sec>
          <div className="col">
            <span className="rule" aria-hidden="true" />
            <p className="last">{FOOTER.line}</p>
            <ul className="links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
            <ul className="pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
            <p className="small">Draft 2, version 80. Not the live site.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
