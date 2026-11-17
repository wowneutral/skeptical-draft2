// Version 73: the cradle. Eight steel balls on a black frame, shot like a
// product. Pull one back and let go: the knock passes through everyone and only
// the last one flies. The scroll moves the lens between five set shots.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/index.css';
import './cradle.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap } from '@/lib/scroll';
import { Split, useRise } from '@/lib/motion';
import { clamp, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { N, group, pull, resetRig, rig, wakeSound } from './rig';

const Stage = lazy(() => import('./Stage'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** The cradle drawn flat, for a browser without WebGL. */
function FlatCradle() {
  const r = 22, gap = 2 * r + 1, x0 = 200 - (gap * 7) / 2;
  return (
    <svg className="flat" viewBox="0 0 400 260" role="img" aria-label="Eight steel balls hung in a row from a black frame">
      <rect x="8" y="232" width="384" height="18" fill="#1a1a1b" />
      <rect x="22" y="20" width="6" height="212" fill="#2a2a2b" /><rect x="372" y="20" width="6" height="212" fill="#2a2a2b" />
      <rect x="22" y="18" width="356" height="6" fill="#2a2a2b" />
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i}>
          <line x1={x0 + i * gap} y1="24" x2={x0 + i * gap} y2={190 - r} stroke="#9a9894" strokeWidth="1" />
          <circle cx={x0 + i * gap} cy="190" r={r} fill="#b9b7b1" />
          <rect x={x0 + i * gap - 12} y="172" width="24" height="5" fill="#f4f2ec" />
        </g>
      ))}
    </svg>
  );
}

