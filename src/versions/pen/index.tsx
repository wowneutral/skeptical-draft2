// Version 24: the pen. One gel pen in 3D over a desk-sized sheet of notes.
// Flick it and it spins; when the page needs a heading, it flies down and writes it.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import '@fontsource/caveat/500.css';
import '@fontsource/caveat/700.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import './pen.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { clamp, isPhone, smooth, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { INKS, rig, spendInk, type Trick } from './rig';
import { writer } from './ink';
import { InkWord, Mark } from './parts';
import { click as sClick, land as sLand, scratch as sScratch, soundOff, soundOn, whoosh as sWhoosh } from './sound';

const Scene = lazy(() => import('./Scene'));
const CALLS: Record<Trick, string> = { flat: 'Flat spin.', around: 'Around the thumb.', drop: 'Dropped it.' };

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

/** Split a content string around one phrase it contains, so the phrase can be marked. */
function around(s: string, phrase: string) {
  const i = s.indexOf(phrase);
  return i < 0 ? null : [s.slice(0, i), phrase, s.slice(i + phrase.length)] as const;
}

/* ───────────────────────── the visitor's own corner of the paper ───────────────────────── */

const pad = { active: false, down: false };

function Pad({ ink }: { ink: number }) {
  const box = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null);
  const cur = useRef<{ path: SVGPathElement; pts: [number, number][] } | null>(null);
  const kb = useRef<[number, number] | null>(null);
  const off = useRef<ReturnType<typeof setTimeout>>(undefined);
  const local = (e: { clientX: number; clientY: number }) => { const r = box.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as [number, number]; };
  const nib = (x: number, y: number, lift: number) => { const r = box.current!.getBoundingClientRect(); Object.assign(rig.nib, { x: r.left + x, y: r.top + y, lift, len: isPhone() ? 300 : 420 }); };
  const start = (p: [number, number]) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke', INKS[rig.ink].c);
    svg.current!.append(path);
    cur.current = { path, pts: [p] };
    path.setAttribute('d', `M${p[0]} ${p[1]}l0.1 0`);
  };
  const extend = (p: [number, number]) => {
    const c = cur.current; if (!c) return;
    const l = c.pts[c.pts.length - 1], d = Math.hypot(p[0] - l[0], p[1] - l[1]);
    if (d < 1.5) return;
    c.pts.push(p); spendInk(d);
    let s = `M${c.pts[0][0]} ${c.pts[0][1]}`;
    for (let i = 1; i < c.pts.length - 1; i++) { const m = [(c.pts[i][0] + c.pts[i + 1][0]) / 2, (c.pts[i][1] + c.pts[i + 1][1]) / 2]; s += `Q${c.pts[i][0]} ${c.pts[i][1]} ${m[0]} ${m[1]}`; }
    s += `L${p[0]} ${p[1]}`;
    c.path.setAttribute('d', s);
  };
  const enter = () => { clearTimeout(off.current); pad.active = true; };
  const leave = (delay = 0) => { clearTimeout(off.current); off.current = setTimeout(() => { pad.active = false; pad.down = false; }, delay); };

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    box.current!.setPointerCapture(e.pointerId);
    enter(); pad.down = true;
    const p = local(e); start(p); nib(p[0], p[1], 0);
  };
  const onMove = (e: React.PointerEvent) => {
    const p = local(e);
    if (pad.down) { extend(p); nib(p[0], p[1], 0); }
    else if (e.pointerType === 'mouse') { enter(); nib(p[0], p[1], 34); }
  };
  const onUp = (e: React.PointerEvent) => { pad.down = false; cur.current = null; const p = local(e); nib(p[0], p[1], 34); if (e.pointerType !== 'mouse') leave(900); };
  const onKey = (e: React.KeyboardEvent) => {
    const d: Record<string, [number, number]> = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
    if (!d[e.key]) return;
    e.preventDefault();
    const r = box.current!.getBoundingClientRect();
    if (!kb.current) { kb.current = [r.width / 2, r.height / 2]; start(kb.current); }
    const p: [number, number] = [clamp(kb.current[0] + d[e.key][0], 8, r.width - 8), clamp(kb.current[1] + d[e.key][1], 8, r.height - 8)];
    kb.current = p; extend(p); enter(); nib(p[0], p[1], 0);
  };
  const clear = () => { svg.current?.querySelectorAll('path').forEach((p) => p.remove()); kb.current = null; cur.current = null; };
  useEffect(() => () => { clearTimeout(off.current); pad.active = false; }, []);

  return (
    <div className="pn-padwrap">
      <div className="pn-padhead">
        <p className="pn-hand pn-padnote">Your turn. Draw here.</p>
        <button type="button" className="pn-chip" onClick={clear}>Clear</button>
      </div>
      <Mark kind="box" id="pad-box" className="pn-padmark" th={3} at={0.75} speed={2200} pen={460}>
        <div
          ref={box} className="pn-pad" role="application" tabIndex={0}
          aria-label="Drawing area. Drag to draw with the pen, or use the arrow keys."
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
          onPointerLeave={(e) => { if (e.pointerType === 'mouse' && !pad.down) leave(0); }}
          onFocus={() => { if (box.current?.matches(':focus-visible')) { enter(); const r = box.current.getBoundingClientRect(); nib(kb.current?.[0] ?? r.width / 2, kb.current?.[1] ?? r.height / 2, 30); } }}
          onBlur={() => { leave(0); kb.current = null; }}
          onKeyDown={onKey}
          style={{ ['--pad-ink' as string]: INKS[ink].c }}
        >
          <svg ref={svg} className="pn-padsvg" aria-hidden="true" />
        </div>
      </Mark>
    </div>
  );
}

