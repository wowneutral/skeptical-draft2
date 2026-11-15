// Version 25: the desktop. The site as a debater's machine the night before a
// tournament: a small operating system of its own, with windows that each hold
// one part of the site and do something with it, toys in the corners, and a
// shutdown at the end of the join installer.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import '@fontsource/silkscreen/400.css';
import '@fontsource/silkscreen/700.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource/kalam/400.css';
import './desktop.css';
import { SITE, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { gsap } from '@/lib/scroll';
import { cn, still, coarse } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { useOS, BAR, SHELF, APP_ORDER, openSheets, type AppId, type Win } from './store';
import { Window, Shelf, Clock, Prep, Menu, type AppDef } from './wm';
import { Px, CURSORS } from './pixels';
import { Readme, Manifesto, Record, Drive, People, About, Join, Flow, Trash, Note, MarkViewer, Footer, JoinLinks, QMark, DRAFT } from './apps';
import MARKS from '@/lib/marks.json';

const APPS: AppDef[] = [
  { id: 'readme', title: 'read-me.txt', label: 'Read me', icon: 'readme', min: [380, 320] },
  { id: 'manifesto', title: 'manifesto.txt', label: 'Manifesto', icon: 'manifesto', min: [380, 250] },
  { id: 'record', title: 'record viewer', label: 'Record', icon: 'record', min: [380, 320] },
  { id: 'mark', title: 'question.mark', label: 'question.mark', icon: 'mark', min: [240, 300] },
  { id: 'drive', title: 'drive:/', label: 'Drive', icon: 'drive', min: [520, 400] },
  { id: 'people', title: 'contacts', label: 'Coaches', icon: 'people', min: [420, 340] },
  { id: 'about', title: 'about this team', label: 'About', icon: 'about', min: [420, 420] },
  { id: 'join', title: 'join installer', label: 'Join', icon: 'join', min: [560, 440] },
  { id: 'flow', title: 'flow pad', label: 'Flow pad', icon: 'flow', min: [440, 320] },
  { id: 'trash', title: 'trash', label: 'Trash', icon: 'trash', min: [340, 320] },
  { id: 'note', title: 'note', label: 'Note', icon: 'note', min: [200, 170] },
];
const byId = Object.fromEntries(APPS.map((a) => [a.id, a])) as Record<AppId, AppDef>;
const BODY: Record<AppId, () => React.ReactElement> = {
  readme: () => <Readme />, manifesto: () => <Manifesto />, record: () => <Record />, mark: () => <MarkViewer />, drive: () => <Drive />,
  people: () => <People />, about: () => <About />, join: () => <Join />, flow: () => <Flow />, trash: () => <Trash />, note: () => <Note />,
};
// What the desk shows, in icon order. "page" is the read-it-as-a-page icon.
type IconId = AppId | 'page';
const ICONS: IconId[] = ['readme', 'manifesto', 'record', 'drive', 'people', 'join', 'about', 'flow', 'mark', 'note', 'page', 'trash'];
const iconLabel = (k: IconId) => (k === 'page' ? 'Read it as a page' : byId[k].label.replace('.', '\u200B.'));
const iconPx = (k: IconId) => (k === 'page' ? 'page' : byId[k].icon) as Parameters<typeof Px>[0]['name'];

const tiny = () => typeof window !== 'undefined' && innerWidth < 360;
const touchUI = () => typeof window !== 'undefined' && (innerWidth <= 760 || (coarse && innerWidth <= 1024));

/** Where the windows start: overlapping, a little messy, the read-me on top. */
function firstLayout(W: number, H: number): Record<AppId, Win> {
  const s = useOS.getState().wins;
  const out = { ...s };
  const usable = Math.max(760, W - 270);
  const k = Math.min(1.2, Math.max(0.78, usable / 1170));
  const r = (x: number, y: number, w: number, h: number) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(Math.min(h, H - BAR - SHELF - 24)) });
  const base = (id: AppId, rect: ReturnType<typeof r>, z: number, open: boolean, born = 0) => { out[id] = { ...s[id], ...rect, z, open, min: false, max: false, born }; };
  const bottom = H - SHELF;
  // Leave a band above the shelf so the wordmark on the wallpaper reads.
  const band = Math.min(250, Math.max(150, W * 0.16));
  const floor = bottom - band;
  base('readme', r(30, BAR + 20, 620 * k, Math.min(530 * k, floor - BAR - 10)), 6, true, 1);
  base('record', r(usable * 0.48, BAR + 40, 470 * k, 380 * k), 3, true, 2);
  base('manifesto', r(usable * 0.42, Math.max(BAR + 200, floor - 340 * k), 580 * k, 350 * k), 4, true, 3);
  base('mark', r(usable * 0.8, BAR + 130 * k, 300 * k, 440 * k), 5, true, 4);
  base('note', r(usable * 0.47, floor - 40, 230, 190), 7, true, 5);
  // Closed windows remember a sensible place to open.
  base('drive', r(usable * 0.18, BAR + 60, 720, 500), 1, false);
  base('people', r(usable * 0.3, BAR + 90, 600, 420), 1, false);
  base('about', r(usable * 0.36, BAR + 40, 560, 600), 1, false);
  base('join', r(usable * 0.22, BAR + 30, 740, 600), 1, false);
  base('flow', r(usable * 0.12, BAR + 80, 760, 500), 1, false);
  base('trash', r(usable * 0.5, BAR + 140, 380, 360), 1, false);
  return out;
}

