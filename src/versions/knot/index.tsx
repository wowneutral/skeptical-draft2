// Version 58: the knot. A round is two cases tied together; the job is to undo it
// one crossing at a time without cutting anything. Two ropes, one knot, a paper sweep.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/archivo/wdth.css';
import './knot.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import MARKS from '@/lib/marks.json';
import { gsap } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { clamp, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { knot } from './store';

const Scene = lazy(() => import('./Scene'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** The mark as a flat drawing, for a browser with no WebGL. */
function FlatMark() {
  const m = MARKS.roman;
  return (
    <svg className="flat" viewBox={`0 0 ${m.w} ${m.h}`} role="img" aria-label="A question mark">
      <path d={m.d} />
    </svg>
  );
}

function Pull({ label }: { label: string }) {
  // The keyboard and button path for the pull: hold to pull, let go and it springs back.
  const down = () => { knot.hold = true; };
  const up = () => { knot.hold = false; };
  return (
    <button
      type="button" className="pull"
      onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); down(); } }}
      onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') up(); }}
      onBlur={up}
    >
      <span className="pull-line" aria-hidden />{label}
    </button>
  );
}

export default function Knot() {
  useVersion('knot');
  const root = useRef<HTMLDivElement>(null), jamRef = useRef<HTMLParagraphElement>(null);
  const [webgl] = useState(hasWebGL);
  const [low] = useState(() => isPhone());
  const [open, setOpen] = useState(still || !webgl);
  useRise(root);

  // The opening: the knot draws itself tight, then the words come in.
  useEffect(() => {
    if (still || !webgl) { knot.ready = true; return; }
    knot.ready = false;
    const t0 = setTimeout(() => { knot.ready = true; }, 900);
    const t1 = setTimeout(() => setOpen(true), 1500);
    return () => { clearTimeout(t0); clearTimeout(t1); };
  }, [webgl]);

  // Scroll sets the stage: one stage per section, held while you read it, eased between.
  useEffect(() => {
    const el = root.current; if (!el) return;
    // Each section holds its stage while the reading line is inside it; the gaps between sections are the travel.
    let spans: { a: number; b: number }[] = [];
    const line = () => (isPhone() ? window.innerHeight * 0.72 : window.innerHeight * 0.5);
    const measure = () => {
      const sy = window.scrollY;
      spans = Array.from(el.querySelectorAll<HTMLElement>('[data-stage]')).map((s) => { const r = s.getBoundingClientRect(); return { a: r.top + sy, b: r.bottom + sy }; });
      if (spans.length) { spans[0].a = -1e6; spans[spans.length - 1].b = 1e9; }
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    let lastJam = false, lastNear = false;
    const tick = () => {
      const y = window.scrollY + line();
      let f = 0;
      for (let i = 0; i < spans.length; i++) {
        const sp = spans[i], n = spans[i + 1];
        const a0 = n ? sp.b - Math.min(window.innerHeight * 0.2, (sp.b - sp.a) * 0.2) : Infinity;
        if (n && y >= a0 && y < n.a) { f = i + clamp((y - a0) / Math.max(1, n.a - a0)); break; }
        if (y >= sp.a && y <= sp.b) { f = i; break; }
      }
      knot.f = f;
      knot.phone = isPhone();
      const jamming = knot.jam && knot.give > 0.2;
      if (jamming !== lastJam) { lastJam = jamming; el.classList.toggle('is-jam', jamming); }
      if (knot.near !== lastNear) { lastNear = knot.near; el.classList.toggle('can-pull', lastNear); }
      el.style.setProperty('--give', Math.max(0, knot.give).toFixed(3));
      el.dataset.end = `${Math.round(knot.endPx.x)},${Math.round(knot.endPx.y)}`;
    };
    gsap.ticker.add(tick);
    window.addEventListener('resize', measure);
    document.fonts.ready.then(measure);
    return () => { gsap.ticker.remove(tick); ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  // The pull by hand: grab the loose end (mouse or finger) and drag it away.
  useEffect(() => {
    if (still || !webgl) return;
    const stageEl = root.current?.querySelector<HTMLElement>('.stage');
    const local = (e: PointerEvent) => { const r = stageEl?.getBoundingClientRect(); return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0), w: r?.width ?? innerWidth, h: r?.height ?? innerHeight }; };
    const nearEnd = (x: number, y: number) => Math.hypot(x - knot.endPx.x, y - knot.endPx.y) < (isPhone() ? 70 : 64);
    const interactive = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest?.('a, button, input, [data-text]');
    const move = (e: PointerEvent) => {
      const p = local(e);
      knot.pointer.x = p.x / p.w; knot.pointer.y = p.y / p.h; knot.pointer.in = p.y >= 0 && p.y <= p.h;
      if (knot.drag) { knot.drag = { x: p.x, y: p.y }; return; }
      knot.near = knot.shown < 4.5 && !interactive(e.target) && nearEnd(p.x, p.y);
    };
    const down = (e: PointerEvent) => {
      if (interactive(e.target) || knot.shown > 4.5) return;
      const p = local(e);
      // On a phone, a press anywhere on the knot's window is the pull.
      const onBand = isPhone() && p.y >= 0 && p.y <= p.h;
      if (!nearEnd(p.x, p.y) && !onBand) return;
      knot.drag = { x: p.x, y: p.y }; knot.near = true;
    };
    const up = () => { knot.drag = null; };
    const leave = () => { knot.pointer.in = false; };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    document.documentElement.addEventListener('pointerleave', leave);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); document.documentElement.removeEventListener('pointerleave', leave); };
  }, [webgl]);

  return (
    <div ref={root} className={`v-knot${open ? ' is-open' : ''}${webgl && !still ? ' has-3d' : ''}`}>
      <a className="skip-x" href="#main">Skip to the page</a>
      <div className="stage" aria-hidden={webgl ? true : undefined}>
        {webgl ? (
          <Suspense fallback={null}><Scene low={low} /></Suspense>
        ) : <FlatMark />}
      </div>
      <div className="veil" aria-hidden />

      <header className="top">
        <a className="brand" href="#main">{SITE.name}</a>
        <nav aria-label="Sections">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}
        </nav>
      </header>

      <main id="main">
        <section className="sec hero" data-stage="0" aria-labelledby="k-h1">
          <div className="col" data-text>
            <h1 id="k-h1" className="h1">
              <span className="sr-only-x">{SITE.heading}</span>
              <span aria-hidden className="pitch">{HERO.pitch.map((l) => <span key={l} className="pl">{l}</span>)}</span>
            </h1>
            <ul className="statement">{HERO.statement.map((l) => <li key={l}>{l}</li>)}</ul>
            <div className="doors">
              {HERO.doors.map((d, i) => <A key={d.label} href={d.href} className={`door${i === 0 ? ' door-1' : ''}`}><span>{d.label}</span><span className="arr" aria-hidden>→</span></A>)}
            </div>
          </div>
          {webgl && !still && <div className="hero-pull"><Pull label="Pull the loose end." /></div>}
        </section>

        <section className="sec manifesto" data-stage="1" aria-label="What we are">
          <div className="col" data-text>
            {MANIFESTO.map((l) => <p key={l} className="mline" data-rise>{l}</p>)}
          </div>
        </section>

        <section className="sec record" id="record" data-stage="2" aria-labelledby="k-record">
          <div className="col" data-text>
            <h2 id="k-record" className="h2" data-rise>{RECORD.title}</h2>
            <p className="rule" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ol className="results">
              {RECORD.results.map((r) => (
                <li key={r.who} data-rise>
                  <span className="what">{r.what}</span>
                  <span className="who">{r.who}</span>
                  <span className="more">{r.more}</span>
                </li>
              ))}
            </ol>
            <A href={RECORD.more.href} className="link">{RECORD.more.label}</A>
          </div>
        </section>

        <section className="sec drive" id="drive" data-stage="3" aria-labelledby="k-drive">
          <div className="col" data-text>
            <h2 id="k-drive" className="h2" data-rise>{DRIVE.title}</h2>
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <dl className="items">
              {DRIVE.items.map((it) => (
                <div key={it.term} className="item" data-rise><dt>{it.term}</dt><dd>{it.text}</dd></div>
              ))}
            </dl>
            <A href={DRIVE.more.href} className="link">{DRIVE.more.label}</A>
            {webgl && !still && (
              <div className="jam">
                <Pull label="Pull it." />
                <p ref={jamRef} className="jam-line" aria-live="polite">It only tightens.</p>
              </div>
            )}
          </div>
        </section>

        <section className="sec people" id="people" data-stage="4" aria-labelledby="k-people">
          <div className="col" data-text>
            <h2 id="k-people" className="h2" data-rise>{PEOPLE.title}</h2>
            {PEOPLE.coaches.map((c) => (
              <article key={c.name} className="coach" data-rise>
                <h3 className="cname">{c.name}</h3>
                <p className="role">{c.role}</p>
                <p className="bio">{c.bio}</p>
              </article>
            ))}
            <p className="count" data-rise>{PEOPLE.count}</p>
            <A href={PEOPLE.more.href} className="link">{PEOPLE.more.label}</A>
          </div>
        </section>

        <section className="sec join" id="join" data-stage="5" aria-labelledby="k-join">
          <div className="col wide" data-text>
            <h2 id="k-join" className="h2" data-rise>{JOIN.title}</h2>
            <p className="lead" data-rise>{JOIN.lead}</p>
            <ol className="paths">
              {JOIN.paths.map((p) => (
                <li key={p.id} className="path" data-rise>
                  <A href={p.href} className="pname"><span>{p.name}</span><span className="arr" aria-hidden>→</span></A>
                  <p className="pline">{p.line}</p>
                  <ul className="ptext">{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
                </li>
              ))}
            </ol>
            <div className="small">
              <p>{JOIN.already.before}<A href={JOIN.already.href} className="link-i">{JOIN.already.label}</A></p>
              <p>{JOIN.coach.before}<A href={JOIN.coach.href} className="link-i">{JOIN.coach.label}</A></p>
              <p>{JOIN.also} <A href={`mailto:${SITE.email}`} className="link-i">{SITE.email}</A></p>
              <p>{JOIN.discord}</p>
            </div>
          </div>
        </section>

        <div className="sec ending" data-stage="6" aria-hidden />
      </main>

      <footer className="foot">
        <p className="fline">{FOOTER.line}</p>
        <ul className="flinks">{FOOTER.links.map((l) => <li key={l.label}><A href={l.href}>{l.label}</A></li>)}</ul>
        <ul className="fpages">{FOOTER.pages.map((l) => <li key={l.label}><A href={l.href}>{l.label}</A></li>)}</ul>
        <p className="draft">Draft 2, version 58. Not the live site.</p>
      </footer>
    </div>
  );
}
