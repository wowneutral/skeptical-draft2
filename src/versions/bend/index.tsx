// Version 43: the bend. The oldest example in scepticism, as one still life:
// a straight steel rule in a glass of water looks broken at the surface.
// Lift it out and it is straight. That is the whole site.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/wght.css';
import './bend.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { isPhone, lerp, smooth, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { store } from './store';
import type { Cam } from './Scene';

const Scene = lazy(() => import('./Scene'));

// Where the camera stands for each part of the page (degrees round, degrees up, distance).
const CAMS: Record<string, Cam> = {
  hero: { az: -14, el: 7, d: 9.4 },
  m0: { az: 22, el: 5, d: 10.2 },
  m1: { az: 46, el: 9, d: 10 },
  m2: { az: 72, el: 6, d: 10.4 },
  m3: { az: 34, el: 4, d: 10 },
  record: { az: 0, el: 26, d: 12.2 },
  drive: { az: -36, el: 8, d: 10.4 },
  people: { az: -62, el: 6, d: 10.8 },
  join: { az: -22, el: 7, d: 10.6 },
  end: { az: -8, el: 5, d: 9.6 },
};

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

/** The glass and the rule as a line drawing, for a browser without WebGL. */
function Drawing({ lifted = false }: { lifted?: boolean }) {
  return (
    <svg className="drawing" viewBox="0 0 200 260" role="img" aria-label={lifted ? 'The rule out of the water, straight.' : 'A steel rule in a glass of water, looking broken at the surface.'}>
      <path className="gl" d="M58 92 L66 246 Q66 250 70 250 L130 250 Q134 250 134 246 L142 92" />
      <path className="wl" d="M62 160 L138 160" />
      {lifted
        ? <path className="rl" d="M28 86 L172 86" />
        : <><path className="rl" d="M120 22 L104 160" /><path className="rl" d="M94 160 L80 238" /></>}
    </svg>
  );
}