function iconHome(W: number, H: number) {
  const avail = H - BAR - SHELF - 24;
  const rows = Math.max(4, Math.floor(avail / 118));
  const cols = Math.ceil(ICONS.length / rows);
  const pitch = Math.min(126, avail / Math.ceil(ICONS.length / cols));
  const pos: Record<string, { x: number; y: number }> = {};
  // Slightly off the grid, the way a desktop gets after a week of use.
  const jit = [[0, 0], [6, 3], [-4, 1], [3, -2], [-6, 4], [2, 6], [-3, -3], [5, 1], [-2, 5], [4, -4], [0, 2], [-5, 0]];
  ICONS.forEach((id, i) => {
    const per = Math.ceil(ICONS.length / cols), c = Math.floor(i / per), rr = i % per;
    pos[id] = { x: W - 128 - (cols - 1 - c) * 118 + jit[i][0], y: BAR + 14 + rr * pitch + jit[i][1] };
  });
  if (pos.trash) pos.trash = { x: W - 128, y: H - SHELF - 112 };
  return pos;
}

/* ------------------------------------------------------------------ pieces */

function Wallpaper() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (still) return;
    const el = ref.current!;
    let raf = 0, tx = innerWidth * 0.7, ty = innerHeight * 0.4, x = tx, y = ty;
    const mv = (e: PointerEvent) => { tx = e.clientX; ty = e.clientY; if (!raf) raf = requestAnimationFrame(tick); };
    const tick = () => {
      x += (tx - x) * 0.18; y += (ty - y) * 0.18;
      el.style.setProperty('--mx', `${Math.round(x / 4) * 4}px`); el.style.setProperty('--my', `${Math.round(y / 4) * 4}px`);
      el.style.setProperty('--px', `${((x / innerWidth) - 0.5) * -18}px`); el.style.setProperty('--py', `${((y / innerHeight) - 0.5) * -12}px`);
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 1 ? requestAnimationFrame(tick) : 0;
    };
    addEventListener('pointermove', mv);
    return () => { removeEventListener('pointermove', mv); cancelAnimationFrame(raf); };
  }, []);
  const [hook, ...dots] = MARKS.italic.d.split(/(?=M)/);
  return (
    <div className="wall" ref={ref} aria-hidden="true">
      <svg className="wall-q" viewBox="-490 -750 980 1030" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="dk-d1" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#f3f1ea" /></pattern>
          <pattern id="dk-d2" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#f3f1ea" /><rect x="6" y="6" width="6" height="6" fill="#f3f1ea" /></pattern>
        </defs>
        <path d={hook} fill="#1b2738" transform="translate(26 26)" />
        <path d={hook} fill="url(#dk-d1)" opacity="0.5" />
        <path d={hook} fill="none" stroke="#f3f1ea" strokeWidth="5" opacity="0.55" />
        {dots.map((d, i) => <g key={i}><path d={d} fill="#1b2738" transform="translate(26 26)" /><path d={d} fill="#ffd84a" /></g>)}
      </svg>
      <svg className="wall-q wall-q--lamp" viewBox="-490 -750 980 1030" preserveAspectRatio="xMidYMid meet">
        <path d={hook} fill="url(#dk-d2)" />
      </svg>
      <p className="wall-word">Skeptical</p>
    </div>
  );
}

