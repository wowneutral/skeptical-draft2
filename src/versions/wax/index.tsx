// Version 56: the wax. A question mark cast in bone white wax stands on black
// stone under a warm lamp. You are the heat: hold it and it slumps where you
// hold; scroll and the whole mark melts to a pool; at Join it draws itself
// back up, the same wax.
import { useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/index.css';
import './wax.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import MARKS from '@/lib/marks.json';
import { gsap } from '@/lib/scroll';
import { Split, useRise } from '@/lib/motion';
import { clamp, isPhone, smooth, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { makeWax, type Wax } from './engine';

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch { return false; }
}

/** The mark drawn flat, for a browser without WebGL. */
function FlatMark() {
  const m = MARKS.roman;
  return (
    <svg className="flatmark" viewBox="-560 -840 1120 1680" role="img" aria-label="A question mark">
      <path d={m.d} />
    </svg>
  );
}

export default function WaxPage() {
  useVersion('wax', { anchorOffset: isPhone() ? -Math.round(window.innerHeight * 0.42) - 8 : 0 });
  const root = useRef<HTMLDivElement>(null), stageRef = useRef<HTMLButtonElement>(null), canvasRef = useRef<HTMLCanvasElement>(null);
  const wax = useRef<Wax | null>(null);
  const [webgl] = useState(hasWebGL);
  const [phone, setPhone] = useState(isPhone);
  const [opened, setOpened] = useState(still || !webgl);
  const [held, setHeld] = useState(false);
  useRise(root);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // The wax itself.
  useEffect(() => {
    const c = canvasRef.current; if (!c || !webgl) return;
    let w: Wax;
    try { w = makeWax(c, { still, phone }); } catch { return; }
    wax.current = w;
    w.onOpen = () => setOpened(true);
    const t = setTimeout(() => setOpened(true), 3200);
    const ro = new ResizeObserver(() => w.resize()); ro.observe(c);
    return () => { clearTimeout(t); ro.disconnect(); w.dispose(); wax.current = null; };
  }, [webgl, phone]);

  // Scroll is time and heat: it melts slowly down the page, and runs backwards at Join.
  useEffect(() => {
    const el = root.current; if (!el || still || !webgl) return;
    let keys: [number, number][] = [], j0 = 0, j1 = 1;
    const top = (sel: string) => { const s = el.querySelector<HTMLElement>(sel); return s ? s.getBoundingClientRect().top + window.scrollY : 0; };
    const measure = () => {
      const vh = window.innerHeight;
      keys = [[0, 0], [top('[data-k="m"]'), 0.04], [top('#record'), 0.24], [top('#drive') + vh * 0.2, 0.5], [top('#people'), 0.72], [top('#people') + vh * 0.7, 1]];
      j0 = top('#join') - vh * 0.45; j1 = top('#join') + vh * 0.55;
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    document.fonts.ready.then(measure);
    const tick = () => {
      const y = window.scrollY + window.innerHeight * (isPhone() ? 0.72 : 0.5);
      let m = keys[keys.length - 1][1];
      for (let i = 0; i < keys.length - 1; i++) if (y < keys[i + 1][0]) { const [a, ma] = keys[i], [b, mb] = keys[i + 1]; m = ma + (mb - ma) * smooth(clamp((y - a) / Math.max(1, b - a))); break; }
      const rw = clamp((y - j0) / Math.max(1, j1 - j0));
      wax.current?.setMelt(m * (1 - smooth(rw)), rw);
      el.style.setProperty('--cold', rw.toFixed(3));
    };
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); ro.disconnect(); };
  }, [webgl, phone]);

  // The pointer is the heat. A mouse warms on press; a finger warms on a long press.
  useEffect(() => {
    const s = stageRef.current; if (!s || still || !webgl) return;
    let lp = 0, start: { x: number; y: number } | null = null, holding = false, id = -1;
    const local = (e: PointerEvent) => { const r = canvasRef.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const begin = (e: PointerEvent) => {
      const p = local(e);
      if (wax.current?.press(p.x, p.y)) { holding = true; setHeld(true); s.classList.add('is-hot'); try { s.setPointerCapture(id); } catch { /* fine */ } }
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      id = e.pointerId; start = local(e);
      if (e.pointerType === 'mouse') begin(e);
      else { clearTimeout(lp); lp = window.setTimeout(() => begin(e), 220); }
    };
    const move = (e: PointerEvent) => {
      const p = local(e);
      if (start && !holding && Math.hypot(p.x - start.x, p.y - start.y) > 10) clearTimeout(lp);
      const over = wax.current?.pointer(p.x, p.y, true) ?? false;
      s.classList.toggle('is-over', over || holding);
    };
    const up = () => { clearTimeout(lp); start = null; if (holding) { holding = false; s.classList.remove('is-hot'); wax.current?.release(); } };
    const leave = (e: PointerEvent) => { if (!holding) { const p = local(e); wax.current?.pointer(p.x, p.y, false); s.classList.remove('is-over'); } };
    const menu = (e: Event) => e.preventDefault();
    s.addEventListener('pointerdown', down); s.addEventListener('pointermove', move);
    s.addEventListener('pointerup', up); s.addEventListener('pointercancel', up); s.addEventListener('pointerleave', leave);
    s.addEventListener('contextmenu', menu);
    return () => { clearTimeout(lp); s.removeEventListener('pointerdown', down); s.removeEventListener('pointermove', move); s.removeEventListener('pointerup', up); s.removeEventListener('pointercancel', up); s.removeEventListener('pointerleave', leave); s.removeEventListener('contextmenu', menu); };
  }, [webgl, phone]);

  // Keyboard: hold Space or Enter on the wax; arrows move where the heat is.
  const onKey = (e: React.KeyboardEvent, down: boolean) => {
    const w = wax.current; if (!w || still) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (down && !e.repeat) { const k = w.keyPoint(); w.pressAt(k.x, k.y); setHeld(true); stageRef.current?.classList.add('is-hot'); }
      if (!down) { w.release(); stageRef.current?.classList.remove('is-hot'); }
      return;
    }
    const d: Record<string, [number, number]> = { ArrowLeft: [-0.06, 0], ArrowRight: [0.06, 0], ArrowUp: [0, 0.06], ArrowDown: [0, -0.06] };
    if (down && d[e.key]) { e.preventDefault(); w.moveKey(...d[e.key]); if (stageRef.current?.classList.contains('is-hot')) { const k = w.keyPoint(); w.pressAt(k.x, k.y); } }
  };

  const play = webgl && !still;
  return (
    <div className={`v-wax${opened ? ' is-open' : ''}${phone ? ' is-phone' : ''}${webgl ? '' : ' no-gl'}${held ? ' was-held' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>

      {webgl ? (
        <button
          type="button" className="stage" ref={stageRef}
          aria-label={play ? 'The wax. Hold Space to warm it; arrow keys move the heat.' : 'The wax, a question mark standing on stone.'}
          onKeyDown={(e) => onKey(e, true)} onKeyUp={(e) => onKey(e, false)} onBlur={() => { wax.current?.release(); stageRef.current?.classList.remove('is-hot'); }}
        >
          <canvas ref={canvasRef} aria-hidden="true" />
        </button>
      ) : (
        <div className="stage"><FlatMark /></div>
      )}

      <div className="field">
        <header className="top">
          <a className="brand" href="#top" aria-label="Skeptical, back to the top">Skeptical<i>?</i></a>
          <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
        </header>

        <main id="main">
          <section className="hero" id="top" aria-label={SITE.heading}>
            <h1 className="pitch">{HERO.pitch.map((l) => <span key={l}><span>{l}</span></span>)}</h1>
            <p className="statement">{HERO.statement.map((s) => <span key={s}>{s}</span>)}</p>
            <p className="doors">{HERO.doors.map((d, i) => <A key={d.href} className={i === 0 ? 'door main' : 'door'} href={d.href}>{d.label}</A>)}</p>
            {play && <p className="hint" aria-hidden="true">{phone ? 'Hold your finger on the wax.' : 'Press and hold the wax.'}</p>}
          </section>

          <section className="manifesto" data-k="m" aria-label="How the team works">
            {MANIFESTO.map((m) => <Split key={m} as="p" className="line" by="words" effect="blur">{m}</Split>)}
          </section>

          <section className="sec record" id="record">
            <Split as="h2" className="title" by="chars">{RECORD.title}</Split>
            <p className="lead" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
            <ul className="results">
              {RECORD.results.map((r) => (
                <li data-rise key={r.who}>
                  <h3>{r.what}</h3>
                  <p><b>{r.who}</b> {r.more}</p>
                </li>
              ))}
            </ul>
            <p data-rise><A className="more" href={RECORD.more.href}>{RECORD.more.label}</A></p>
          </section>

          <section className="sec drive" id="drive">
            <Split as="h2" className="title" by="chars">{DRIVE.title}</Split>
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <dl className="items">
              {DRIVE.items.map((it) => (
                <div className="item" data-rise key={it.term}>
                  <dt>{it.term}</dt>
                  <dd>{it.text}</dd>
                </div>
              ))}
            </dl>
            <p data-rise><A className="more" href={DRIVE.more.href}>{DRIVE.more.label}</A></p>
          </section>

          <section className="sec people" id="people">
            <Split as="h2" className="title" by="chars">{PEOPLE.title}</Split>
            <ul className="coaches">
              {PEOPLE.coaches.map((c) => (
                <li data-rise key={c.name}>
                  <h3>{c.name}</h3>
                  <p className="role">{c.role}</p>
                  <p className="bio">{c.bio}</p>
                </li>
              ))}
            </ul>
            <p className="count" data-rise>{PEOPLE.count}</p>
            <p data-rise><A className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>
          </section>

          <section className="sec join" id="join">
            <Split as="h2" className="title" by="chars">{JOIN.title}</Split>
            <p className="lead" data-rise>{JOIN.lead}</p>
            <ol className="paths">
              {JOIN.paths.map((p) => (
                <li className="path" data-rise key={p.id}>
                  <h3><A href={p.href}><span className="nm">{p.name}.</span><span className="ln">{p.line}</span></A></h3>
                  <ul>{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
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
        </main>

        <footer className="end">
          <p className="fline">{FOOTER.line}</p>
          <ul className="links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul className="pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <small>Draft 2, version 56. Not the live site.</small>
        </footer>
      </div>
    </div>
  );
}