export default function Bend() {
  useVersion('bend');
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const live = webgl && !still;
  const [opened, setOpened] = useState(!live);
  const [out, setOut] = useState(false);
  const [ended, setEnded] = useState(false);
  useRise(root);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  useEffect(() => {
    store.out = false; store.held = false; store.lift = 0; store.lean = 1; store.auto = 0; store.opened = false; store.waves = [];
    store.onOut = (o) => setOut(o);
    return () => { store.onOut = null; };
  }, []);

  // Every frame: where the camera should be, and whether The record is being read.
  useEffect(() => {
    if (!live) return;
    const el = root.current; if (!el) return;
    const secs = Array.from(el.querySelectorAll<HTMLElement>('[data-cam]'));
    const rec = el.querySelector<HTMLElement>('#record');
    const t0 = performance.now();
    const tick = () => {
      if ((store.opened || performance.now() - t0 > 7000) && !el.classList.contains('is-open')) setOpened(true);
      const vh = window.innerHeight, c = vh * 0.5;
      const zones = secs.map((s) => {
        const r = s.getBoundingClientRect();
        let a = r.top + vh * 0.3, b = r.bottom - vh * 0.3;
        if (a > b) a = b = (r.top + r.bottom) / 2;
        return { a, b, cam: CAMS[s.dataset.cam!] };
      });
      let cam = zones[0].cam;
      if (c >= zones[zones.length - 1].b) cam = zones[zones.length - 1].cam;
      else for (let i = 0; i < zones.length; i++) {
        const z = zones[i];
        if (c < z.a) { if (i === 0) { cam = z.cam; break; } const p = zones[i - 1], t = smooth((c - p.b) / Math.max(1, z.a - p.b)); cam = { az: lerp(p.cam.az, z.cam.az, t), el: lerp(p.cam.el, z.cam.el, t), d: lerp(p.cam.d, z.cam.d, t) }; break; }
        if (c <= z.b) { cam = z.cam; break; }
      }
      store.az = cam.az; store.el = cam.el; store.d = cam.d;
      if (rec) {
        const r = rec.getBoundingClientRect();
        const on = r.top < vh * 0.55 && r.bottom > vh * 0.5;
        if (on && store.auto < 0.5) { store.out = false; setOut(false); }
        store.auto = on ? 1 : 0;
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [live]);

  const lift = (end = false) => {
    store.out = !store.out; setOut(store.out);
    if (end) setEnded(store.out);
  };

  return (
    <div className={`v-bend${opened ? ' is-open' : ''}${phone ? ' is-phone' : ''}${live ? ' is-live' : ' is-still'}${webgl ? '' : ' no-gl'}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      {live && <div className="stage" aria-hidden="true"><Suspense fallback={null}><Scene mode="live" phone={phone} /></Suspense></div>}
      {live && <div className="field" aria-hidden="true" />}

      <header className="top">
        <a className="brand" href="#top" aria-label="Skeptical, back to the top">Skeptical<i>?</i></a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
      </header>

      <main id="main">
        <section className="sec hero" data-cam="hero" id="top" aria-label={SITE.heading}>
          <div className="col">
            <h1 className="pitch"><span>{HERO.pitch[0]}</span> <em>{HERO.pitch[1]}</em></h1>
            <div className="grad" aria-hidden="true" />
            <p className="statement">{HERO.statement.map((s) => <span key={s}>{s}</span>)}</p>
            <p className="doors">{HERO.doors.map((d) => <A key={d.href} href={d.href}>{d.label}</A>)}</p>
            {live && (
              <p className="try">
                <button type="button" className="lift" aria-pressed={out} onClick={() => lift()}>{out ? 'Drop it back.' : 'Lift it out.'}</button>
                <span>{phone ? 'Or tap the rule.' : 'Or drag the rule up and lean it.'}</span>
              </p>
            )}
          </div>
          {!live && <div className="still">{webgl ? <Suspense fallback={null}><Scene mode="rest" phone={phone} /></Suspense> : <Drawing />}</div>}
        </section>

        {MANIFESTO.map((m, i) => (
          <section className="sec say" data-cam={`m${i}`} key={m} aria-label={i === 0 ? 'How the team works' : undefined}>
            <div className="col"><p className="line" data-rise>{m}</p></div>
          </section>
        ))}

        <section className="sec record" data-cam="record" id="record" aria-labelledby="record-h">
          <div className="col">
            <h2 className="title" id="record-h" data-rise>{RECORD.title}</h2>
            <div className="grad" aria-hidden="true" />
            <p className="rule" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ul className="results">
              {RECORD.results.map((r) => <li data-rise key={r.who}><h3>{r.what}</h3><p><b>{r.who}</b> {r.more}</p></li>)}
            </ul>
            <p data-rise><A className="more" href={RECORD.more.href}>{RECORD.more.label}</A></p>
          </div>
          {!live && <div className="still">{webgl ? <Suspense fallback={null}><Scene mode="lifted" phone={phone} /></Suspense> : <Drawing lifted />}</div>}
        </section>

        <section className="sec drive" data-cam="drive" id="drive" aria-labelledby="drive-h">
          <div className="col">
            <h2 className="title" id="drive-h" data-rise>{DRIVE.title}</h2>
            <div className="grad" aria-hidden="true" />
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <dl className="kit">
              {DRIVE.items.map((d) => <div data-rise key={d.term}><dt>{d.term}</dt><dd>{d.text}</dd></div>)}
            </dl>
            <p data-rise><A className="more" href={DRIVE.more.href}>{DRIVE.more.label}</A></p>
          </div>
        </section>

        <section className="sec people" data-cam="people" id="people" aria-labelledby="people-h">
          <div className="col">
            <h2 className="title" id="people-h" data-rise>{PEOPLE.title}</h2>
            <div className="grad" aria-hidden="true" />
            <ul className="coaches">
              {PEOPLE.coaches.map((c) => <li data-rise key={c.name}><h3>{c.name}</h3><p className="role">{c.role}</p><p>{c.bio}</p></li>)}
            </ul>
            <p className="lead" data-rise>{PEOPLE.count}</p>
            <p data-rise><A className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>
          </div>
        </section>

        <section className="sec join" data-cam="join" id="join" aria-labelledby="join-h">
          <div className="col">
            <h2 className="title" id="join-h" data-rise>{JOIN.title}</h2>
            <div className="grad" aria-hidden="true" />
            <p className="lead" data-rise>{JOIN.lead}</p>
            <ol className="ways">
              {JOIN.paths.map((p) => (
                <li key={p.id} data-rise>
                  <a href={p.href} rel="noopener"><span className="name">{p.name}</span><span className="what">{p.line}</span></a>
                  <ul>{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
                </li>
              ))}
            </ol>
            <div className="after">
              <p data-rise>{JOIN.discord}</p>
              <p data-rise>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
              <p data-rise>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
            </div>
          </div>
        </section>
      </main>

      <footer className="sec end" data-cam="end">
        <div className="col">
          {live && (
            <div className="once">
              <button type="button" className="lift big" aria-pressed={out} onClick={() => lift(true)}>{out ? 'Put it back.' : 'Lift it out once more.'}</button>
              <p className={`straight${ended && out ? ' is-on' : ''}`} aria-live="polite">{ended && out ? 'Straight. It always was.' : ' '}</p>
            </div>
          )}
          <p className="last">{FOOTER.line}</p>
          <ul className="links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul className="pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <small>Draft 2, version 43. Not the live site.</small>
        </div>
      </footer>
    </div>
  );
}