function Boot({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const lines = ['starting prep', 'mounting drive:/ (locked)', `${PEOPLE.count.toLowerCase()}`, 'ready'];
  useEffect(() => {
    const ts = [260, 620, 1000, 1360].map((t, k) => setTimeout(() => setI(k + 1), t));
    const end = setTimeout(onDone, 1650);
    return () => { ts.forEach(clearTimeout); clearTimeout(end); };
  }, [onDone]);
  return (
    <div className="boot" role="status">
      <Px name="mark3" size={112} />
      <p className="boot-name">Skep OS</p>
      <div className="boot-bar" aria-hidden="true">{Array.from({ length: 16 }, (_, k) => <i key={k} className={cn(k < i * 4 && 'on')} />)}</div>
      <ul className="boot-log">{lines.slice(0, i).map((l) => <li key={l}>{l}</li>)}</ul>
    </div>
  );
}

function Toast() {
  const t = useOS((s) => s.toast);
  const set = useOS((s) => s.set);
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!t) return;
    if (!still && el.current) gsap.fromTo(el.current, { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(2)' });
    const k = setTimeout(() => set({ toast: null }), 5200);
    return () => clearTimeout(k);
  }, [t, set]);
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      {t && (
        <div className="toast" ref={el} key={t.id}>
          <Px name="mark3" size={44} />
          <div><p className="toast-t">{t.text}</p>{t.sub && <p className="toast-s">{t.sub}</p>}</div>
          <button type="button" className="ctl" onClick={() => set({ toast: null })} aria-label="Dismiss">×</button>
        </div>
      )}
    </div>
  );
}

/** The outline that runs from an icon to the window it opens, in four hard steps. */
function Zoom() {
  const z = useOS((s) => s.zoom);
  const el = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!z || !el.current || still) return;
    const { from: f, to: t } = z;
    gsap.fromTo(el.current, { left: f.left, top: f.top, width: f.width, height: f.height, opacity: 1 },
      { left: t.x, top: t.y, width: t.w, height: t.h, duration: 0.24, ease: 'steps(5)', onComplete: () => { if (el.current) el.current.style.opacity = '0'; } });
    const win = document.querySelector<HTMLElement>(`[data-win="${Object.entries(useOS.getState().wins).find(([, w]) => w.z === useOS.getState().top)?.[0]}"]`);
    if (win) gsap.fromTo(win, { opacity: 0 }, { opacity: 1, duration: 0.01, delay: 0.24 });
  }, [z]);
  return <div className="zoom" ref={el} aria-hidden="true" />;
}

/** Screensaver: the question mark drawn over and over, in pen, until you move. */
function Saver({ onWake }: { onWake: () => void }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = ref.current!;
    const [hook, dot] = MARKS.italic.d.split(/(?=M)/);
    const NS = 'http://www.w3.org/2000/svg';
    let n = 0;
    const draw = () => {
      const W = innerWidth, H = innerHeight, s = 0.12 + Math.random() * 0.34;
      const g = document.createElementNS(NS, 'g');
      const x = Math.random() * (W - 980 * s) + 490 * s, y = Math.random() * (H - 1030 * s) + 750 * s;
      g.setAttribute('transform', `translate(${x} ${y}) scale(${s}) rotate(${(Math.random() - 0.5) * 24})`);
      const col = n % 3 === 0 ? '#ffd84a' : n % 3 === 1 ? '#f3f1ea' : '#7f9bd0';
      const a = document.createElementNS(NS, 'path'); a.setAttribute('d', hook); a.setAttribute('fill', 'none'); a.setAttribute('stroke', col); a.setAttribute('stroke-width', String(3 / s)); a.setAttribute('stroke-linejoin', 'round');
      const b = document.createElementNS(NS, 'path'); b.setAttribute('d', dot); b.setAttribute('fill', col); b.style.opacity = '0';
      g.append(a, b); svg.append(g); n++;
      gsap.timeline().fromTo(a, { drawSVG: '0%' }, { drawSVG: '100%', duration: 2.2, ease: 'power1.inOut' }).to(b, { opacity: 1, duration: 0.01, scale: 1 }).to(g, { opacity: 0, duration: 3, delay: 4 }).add(() => g.remove());
    };
    draw();
    const t = setInterval(draw, 1300);
    const born = performance.now();
    const wake = () => { if (performance.now() - born > 600) onWake(); };
    addEventListener('pointermove', wake); addEventListener('keydown', wake); addEventListener('pointerdown', wake);
    return () => { clearInterval(t); removeEventListener('pointermove', wake); removeEventListener('keydown', wake); removeEventListener('pointerdown', wake); };
  }, [onWake]);
  return (
    <div className="saver" role="presentation">
      <svg ref={ref} width="100%" height="100%" aria-hidden="true" />
      <p className="saver-t" aria-hidden="true">Skeptical<span>move to wake</span></p>
    </div>
  );
}

