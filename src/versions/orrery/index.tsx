// Version 29: the orrery. The team as a small solar system: a binary star for
// the two coaches, eight unnamed worlds, two comets for the two results, a dark
// ring of seven for the drive, and a ninth orbit, dashed, for whoever joins.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import './orrery.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap } from '@/lib/scroll';
import { Split, useRise } from '@/lib/motion';
import { clamp, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { stage, STOPS, word, WORLDS } from './stage';
import { SkyDiagram } from './Diagram';

const Scene = lazy(() => import('./Scene'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const SPEEDS = [-8, -4, -2, -1, -0.5, 0, 0.5, 1, 2, 4, 8];
const BODIES = ['A', 'B', 'w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'c0', 'c1', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6'];

function nameOf(id: string) {
  if (id === 'A') return `${PEOPLE.coaches[0].name}. ${PEOPLE.coaches[0].role}.`;
  if (id === 'B') return `${PEOPLE.coaches[1].name}. ${PEOPLE.coaches[1].role}.`;
  if (id[0] === 'w') return `World ${word[+id.slice(1)]} of eight. Unnamed.`;
  if (id[0] === 'c') { const r = RECORD.results[+id.slice(1)]; return `${r.who} ${r.what}.`; }
  if (id[0] === 'd') return `${DRIVE.items[+id.slice(1)].term}. Private.`;
  return '';
}

/** Faint lens dirt, drawn once on a canvas. */
function dirtURL() {
  try {
    const c = document.createElement('canvas'); c.width = 640; c.height = 400; const g = c.getContext('2d')!;
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * 640, y = Math.random() * 400, r = 4 + Math.random() * 26;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,235,205,${0.05 + Math.random() * 0.1})`); gr.addColorStop(0.7, `rgba(255,235,205,${Math.random() * 0.05})`); gr.addColorStop(1, 'rgba(255,235,205,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(255,235,205,0.05)'; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); const x = Math.random() * 640, y = Math.random() * 400; g.moveTo(x, y); g.bezierCurveTo(x + 60, y - 30, x + 90, y + 40, x + 160, y + 10); g.stroke(); }
    return c.toDataURL();
  } catch { return ''; }
}

export default function Orrery() {
  useVersion('orrery');
  const root = useRef<HTMLDivElement>(null), pins = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [phone, setPhone] = useState(isPhone);
  const [view, setView] = useState<'inst' | 'sky'>('inst');
  const [speed, setSpeed] = useState(still ? 0 : 1);
  const [follow, setFollow] = useState('');
  const [dirt] = useState(dirtURL);
  useRise(root);
  const play = webgl;

  useEffect(() => { const on = () => setPhone(isPhone()); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, []);
  useEffect(() => { stage.speed = speed; }, [speed]);
  useEffect(() => { stage.onFollow = (id) => setFollow(id); return () => { stage.onFollow = null; }; }, []);
  useEffect(() => { stage.t = 0; stage.intro = 0; stage.f = 0; stage.yaw = 0; stage.pitch = 0; stage.follow = ''; stage.manual = false; stage.inst = 1; stage.close = 0; }, []);

  // Scroll position becomes a continuous stop index, and the view follows the scroll until chosen by hand.
  useEffect(() => {
    const el = root.current; if (!el) return;
    let anchors: number[] = [];
    const measure = () => {
      const vh = window.innerHeight, sy = window.scrollY, max = Math.max(1, document.documentElement.scrollHeight - vh);
      anchors = STOPS.map((s, i) => {
        const n = el.querySelector<HTMLElement>(`[data-stop="${s}"]`); if (!n) return 0;
        const r = n.getBoundingClientRect();
        if (i === 0) return 0;
        if (i === STOPS.length - 1) return max;
        return clamp(r.top + sy + Math.min(r.height, vh * 2.2) / 2 - vh / 2, 0, max);
      });
      for (let i = 1; i < anchors.length; i++) anchors[i] = Math.max(anchors[i], anchors[i - 1] + 1);
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    const t = setTimeout(measure, 900);
    let lastView = '', lastF = -1;
    const pinEls = pins.current ? Array.from(pins.current.querySelectorAll<HTMLElement>('[data-pin]')) : [];
    const tick = () => {
      const y = window.scrollY; let f = 0;
      for (let i = 0; i < anchors.length - 1; i++) { if (y >= anchors[i]) f = i + clamp((y - anchors[i]) / Math.max(1, anchors[i + 1] - anchors[i])); }
      stage.f = f;
      if (Math.abs(f - lastF) > 0.002) { lastF = f; el.style.setProperty('--f', f.toFixed(3)); el.dataset.at = STOPS[Math.round(f)]; }
      const v = stage.inst > 0.5 ? 'inst' : 'sky';
      if (v !== lastView) { lastView = v; setView(v); }
      el.style.setProperty('--dirt', (0.25 + 0.75 * Math.max(0, 1 - Math.abs(f - 2) * 1.5)).toFixed(3));
      // labels that ride on the bodies
      for (const p of pinEls) {
        const id = p.dataset.pin!, at = +(p.dataset.at ?? -1), pin = stage.pins[id];
        const near = at < 0 ? 1 : clamp(1 - Math.abs(f - at) * 2.2);
        const o = pin && pin.on ? near : 0;
        if (pin && (id === 'A' || id === 'B')) { const other = stage.pins[id === 'A' ? 'B' : 'A']; p.classList.toggle('flip', !!other && pin.x < other.x); }
        p.style.opacity = o.toFixed(3);
        if (pin && o > 0) p.style.transform = `translate3d(${pin.x.toFixed(1)}px, ${pin.y.toFixed(1)}px, 0)`;
      }
    };
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); ro.disconnect(); clearTimeout(t); };
  }, [webgl, phone]);

  // Drag to turn; two fingers to pinch the speed of time.
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef({ d: 0, s: 1 });
  const onDown = (e: React.PointerEvent) => {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stage.dragging = true; stage.moved = 0; stage.yawV = 0;
    if (ptrs.current.size === 2) { const [a, b] = [...ptrs.current.values()]; pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), s: stage.speed || 1 }; }
  };
  const onMove = (e: React.PointerEvent) => {
    const p = ptrs.current.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current.d > 10) { const s = clamp(pinch.current.s * Math.pow(d / pinch.current.d, 1.6), -8, 8); stage.speed = s; setSpeed(Math.round(s * 4) / 4); }
      return;
    }
    stage.moved += Math.abs(dx) + Math.abs(dy);
    stage.yaw += dx * 0.005; stage.yawV = dx * 0.3;
    if (e.pointerType === 'mouse') stage.pitch = clamp(stage.pitch + dy * 0.003, -0.6, 0.9);
  };
  const onUp = (e: React.PointerEvent) => { ptrs.current.delete(e.pointerId); if (!ptrs.current.size) stage.dragging = false; };

  const stepSpeed = (dir: number) => {
    setSpeed((s) => { const i = SPEEDS.findIndex((x) => x >= s - 0.01); return SPEEDS[clamp((i < 0 ? SPEEDS.length - 1 : i) + dir, 0, SPEEDS.length - 1)]; });
  };
  const toggleView = (to?: 'inst' | 'sky') => { stage.manual = true; const next = to ?? (stage.inst > 0.5 ? 'sky' : 'inst'); stage.inst = next === 'inst' ? 0.51 : 0.49; setView(next); };
  const followNext = () => { const i = BODIES.indexOf(stage.follow); const id = BODIES[(i + 1) % BODIES.length]; stage.follow = id; stage.followAt = stage.f; setFollow(id); };
  const letGo = () => { stage.follow = ''; setFollow(''); };
  const turn = (d: number) => { stage.yawV += d * 1.6; };

  useEffect(() => {
    if (!play) return;
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === ',') stepSpeed(-1);
      else if (k === '.') stepSpeed(1);
      else if (k === 'r') setSpeed((s) => -(s || 1));
      else if (k === 'p') setSpeed((s) => (s ? 0 : 1));
      else if (k === 'b') toggleView();
      else if (k === 'f') followNext();
      else if (k === 'escape') letGo();
      else if (k === 'q') turn(-1);
      else if (k === 'e') turn(1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [play]);

  const sp = speed === 0 ? 'Stopped' : `${speed > 0 ? '' : 'minus '}${Math.abs(speed)}x`;
  return (
    <div className={`v-orrery${webgl ? '' : ' no-gl'}${phone ? ' is-phone' : ''} view-${view}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      {webgl && (
        <div className="stage" aria-hidden="true" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onUp}>
          <Suspense fallback={null}><Scene /></Suspense>
        </div>
      )}
      {webgl && <div className="dirt" aria-hidden="true" style={{ backgroundImage: dirt ? `url(${dirt})` : undefined }} />}
      {webgl && <div className="vig" aria-hidden="true" />}

      {webgl && (
        <div className="pins" ref={pins} aria-hidden="true">
          <div className="pin star a" data-pin="A" data-at="2"><i /><b>{PEOPLE.coaches[0].name}</b><span>{PEOPLE.coaches[0].role}</span></div>
          <div className="pin star b" data-pin="B" data-at="2"><i /><b>{PEOPLE.coaches[1].name}</b><span>{PEOPLE.coaches[1].role}</span></div>
          {RECORD.results.map((r, k) => <div key={r.who} className={`pin comet c${k}`} data-pin={'c' + k} data-at="3"><i /><b>{r.what}</b><span>{r.who}</span></div>)}
          {DRIVE.items.map((d, k) => <div key={d.term} className="pin unlit" data-pin={'d' + k} data-at="4"><i /><span className="no">{String(k + 1).padStart(2, '0')}</span><b>{d.term}</b></div>)}
          <div className="pin you" data-pin="you" data-at="5"><i /><b>Your orbit</b></div>
          <div className="pin world" data-pin="w3" data-at="1"><i /><span>World {word[3]} of eight. Unnamed.</span></div>
        </div>
      )}

      <header className="top">
        <a className="brand" href="#top" aria-label="Skeptical, back to the top">Skeptical<em>?</em></a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
      </header>

      {play && (
        <aside className={`hud${follow ? ' has-follow' : ''}`} aria-label="Orrery controls">
          <div className="seg" role="group" aria-label="View">
            <button type="button" aria-pressed={view === 'inst'} onClick={() => toggleView('inst')}>Brass</button>
            <button type="button" aria-pressed={view === 'sky'} onClick={() => toggleView('sky')}>Sky</button>
          </div>
          <div className="time" role="group" aria-label="Speed of time">
            <button type="button" onClick={() => stepSpeed(-1)} aria-label="Slower, or backwards">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 6 7 12l6 6M19 6l-6 6 6 6" /></svg>
            </button>
            <button type="button" className="rd" onClick={() => setSpeed((s) => (s ? 0 : 1))} aria-label={`${sp}. ${speed ? 'Stop time' : 'Start time'}`}><span aria-live="polite">{sp}</span></button>
            <button type="button" onClick={() => stepSpeed(1)} aria-label="Faster">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m11 6 6 6-6 6M5 6l6 6-6 6" /></svg>
            </button>
          </div>
          <input className="range" type="range" min={-8} max={8} step={0.25} value={speed} onChange={(e) => setSpeed(+e.target.value)} aria-label="Speed of time, negative runs it backwards" />
          <div className="follow">
            <button type="button" onClick={followNext}>{follow ? 'Next body' : 'Follow a body'}</button>
            {follow && <button type="button" onClick={letGo}>Let go</button>}
          </div>
          <p className="fl" aria-live="polite">{follow ? `Following: ${nameOf(follow)}` : 'Drag to turn. Click a body to follow it.'}</p>
          <p className="keys">Keys: <kbd>,</kbd><kbd>.</kbd> speed, <kbd>R</kbd> reverse, <kbd>B</kbd> view, <kbd>F</kbd> follow, <kbd>Q</kbd><kbd>E</kbd> turn</p>
          <p className="scale">Sizes and distances not to scale.</p>
        </aside>
      )}

      <main id="main">
        <section className="hero" id="top" data-stop="hero" aria-label={SITE.heading}>
          <p className="eyebrow">Skeptical. An orrery of the team.</p>
          <Split as="h1" className="pitch" by="words" on="load" delay={0.6}>{HERO.pitch.join(' ')}</Split>
          <div className="under">
            <p className="statement">{HERO.statement.map((s) => <span key={s}>{s}</span>)}</p>
            <p className="doors">{HERO.doors.map((d, i) => <A key={d.href} className={i ? 'door ghost' : 'door'} href={d.href}>{d.label}</A>)}</p>
          </div>
          {!webgl && <SkyDiagram />}
          <p className="legend" aria-hidden="true"><span><i className="l-a" />Two stars</span><span><i className="l-w" />Eight worlds</span><span><i className="l-d" />A dark ring</span><span><i className="l-n" />One empty orbit</span></p>
        </section>

        <section className="manifesto" data-stop="manifesto" aria-label="How the team works">
          {MANIFESTO.map((m, i) => (
            <div className="mline" key={m}>
              <span className="mn" aria-hidden="true">{['I', 'II', 'III', 'IV'][i]}</span>
              <Split as="p" by="words">{m}</Split>
            </div>
          ))}
        </section>

        <section className="people" id="people" data-stop="people">
          <div className="hd">
            <Split as="h2" className="title">{PEOPLE.title}</Split>
            <p className="kicker" data-rise>Two stars, orbiting each other.</p>
          </div>
          <div className="coaches">
            {PEOPLE.coaches.map((c, i) => (
              <article className={`coach k${i}`} key={c.name} data-rise>
                <p className="role">{c.role}</p>
                <h3>{c.name}</h3>
                <p>{c.bio}</p>
              </article>
            ))}
          </div>
          <div className="ft" data-rise>
            <p className="count">{PEOPLE.count}</p>
            <A className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A>
          </div>
        </section>

        <section className="record" id="record" data-stop="record">
          <div className="hd">
            <Split as="h2" className="title">{RECORD.title}</Split>
            <p className="rule" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
          </div>
          <ol className="results">
            {RECORD.results.map((r, i) => (
              <li key={r.who} className={`res r${i}`} data-rise>
                <p className="what">{r.what}</p>
                <p className="who">{r.who}</p>
                <p className="more-t">{r.more}</p>
              </li>
            ))}
          </ol>
          <p data-rise><A className="more" href={RECORD.more.href}>{RECORD.more.label}</A></p>
        </section>

        <section className="drive" id="drive" data-stop="drive">
          <div className="hd">
            <Split as="h2" className="title">{DRIVE.title}</Split>
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <p className="kicker" data-rise>Seven bodies. None of them give off light.</p>
          </div>
          <ol className="items">
            {DRIVE.items.map((d, k) => (
              <li key={d.term} data-rise onPointerEnter={() => { stage.hl = k; }} onPointerLeave={() => { stage.hl = -1; }}>
                <button type="button" className="item" onFocus={() => { stage.hl = k; }} onBlur={() => { stage.hl = -1; }} onClick={() => { if (play) { stage.follow = 'd' + k; stage.followAt = stage.f; setFollow('d' + k); } }}>
                  <span className="no" aria-hidden="true">{String(k + 1).padStart(2, '0')}</span>
                  <span className="term">{d.term}</span>
                  <span className="txt">{d.text}</span>
                </button>
              </li>
            ))}
          </ol>
          <p data-rise><A className="more" href={DRIVE.more.href}>{DRIVE.more.label}</A></p>
        </section>

        <section className="join" id="join" data-stop="join">
          <div className="hd">
            <p className="kicker" data-rise>The ninth orbit is empty.</p>
            <Split as="h2" className="title">{JOIN.title}</Split>
            <p className="lead" data-rise>{JOIN.lead}</p>
          </div>
          <div className="paths">
            {JOIN.paths.map((p, i) => (
              <article className="path" key={p.id} data-rise>
                <p className="pn" aria-hidden="true">{['i', 'ii', 'iii'][i]}</p>
                <h3>{p.name}</h3>
                <p className="line">{p.line}</p>
                <ul>{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
                <A className="go" href={p.href}>{p.name}<span aria-hidden="true"> &rarr;</span></A>
              </article>
            ))}
          </div>
          <div className="after" data-rise>
            <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A></p>
            <p>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A></p>
            <p>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
            <p>{JOIN.discord}</p>
          </div>
        </section>

        <footer className="foot" data-stop="end">
          <p className="fline">{FOOTER.line}</p>
          <nav aria-label="Elsewhere"><ul>{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul></nav>
          <nav aria-label="Pages"><ul>{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul></nav>
          <p className="small">Draft 2, version 29. Not the live site. Sizes and distances not to scale. The {WORLDS.length} worlds are drawn, not named.</p>
        </footer>
      </main>
    </div>
  );
}
