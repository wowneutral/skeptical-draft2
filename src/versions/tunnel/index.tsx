import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import '@fontsource/bodoni-moda/700.css';
import '@fontsource/bodoni-moda/400-italic.css';
import '@fontsource/bodoni-moda/700-italic.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import { ArrowUpRight } from 'lucide-react';
import { useVersion } from '@/lib/version';
import { gsap, scrollToId } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { still, isPhone } from '@/lib/utils';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { rig, type Key } from './plan';
import './tunnel.css';

const Scene = lazy(() => import('./Scene'));

function webgl() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const Arrow = () => <ArrowUpRight className="tn-arrow" aria-hidden="true" strokeWidth={1.5} />;

export default function Tunnel() {
  useVersion('tunnel');
  const root = useRef<HTMLDivElement>(null);
  const [flat] = useState(() => still || !webgl());
  const [phone, setPhone] = useState(() => isPhone());
  const [lit, setLit] = useState(flat);
  const [covered, setCovered] = useState(false);
  useRise(root);

  // phone or not decides the corridor's geometry; rebuild only when that flips
  useEffect(() => {
    const on = () => setPhone((p) => (isPhone() !== p ? !p : p));
    addEventListener('resize', on);
    return () => removeEventListener('resize', on);
  }, []);

  // camera keyframes come from where each phrase's section sits on the page
  useLayoutEffect(() => {
    if (flat) return;
    const measure = () => {
      const vh = innerHeight;
      const keys: Key[] = [];
      root.current!.querySelectorAll<HTMLElement>('[data-key]').forEach((el) => {
        const i = Number(el.dataset.key);
        const top = el.getBoundingClientRect().top + scrollY;
        const y = i < 0 ? top + el.offsetHeight - vh : Math.max(0, top + el.offsetHeight / 2 - vh / 2);
        keys.push({ y, i });
      });
      keys.sort((a, b) => a.y - b.y);
      rig.keys = keys;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root.current!);
    addEventListener('resize', measure);
    return () => { ro.disconnect(); removeEventListener('resize', measure); };
  }, [flat, phone]);

  // while a calm field fills the screen, the corridor behind it stops drawing
  useEffect(() => {
    if (flat) return;
    let raf = 0;
    const check = () => {
      raf = 0;
      const vh = innerHeight;
      const c = [...root.current!.querySelectorAll<HTMLElement>('.tn-panel, .tn-foot')].some((el) => { const r = el.getBoundingClientRect(); return r.top <= 0 && r.bottom >= vh; });
      setCovered((v) => (v === c ? v : c));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(check); };
    addEventListener('scroll', on, { passive: true }); addEventListener('resize', on);
    check();
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, [flat]);

  // the pointer is the torch; a press anywhere knocks on the far wall
  useEffect(() => {
    if (flat) return;
    const move = (e: PointerEvent) => { rig.pointer.x = (e.clientX / innerWidth) * 2 - 1; rig.pointer.y = -(e.clientY / innerHeight) * 2 + 1; rig.pointer.has = true; };
    const down = (e: PointerEvent) => {
      move(e);
      if ((e.target as HTMLElement).closest('a,button')) return;
      rig.ripple = { t: performance.now() / 1000, x: rig.pointer.x, y: rig.pointer.y };
    };
    const leave = () => { rig.pointer.has = false; };
    addEventListener('pointermove', move, { passive: true });
    addEventListener('pointerdown', down, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => { removeEventListener('pointermove', move); removeEventListener('pointerdown', down); document.documentElement.removeEventListener('pointerleave', leave); };
  }, [flat]);

  const onReady = useCallback(() => {
    setLit(true);
    rig.intro = 0;
    gsap.to(rig, { intro: 1, duration: 3.2, ease: 'power2.inOut', delay: 0.25 });
  }, []);
  useEffect(() => () => { gsap.killTweensOf(rig); rig.keys = []; }, []);

  const knock = () => {
    // a wave from the middle of the wall
    rig.ripple = { t: performance.now() / 1000, x: 0, y: 0.1 };
  };

  const say = 'tn-say';
  return (
    <div ref={root} className={`v-tunnel${flat ? ' tn-flat' : ''}${lit ? ' tn-lit' : ''}`}>
      <a className="skip-x" href="#main">Skip to content</a>
      {!flat && (
        <div className="tn-stage" aria-hidden="true">
          <Suspense fallback={null}>
            <Scene key={phone ? 'p' : 'd'} phone={phone} paused={covered} onReady={onReady} />
          </Suspense>
        </div>
      )}

      <header className="tn-top">
        <a className="tn-brand" href="#top" onClick={(e) => { e.preventDefault(); scrollToId('top'); }}>
          Skeptical<span className="tn-q">?</span>
        </a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </header>

      <main id="main">
        <h1 className="sr-only-x">{SITE.heading}</h1>

        <section id="top" className="tn-hero" data-key="0">
          <p className={say}>{HERO.pitch[0]}</p>
          <div className="tn-hero-foot">
            <div className="tn-doors">
              {HERO.doors.map((d) => <a key={d.href} href={d.href}>{d.label}<Arrow /></a>)}
            </div>
            <p className="tn-hint" aria-hidden={flat ? undefined : 'true'}><span className="tn-hint-line" />Scroll to walk in.</p>
          </div>
        </section>

        <section className="tn-stop" data-key="1"><p className={say}>{HERO.pitch[1]}</p></section>
        <section className="tn-stop tn-statement" aria-label="Three lines" >
          {HERO.statement.map((s, i) => (
            <div key={s} className="tn-sub" data-key={2 + i}><p className={say}>{s}</p></div>
          ))}
        </section>
        <section className="tn-stop tn-manifesto" aria-label="What we are">
          {MANIFESTO.map((m, i) => (
            <div key={m} className="tn-sub" data-key={5 + i}><p className={`${say} tn-say-long`}>{m}</p></div>
          ))}
        </section>

        {/* The record */}
        <section className="tn-stop" id="record" data-key="9"><h2 className={say} id="h-record">{RECORD.title}</h2></section>
        <section className="tn-panel" aria-labelledby="h-record">
          <div className="tn-wrap">
            <p className="tn-lead" data-rise>{RECORD.rule}</p>
            <p className="tn-event" data-rise>
              <span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span>
            </p>
            <ol className="tn-results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <span className="tn-res-what">{r.what}</span>
                  <span className="tn-res-who">{r.who}</span>
                  <span className="tn-res-more">{r.more}</span>
                </li>
              ))}
            </ol>
            <a className="tn-more" href={RECORD.more.href} data-rise>{RECORD.more.label}<Arrow /></a>
          </div>
        </section>

        {/* The drive */}
        <section className="tn-stop" id="drive" data-key="10"><h2 className={say} id="h-drive">{DRIVE.title}</h2></section>
        <section className="tn-panel" aria-labelledby="h-drive">
          <div className="tn-wrap">
            <p className="tn-lead" data-rise>{DRIVE.lead}</p>
            <dl className="tn-drive">
              {DRIVE.items.map((d) => (
                <div key={d.term} className="tn-row" data-rise>
                  <dt>{d.term}</dt><dd>{d.text}</dd>
                </div>
              ))}
            </dl>
            <a className="tn-more" href={DRIVE.more.href} data-rise>{DRIVE.more.label}<Arrow /></a>
          </div>
        </section>

        {/* The people */}
        <section className="tn-stop" id="people" data-key="11"><h2 className={say} id="h-people">{PEOPLE.title}</h2></section>
        <section className="tn-panel" aria-labelledby="h-people">
          <div className="tn-wrap">
            <p className="tn-lead tn-count" data-rise>{PEOPLE.count}</p>
            <div className="tn-coaches">
              {PEOPLE.coaches.map((c) => (
                <article key={c.name} className="tn-coach" data-rise>
                  <p className="tn-role">{c.role}</p>
                  <h3>{c.name}</h3>
                  <p className="tn-bio">{c.bio}</p>
                </article>
              ))}
            </div>
            <a className="tn-more" href={PEOPLE.more.href} data-rise>{PEOPLE.more.label}<Arrow /></a>
          </div>
        </section>

        {/* Join */}
        <section className="tn-stop" id="join" data-key="12"><h2 className={say} id="h-join">{JOIN.title}</h2></section>
        <section className="tn-panel tn-join" aria-labelledby="h-join">
          <div className="tn-wrap">
            <p className="tn-lead" data-rise>{JOIN.lead}</p>
            <div className="tn-paths">
              {JOIN.paths.map((p) => (
                <article key={p.id} className="tn-path" data-rise>
                  <h3>{p.name}</h3>
                  <p className="tn-line">{p.line}</p>
                  {p.text.map((t) => <p key={t} className="tn-text">{t}</p>)}
                  <a className="tn-go" href={p.href}>{p.name}<Arrow /></a>
                </article>
              ))}
            </div>
            <div className="tn-after" data-rise>
              <p>{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a></p>
              <p>{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a></p>
              <p>{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
              <p>{JOIN.discord}</p>
            </div>
          </div>
        </section>

        {/* The far wall */}
        <section className="tn-end" data-key="-1" aria-label="Skeptical?">
          <div className="tn-wallflat" aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => <span key={i}>SKEPTICAL?</span>)}
          </div>
          {!flat && <button type="button" className="tn-knock" onClick={knock}>Knock on the wall.</button>}
        </section>
      </main>

      <footer className="tn-foot">
        <div className="tn-wrap">
          <p className="tn-foot-line">{FOOTER.line}</p>
          <div className="tn-foot-cols">
            <ul aria-label="Elsewhere">
              {FOOTER.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
            </ul>
            <ul aria-label="Pages">
              {FOOTER.pages.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
            </ul>
          </div>
          <p className="tn-small">Draft 2, version 37. Not the live site.</p>
        </div>
      </footer>
    </div>
  );
}