export default function Cradle() {
  useVersion('cradle');
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const [sound, setSound] = useState(false);
  const [sel, setSel] = useState(0);
  const [focused, setFocused] = useState(false);
  useRise(root);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  useEffect(() => {
    resetRig();
    rig.onSound = (v) => setSound(v);
    return () => { rig.onSound = null; rig.focus = false; };
  }, []);

  // The scroll, turned into a position along the five shots. Each shot window
  // holds the lens still while it is in the middle of the screen.
  useEffect(() => {
    const el = root.current; if (!el) return;
    let marks: { a: number; b: number; k: number }[] = [];
    const measure = () => {
      const vh = window.innerHeight, sy = window.scrollY;
      marks = Array.from(el.querySelectorAll<HTMLElement>('[data-shot]')).map((s) => {
        const r = s.getBoundingClientRect(), c = r.top + sy + r.height / 2 - vh / 2, h = Math.max(vh * 0.12, r.height * 0.22);
        return { a: c - h, b: c + h, k: Number(s.dataset.shot) };
      });
      if (marks.length) { marks[0].a = -1e9; marks[0].b = Math.max(marks[0].b, vh * 0.15); marks[marks.length - 1].b = 1e9; }
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    document.fonts.ready.then(measure);
    const tick = () => {
      const y = window.scrollY;
      let f = 0;
      for (let i = 0; i < marks.length; i++) {
        const m = marks[i];
        if (y <= m.b) {
          if (y >= m.a || i === 0) f = m.k;
          else { const p = marks[i - 1]; f = p.k + (m.k - p.k) * clamp((y - p.b) / Math.max(1, m.a - p.b)); }
          break;
        }
        f = m.k;
      }
      rig.f = f;
    };
    gsap.ticker.add(tick);
    return () => { ro.disconnect(); gsap.ticker.remove(tick); };
  }, [phone]);

  const toggleSound = () => {
    rig.soundTouched = true;
    const next = !rig.sound;
    rig.sound = next;
    if (next) wakeSound();
    setSound(next);
  };

  // Keyboard: arrows pick a ball, Enter pulls it back and lets go.
  const swing = (i: number) => {
    rig.pressed = true;
    wakeSound();
    if (!rig.soundTouched && !rig.sound) { rig.sound = true; setSound(true); }
    const side = i < N / 2 ? -1 : 1;
    pull(group(i, side), side * 0.62, 0.55);
  };
  const onKey = (e: React.KeyboardEvent) => {
    let n = sel;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = Math.max(0, sel - 1);
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = Math.min(N - 1, sel + 1);
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = N - 1;
    else return;
    e.preventDefault();
    rig.sel = n; setSel(n);
  };

  const words = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'last'];
  return (
    <div className={`v-cradle${phone ? ' is-phone' : ''}${webgl ? '' : ' no-gl'}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      {webgl && <div className="stage" aria-hidden="true"><Suspense fallback={null}><Stage phone={phone} /></Suspense></div>}

      <header className="top">
        <a className="brand" href="#top" aria-label="Skeptical, back to the top">Skeptical<i>?</i></a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
        {webgl && <button type="button" className="snd" aria-pressed={sound} onClick={toggleSound}>{sound ? 'Sound on' : 'Sound off'}</button>}
      </header>

      <main id="main">
        {/* 0. The cradle, side on. */}
        <section className="win hero" data-shot="0" id="top" aria-label={SITE.heading}>
          <div className="copy">
            <Split as="h1" className="pitch" by="lines" on="load" delay={0.4}>{HERO.pitch.map((l) => <span key={l} className="ln">{l}</span>)}</Split>
            <p className="statement" data-rise>{HERO.statement.map((s) => <span key={s}>{s}</span>)}</p>
            <p className="doors" data-rise>{HERO.doors.map((d) => <A key={d.href} href={d.href}>{d.label}</A>)}</p>
          </div>
          {webgl && (
            <div className="hand">
              <button
                type="button" className="pick"
                onFocus={() => { setFocused(true); rig.focus = true; }}
                onBlur={() => { setFocused(false); rig.focus = false; }}
                onKeyDown={onKey}
                onClick={() => swing(sel)}
              >
                <span className="hint">{focused ? `The ${words[sel]} ball. Enter lets it go.` : phone ? 'Tap a ball.' : 'Pull one back. Let go.'}</span>
                <span className="sr-only-x"> Arrow keys pick a ball.</span>
              </button>
            </div>
          )}
          {!webgl && <FlatCradle />}
        </section>

        {/* Between shots: what the team is, on a near solid field. */}
        <section className="slab manifesto" aria-label="How the team works">
          {MANIFESTO.map((m, i) => <Split as="p" key={m} className={`say s${i}`} by="lines">{m}</Split>)}
        </section>

        {/* 1. The record: two pulled, two answer. */}
        <section className="win at-r" data-shot="1" id="record" aria-labelledby="record-h">
          <div className="copy">
            <Split as="h2" className="big" id="record-h">{RECORD.title}</Split>
            <p className="rule" data-rise>{RECORD.rule}</p>
          </div>
        </section>
        <section className="slab record" aria-label="Results">
          <p className="event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
          <ol className="results">
            {RECORD.results.map((r) => (
              <li key={r.who} data-rise>
                <span className="orb" aria-hidden="true" />
                <h3>{r.what}.</h3>
                <p><b>{r.who}</b> {r.more}</p>
              </li>
            ))}
          </ol>
          <p data-rise><A className="more" href={RECORD.more.href}>{RECORD.more.label}</A></p>
        </section>

        {/* 2. The drive: at rest, the first lit, seven in shadow. */}
        <section className="win" data-shot="2" id="drive" aria-labelledby="drive-h">
          <div className="copy">
            <Split as="h2" className="big" id="drive-h">{DRIVE.title}</Split>
            <p className="rule" data-rise>{DRIVE.lead}</p>
          </div>
        </section>
        <section className="slab drive" aria-label="What is in the drive">
          <ol className="items">
            {DRIVE.items.map((d) => (
              <li key={d.term} data-rise><h3>{d.term}</h3><p>{d.text}</p></li>
            ))}
          </ol>
          <p data-rise><A className="more" href={DRIVE.more.href}>{DRIVE.more.label}</A></p>
        </section>

        {/* 3. The people: two again, the lens low between the wires. */}
        <section className="win at-r" data-shot="3" id="people" aria-labelledby="people-h">
          <div className="copy">
            <Split as="h2" className="big" id="people-h">{PEOPLE.title}</Split>
            <p className="rule count" data-rise>{PEOPLE.count}</p>
          </div>
        </section>
        <section className="slab people" aria-label="The coaches">
          <ul className="coaches">
            {PEOPLE.coaches.map((c) => (
              <li key={c.name} data-rise>
                <p className="role">{c.role}</p>
                <h3>{c.name}</h3>
                <p className="bio">{c.bio}</p>
              </li>
            ))}
          </ul>
          <div className="eight" data-rise>
            <span className="row" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} />)}</span>
            <p>{PEOPLE.count}</p>
          </div>
          <p data-rise><A className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>
        </section>

        {/* 4. Join: three pulled, the lens comes round to the end of the row. */}
        <section className="win low" data-shot="4" id="join" aria-labelledby="join-h">
          <div className="copy">
            <Split as="h2" className="big" id="join-h">{JOIN.title}</Split>
            <p className="rule" data-rise>{JOIN.lead}</p>
          </div>
        </section>
        <section className="slab join" aria-label="Three ways in">
          <ol className="ways">
            {JOIN.paths.map((p) => (
              <li key={p.id} data-rise>
                <a className="way" href={p.href}>
                  <span className="orb" aria-hidden="true" />
                  <h3>{p.name}</h3>
                  <p className="line">{p.line}</p>
                  {p.text.map((t) => <p key={t} className="t">{t}</p>)}
                </a>
              </li>
            ))}
          </ol>
          <div className="after" data-rise>
            <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A></p>
            <p>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A></p>
            <p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
            <p>{JOIN.discord}</p>
          </div>
        </section>

        {/* 5. Everything comes to rest. */}
        <footer className="win end" data-shot="5" aria-label="Footer">
          <div className="copy">
            <Split as="p" className="last">{FOOTER.line}</Split>
            <ul className="links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
            <ul className="pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
            <p className="draft">Draft 2, version 73. Not the live site.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
