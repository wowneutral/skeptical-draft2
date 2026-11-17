// Version 95: the facade. A white plaster temple front that is only a front:
// turn it and it is one finger thick, held up from behind by black steel props.
// The fake barn case as a museum model. Scroll walks the camera round it.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/standard.css';
import './facade.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { useRise } from '@/lib/motion';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { store, type Pose } from './store';
import meta from './meta';

const Scene = lazy(() => import('./Scene'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

const P = (yaw: number, el: number, zoom: number): Pose => ({ yaw, el, zoom });
/** Where the camera stands for each section: front, edge on, behind, far side, front again, above. */
const POSES: Record<string, Pose> = {
  hero: P(0, 3, 1.12),
  m0: P(58, 3, 1.08),
  m1: P(76, 3, 1.14),
  m2: P(86, 3, 1.18),
  m3: P(90, 3.5, 1.2),
  record: P(162, 5, 1.22),
  drive: P(205, 22, 1.1),
  people: P(268, 4, 1.12),
  join: P(384, 3, 1.04),
  end: P(412, 22, 0.96),
};
const HOLD = new Set(['hero', 'record', 'drive', 'people', 'join', 'end']);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** The model as a line drawing, for a browser with no WebGL: the front, and the same thing from the side. */
function Flat() {
  const cols = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5];
  return (
    <svg className="fc-flat" viewBox="-4 -6 13 6.6" role="img" aria-label="A temple front, and the same front from the side: one thin board held up by props.">
      <g transform="scale(1,-1)" fill="none" stroke="currentColor" strokeWidth="0.03">
        <rect x="-3.3" y="0" width="6.6" height="0.14" /><rect x="-3.15" y="0.14" width="6.3" height="0.14" /><rect x="-3" y="0.28" width="6" height="0.14" />
        {cols.map((x) => <path key={x} d={`M${x - 0.23} 0.42 L${x - 0.19} 3.14 L${x + 0.19} 3.14 L${x + 0.23} 0.42 M${x - 0.32} 3.29 L${x + 0.32} 3.29 L${x + 0.32} 3.41 L${x - 0.32} 3.41 Z`} />)}
        <rect x="-2.96" y="3.41" width="5.92" height="0.7" /><rect x="-3.1" y="4.11" width="6.2" height="0.17" />
        <path d="M-3.07 4.28 L3.07 4.28 L0 5.3 Z" />
        <path d="M6 0 L6 5.3 M6 3.2 L4.6 0 M6 0.05 L4.6 0.05" />
      </g>
    </svg>
  );
}

export default function Facade() {
  const [phone] = useState(isPhone);
  useVersion('facade', { anchorOffset: phone ? Math.round(-0.02 * window.innerHeight) : 0 });
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLButtonElement>(null);
  const [webgl] = useState(hasWebGL);
  const [touched, setTouched] = useState(false);
  useRise(root);

  /** A column pressed: its prop gives, and from near the front the camera glances round to show why. */
  const knock = useRef((i: number) => {
    store.knocks.push(i); store.touched = true; setTouched(true);
    if (!still && Math.abs(store.drag) < 8) { store.drag += i < 3 ? -20 : 20; store.dragAt = performance.now(); }
  }).current;

  // Camera keys from where each section actually sits.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const measure = () => {
      const vh = window.innerHeight;
      const keys: typeof store.keys = [];
      el.querySelectorAll<HTMLElement>('[data-k]').forEach((n) => {
        const k = n.dataset.k!; const p = POSES[k]; if (!p) return;
        const r = n.getBoundingClientRect();
        const top = r.top + window.scrollY, bottom = top + r.height;
        if (k === 'hero') { keys.push({ y: 0, p }, { y: Math.max(1, bottom - vh * 0.75), p }); return; }
        const y0 = Math.max(1, top - vh * (phone ? 0.75 : 0.55));
        keys.push({ y: y0, p });
        if (HOLD.has(k)) keys.push({ y: Math.max(y0 + 1, bottom - vh * 0.85), p });
      });
      keys.sort((a, b) => a.y - b.y);
      store.keys = keys;
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    document.fonts.ready.then(measure);
    return () => ro.disconnect();
  }, [phone]);

  // Pointer moves the key light; drag on the model turns it; a press on a column knocks its prop.
  useEffect(() => {
    const mv = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      store.px = (e.clientX / window.innerWidth) * 2 - 1;
      store.py = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', mv, { passive: true });
    const s = stage.current;
    let down: { x: number; y: number; d: number; id: number } | null = null;
    const pd = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY, d: store.drag, id: e.pointerId }; };
    const pm = (e: PointerEvent) => {
      if (!down || e.pointerId !== down.id) return;
      const dx = e.clientX - down.x;
      if (!store.dragging && Math.abs(dx) > 6) { store.dragging = true; store.touched = true; setTouched(true); try { s?.setPointerCapture(e.pointerId); } catch { /* ignore */ } }
      if (store.dragging) { store.drag = Math.max(-170, Math.min(170, down.d + dx * (phone ? 0.5 : 0.28))); store.dragAt = performance.now(); }
    };
    const pu = (e: PointerEvent) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      if (!store.dragging && moved < 8 && store.hover >= 0) knock(store.hover);
      if (e.pointerType !== 'mouse') store.hover = -1;
      store.dragging = false; store.dragAt = performance.now(); down = null;
    };
    const pc = () => { store.dragging = false; down = null; };
    s?.addEventListener('pointerdown', pd); s?.addEventListener('pointermove', pm); s?.addEventListener('pointerup', pu); s?.addEventListener('pointercancel', pc);
    return () => {
      window.removeEventListener('pointermove', mv);
      s?.removeEventListener('pointerdown', pd); s?.removeEventListener('pointermove', pm); s?.removeEventListener('pointerup', pu); s?.removeEventListener('pointercancel', pc);
    };
  }, [phone]);

  const key = (e: React.KeyboardEvent) => {
    const n = Number(e.key);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      store.drag = Math.max(-170, Math.min(170, store.drag + (e.key === 'ArrowLeft' ? -15 : 15)));
      store.dragAt = performance.now(); store.touched = true; setTouched(true);
    } else if (n >= 1 && n <= 6) knock(n - 1);
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); knock(2 + Math.round(Math.random())); }
  };

  return (
    <div className="v-facade" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <button ref={stage} type="button" className="fc-stage" onKeyDown={key}
        aria-label="A plaster temple front on stone, one finger thick and propped from behind. Arrow keys turn it. Enter or 1 to 6 press a column.">
        {webgl ? <Suspense fallback={null}><Scene /></Suspense> : <Flat />}
      </button>
      <span className={'fc-cue' + (touched ? ' gone' : '')} aria-hidden>{phone ? 'Drag sideways. Tap a column.' : 'Drag to walk round. Press a column.'}</span>

      <main id="main" className="fc-col">
        <header className="fc-sec fc-hero" data-k="hero">
          <p className="fc-mark">{SITE.name}<span>?</span></p>
          <h1 className="fc-h1"><span className="sr-only-x">{SITE.heading}. </span>
            {HERO.pitch.map((l) => <span key={l} className="ln" aria-hidden>{l}</span>)}
          </h1>
          <ul className="fc-state">{HERO.statement.map((l) => <li key={l}>{l}</li>)}</ul>
          <div className="fc-doors">
            {HERO.doors.map((d, i) => <A key={d.href} href={d.href} className={'fc-btn' + (i ? ' alt' : '')}>{d.label}</A>)}
          </div>
        </header>

        <section className="fc-sec fc-man" aria-label="What we are">
          <p className="fc-eye">Edge on.</p>
          {MANIFESTO.map((l, i) => (
            <p key={l} className="fc-mline" data-k={'m' + i} data-rise><span className="n">{String(i + 1).padStart(2, '0')}</span>{l}</p>
          ))}
        </section>

        <section className="fc-sec" id="record" data-k="record" aria-labelledby="h-record">
          <p className="fc-eye">From behind.</p>
          <h2 id="h-record" className="fc-h2">{RECORD.title}</h2>
          <p className="fc-lead">{RECORD.rule}</p>
          <p className="fc-event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
          <ol className="fc-results">
            {RECORD.results.map((r) => (
              <li key={r.who} data-rise><span className="what">{r.what}</span><span className="who">{r.who}</span><span className="more">{r.more}</span></li>
            ))}
          </ol>
          <A className="fc-more" href={RECORD.more.href}>{RECORD.more.label}</A>
        </section>

        <section className="fc-sec" id="drive" data-k="drive" aria-labelledby="h-drive">
          <p className="fc-eye">What holds it up.</p>
          <h2 id="h-drive" className="fc-h2">{DRIVE.title}</h2>
          <p className="fc-lead">{DRIVE.lead}</p>
          <dl className="fc-drive">
            {DRIVE.items.map((d) => <div key={d.term} data-rise><dt>{d.term}</dt><dd>{d.text}</dd></div>)}
          </dl>
          <A className="fc-more" href={DRIVE.more.href}>{DRIVE.more.label}</A>
        </section>

        <section className="fc-sec" id="people" data-k="people" aria-labelledby="h-people">
          <p className="fc-eye">The far side.</p>
          <h2 id="h-people" className="fc-h2">{PEOPLE.title}</h2>
          {PEOPLE.coaches.map((c) => (
            <div key={c.name} className="fc-coach" data-rise>
              <h3>{c.name}</h3><p className="role">{c.role}</p><p>{c.bio}</p>
            </div>
          ))}
          <p className="fc-count" data-rise>{PEOPLE.count}</p>
          <A className="fc-more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A>
        </section>

        <section className="fc-sec" id="join" data-k="join" aria-labelledby="h-join">
          <p className="fc-eye">Back at the front.</p>
          <h2 id="h-join" className="fc-h2">{JOIN.title}</h2>
          <p className="fc-lead">{JOIN.lead}</p>
          <div className="fc-paths">
            {JOIN.paths.map((p) => (
              <A key={p.id} href={p.href} className="fc-path">
                <span className="nm">{p.name}</span>
                <span className="line">{p.line}</span>
                {p.text.map((t) => <span key={t} className="tx">{t}</span>)}
                <span className="go" aria-hidden>Apply</span>
              </A>
            ))}
          </div>
          <p className="fc-small">{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
          <p className="fc-small">{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
          <p className="fc-small">{JOIN.discord}</p>
        </section>

        <footer className="fc-sec fc-foot" data-k="end">
          <p className="fc-eye">Both at once.</p>
          <p className="fc-fline">{FOOTER.line}</p>
          <ul className="fc-links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul className="fc-pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <p className="fc-draft">Draft 2, version {meta.n}. Not the live site.</p>
        </footer>
      </main>
    </div>
  );
}