/** The ending: the desk dims to one window. */
function Off({ onWake }: { onWake: () => void }) {
  const chosen = useOS((s) => s.chosen) as Parameters<typeof JoinLinks>[0]['chosen'];
  const dim = useRef<HTMLDivElement>(null), box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    box.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
    if (still) return;
    gsap.timeline()
      .fromTo(dim.current, { opacity: 0 }, { opacity: 1, duration: 1.3, ease: 'steps(8)' })
      .fromTo(box.current, { scaleY: 0.02, scaleX: 0.4, opacity: 0 }, { scaleY: 1, scaleX: 1, opacity: 1, duration: 0.42, ease: 'expo.out' }, 1.1);
  }, []);
  return (
    <div className="off" role="dialog" aria-modal="true" aria-labelledby="off-t">
      <div className="off-dim" ref={dim} />
      <div className="off-win" ref={box}>
        <div className="win-bar"><p className="win-title"><span>join: finished</span></p><span className="win-grip" aria-hidden="true" /></div>
        <div className="off-body">
          <h2 className="off-t" id="off-t" tabIndex={-1}>{JOIN.title}</h2>
          <p className="off-lead">{JOIN.lead}</p>
          <JoinLinks chosen={chosen.length ? chosen : JOIN.paths.map((p) => p.id)} />
          <Footer />
          <button type="button" className="key" onClick={onWake}>Turn it back on</button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- the bar */

function Bar({ onPage, touch }: { onPage: () => void; touch?: boolean }) {
  const { open, set } = useOS.getState();
  const wins = useOS((s) => s.wins);
  const tidy = () => {
    const ids = APP_ORDER.filter((k) => wins[k].open && !wins[k].min);
    const next = { ...useOS.getState().wins };
    ids.forEach((k, i) => { next[k] = { ...next[k], x: 40 + i * 36, y: BAR + 20 + i * 36, max: false, z: 20 + i }; });
    useOS.setState({ wins: next, top: 20 + ids.length });
  };
  return (
    <header className="bar">
      <Menu className="menu--logo" label={<><QMark className="bar-q" dot="#15171d" /><span>Skeptical</span></>}>
        {(c) => (
          <>
            <button type="button" onClick={() => { c(); open('about'); }}>About this team</button>
            <button type="button" onClick={() => { c(); onPage(); }}>Read it as a page</button>
            {!touch && !still && <button type="button" onClick={() => { c(); set({ saver: true }); }}>Start the screensaver</button>}
            <hr />
            {FOOTER.pages.map((p) => <a key={p.href} href={p.href}>{p.label}<span aria-hidden="true"> ↗</span></a>)}
            <hr />
            <button type="button" onClick={() => { c(); set({ mode: 'off' }); }}>Shut down</button>
          </>
        )}
      </Menu>
      <Menu label="Open">
        {(c) => APPS.map((a) => <button key={a.id} type="button" onClick={() => { c(); open(a.id); }}><Px name={a.icon} size={22} shadow={false} />{a.title}</button>)}
      </Menu>
      {!touch && (
        <Menu label="Arrange">
          {(c) => (
            <>
              <button type="button" onClick={() => { c(); tidy(); }}>Tidy the windows</button>
              <button type="button" onClick={() => { c(); APP_ORDER.forEach((k) => wins[k].open && useOS.getState().minimise(k)); }}>Put them all on the shelf</button>
              <button type="button" onClick={() => { c(); APP_ORDER.forEach((k) => wins[k].open && useOS.getState().close(k)); }}>Close everything</button>
            </>
          )}
        </Menu>
      )}
      {!touch && <button type="button" className="menu-btn bar-page" onClick={onPage}>Read it as a page</button>}
      <span className="bar-gap" />
      <Prep />
      <Clock />
    </header>
  );
}

/* ------------------------------------------------------------ desk icons */

function Icons({ home }: { home: Record<string, { x: number; y: number }> }) {
  const [pos, setPos] = useState(home);
  const [sel, setSel] = useState<IconId | null>(null);
  const open = useOS((s) => s.open);
  const say = useOS((s) => s.say);
  const set = useOS((s) => s.set);
  const posRef = useRef(pos); posRef.current = pos;
  useEffect(() => setPos(home), [home]);

  const launch = (k: IconId, el: HTMLElement) => {
    if (k === 'page') { set({ mode: 'page' }); return; }
    open(k, el.querySelector('svg')!.getBoundingClientRect());
  };
  const spit = useCallback((k: IconId) => {
    const el = document.querySelector<HTMLElement>(`[data-icon="${k}"]`), bin = document.querySelector<HTMLElement>('[data-icon="trash"]');
    const back = home[k] ?? posRef.current[k];
    if (k === 'mark') say('The question mark won’t go in the trash.', MANIFESTO[3]);
    else say(`The trash won’t take ${iconLabel(k)}.`, 'Some things stay on the desk.');
    if (still || !el || !bin) { setPos((p) => ({ ...p, [k]: back })); return; }
    const t = posRef.current.trash;
    gsap.timeline()
      .to(el, { left: t.x, top: t.y - 10, scale: 0.6, duration: 0.25, ease: 'power2.in' })
      .to(bin, { keyframes: { rotate: [0, -12, 10, -6, 0] }, duration: 0.4 }, '>-0.05')
      .to(el, { left: back.x, top: back.y, scale: 1, rotate: 360, duration: 0.7, ease: 'back.out(2.2)' }, '>-0.15')
      .add(() => { gsap.set(el, { rotate: 0 }); setPos((p) => ({ ...p, [k]: back })); });
  }, [home, say]);
  useEffect(() => { const f = () => spit('mark'); document.addEventListener('desk:spit', f); return () => document.removeEventListener('desk:spit', f); }, [spit]);

  const down = (k: IconId) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const el = e.currentTarget, sx = e.clientX, sy = e.clientY, p0 = posRef.current[k];
    let moved = false;
    el.setPointerCapture(e.pointerId);
    const mv = (ev: PointerEvent) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 5) return;
      moved = true; el.classList.add('is-drag');
      const x = Math.min(innerWidth - 100, Math.max(0, p0.x + dx)), y = Math.min(innerHeight - SHELF - 96, Math.max(BAR, p0.y + dy));
      el.style.left = x + 'px'; el.style.top = y + 'px';
      const t = posRef.current.trash;
      document.querySelector('[data-icon="trash"]')?.classList.toggle('is-target', k !== 'trash' && Math.hypot(x - t.x, y - t.y) < 70);
    };
    const up = (ev: PointerEvent) => {
      el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      el.classList.remove('is-drag');
      document.querySelector('[data-icon="trash"]')?.classList.remove('is-target');
      if (!moved) return;
      el.dataset.moved = '1'; setTimeout(() => delete el.dataset.moved, 50);
      const x = Math.min(innerWidth - 100, Math.max(0, p0.x + ev.clientX - sx)), y = Math.min(innerHeight - SHELF - 96, Math.max(BAR, p0.y + ev.clientY - sy));
      const t = posRef.current.trash;
      if (k !== 'trash' && Math.hypot(x - t.x, y - t.y) < 70) { setPos((p) => ({ ...p, [k]: { x, y } })); requestAnimationFrame(() => spit(k)); }
      else setPos((p) => ({ ...p, [k]: { x, y } }));
    };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };

  return (
    <ul className="icons" aria-label="Desktop">
      {ICONS.map((k) => (
        <li key={k}>
          <button type="button" data-icon={k} className={cn('icon', sel === k && 'is-sel', k === 'mark' && 'icon--mark')}
            style={{ left: pos[k]?.x, top: pos[k]?.y }}
            onPointerDown={down(k)}
            onClick={(e) => {
              if (e.currentTarget.dataset.moved) return;
              // Keyboard, touch and a second click open; a first click selects.
              if (e.detail === 0 || coarse || sel === k && e.detail > 1) launch(k, e.currentTarget);
              else setSel(k);
            }}
            onDoubleClick={(e) => launch(k, e.currentTarget)}
            onKeyDown={(e) => { if ((e.key === 'Delete' || e.key === 'Backspace') && k !== 'trash') { e.preventDefault(); spit(k); } }}
            aria-label={`${iconLabel(k)}${k === 'page' ? '' : ', open'}`}>
            <Px name={iconPx(k)} size={64} />
            <span className="icon-l">{iconLabel(k)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------- the page reading */

const ORDER: { id: AppId; h: string }[] = [
  { id: 'readme', h: 'read-me.txt' }, { id: 'manifesto', h: 'manifesto.txt' }, { id: 'record', h: RECORD.title }, { id: 'drive', h: DRIVE.title },
  { id: 'people', h: PEOPLE.title }, { id: 'about', h: 'About this team.' }, { id: 'join', h: JOIN.title },
];
const FLAT: Record<string, () => React.ReactElement> = {
  readme: () => <Readme flat />, manifesto: () => <Manifesto flat />, record: () => <Record flat />, drive: () => <Drive flat />,
  people: () => <People flat />, about: () => <About flat />, join: () => <Join flat />,
};

function Page({ onDesk }: { onDesk: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    if (still || !root.current) return;
    gsap.fromTo(root.current.querySelectorAll('.pg-win'), { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'out', stagger: 0.07 });
  }, []);
  return (
    <div className="pg" ref={root}>
      <header className="pg-top">
        <p className="pg-mark"><QMark className="bar-q" dot="#15171d" /><span>Skeptical</span></p>
        <button type="button" className="key key--hi" onClick={onDesk}><Px name="mark3" size={24} shadow={false} />Use the desktop</button>
      </header>
      <main id="main" className="pg-main">
        <div className="pg-head">
          <h1 className="pg-h1">{SITE.heading}</h1>
          <p className="pg-note">Every window on the desktop, laid out in order as one page.</p>
        </div>
        {ORDER.map(({ id, h }, i) => (
          <section key={id} className={cn('pg-win', `pg-win--${id}`)} aria-labelledby={`pg-${id}`}>
            <div className="win-bar"><span className="pg-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><h2 className="win-title" id={`pg-${id}`}><span>{h}</span></h2><span className="win-grip" aria-hidden="true" /><Px name={byId[id].icon} size={28} shadow={false} className="win-ico" /></div>
            <div className="win-body">{FLAT[id]()}</div>
          </section>
        ))}
      </main>
      <footer className="pg-foot"><Footer /></footer>
    </div>
  );
}

/* ------------------------------------------------------------ touch sheets */

function Sheets() {
  const wins = useOS((s) => s.wins);
  const sheet = useOS((s) => s.sheet);
  const { set, close } = useOS.getState();
  const strip = useRef<HTMLDivElement>(null);
  const list = openSheets(wins);
  const idx = Math.max(0, sheet ? list.indexOf(sheet) : 0);
  const lock = useRef(false);
  useLayoutEffect(() => {
    const s = strip.current; if (!s || !sheet) return;
    const target = s.querySelector<HTMLElement>(`[data-sheet="${sheet}"]`);
    if (target && Math.abs(target.offsetLeft - s.scrollLeft) > 4) { lock.current = true; s.scrollTo({ left: target.offsetLeft, behavior: 'instant' as ScrollBehavior }); setTimeout(() => (lock.current = false), 60); }
  }, [sheet, list.length]);
  const onScroll = () => {
    const s = strip.current; if (!s || lock.current) return;
    const i = Math.round(s.scrollLeft / s.clientWidth);
    const id = list[i];
    if (id && id !== sheet) set({ sheet: id });
  };
  const go = (d: number) => { const id = list[Math.min(list.length - 1, Math.max(0, idx + d))]; if (id) { const t = strip.current?.querySelector<HTMLElement>(`[data-sheet="${id}"]`); strip.current?.scrollTo({ left: t?.offsetLeft ?? 0, behavior: still ? 'auto' : 'smooth' }); } };
  const cur = list[idx];
  if (!cur) return null;
  return (
    <div className="sheets" role="dialog" aria-label="Open windows" onKeyDown={(e) => { if (e.key === 'Escape') set({ sheet: null }); }}>
      <div className="sheets-top">
        <button type="button" className="ctl ctl--x" onClick={() => close(cur)} aria-label={`Close ${byId[cur].title}`}>×</button>
        <p className="sheets-t"><span>{byId[cur].title}</span><span className="sheets-n">{idx + 1} of {list.length}</span></p>
        <button type="button" className="ctl" disabled={idx === 0} onClick={() => go(-1)} aria-label="Previous window">‹</button>
        <button type="button" className="ctl" disabled={idx === list.length - 1} onClick={() => go(1)} aria-label="Next window">›</button>
        <button type="button" className="key sheets-desk" onClick={() => set({ sheet: null })}>Desk</button>
      </div>
      <div className="strip" ref={strip} onScroll={onScroll}>
        {list.map((id) => (
          <section key={id} data-sheet={id} className={cn('sheet', `win--${id}`)} aria-label={byId[id].title} aria-hidden={id !== cur} inert={id !== cur}>
            <div className="sheet-body">{BODY[id]()}</div>
          </section>
        ))}
      </div>
      <div className="dots" aria-hidden="true">{list.map((id) => <i key={id} className={cn(id === cur && 'on')} />)}</div>
    </div>
  );
}

function TouchDesk({ onPage }: { onPage: () => void }) {
  const sheet = useOS((s) => s.sheet);
  const wins = useOS((s) => s.wins);
  const { open, set } = useOS.getState();
  const n = openSheets(wins).length;
  return (
    <>
      <Bar onPage={onPage} touch />
      <main id="main" className="t-main" inert={!!sheet}>
        <h1 className="sr-only-x">{SITE.heading}</h1>
        <section className="t-widget win is-focus" aria-label="read-me.txt">
          <div className="win-bar"><h2 className="win-title"><span>read-me.txt</span></h2><span className="win-grip" aria-hidden="true" /><Px name="readme" size={26} shadow={false} className="win-ico" /></div>
          <div className="win-body"><Readme /></div>
        </section>
        <ul className="t-icons" aria-label="Desktop">
          {ICONS.filter((k) => k !== 'readme').map((k) => (
            <li key={k}>
              <button type="button" className="icon" data-icon={k} onClick={(e) => (k === 'page' ? set({ mode: 'page' }) : open(k, e.currentTarget.getBoundingClientRect()))}>
                <Px name={iconPx(k)} size={56} /><span className="icon-l">{iconLabel(k)}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="t-draft">{DRAFT}</p>
      </main>
      {!sheet && n > 0 && <button type="button" className="t-open key key--hi" onClick={() => set({ sheet: openSheets(useOS.getState().wins)[0] })}>{n} open <span aria-hidden="true">▲</span></button>}
      {sheet && <Sheets />}
    </>
  );
}

/* ------------------------------------------------------------------- root */

export default function Desktop() {
  useVersion('desktop');
  const mode = useOS((s) => s.mode);
  const saver = useOS((s) => s.saver);
  const set = useOS((s) => s.set);
  const [touch, setTouch] = useState(touchUI);
  const [size, setSize] = useState(() => ({ W: innerWidth, H: innerHeight }));
  const [home, setHome] = useState(() => iconHome(innerWidth, innerHeight));
  const booted = useRef(false);
  const lastMode = useRef<'desk' | 'page'>('desk');

  // First state: reduced motion and very small screens read it as a page; everyone else boots.
  useLayoutEffect(() => {
    const st = useOS.getState();
    const wins = firstLayout(innerWidth, innerHeight);
    if (touchUI()) { (['note', 'mark', 'record', 'manifesto'] as AppId[]).forEach((k) => { wins[k] = { ...wins[k], open: true }; }); wins.note = { ...wins.note, open: false }; wins.readme = { ...wins.readme, open: false }; }
    st.layout(wins);
    set({ mode: still || tiny() ? 'page' : 'boot', focus: 'readme', top: 10, sheet: null, saver: false, toast: null, zoom: null, chosen: [] });
  }, [set]);

  useEffect(() => {
    const r = () => {
      setTouch(touchUI());
      setSize({ W: innerWidth, H: innerHeight });
      setHome(iconHome(innerWidth, innerHeight));
      // Keep every window reachable when the screen shrinks.
      const w = { ...useOS.getState().wins };
      APP_ORDER.forEach((k) => { w[k] = { ...w[k], x: Math.min(w[k].x, innerWidth - 120), y: Math.min(w[k].y, innerHeight - SHELF - 60), w: Math.min(w[k].w, innerWidth - 20) }; });
      useOS.setState({ wins: w });
    };
    addEventListener('resize', r);
    return () => removeEventListener('resize', r);
  }, []);

  const onBooted = useCallback(() => {
    set({ mode: 'desk' });
    if (still) return;
    requestAnimationFrame(() => {
      const wins = [...document.querySelectorAll<HTMLElement>('.desk .win:not([hidden]), .desk .icon, .t-widget')];
      const icons = wins.filter((w) => w.classList.contains('icon')), ws = wins.filter((w) => !w.classList.contains('icon'));
      const order = ws.sort((a, b) => +(getComputedStyle(a).zIndex || 0) - +(getComputedStyle(b).zIndex || 0));
      gsap.fromTo('.wall', { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'steps(3)' });
      gsap.fromTo(icons, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.25, ease: 'steps(3)', stagger: 0.03, delay: 0.1, clearProps: 'opacity,transform' });
      gsap.fromTo(order, { opacity: 0, scale: 0.86 }, { opacity: 1, scale: 1, duration: 0.42, ease: 'back.out(1.8)', stagger: 0.14, delay: 0.45, clearProps: 'opacity,transform' });
    });
    booted.current = true;
  }, [set]);

  // Idle for forty seconds and the screensaver starts drawing.
  useEffect(() => {
    if (still || touch || mode !== 'desk') return;
    let last = performance.now();
    const poke = () => { last = performance.now(); };
    const evs = ['pointermove', 'pointerdown', 'keydown', 'wheel'];
    evs.forEach((e) => addEventListener(e, poke, { passive: true }));
    const t = setInterval(() => { if (performance.now() - last > 40000 && !useOS.getState().saver) set({ saver: true }); }, 2000);
    return () => { evs.forEach((e) => removeEventListener(e, poke)); clearInterval(t); };
  }, [mode, touch, set]);

  const toPage = useCallback(() => { lastMode.current = 'desk'; set({ mode: 'page', sheet: null }); }, [set]);
  const toDesk = useCallback(() => { set({ mode: booted.current ? 'desk' : 'boot' }); window.scrollTo(0, 0); }, [set]);
  const wake = useCallback(() => set({ saver: false }), [set]);
  const reboot = useCallback(() => set({ mode: 'boot' }), [set]);

  if (mode === 'page') return (
    <div className="v-desktop is-page" style={CURSORS as CSSProperties}>
      <a className="skip-x" href="#main">Skip to the page</a>
      <Page onDesk={toDesk} />
    </div>
  );

  return (
    <div className={cn('v-desktop', touch ? 'is-touch' : 'is-desk')} style={CURSORS as CSSProperties}>
      <a className="skip-x" href="#main">Skip to the desktop</a>
      <div className="desk" inert={mode === 'off' || mode === 'boot'} data-w={size.W}>
        <Wallpaper />
        {touch ? <TouchDesk onPage={toPage} /> : (
          <>
            <Bar onPage={toPage} />
            <main id="main" className="desk-main" onPointerDown={(e) => { if (e.target === e.currentTarget) (document.activeElement as HTMLElement | null)?.blur?.(); }}>
              <h1 className="sr-only-x">{SITE.heading}</h1>
              <Icons home={home} />
              {APPS.map((a) => <Window key={a.id} app={a} className={a.id === 'note' ? 'win--sticky' : undefined}>{BODY[a.id]()}</Window>)}
            </main>
            <Shelf apps={APPS} />
            <footer className="desk-draft">{DRAFT}</footer>
          </>
        )}
        <Toast />
        <Zoom />
      </div>
      {mode === 'boot' && <Boot onDone={onBooted} />}
      {saver && mode === 'desk' && <Saver onWake={wake} />}
      {mode === 'off' && <Off onWake={reboot} />}
    </div>
  );
}
