// Version 13: the letters. SKEPTICAL? stands in the room as ten heavy
// objects. You can push the name over; it gets back up.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource/anton/400.css';
import '@fontsource-variable/archivo/wdth.css';
import './letters.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import MARKS from '@/lib/marks.json';
import { gsap } from '@/lib/scroll';
import { Split, useRise } from '@/lib/motion';
import { clamp, isPhone, smooth, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import GLYPHS from './glyphs.json';
import { makePlan, STOPS, WORD } from './plan';
import { resetStage, stage } from './stage';

const Stage = lazy(() => import('./Stage'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

/** What each camera position is called, in the corner. */
const SLATE = ['Front', 'Under the hook', 'Along the floor', 'Set down', 'The keyhole', 'Behind the name', 'Over the top', 'From above', 'Three ways in', 'All standing'];
/** Where the reading line sits on screen: the middle, or the middle of the lower half on a phone. */
const READ = (phone: boolean) => (phone ? 0.735 : 0.5);

function hasWebGL() {
  // /letters?flat shows the page as it is without WebGL.
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** The word as flat type, for a browser with no WebGL. */
function FlatWord() {
  let pen = 0;
  const parts = WORD.split('').map((ch) => { const g = GLYPHS.glyphs.find((x) => x.ch === ch)!; const el = <path key={ch} d={g.d} transform={`translate(${pen - g.x} 0)`} />; pen += g.advance + 46; return el; });
  const k = 1000 / MARKS.italic.h;
  return (
    <svg className="flat" viewBox={`-20 -985 ${pen + 660} 1050`} role="img" aria-label="Skeptical?">
      {parts}
      <path className="q" d={MARKS.italic.d} transform={`translate(${pen + 310} -455) scale(${k})`} />
    </svg>
  );
}

export default function Letters() {
  useVersion('letters');
  const root = useRef<HTMLDivElement>(null), slate = useRef<HTMLSpanElement>(null), slateN = useRef<HTMLSpanElement>(null), count = useRef<HTMLSpanElement>(null), locked = useRef<HTMLParagraphElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const [opened, setOpened] = useState(still || !webgl);
  const [way, setWay] = useState(0);
  const hoverWay = useRef(-1);
  const plan = useMemo(() => makePlan(phone), [phone]);
  useRise(root);

  // One plan for wide screens and one for phones; crossing the line rebuilds the set.
  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // The opening: the page waits for its fonts, then the letters come down, then the words arrive.
  useEffect(() => {
    resetStage();
    stage.onOpened = () => setOpened(true);
    let live = true;
    const go = () => { if (live) { stage.go = true; stage.wake = Math.max(stage.wake, 90); } };
    const t0 = setTimeout(go, 1500);
    document.fonts.ready.then(() => setTimeout(go, 350));
    const t1 = setTimeout(() => setOpened(true), 9000);
    return () => { live = false; clearTimeout(t0); clearTimeout(t1); stage.onOpened = null; };
  }, [phone]);

  // Measure where each stop is on the page, so the camera knows when to hold and when to travel.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const measure = () => {
      const vh = window.innerHeight, sy = window.scrollY, read = READ(isPhone());
      const max = Math.max(1, document.documentElement.scrollHeight - vh);
      const list = STOPS.map((name, i) => {
        const s = el.querySelector<HTMLElement>(`[data-stop="${name}"]`);
        if (!s) return { a: 0, b: 0 };
        const r = s.getBoundingClientRect(), top = r.top + sy;
        // A tall section holds for as long as it takes to read down it.
        const body = s.querySelector<HTMLElement>('[data-body]')?.getBoundingClientRect() ?? r;
        const mid = body.top + sy + body.height / 2, half = Math.max(0, (body.height - vh * (isPhone() ? 0.4 : 0.7)) / 2) + vh * 0.09;
        let a = mid - half, b = mid + half;
        if (i === 0) { a = 0; b = Math.max(vh * read + vh * 0.06, Math.min(b, top + r.height - vh * 0.3)); }
        if (i === STOPS.length - 1) { a = Math.min(a, max + vh * read - vh * 0.05); b = max + vh; }
        return { a, b };
      });
      for (let i = 0; i < list.length - 1; i++) if (list[i].b > list[i + 1].a - 40) { const m = (list[i].b + list[i + 1].a) / 2; list[i].b = m - 20; list[i + 1].a = m + 20; }
      stage.stops = list.map((s) => ({ a: s.a - vh * read + vh * 0.5, b: s.b - vh * read + vh * 0.5 }));
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    window.addEventListener('resize', measure);
    document.fonts.ready.then(measure);
    const t = setTimeout(measure, 800);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); clearTimeout(t); };
  }, [phone, opened]);

  // Every frame: the corner slate, the pointer, the phone's window, and which way in is nearest the reading line.
  useEffect(() => {
    const el = root.current; if (!el) return;
    let lastShot = -1, lastCount = -1, lastWay = -1, over = false, cut = -1;
    const rows = Array.from(el.querySelectorAll<HTMLElement>('[data-way]'));
    const tick = () => {
      const shot = Math.round(clamp(stage.f, 0, STOPS.length - 1));
      if (shot !== lastShot) { lastShot = shot; if (slate.current) slate.current.textContent = SLATE[shot]; if (slateN.current) slateN.current.textContent = String(shot + 1).padStart(2, '0'); el.dataset.shot = STOPS[shot]; }
      if (stage.shoves !== lastCount) { lastCount = stage.shoves; if (count.current) count.current.textContent = String(lastCount).padStart(3, '0'); }
      if (stage.over !== over) { over = stage.over; el.classList.toggle('can-push', over); }
      const c = isPhone() ? smooth(clamp((stage.f - 0.08) / 0.8)) : 0;
      if (Math.abs(c - cut) > 0.001) { cut = c; el.style.setProperty('--cut', c.toFixed(3)); }
      // Which of the three ways the dot should mark: the one under the pointer, or the one being read.
      let w = hoverWay.current;
      if (w < 0 && stage.f > 7.3) {
        const line = window.innerHeight * READ(isPhone()); let best = Infinity; w = 0;
        rows.forEach((r, i) => { const b = r.getBoundingClientRect(), d = Math.abs(b.top + b.height / 2 - line); if (d < best) { best = d; w = i; } });
      }
      if (w >= 0 && w !== lastWay) { lastWay = w; stage.way = w; setWay(w); }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [phone]);

  // Keys: type a letter of the name to knock it over.
  useEffect(() => {
    if (still || !webgl) return;
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const ch = e.key.toUpperCase();
      if (ch.length === 1 && (WORD.includes(ch) || ch === '?')) stage.cmds.push({ type: 'key', ch });
    };
    window.addEventListener('keydown', key);
    stage.onLocked = (x, y) => {
      const p = locked.current; if (!p) return;
      p.style.left = `${clamp(x, 110, window.innerWidth - 110)}px`; p.style.top = `${Math.max(70, y - 18)}px`;
      gsap.killTweensOf(p);
      gsap.fromTo(p, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.22, ease: 'out' });
      gsap.to(p, { autoAlpha: 0, duration: 0.3, delay: 1.5 });
    };
    return () => { window.removeEventListener('keydown', key); stage.onLocked = null; };
  }, [webgl]);

  const play = !still && webgl;
  return (
    <div className={`v-letters${opened ? ' is-open' : ''}${phone ? ' is-phone' : ''}${webgl ? '' : ' no-gl'}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      {webgl && <div className="stage" aria-hidden="true"><Suspense fallback={null}><Stage key={phone ? 'p' : 'd'} plan={plan} /></Suspense></div>}
      {webgl && <div className="sill" aria-hidden="true" />}

      <header className="top">
        <a className="brand" href="#top" aria-label="Skeptical, back to the top">Skeptical<i>?</i></a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
      </header>

      {webgl && (
        <aside className="hud" aria-label="The set" data-nopush>
          {play && <p className="how">{phone ? 'Or tap a letter.' : 'Or click a letter. Or type one.'}</p>}
          <p className="slate" aria-hidden="true"><span ref={slateN}>01</span><span ref={slate}>{SLATE[0]}</span>{play && <span className="tally">Pushed <span ref={count}>000</span></span>}</p>
          {play && <button type="button" className="shove" onClick={() => stage.cmds.push({ type: 'all' })}>Push it over</button>}
        </aside>
      )}
      <p className="locked" ref={locked} role="status">Locked. That part is private.</p>

      <main id="main">
        <section className="stop hero" data-stop="hero" id="top" aria-label={SITE.heading}>
          <Split as="h1" className="pitch" on={opened ? 'load' : 'none'} delay={0.05} key={String(opened)}>{HERO.pitch.join(' ')}</Split>
          <div className="side">
            <p className="statement">{HERO.statement.map((s) => <span key={s}>{s}</span>)}</p>
            <p className="doors">{HERO.doors.map((d) => <A key={d.href} href={d.href}>{d.label}</A>)}</p>
          </div>
          {!webgl && <FlatWord />}
        </section>

        <section className="stop say" data-stop="m1" aria-label="How the team works">
          <Split as="p" className="line">{MANIFESTO[0]}</Split>
        </section>
        <section className="stop say at-r" data-stop="m2">
          <Split as="p" className="line">{MANIFESTO[1]}</Split>
        </section>

        <section className="stop sec" data-stop="record" id="record">
          <div className="col" data-body>
            <Split as="h2" className="title">{RECORD.title}</Split>
            <p className="lead" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise><b>{RECORD.when}</b> {RECORD.name}, {RECORD.where}</p>
            <ul className="results">
              {RECORD.results.map((r) => <li data-rise key={r.who}><h3>{r.what}</h3><p><b>{r.who}</b> {r.more}</p></li>)}
            </ul>
            <p data-rise><A className="more" href={RECORD.more.href}>{RECORD.more.label}</A></p>
          </div>
        </section>

        <section className="stop say" data-stop="m3">
          <Split as="p" className="line">{MANIFESTO[2]}</Split>
        </section>

        <section className="stop sec" data-stop="drive" id="drive">
          <div className="col" data-body>
            <Split as="h2" className="title">{DRIVE.title}</Split>
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <dl className="kit">
              {DRIVE.items.map((d, i) => <div data-rise key={d.term}><dt><span>{String(i + 1).padStart(2, '0')}</span>{d.term}</dt><dd>{d.text}</dd></div>)}
            </dl>
            <p data-rise><A className="more" href={DRIVE.more.href}>{DRIVE.more.label}</A></p>
          </div>
        </section>

        <section className="stop sec at-r" data-stop="people" id="people">
          <div className="col" data-body>
            <Split as="h2" className="title">{PEOPLE.title}</Split>
            <ul className="coaches">
              {PEOPLE.coaches.map((c) => <li data-rise key={c.name}><h3><span aria-hidden="true">{c.name[0]}</span>{c.name}</h3><p><b>{c.role}.</b> {c.bio}</p></li>)}
            </ul>
            <p className="lead" data-rise>{PEOPLE.count}</p>
            <p data-rise><A className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>
          </div>
        </section>

        <section className="stop say wide" data-stop="m4">
          <Split as="p" className="line">{MANIFESTO[3]}</Split>
        </section>

        <section className="stop sec at-r" data-stop="join" id="join">
          <div className="col" data-body>
            <Split as="h2" className="title">{JOIN.title}</Split>
            <p className="lead" data-rise>{JOIN.lead}</p>
            <ol className="ways">
              {JOIN.paths.map((p, i) => (
                <li key={p.id} data-way className={way === i ? 'is-on' : undefined}
                  onPointerEnter={(e) => { if (e.pointerType !== 'touch') hoverWay.current = i; }} onPointerLeave={() => { hoverWay.current = -1; }}
                  onFocus={() => { hoverWay.current = i; }} onBlur={() => { hoverWay.current = -1; }}>
                  <a href={p.href} rel="noopener"><span className="name">{p.name}</span><span className="what">{p.line}</span></a>
                  <ul>{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
                </li>
              ))}
            </ol>
            <p className="after" data-rise>{JOIN.discord}</p>
            <p className="after" data-rise>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
            <p className="after" data-rise>{JOIN.also} <A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
          </div>
        </section>
      </main>

      <footer className="stop end" data-stop="end">
        <div className="foot" data-body>
          <p className="last">{FOOTER.line}</p>
          <ul>{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul>{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <small>Draft 2, version 13. Not the live site.</small>
        </div>
      </footer>
    </div>
  );
}
