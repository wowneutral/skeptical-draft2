// Version 78: the domino. The impact chain as an object: nine bone tiles on black slate,
// each half again as big as the one before. Push the little one and it brings down the monument.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/wdth.css';
import './domino.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { Split, useRise } from '@/lib/motion';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { N, h, row } from './row';

const Stage = lazy(() => import('./Stage'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** The row drawn flat, for a browser without WebGL. */
function FlatRow() {
  const k = 26; let x = 8; const base = 300;
  const tiles = h.map((H, i) => { const hh = H * k, ww = hh * 0.16; const r = <rect key={i} x={x} y={base - hh} width={ww} height={hh} rx={ww * 0.16} className={i === 6 ? 'dark' : undefined} />; x += ww + hh * 0.5; return r; });
  return (
    <svg className="flatrow" viewBox={`0 0 ${x + 40} ${base + 10}`} role="img" aria-label="A row of nine dominoes, each half again as tall as the last.">
      <line x1="0" x2={x + 40} y1={base} y2={base} />
      {tiles}
    </svg>
  );
}

function Push({ i, label }: { i: number; label: string }) {
  return <button type="button" className="nudge" onClick={() => row.push(i)}>{label}</button>;
}

export default function Domino() {
  useVersion('domino');
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [gl] = useState(hasWebGL);
  const play = gl && !still;
  useRise(root);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // Measure where each shot sits, so the camera stands beside its tile when the shot is centred.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const measure = () => {
      const vh = window.innerHeight, sy = window.scrollY;
      const top = (q: string) => { const n = el.querySelector<HTMLElement>(q); if (!n) return null; const r = n.getBoundingClientRect(); return { t: r.top + sy, h: r.height }; };
      const keys: [number, number][] = [[0, 0], [vh * 0.45, 0.33]];
      for (let i = 1; i < N - 1; i++) {
        const s = top(`[data-shot="${i}"]`); if (!s) continue;
        const c = s.t + s.h / 2 - vh / 2;
        keys.push([c - vh * 0.42, i - 0.32], [c, i], [c + vh * 0.42, i + 0.33]);
      }
      const s8 = top(`[data-shot="${N - 1}"]`), j = top('#join'), e = top('[data-shot="10"]');
      if (s8 && j) {
        keys.push([s8.t + s8.h / 2 - vh / 2 - vh * 0.42, N - 1.32], [s8.t + s8.h / 2 - vh / 2, N - 1], [j.t - vh, 8.62], [j.t - vh * 0.05, 9], [j.t + j.h - vh, 9.04]);
      }
      if (e) { const c = e.t + e.h / 2 - vh / 2; keys.push([c - vh * 0.5, 9.55], [Math.min(c, document.documentElement.scrollHeight - vh), 10]); }
      keys.sort((a, b) => a[0] - b[0]);
      for (let i = 1; i < keys.length; i++) { if (keys[i][0] <= keys[i - 1][0]) keys[i][0] = keys[i - 1][0] + 1; if (keys[i][1] < keys[i - 1][1]) keys[i][1] = keys[i - 1][1]; }
      row.keys = keys;
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    window.addEventListener('resize', measure);
    document.fonts.ready.then(measure);
    const tm = setTimeout(measure, 900);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); clearTimeout(tm); };
  }, [phone]);

  const fields: { key: string; node: React.ReactNode; cls?: string; id?: string; label?: string }[] = [
    { key: 'm1', cls: 'say', label: 'How the team works', node: <Split as="p" className="line">{MANIFESTO[0]}</Split> },
    { key: 'm2', cls: 'say at-r', node: <Split as="p" className="line">{MANIFESTO[1]}</Split> },
    { key: 'm3', cls: 'say', node: <Split as="p" className="line">{MANIFESTO[2]}</Split> },
    { key: 'm4', cls: 'say at-r', node: <Split as="p" className="line">{MANIFESTO[3]}</Split> },
    {
      key: 'record', id: 'record', cls: 'sec', node: (
        <div className="pair">
          <div className="head"><Split as="h2" className="title">{RECORD.title}</Split><p className="lead" data-rise>{RECORD.rule}</p></div>
          <div className="body">
            <p className="event" data-rise><span>{RECORD.when}</span> {RECORD.name}, {RECORD.where}</p>
            <ul className="results">
              {RECORD.results.map((r) => <li data-rise key={r.who}><h3>{r.what}</h3><p><b>{r.who}</b> {r.more}</p></li>)}
            </ul>
            <p data-rise><A className="more" href={RECORD.more.href}>{RECORD.more.label}</A></p>
          </div>
        </div>
      ),
    },
    {
      key: 'drive', id: 'drive', cls: 'sec', node: (
        <div className="pair">
          <div className="head"><Split as="h2" className="title">{DRIVE.title}</Split><p className="lead" data-rise>{DRIVE.lead}</p></div>
          <div className="body">
            <dl className="kit">{DRIVE.items.map((d) => <div data-rise key={d.term}><dt>{d.term}</dt><dd>{d.text}</dd></div>)}</dl>
            <p data-rise><A className="more" href={DRIVE.more.href}>{DRIVE.more.label}</A></p>
          </div>
        </div>
      ),
    },
    {
      key: 'people', id: 'people', cls: 'sec', node: (
        <div className="pair">
          <div className="head"><Split as="h2" className="title">{PEOPLE.title}</Split><p className="lead" data-rise>{PEOPLE.count}</p></div>
          <div className="body">
            <ul className="coaches">{PEOPLE.coaches.map((c) => <li data-rise key={c.name}><h3>{c.name}</h3><p className="role">{c.role}</p><p>{c.bio}</p></li>)}</ul>
            <p data-rise><A className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className={`v-domino${phone ? ' is-phone' : ''}${gl ? '' : ' no-gl'}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      {gl && <div className="stage" aria-hidden="true"><Suspense fallback={null}><Stage key={phone ? 'p' : 'd'} phone={phone} /></Suspense></div>}

      <header className="top">
        <a className="brand" href="#top" aria-label="Skeptical, back to the top">Skeptical<span className="q" aria-hidden="true">?</span></a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
      </header>

      <main id="main">
        <section className="shot hero" data-shot="0" id="top" aria-label={SITE.heading}>
          <div className="copy">
            <Split as="h1" className="pitch" by="words" on="load" delay={0.9}>{HERO.pitch.join(' ')}</Split>
            <p className="statement">{HERO.statement.map((s) => <span key={s}>{s}</span>)}</p>
            <p className="doors">{HERO.doors.map((d) => <A key={d.href} href={d.href}>{d.label}</A>)}</p>
            {play && <button type="button" className="go" onClick={() => row.push(0)}><span className="tip" aria-hidden="true" />Push the small one.</button>}
          </div>
          {!gl && <FlatRow />}
        </section>

        {fields.map((fl, n) => {
          const i = n + 1;
          return (
            <div key={fl.key} className="pairing">
              <div className={`shot s${i}`} data-shot={i}>{play && <Push i={i} label="Push this tile." />}</div>
              <section className={`field ${fl.cls ?? ''}`} id={fl.id} aria-label={fl.label}>{fl.node}</section>
            </div>
          );
        })}

        <div className={`shot s${N - 1} tall`} data-shot={N - 1}>{play && <Push i={N - 1} label="Push the last one." />}</div>
        <section className="field join" id="join">
          <span className="dot" aria-hidden="true" />
          <div className="jhead">
            <Split as="h2" className="title">{JOIN.title}</Split>
            <p className="lead" data-rise>{JOIN.lead}</p>
          </div>
          <ol className="ways">
            {JOIN.paths.map((p) => (
              <li key={p.id} data-rise>
                <a href={p.href} rel="noopener"><span className="name">{p.name}</span><span className="what">{p.line}</span></a>
                <ul>{p.text.map((tx) => <li key={tx}>{tx}</li>)}</ul>
              </li>
            ))}
          </ol>
          <div className="after">
            <p data-rise>{JOIN.discord}</p>
            <p data-rise>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
            <p data-rise>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
          </div>
        </section>
      </main>

      <footer className="end">
        <div className="shot hero last" data-shot="10">
          <div className="copy">
            <p className="pitch">{FOOTER.line}</p>
            {play && <button type="button" className="go" onClick={() => row.push(0)}><span className="tip" aria-hidden="true" />Push it again.</button>}
          </div>
        </div>
        <div className="foot">
          <ul>{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul>{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <small>Draft 2, version 78. Not the live site.</small>
        </div>
      </footer>
    </div>
  );
}