/* ───────────────────────── the page ───────────────────────── */

export default function PenPage() {
  useVersion('pen');
  const root = useRef<HTMLDivElement>(null);
  const grab = useRef<HTMLButtonElement>(null), knob = useRef<HTMLButtonElement>(null), hint = useRef<HTMLDivElement>(null);
  const mapView = useRef<HTMLSpanElement>(null);
  const [webgl] = useState(hasWebGL);
  const [ink, setInk] = useState(0);
  const [sound, setSound] = useState(false);
  const [retracted, setRetracted] = useState(false);
  const [level, setLevel] = useState(100);
  const [more, setMore] = useState(false);
  const [called, setCalled] = useState<{ n: number; t: string } | null>(null);
  useRise(root);

  // Wire the scene's events to sound and to the controls.
  useEffect(() => {
    rig.webgl = webgl; rig.ink = 0; rig.level = [1, 1, 1]; rig.retracted = false; rig.cmds.length = 0; rig.want = 'hold';
    rig.on.click = (r) => { setRetracted(r); sClick(r); };
    rig.on.land = (h) => sLand(h);
    rig.on.whoosh = (w) => sWhoosh(w);
    writer.onWrite = (d) => sScratch(d);
    writer.instant = still;
    writer.enabled = false;
    let live = true;
    const go = () => { if (live) writer.enabled = true; };
    const t = setTimeout(go, 2600);
    document.fonts.ready.then(() => setTimeout(go, webgl ? 700 : 300));
    return () => { live = false; clearTimeout(t); writer.enabled = false; writer.queue = []; soundOff(); };
  }, [webgl]);

  // One ticker for the whole page: the writer, the pen's poses, the grab handles, the sheet map.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const ways = el.querySelector<HTMLElement>('.pn-ways');
    const join = el.querySelector<HTMLElement>('[data-word="join"]');
    let lastLevel = -1, lastBusy = false;
    const tick = (_t: number, dms: number) => {
      const dt = Math.min(0.1, dms / 1000);
      const W = window.innerWidth, H = window.innerHeight, phone = isPhone(), y = window.scrollY;
      // Hold: big in the first screen, parked in the margin after it.
      const p = smooth(clamp((y - H * 0.2) / (H * 0.6)));
      const hero = phone ? { x: W * 0.62, y: H * 0.83, len: Math.min(W * 1.02, 460), ang: 160, z: 80 } : { x: W * 0.79, y: H * 0.56, len: Math.min(W * 0.5, H * 0.88, 820), ang: 119, z: 120 };
      const park = phone ? { x: W - 34, y: H - 120, len: 250, ang: 128, z: 40 } : { x: W - Math.min(140, W * 0.1), y: H * 0.42, len: Math.min(480, H * 0.56), ang: 100, z: 70 };
      Object.assign(rig.hold, { x: hero.x + (park.x - hero.x) * p, y: hero.y + (park.y - hero.y) * p, len: hero.len + (park.len - hero.len) * p, ang: hero.ang + (park.ang - hero.ang) * p, z: hero.z + (park.z - hero.z) * p, idle: 1 - p * 0.5 });
      // The ending: once Join is written and the three ways are in view, the pen is put down across them.
      let rest = false;
      if (ways && join && writer.jobs.find((j) => j.id === 'join')?.state === 'done') {
        const r = ways.getBoundingClientRect();
        if (r.top < H * 0.62 && r.bottom > H * 0.38) {
          rest = true;
          const ang = Math.atan2(r.height, r.width) * 180 / Math.PI;
          Object.assign(rig.rest, { x: r.left + r.width / 2, y: r.top + r.height / 2, len: Math.min(Math.hypot(r.width, r.height) * (phone ? 0.86 : 0.8), phone ? 520 : 980), ang: phone ? 74 : ang * 0.9 });
        }
      }
      rig.want = pad.active ? 'draw' : writer.queue.length ? 'write' : rest ? 'rest' : 'hold';
      writer.tick(dt);
      if (!rig.screen.busy && lastBusy) sWhoosh(0);
      lastBusy = rig.screen.busy;

      // Grab handles follow the pen; they step aside while it writes.
      const s = rig.screen, free = webgl && rig.want === 'hold';
      if (grab.current) {
        const size = clamp(s.len * 0.42, 96, 280);
        grab.current.style.transform = `translate(${s.cx - size / 2}px, ${s.cy - size / 2}px)`;
        grab.current.style.width = grab.current.style.height = `${size}px`;
        grab.current.classList.toggle('off', !free);
      }
      if (knob.current) {
        knob.current.style.transform = `translate(${s.ex - 30}px, ${s.ey - 30}px)`;
        knob.current.classList.toggle('off', !webgl || !(rig.want === 'hold' || rig.want === 'rest'));
      }
      if (hint.current) hint.current.style.opacity = String(webgl ? clamp(1 - y / (H * 0.3)) : 0);
      const lv = Math.round(rig.level[rig.ink] * 100);
      if (lv !== lastLevel) { lastLevel = lv; setLevel(lv); }
      // The sheet map: where the camera is over the whole page.
      if (mapView.current) {
        const sh = document.documentElement.scrollHeight;
        mapView.current.style.transform = `translateY(${(y / sh) * 100}%)`;
        mapView.current.style.height = `${(H / sh) * 100}%`;
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [webgl]);

  const trick = useCallback((t: Trick, power?: number, dir?: number) => {
    if (rig.want === 'hold') setCalled((c) => ({ n: (c?.n ?? 0) + 1, t: CALLS[t] }));
    rig.cmds.push({ t: 'trick', trick: t, power: power ?? (t === 'around' ? 15 + Math.random() * 6 : 18 + Math.random() * 10), dir: dir ?? (Math.random() < 0.5 ? -1 : 1) });
  }, []);
  const nextInk = useCallback((i?: number) => { const n = i ?? (rig.ink + 1) % INKS.length; rig.ink = n; setInk(n); }, []);
  const clickPen = useCallback(() => rig.cmds.push({ t: 'click' }), []);

  // Space spins the pen (unless a control or the drawing area has focus).
  useEffect(() => {
    if (!webgl) return;
    const key = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && t.closest('a, button, input, textarea, [role="application"], [contenteditable]')) return;
      e.preventDefault();
      const r = Math.random();
      trick(r < 0.55 ? 'flat' : r < 0.9 ? 'around' : 'drop');
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [webgl, trick]);

  // Flick: the speed and the side you flick it on set the spin.
  const drag = useRef<{ id: number; pts: { x: number; y: number; t: number }[]; x0: number; y0: number; t0: number } | null>(null);
  const onGrabDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (rig.want !== 'hold') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, pts: [{ x: e.clientX, y: e.clientY, t: performance.now() }], x0: e.clientX, y0: e.clientY, t0: performance.now() };
  };
  const onGrabMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || d.id !== e.pointerId) return;
    const now = performance.now();
    d.pts.push({ x: e.clientX, y: e.clientY, t: now });
    while (d.pts.length > 2 && now - d.pts[0].t > 90) d.pts.shift();
  };
  const onGrabUp = (e: React.PointerEvent) => {
    const d = drag.current; drag.current = null; if (!d) return;
    const now = performance.now(), moved = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
    if (moved < 10 && now - d.t0 < 500) { nextInk(); return; }
    const a = d.pts[0], dt = Math.max(16, now - a.t) / 1000;
    const vx = (e.clientX - a.x) / dt, vy = (e.clientY - a.y) / dt, sp = Math.hypot(vx, vy);
    const rx = e.clientX - rig.screen.cx, ry = e.clientY - rig.screen.cy;
    const cross = rx * vy - ry * vx;
    const dir = cross > 0 ? -1 : 1;
    if (sp > 3400) trick('drop');
    else if (Math.abs(vy) > Math.abs(vx) * 1.5 && Math.hypot(rx, ry) < 60) trick('around', clamp(sp / 110, 9, 26), vy > 0 ? 1 : -1);
    else trick('flat', clamp(sp / 95, 6, 36), dir);
  };

  const rec = RECORD, drv = DRIVE;
  const pub = around(drv.lead, 'public');

  return (
    <div className="v-pen" ref={root} style={{ ['--ink' as string]: INKS[ink].c }}>
      <a className="skip-x" href="#main">Skip to content</a>

      {/* The pen case: everything the pen does, as buttons. */}
      <aside className={more ? 'pn-case is-open' : 'pn-case'} aria-label="The pen">
        {webgl && (
          <>
            <button type="button" className="pn-chip" onClick={() => trick('flat')}>Spin <kbd>space</kbd></button>
            <button type="button" className="pn-chip pn-x" onClick={() => trick('around')}>Around</button>
            <button type="button" className="pn-chip pn-x" onClick={() => trick('drop')}>Drop</button>
            <button type="button" className="pn-chip" aria-pressed={retracted} onClick={clickPen}>Click</button>
          </>
        )}
        <div className="pn-inks" role="radiogroup" aria-label="Ink">
          {INKS.map((k, i) => (
            <button key={k.name} type="button" role="radio" aria-checked={ink === i} aria-label={`${k.name} ink`} className="pn-ink" style={{ ['--c' as string]: k.c }} onClick={() => nextInk(i)}>
              <span className="pn-ink-lvl" style={{ transform: `scaleY(${ink === i ? level / 100 : 1})` }} />
            </button>
          ))}
        </div>
        {webgl && (
          <button type="button" className="pn-chip pn-more" aria-expanded={more} onClick={() => setMore((m) => !m)}>{more ? 'Less' : 'More'}</button>
        )}
        {webgl && (
          <button type="button" className="pn-chip pn-snd pn-x" aria-pressed={sound} onClick={async () => { if (sound) { soundOff(); setSound(false); } else setSound(await soundOn()); }}>
            {sound ? 'Sound on' : 'Sound off'}
          </button>
        )}
      </aside>

      <div className="pn-sheet">
        <main id="main">
          {/* First screen */}
          <section className="pn-hero">
            <h1 className="pn-word">
              <span className="sr-only-x">{SITE.name}</span>
              <InkWord text={SITE.name} id="word" speed={2100} pen={2.3} at={1.3} />
            </h1>
            <p className="pn-pitch" data-rise>
              <span>{HERO.pitch[0]}</span> <span>{HERO.pitch[1]}</span>
            </p>
            <ol className="pn-state" data-rise>
              {HERO.statement.map((s, i) => (
                <li key={s}><span className="pn-num pn-hand" aria-hidden="true">{i + 1}.</span>{i === 0 ? <Mark kind="underline2" id="free">{s}</Mark> : s}</li>
              ))}
            </ol>
            <div className="pn-doors" data-rise>
              {HERO.doors.map((d, i) => (
                <A key={d.href} href={d.href} className={i === 0 ? 'pn-door is-main' : 'pn-door'}>{d.label}<span aria-hidden="true"> &rarr;</span></A>
              ))}
            </div>
            <div className="pn-hint" ref={hint} aria-hidden="true">
              <span className="pn-hand">Flick the pen.</span>
              <span className="pn-hand pn-hint-s">Tap it to change the ink.</span>
            </div>
          </section>

          {/* Four lines, ticked in the margin */}
          <section className="pn-man" aria-label="What we are">
            {MANIFESTO.map((m, i) => (
              <p key={m} className="pn-man-line" data-rise>
                <Mark kind="tick" id={`tick-${i}`} className="pn-tick" th={3.2} speed={900} pen={340}><span className="pn-tickbox" /></Mark>
                {m}
              </p>
            ))}
          </section>

          {/* The record */}
          <section id="record" className="pn-sec pn-rec" aria-labelledby="h-record">
            <h2 id="h-record" className="pn-h"><span className="sr-only-x">{rec.title}</span><InkWord text={rec.title} id="record" /></h2>
            <p className="pn-rule" data-rise>{rec.rule}</p>
            <div className="pn-event" data-rise>
              <span className="pn-when">{rec.when}</span>
              <span className="pn-ename">{rec.name}</span>
              <span className="pn-where">{rec.where}</span>
            </div>
            <ul className="pn-results">
              {rec.results.map((r, i) => (
                <li key={r.who} className="pn-result" data-rise>
                  <span className="pn-who pn-hand">{r.who}</span>
                  <Mark kind="circle" id={`res-${i}`} className="pn-what" th={3.6} pen={460}>{r.what}</Mark>
                  <span className="pn-rmore">{r.more}</span>
                </li>
              ))}
            </ul>
            <A href={rec.more.href} className="pn-link">{rec.more.label}</A>
          </section>

          {/* The drive */}
          <section id="drive" className="pn-sec pn-drv" aria-labelledby="h-drive">
            <h2 id="h-drive" className="pn-h"><span className="sr-only-x">{drv.title}</span><InkWord text={drv.title} id="drive" /></h2>
            <p className="pn-lead" data-rise>
              {pub ? <>{pub[0]}<Mark kind="fix" id="public" th={2.6} speed={1500} pen={380}>{pub[1]}</Mark>{pub[2]}</> : drv.lead}
            </p>
            <Mark kind="bracket" id="drive-bracket" className="pn-dlist-mark" th={3.6} speed={1600} pen={520}>
              <dl className="pn-dlist">
                {drv.items.map((it) => (
                  <div key={it.term} className="pn-ditem" data-rise>
                    <dt>{it.term}</dt>
                    <dd>{it.text}</dd>
                  </div>
                ))}
              </dl>
            </Mark>
            <A href={drv.more.href} className="pn-link">{drv.more.label}</A>
          </section>

          {/* The visitor's turn */}
          <section className="pn-sec pn-yours" aria-label="Draw on the page">
            <Pad ink={ink} />
          </section>

          {/* The people */}
          <section id="people" className="pn-sec pn-ppl" aria-labelledby="h-people">
            <h2 id="h-people" className="pn-h"><span className="sr-only-x">{PEOPLE.title}</span><InkWord text={PEOPLE.title} id="people" /></h2>
            <div className="pn-coaches">
              {PEOPLE.coaches.map((c, i) => (
                <article key={c.name} className="pn-coach" data-rise>
                  <h3 className="pn-cname"><Mark kind="underline2" id={`coach-${i}`} th={3.4} pen={420}>{c.name}</Mark></h3>
                  <p className="pn-role">{c.role}</p>
                  <p className="pn-bio">{c.bio}</p>
                </article>
              ))}
            </div>
            <div className="pn-countrow">
              <p className="pn-count" data-rise><Mark kind="circle" id="count" th={3}>{PEOPLE.count}</Mark></p>
              <Mark kind="tally" id="tally" className="pn-tally" th={3.6} speed={1300} pen={380}><span className="pn-tallybox" /></Mark>
            </div>
            <A href={PEOPLE.more.href} className="pn-link">{PEOPLE.more.label}</A>
          </section>

          {/* Join, and the pen put down */}
          <section id="join" className="pn-sec pn-join" aria-labelledby="h-join">
            <h2 id="h-join" className="pn-h"><span className="sr-only-x">{JOIN.title}</span><InkWord text={JOIN.title} id="join" /></h2>
            <div className="pn-joinlead">
              <p className="pn-lead" data-rise>{JOIN.lead}</p>
              <Mark kind="arrow" id="join-arrow" className="pn-arrow" th={3.4} speed={1400} pen={420}><span className="pn-arrowbox" /></Mark>
            </div>
            <div className="pn-ways">
              {JOIN.paths.map((p, i) => (
                <article key={p.id} className="pn-way" data-rise>
                  <p className="pn-way-n pn-hand" aria-hidden="true">{i + 1}</p>
                  <h3 className="pn-way-name">{p.name}</h3>
                  <p className="pn-way-line">{p.line}</p>
                  <ul className="pn-way-text">{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
                  <A href={p.href} className="pn-way-go">{p.name}<span aria-hidden="true"> &rarr;</span></A>
                </article>
              ))}
            </div>
            <div className="pn-after" data-rise>
              <p>{JOIN.already.before}<A href={JOIN.already.href} className="pn-link-i">{JOIN.already.label}</A></p>
              <p>{JOIN.coach.before}<A href={JOIN.coach.href} className="pn-link-i">{JOIN.coach.label}</A></p>
              <p>{JOIN.also} <A href={`mailto:${SITE.email}`} className="pn-link-i">{SITE.email}</A></p>
              <p className="pn-discord">{JOIN.discord}</p>
            </div>
          </section>
        </main>

        <footer className="pn-foot">
          <p className="pn-foot-line">{FOOTER.line}</p>
          <ul className="pn-foot-links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul className="pn-foot-pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <p className="pn-draft">Draft 2, version 24. Not the live site. Handwriting traced from Caveat (SIL Open Font License).</p>
        </footer>
      </div>

      {/* The sheet map */}
      <nav className="pn-map" aria-label="Sections">
        <span className="pn-map-view" ref={mapView} aria-hidden="true" />
        {NAV.map((n) => <a key={n.id} href={`#${n.id}`} className="pn-map-a">{n.label}</a>)}
      </nav>

      <p className="pn-call pn-hand" aria-live="polite">
        {called && <span key={called.n}>{called.t}</span>}
      </p>
      <div className="pn-light" aria-hidden="true" />
      <div className="pn-dof" aria-hidden="true" />
      {webgl && (
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      )}
      {webgl && (
        <>
          <button ref={grab} type="button" className="pn-grab off" aria-label="The pen. Flick it to spin it, or press to change the ink."
            onPointerDown={onGrabDown} onPointerMove={onGrabMove} onPointerUp={onGrabUp} onPointerCancel={() => { drag.current = null; }}
            onKeyDown={(e) => { if (e.key === ' ') { e.preventDefault(); trick('flat'); } }}
            onKeyUp={(e) => { if (e.key === ' ') e.preventDefault(); }}
            onClick={(e) => { if (e.detail === 0) nextInk(); }}
          />
          <button ref={knob} type="button" className="pn-knob off" aria-label={retracted ? 'Click the pen open' : 'Click the pen shut'} onClick={clickPen} />
        </>
      )}
    </div>
  );
}
