// Version 33: the plaster. SKEPTICAL? cast as a deep relief in a plaster wall.
// One raking light swings round it as you scroll, so the word exists only as light
// and shadow; the sections sit in the bare wall below it. At Join the light comes
// straight on and the word all but disappears, leaving the three ways in.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/instrument-sans/wdth.css';
import './plaster.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { useRise } from '@/lib/motion';
import { coarse, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { store, type Frame } from './store';
import { layout } from './geo';
import GLYPHS from './glyphs.json';

const Scene = lazy(() => import('./Scene'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

const f = (ax: number, ay: number, sx: number, sy: number, s: number, az: number, el: number, band: number): Frame => ({ ax, ay, sx, sy, s, az, el, band });

/** Where the relief sits and where the light stands, section by section. */
const WIDE: Record<string, Frame> = {
  hero: f(0.5, 0.5, 0.5, 0.33, 0.92, 172, 15, 0.62),
  m0: f(0.5, 0.5, 0.5, 0.25, 0.84, 160, 16, 0.46),
  m1: f(0.5, 0.5, 0.5, 0.25, 0.84, 92, 16, 0.46),
  m2: f(0.5, 0.5, 0.5, 0.25, 0.84, 6, 16, 0.46),
  m3: f(0.5, 0.5, 0.5, 0.25, 0.84, -86, 17, 0.46),
  record: f(0.47, 0.0, 0.5, 0.31, 2.5, -38, 18, 0.36),
  drive: f(0.08, 0.12, 0.3, 0.22, 3.8, 220, 17, 0.28),
  people: f(1.0, 0.5, 1.06, 0.16, 1.7, -140, 18, 0.34),
  join: f(0.5, 0.5, 0.5, 0.2, 0.86, 90, 74, 0.36),
  end: f(0.5, 0.5, 0.5, 0.2, 0.86, 90, 88, 0.36),
};
const NARROW: Record<string, Frame> = {
  hero: f(0.5, 0.5, 0.47, 0.27, 0.86, 172, 15, 0.52),
  m0: f(0.5, 0.5, 0.5, 0.2, 0.84, 160, 16, 0.38),
  m1: f(0.5, 0.5, 0.5, 0.2, 0.84, 92, 16, 0.38),
  m2: f(0.5, 0.5, 0.5, 0.2, 0.84, 6, 16, 0.38),
  m3: f(0.5, 0.5, 0.5, 0.2, 0.84, -86, 17, 0.38),
  record: f(0.98, 0.0, 0.98, 0.22, 2.3, -38, 18, 0.27),
  drive: f(0.04, 0.0, 0.06, 0.19, 2.7, 220, 17, 0.23),
  people: f(0.55, 0.0, 0.5, 0.22, 1.5, -140, 18, 0.26),
  join: f(0.5, 0.5, 0.5, 0.17, 0.8, 90, 74, 0.3),
  end: f(0.5, 0.5, 0.5, 0.15, 0.8, 90, 88, 0.34),
};
/** Keys that hold while their section is read; the manifesto lines flow into each other instead. */
const HOLD = new Set(['hero', 'record', 'drive', 'people', 'join']);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** The word as flat type, for a browser with no WebGL. */
function FlatWord({ phone }: { phone: boolean }) {
  const L = layout(phone);
  return (
    <svg className="pl-flat" viewBox={`-40 ${-L.h * 1000 - 40} ${L.w * 1000 + 80} ${L.h * 1000 + 80}`} role="img" aria-label="Skeptical?">
      {L.glyphs.map((g, i) => <path key={i} d={GLYPHS.glyphs[i].d} transform={`translate(${g.dx} ${-g.dy})`} />)}
    </svg>
  );
}

export default function Plaster() {
  const [phone] = useState(isPhone);
  const frames = phone ? NARROW : WIDE;
  useVersion('plaster', { anchorOffset: Math.round((phone ? 0.3 : 0.36) * window.innerHeight) });
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [way, setWay] = useState(-1);
  const [lit, setLit] = useState(still);
  useRise(root);

  // Keyframes from where each section actually sits on the page.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const measure = () => {
      const vh = window.innerHeight;
      const keys: typeof store.keys = [];
      el.querySelectorAll<HTMLElement>('[data-k]').forEach((n) => {
        const k = n.dataset.k!; const fr = frames[k]; if (!fr) return;
        const r = n.getBoundingClientRect();
        const top = r.top + window.scrollY, bottom = top + r.height;
        if (k === 'hero') { keys.push({ y: 0, f: fr }, { y: vh * 0.2, f: fr }); return; }
        const y0 = Math.max(0, top - vh * 0.62);
        keys.push({ y: y0, f: fr });
        if (HOLD.has(k)) keys.push({ y: Math.max(y0 + 1, bottom - vh * 0.95), f: fr });
      });
      keys.sort((a, b) => a.y - b.y);
      store.keys = keys;
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    document.fonts.ready.then(measure);
    return () => ro.disconnect();
  }, [frames]);

  // The pointer moves the light a little; on touch, a drag across the wall does.
  useEffect(() => {
    if (still) return;
    const mv = (e: PointerEvent) => {
      if (e.pointerType === 'touch' && !coarse) return;
      store.px = (e.clientX / window.innerWidth) * 2 - 1;
      store.py = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const leave = () => { store.px = 0; store.py = 0; };
    window.addEventListener('pointermove', mv, { passive: true });
    window.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') leave(); });
    document.addEventListener('pointerleave', leave);
    const t = setTimeout(() => setLit(true), 2600);
    return () => { window.removeEventListener('pointermove', mv); document.removeEventListener('pointerleave', leave); clearTimeout(t); };
  }, []);

  useEffect(() => { store.way = way; }, [way]);
  useEffect(() => () => { store.way = -1; store.hold.az = 0; store.hold.el = 0; }, []);

  // The wall takes the arrow keys while it has focus.
  const onKey = (e: React.KeyboardEvent) => {
    const h = store.hold;
    if (e.key === 'ArrowLeft') h.az = Math.min(80, h.az + 14);
    else if (e.key === 'ArrowRight') h.az = Math.max(-80, h.az - 14);
    else if (e.key === 'ArrowUp') h.el = Math.min(30, h.el + 4);
    else if (e.key === 'ArrowDown') h.el = Math.max(-4, h.el - 4);
    else if (e.key === 'Home') { h.az = 0; h.el = 0; }
    else return;
    e.preventDefault();
  };

  const live3d = webgl;
  const heroBand = (still || !webgl ? (phone ? 0.42 : 0.6) : frames.hero.band) * 100;

  return (
    <div ref={root} className={`v-plaster${live3d && !still ? ' is-live' : ''}${lit ? ' is-lit' : ''}`} style={{ ['--hero' as string]: heroBand + 'vh' }}>
      <a className="skip-x" href="#main">Skip to content</a>
      {live3d ? (
        <div className="pl-stage" aria-hidden>
          <Suspense fallback={null}><Scene /></Suspense>
        </div>
      ) : (
        <div className="pl-stage pl-stage-flat"><FlatWord phone={phone} /></div>
      )}

      <section className="pl-relief" aria-label="The relief">
        <div
          className="pl-wall" tabIndex={0} role="img" onKeyDown={onKey}
          aria-label="Skeptical? cast in plaster. Use the arrow keys to move the light."
        />
      </section>
      <main id="main" className="pl-main">
        <header className="pl-hero" data-k="hero">
          <h1 className="sr-only-x">{SITE.heading}</h1>
          <div className="pl-hero-text">
            <p className="pl-pitch" data-rise>{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</p>
            <div className="pl-hero-side" data-rise>
              <p className="pl-statement">{HERO.statement.map((l) => <span key={l}>{l}</span>)}</p>
              <div className="pl-doors">
                {HERO.doors.map((d) => <A key={d.href} className="pl-door" href={d.href}>{d.label}</A>)}
              </div>
            </div>
          </div>
          <p className="pl-hint" aria-hidden>{coarse ? 'Drag sideways. The light follows.' : 'Move the pointer. The light follows.'}</p>
        </header>

        <section className="pl-manifesto" aria-label="What we are">
          {MANIFESTO.map((l, i) => (
            <p key={i} className="pl-line" data-k={'m' + i}><span data-rise>{l}</span></p>
          ))}
        </section>

        <section id="record" className="pl-sec pl-record" data-k="record" aria-labelledby="pl-record-h">
          <h2 id="pl-record-h" className="pl-h2" data-rise>{RECORD.title}</h2>
          <p className="pl-rule" data-rise>{RECORD.rule}</p>
          <p className="pl-event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
          <ol className="pl-results">
            {RECORD.results.map((r) => (
              <li key={r.who} data-rise>
                <span className="pl-who">{r.who}</span>
                <span className="pl-what">{r.what}</span>
                <span className="pl-more">{r.more}</span>
              </li>
            ))}
          </ol>
          <A className="pl-link" href={RECORD.more.href}>{RECORD.more.label}</A>
        </section>

        <section id="drive" className="pl-sec pl-drive" data-k="drive" aria-labelledby="pl-drive-h">
          <h2 id="pl-drive-h" className="pl-h2" data-rise>{DRIVE.title}</h2>
          <p className="pl-lead" data-rise>{DRIVE.lead}</p>
          <dl className="pl-items">
            {DRIVE.items.map((it) => (
              <div key={it.term} className="pl-item" data-rise>
                <dt>{it.term}</dt>
                <dd>{it.text}</dd>
              </div>
            ))}
          </dl>
          <A className="pl-link" href={DRIVE.more.href}>{DRIVE.more.label}</A>
        </section>

        <section id="people" className="pl-sec pl-people" data-k="people" aria-labelledby="pl-people-h">
          <h2 id="pl-people-h" className="pl-h2" data-rise>{PEOPLE.title}</h2>
          <div className="pl-coaches">
            {PEOPLE.coaches.map((c) => (
              <article key={c.name} className="pl-coach" data-rise>
                <h3>{c.name}</h3>
                <p className="pl-role">{c.role}</p>
                <p>{c.bio}</p>
              </article>
            ))}
          </div>
          <p className="pl-count" data-rise>{PEOPLE.count}</p>
          <A className="pl-link" href={PEOPLE.more.href}>{PEOPLE.more.label}</A>
        </section>

        <section id="join" className="pl-sec pl-join" data-k="join" aria-labelledby="pl-join-h">
          <h2 id="pl-join-h" className="pl-h2" data-rise>{JOIN.title}</h2>
          <p className="pl-lead" data-rise>{JOIN.lead}</p>
          <div className="pl-ways">
            {JOIN.paths.map((p, i) => (
              <div key={p.id} className={`pl-way${way === i ? ' is-on' : ''}${way >= 0 && way !== i ? ' is-off' : ''}`} data-rise>
                <button type="button" className="pl-way-name" aria-pressed={way === i} onClick={() => setWay(way === i ? -1 : i)}
                  onMouseEnter={() => { if (!coarse) store.way = i; }} onMouseLeave={() => { if (!coarse) store.way = way; }}>
                  {p.name}
                </button>
                <p className="pl-way-line">{p.line}</p>
                <ul className="pl-way-text">{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
                <A className="pl-link" href={p.href}>{p.name}: open the page.</A>
              </div>
            ))}
          </div>
          <div className="pl-already" data-rise>
            <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>.</p>
            <p>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
            <p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
            <p>{JOIN.discord}</p>
          </div>
        </section>

        <footer className="pl-foot" data-k="end">
          <p className="pl-foot-line">{FOOTER.line}</p>
          <ul className="pl-foot-links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul className="pl-foot-pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <p className="pl-small">Draft 2, version 33. Not the live site. Set in Bodoni Moda and Instrument Sans.</p>
        </footer>
      </main>
    </div>
  );
}
