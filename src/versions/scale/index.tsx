// Version 23: the scale. A brass balance with the doubt in one pan. The site
// arrives as weights; put them in the other pan and watch the beam come down.
import { lazy, Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import '@fontsource-variable/bodoni-moda/wght.css';
import '@fontsource-variable/bodoni-moda/wght-italic.css';
import '@fontsource-variable/newsreader/wght.css';
import '@fontsource/old-standard-tt/400.css';
import '@fontsource/old-standard-tt/700.css';
import './scale.css';
import { HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV, SITE } from '@/content';
import { ScrollTrigger } from '@/lib/scroll';
import { Split, useRise } from '@/lib/motion';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { WEIGHTS, S, byId, subscribe, toggle, start, stop, reset, open, setLift, setFree, throwFrom, kick, send, type Section } from './sim';
import { Flat } from './Flat';
import { sound } from './sound';

const Scene = lazy(() => import('./Scene'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const useSim = () => useSyncExternalStore(subscribe, () => S.version);

const ORDER: Section[] = ['weigh', 'manifesto', 'record', 'drive', 'people'];

/** One weight in a tray: press to put it on (or take it off), or drag it onto the pan. */
function Chip({ id, big }: { id: string; big?: boolean }) {
  useSim();
  const w = byId(id);
  const on = w.side === 'R';
  const drag = useRef<{ x: number; y: number; moved: boolean; ghost: HTMLElement | null } | null>(null);
  const down = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== 'mouse' || on) return;
    drag.current = { x: e.clientX, y: e.clientY, moved: false, ghost: null };
    const move = (ev: PointerEvent) => {
      const d = drag.current; if (!d) return;
      if (!d.moved && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) > 8) {
        d.moved = true;
        const g = document.createElement('div'); g.className = 'sc-ghost'; g.textContent = w.label;
        document.querySelector('.v-scale')?.appendChild(g); d.ghost = g;
      }
      if (d.ghost) d.ghost.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px)`;
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      const d = drag.current; drag.current = null; if (!d) return;
      d.ghost?.remove();
      if (d.moved) {
        const phone = window.innerWidth < 760;
        const over = phone ? ev.clientY < window.innerHeight * 0.46 : ev.clientX > window.innerWidth * 0.46;
        if (over) { sound.wake(); send(w, 'R'); }
        dragged.current = true; setTimeout(() => { dragged.current = false; }, 50);
      }
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const dragged = useRef(false);
  return (
    <button type="button" className={'sc-chip' + (on ? ' is-on' : '') + (big ? ' is-big' : '') + ' k-' + w.kind} onPointerDown={down}
      onClick={() => { if (dragged.current) return; sound.wake(); toggle(id); }} aria-pressed={on}>
      <span className="sc-knob" aria-hidden="true" />
      <span className="sc-chip-t">{w.label}</span>
      <span className="sc-chip-a">{on ? 'On the pan. Take it off.' : 'Weigh it'}</span>
    </button>
  );
}

function Tray({ ids, note }: { ids: string[]; note?: string }) {
  return (
    <div className="sc-tray" data-rise>
      <p className="sc-tray-h">{note ?? 'Drag onto the pan, or press.'}</p>
      <div className="sc-tray-row">{ids.map((id) => <Chip key={id} id={id} />)}</div>
    </div>
  );
}

/** The live readout: the same needle as the instrument, and two keys. */
function Hud({ reached }: { reached: React.RefObject<Set<string>> }) {
  useSim();
  const needle = useRef<SVGGElement>(null), [msg, setMsg] = useState('');
  useEffect(() => {
    let id = 0;
    const loop = () => { if (needle.current) needle.current.setAttribute('transform', `rotate(${(S.th * 180) / Math.PI * 2.2} 60 8)`); id = requestAnimationFrame(loop); };
    loop(); return () => cancelAnimationFrame(id);
  }, []);
  const next = useCallback(() => {
    sound.wake();
    const w = WEIGHTS.find((x) => x.id !== 'q' && x.side !== 'R' && reached.current.has(x.section));
    if (w) { send(w, 'R'); setMsg(''); } else setMsg(S.free ? 'All of it is loose.' : 'Scroll for more.');
  }, [reached]);
  const back = useCallback(() => {
    const on = WEIGHTS.filter((x) => x.id !== 'q' && x.side === 'R' && x.landed);
    const w = on[on.length - 1]; if (w) send(w, 'off', 0.7);
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'n' || e.key === 'N') next();
      if (e.key === 'b' || e.key === 'B') back();
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [next, back]);
  const state = S.tipped ? 'Skeptical is heavier.' : 'The doubt is heavier.';
  const n = WEIGHTS.filter((x) => x.id !== 'q' && x.side === 'R').length;
  return (
    <aside className="sc-hud" aria-label="The balance">
      <svg viewBox="0 0 120 56" className="sc-dial" aria-hidden="true">
        <path d="M14 44 A 52 52 0 0 0 106 44" fill="none" stroke="currentColor" strokeWidth="1" />
        {Array.from({ length: 13 }, (_, i) => { const a = (-30 + i * 5) * Math.PI / 180; const r0 = i === 6 ? 40 : 45; return <line key={i} x1={60 + Math.sin(a) * r0} y1={8 + Math.cos(a) * r0} x2={60 + Math.sin(a) * 50} y2={8 + Math.cos(a) * 50} stroke="currentColor" strokeWidth={i === 6 ? 2 : 1} />; })}
        <g ref={needle}><line x1="60" y1="8" x2="60" y2="54" stroke="var(--brass)" strokeWidth="2" /><circle cx="60" cy="8" r="4" fill="var(--brass)" /></g>
      </svg>
      <p className="sc-hud-s" aria-live="polite">{msg || state}<span> {n} on the pan.</span></p>
      <div className="sc-hud-b">
        <button type="button" onClick={next}>Next weight <kbd>N</kbd></button>
        <button type="button" onClick={back}>Take back <kbd>B</kbd></button>
      </div>
    </aside>
  );
}

export default function Scale() {
  useVersion('scale');
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [phone, setPhone] = useState(isPhone);
  const [level, setLevel] = useState(0);
  const [snd, setSnd] = useState(false);
  const reached = useRef(new Set<string>(['weigh']));
  const v = useSim();
  useRise(root);

  useEffect(() => { const on = () => setPhone(isPhone()); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, []);

  // the sim runs for the life of the page; the doubt drops in once the page is up
  useEffect(() => {
    reset(); start();
    const t = setTimeout(open, still ? 0 : 900);
    const lv = (up: boolean) => { if (up) { setLevel((x) => x + 1); sound.level(); } };
    const ld = (m: number) => sound.land(m);
    S.onLevel.add(lv); S.onLand.add(ld);
    return () => { clearTimeout(t); stop(); S.onLevel.delete(lv); S.onLand.delete(ld); };
  }, []);

  // the scroll and the weighing are the same thing
  useEffect(() => {
    const ts: ScrollTrigger[] = [];
    ORDER.forEach((id) => {
      const el = document.getElementById(id); if (!el) return;
      ts.push(ScrollTrigger.create({ trigger: el, start: 'top 80%', onEnter: () => reached.current.add(id) }));
    });
    const j = document.getElementById('join'), p = document.getElementById('play');
    if (j) ts.push(ScrollTrigger.create({ trigger: j, start: 'top 60%', end: 'bottom 40%', onToggle: (s) => setLift(s.isActive) }));
    if (p) ts.push(ScrollTrigger.create({ trigger: p, start: 'top 65%', onEnter: () => { ORDER.forEach((o) => reached.current.add(o)); setFree(true); } }));
    return () => ts.forEach((t) => t.kill());
  }, []);

  // pressing a pan: hold and pull to push it down, tap to knock it; in free play a tap throws from it
  const onPan = useCallback((side: 'L' | 'R', e: { clientY: number; type: string }) => {
    sound.wake();
    const y0 = e.clientY; let moved = false;
    const move = (ev: PointerEvent) => { const dy = ev.clientY - y0; if (Math.abs(dy) > 6) moved = true; S.push = (side === 'R' ? 1 : -1) * Math.max(-6, Math.min(6, dy / 18)); };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      S.push = 0;
      if (!moved) { if (S.free) { if (!throwFrom(side)) kick(side); } else kick(side, 1.2); }
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }, []);

  const toggleSound = () => { const on = !snd; setSnd(on); S.sound = on; if (on) { sound.wake(); sound.level(); } };
  const tipped = S.tipped;
  void v;

  return (
    <div className={'v-scale' + (tipped ? ' is-tipped' : '') + (phone ? ' is-phone' : '')} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="sc-top">
        <a className="sc-mark" href="#top" aria-label="Skeptical, to the top">Skeptical<span aria-hidden="true">?</span></a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
        <button type="button" className="sc-snd" onClick={toggleSound} aria-pressed={snd}>{snd ? 'Sound on' : 'Sound off'}</button>
      </header>

      <div className="sc-stage" role="region" aria-label="The scale">
        {webgl ? <Suspense fallback={<div className="sc-wait" aria-hidden="true">Levelling the beam</div>}><Scene onPan={onPan} /></Suspense> : <Flat />}
        <div key={level} className={'sc-level' + (level ? ' go' : '')} aria-hidden="true"><span>Level.</span></div>
      </div>
      <p className="sr-only-x" aria-live="polite">{level ? 'The beam crossed level. Skeptical is heavier.' : ''}</p>

      <main id="main">
        <section id="top" className="sc-hero" aria-labelledby="sc-h1">
          <h1 id="sc-h1" className="sc-pitch">
            <span className="sr-only-x">{SITE.heading}. </span>
            <Split as="span" by="words" on="load" className="sc-p1" delay={0.3}>{HERO.pitch[0]}</Split>
            <Split as="span" by="words" on="load" className="sc-p2" delay={0.7}>{HERO.pitch[1]}</Split>
          </h1>
          <div className="sc-doors">
            {HERO.doors.map((d, i) => <A key={d.href} href={d.href} className={'sc-door' + (i ? '' : ' is-main')}>{d.label}</A>)}
          </div>
          <p className="sc-hint"><span>The doubt is in the left pan.</span> Press a pan, or scroll and weigh.</p>
        </section>

        <section id="weigh" className="sc-sec">
          <div className="sc-col">
            <p className="sc-kick">On the other pan</p>
            <h2 className="sr-only-x">The statement.</h2>
            <ul className="sc-big">{HERO.statement.map((s) => <li key={s} data-rise>{s}</li>)}</ul>
            <Tray ids={['s0', 's1', 's2']} />
          </div>
        </section>

        <section id="manifesto" className="sc-sec">
          <div className="sc-col">
            <p className="sc-kick">Four more, in iron</p>
            <h2 className="sr-only-x">What we are.</h2>
            <ol className="sc-man">{MANIFESTO.map((s, i) => <li key={s} data-rise><span aria-hidden="true">{['i', 'ii', 'iii', 'iv'][i]}</span>{s}</li>)}</ol>
            <Tray ids={['m0', 'm1', 'm2', 'm3']} />
          </div>
        </section>

        <section id="record" className="sc-sec">
          <div className="sc-col">
            <p className="sc-kick">Weighed in public</p>
            <h2 className="sc-h2"><Split as="span" by="chars" effect="blur">{RECORD.title}</Split></h2>
            <p className="sc-rule" data-rise>{RECORD.rule}</p>
            <p className="sc-event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ul className="sc-res">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise><span className="sc-res-who">{r.who}</span><span className="sc-res-what">{r.what}</span><span className="sc-res-more">{r.more}</span></li>
              ))}
            </ul>
            <A className="sc-more" href={RECORD.more.href}>{RECORD.more.label}</A>
            <Tray ids={['r0', 'r1']} />
          </div>
        </section>

        <section id="drive" className="sc-sec">
          <div className="sc-col">
            <p className="sc-kick">A closed box</p>
            <h2 className="sc-h2"><Split as="span" by="chars" effect="blur">{DRIVE.title}</Split></h2>
            <p className="sc-lead" data-rise>{DRIVE.lead}</p>
            <div className="sc-box" data-rise>
              <p className="sc-box-lid">Seven things inside. It goes on the pan shut.</p>
              <dl>{DRIVE.items.map((d) => <div key={d.term}><dt>{d.term}</dt><dd>{d.text}</dd></div>)}</dl>
            </div>
            <A className="sc-more" href={DRIVE.more.href}>{DRIVE.more.label}</A>
            <Tray ids={['d']} note="The heaviest one. Drag it on, or press." />
          </div>
        </section>

        <section id="people" className="sc-sec">
          <div className="sc-col">
            <p className="sc-kick">Who is on the scale</p>
            <h2 className="sc-h2"><Split as="span" by="chars" effect="blur">{PEOPLE.title}</Split></h2>
            <ul className="sc-coaches">
              {PEOPLE.coaches.map((c) => (
                <li key={c.name} data-rise><span className="sc-role">{c.role}</span><span className="sc-name">{c.name}</span><span className="sc-bio">{c.bio}</span></li>
              ))}
            </ul>
            <p className="sc-count" data-rise>{PEOPLE.count}</p>
            <A className="sc-more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A>
            <Tray ids={['p0', 'p1', 'pc']} />
          </div>
        </section>

        <section id="join" className="sc-sec sc-join">
          <div className="sc-col sc-col-wide">
            <p className="sc-kick">The doubt is lifted out</p>
            <h2 className="sc-h2 sc-h2-join"><Split as="span" by="chars" effect="blur">{JOIN.title}</Split><span className="sc-step"> Step on.</span></h2>
            <p className="sc-lead" data-rise>{JOIN.lead}</p>
            <div className="sc-paths">
              {JOIN.paths.map((p, i) => (
                <article key={p.id} className="sc-path" data-rise>
                  <span className="sc-path-n" aria-hidden="true">{['i', 'ii', 'iii'][i]}</span>
                  <h3>{p.name}.</h3>
                  <p className="sc-path-line">{p.line}</p>
                  <ul>{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
                  <A className="sc-path-go" href={p.href}>Step on: {p.name}</A>
                </article>
              ))}
            </div>
            <p className="sc-also" data-rise>
              <span>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>.</span>
              <span>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</span>
            </p>
            <p className="sc-also2" data-rise>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
            <p className="sc-also2" data-rise>{JOIN.discord}</p>
          </div>
        </section>

        <section id="play" className="sc-sec sc-play">
          <div className="sc-col">
            <p className="sc-kick">Free play</p>
            <h2 className="sc-h2">Everything loose.</h2>
            <p className="sc-lead" data-rise>Every weight is on a pan now, and the doubt is back. Throw them across and weigh it again.</p>
            <div className="sc-play-b" data-rise>
              <button type="button" onClick={() => { sound.wake(); setFree(true); throwFrom('L') || kick('L'); }}>Throw left to right</button>
              <button type="button" onClick={() => { sound.wake(); setFree(true); throwFrom('R') || kick('R'); }}>Throw right to left</button>
              <button type="button" onClick={() => { sound.wake(); kick(S.th > 0 ? 'L' : 'R', 2.4); }}>Knock the beam</button>
            </div>
            <p className="sc-tray-h" data-rise>Or press either pan to throw from it.</p>
          </div>
        </section>
      </main>

      <footer className="sc-foot">
        <p className="sc-foot-line">{FOOTER.line}</p>
        <ul className="sc-foot-links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <ul className="sc-foot-pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <p className="sc-foot-small">Draft 2, version 23. Not the live site.</p>
      </footer>
      <Hud reached={reached} />
    </div>
  );
}
