// Version 18: the vault. The drive is behind a round steel door. You can work
// the dial and the wheel as long as you like; it opens with a link from a
// coach, and not otherwise.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/index.css';
import './vault.css';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import { gsap } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { STEP, STOPS, tryHandle, turnDial, vault } from './stage';
import { enableSound, tick } from './sound';
import { RIM_TEXT } from './tex';

const Scene = lazy(() => import('./Scene'));

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

/** What the door says when the handle is tried. Interface words only. */
const NO = ['Refused.', 'No. The bolts hold.', 'Still shut.', 'Not from this side.', 'That is not the way in.', 'Locked, on purpose.', 'It never opens here.'];

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** The door drawn flat, for a browser without WebGL. */
function FlatDoor() {
  return (
    <svg className="flat" viewBox="-310 -310 620 620" role="img" aria-label="A round vault door, shut">
      <defs><path id="vault-rim" d="M 0,-183 a 183,183 0 1,1 0,366 a 183,183 0 1,1 0,-366" /></defs>
      <circle r="305" className="f0" /><circle r="236" className="f1" /><circle r="206" className="f2" />
      <circle r="166" className="f3" />
      <text className="ft"><textPath href="#vault-rim">{RIM_TEXT}</textPath></text>
      <circle cy="-56" r="47" className="f4" /><circle cy="86" r="22" className="f5" />
      {[0, 1, 2, 3, 4].map((i) => <line key={i} x1="0" y1="86" x2={Math.cos((i / 5) * 6.283 - 1.571) * 74} y2={86 + Math.sin((i / 5) * 6.283 - 1.571) * 74} className="f5" />)}
    </svg>
  );
}

export default function Vault() {
  useVersion('vault');
  const root = useRef<HTMLDivElement>(null);
  const num = useRef<HTMLSpanElement>(null), slider = useRef<HTMLDivElement>(null), seqEl = useRef<HTMLSpanElement>(null), count = useRef<HTMLSpanElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const [opened, setOpened] = useState(still || !webgl);
  const [fontsOk, setFontsOk] = useState(false);
  const [verdict, setVerdict] = useState<{ no: string; dialled: string; k: number } | null>(null);
  const [sound, setSound] = useState(false);
  const [box, setBox] = useState(0);
  const boxHover = useRef(-1), boxPinned = useRef(-1);
  useRise(root);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // The textures are lettered on canvases, so the type has to be in before the vault is built.
  useEffect(() => {
    let live = true;
    Promise.all([document.fonts.load('600 64px "Bodoni Moda Variable"'), document.fonts.load('italic 600 64px "Bodoni Moda Variable"'), document.fonts.load('600 32px "Hanken Grotesk Variable"')])
      .catch(() => null).then(() => { if (live) setFontsOk(true); });
    const t = setTimeout(() => live && setFontsOk(true), 2500);
    return () => { live = false; clearTimeout(t); };
  }, []);

  // The words arrive once the light has found the door.
  useEffect(() => {
    if (opened) return;
    const id = setInterval(() => { if (vault.ready && vault.open > 0.32) setOpened(true); }, 100);
    const t = setTimeout(() => setOpened(true), 7000);
    return () => { clearInterval(id); clearTimeout(t); };
  }, [opened]);

  // The dial and the handle talk back.
  useEffect(() => {
    let lastDir = 0, travel = 0, prev = 0, attempts = 0;
    const seq: number[] = [];
    const show = () => { if (seqEl.current) seqEl.current.textContent = [0, 1, 2].map((i) => (seq[i] === undefined ? '__' : String(seq[i]).padStart(2, '0'))).join('  '); };
    show();
    vault.onDetent = (n, dir) => {
      if (lastDir && dir !== lastDir && travel >= 3) { seq.push(prev); if (seq.length > 3) seq.shift(); show(); travel = 0; }
      if (dir !== lastDir) travel = 0;
      lastDir = dir; travel++; prev = n;
      tick();
      if (num.current) {
        num.current.textContent = String(n).padStart(2, '0');
        if (!still) gsap.fromTo(num.current, { y: dir * -6 }, { y: 0, duration: 0.18, ease: 'out', overwrite: true });
      }
      slider.current?.setAttribute('aria-valuenow', String(n));
    };
    vault.onTry = () => {
      const dialled = seq.length ? seq.map((x) => String(x).padStart(2, '0')).join(' ') : '';
      setVerdict({ no: NO[attempts % NO.length], dialled, k: attempts });
      attempts++;
      if (count.current) count.current.textContent = String(attempts);
      seq.length = 0; show(); lastDir = 0; travel = 0;
    };
    vault.onBox = (i) => { boxPinned.current = i; setBox(i); };
    return () => { vault.onDetent = null; vault.onTry = null; vault.onBox = null; };
  }, []);

  // Measure where each stop is on the page so the camera knows when to hold and when to travel.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const measure = () => {
      const vh = window.innerHeight, sy = window.scrollY, max = Math.max(1, document.documentElement.scrollHeight - vh);
      const list = STOPS.map((name, i) => {
        const s = el.querySelector<HTMLElement>(`[data-stop="${name}"]`);
        if (!s) return { a: 0, b: 0 };
        const r = s.getBoundingClientRect(), top = r.top + sy;
        let a = top - vh * 0.18, b = top + r.height - vh * 0.82;
        if (b < a) { const m = (a + b) / 2; a = m - 10; b = m + 10; }
        if (i === 0) a = 0;
        if (i === STOPS.length - 1) { a = Math.min(a, max - 40); b = max + vh; }
        return { a, b };
      });
      for (let i = 0; i < list.length - 1; i++) if (list[i].b > list[i + 1].a - 60) { const m = (list[i].b + list[i + 1].a) / 2; list[i].b = m - 30; list[i + 1].a = m + 30; }
      vault.stops = list;
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    document.fonts.ready.then(measure);
    const t = setTimeout(measure, 900);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, [phone]);

  // While the drive is being read, the box under the reading line comes out.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const rows = Array.from(el.querySelectorAll<HTMLElement>('[data-box]'));
    let last = -2;
    const loop = () => {
      let w = boxHover.current >= 0 ? boxHover.current : boxPinned.current;
      const inDrive = Math.abs(vault.f - 5) < 0.6;
      if (w < 0 && inDrive) {
        const line = window.innerHeight * (isPhone() ? 0.7 : 0.5); let best = Infinity; w = 0;
        rows.forEach((r, i) => { const b = r.getBoundingClientRect(), d = Math.abs(b.top + b.height / 2 - line); if (d < best) { best = d; w = i; } });
      }
      if (!inDrive && boxHover.current < 0) { w = -1; boxPinned.current = -1; }
      if (w !== last) { last = w; vault.box = w; if (w >= 0) setBox(w); }
      el.dataset.shot = STOPS[Math.round(Math.min(STOPS.length - 1, Math.max(0, vault.f)))];
    };
    gsap.ticker.add(loop);
    return () => gsap.ticker.remove(loop);
  }, []);

  const dialKey = (e: React.KeyboardEvent) => {
    const big = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); for (let i = 0; i < big; i++) turnDial(STEP); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); for (let i = 0; i < big; i++) turnDial(-STEP); }
    else if (e.key === 'PageUp') { e.preventDefault(); for (let i = 0; i < 10; i++) turnDial(STEP); }
    else if (e.key === 'PageDown') { e.preventDefault(); for (let i = 0; i < 10; i++) turnDial(-STEP); }
  };
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); if (!vault.wheelLock) { vault.wheelLock = true; vault.wheelV = 7; } }
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); if (!vault.wheelLock) { vault.wheelLock = true; vault.wheelV = -7; } }
  };
  // Holding a turn button keeps the dial going, faster the longer you hold.
  const hold = useRef<number | null>(null);
  const startHold = (dir: number) => {
    turnDial(dir * STEP);
    let n = 0;
    const go = () => { n++; turnDial(dir * STEP * (n > 12 ? 2 : 1)); hold.current = window.setTimeout(go, n > 4 ? 45 : 110); };
    hold.current = window.setTimeout(go, 320);
  };
  const stopHold = () => { if (hold.current) clearTimeout(hold.current); hold.current = null; };
  const toggleSound = async () => {
    const on = !sound;
    if (on) await enableSound().catch(() => null);
    vault.sound = on; setSound(on);
  };

  return (
    <div className={`v-vault${opened ? ' is-open' : ''}${phone ? ' is-phone' : ''}${webgl ? '' : ' no-gl'}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      {webgl && fontsOk && <div className="stage" aria-hidden="true"><Suspense fallback={null}><Scene key={phone ? 'p' : 'd'} phone={phone} /></Suspense></div>}
      {webgl && <div className="scrim" aria-hidden="true" />}

      <header className="top">
        <a className="brand" href="#top" aria-label="Skeptical, back to the top">Skeptical<i>?</i></a>
        <nav aria-label="Sections">{NAV.map((n) => <a key={n.id} href={`#${n.id}`}>{n.label}</a>)}</nav>
      </header>

      <main id="main">
        <section className="stop hero" data-stop="hero" id="top" aria-label={SITE.heading}>
          <div className="col">
            <p className="kicker"><span>{HERO.statement[1]}</span></p>
            <h1 className="pitch">{HERO.pitch.map((l, i) => <span className="ln" key={l}><span style={{ transitionDelay: `${0.08 + i * 0.14}s` }}>{l}</span></span>)}</h1>
            <p className="statement">{HERO.statement.map((s, i) => <span key={s} style={{ transitionDelay: `${0.5 + i * 0.09}s` }}>{s}</span>)}</p>
            <p className="doors">{HERO.doors.map((d) => <A key={d.href} href={d.href}>{d.label}</A>)}</p>
            {webgl && !still && <p className="hint">Drag the dial. Spin the wheel.</p>}
          </div>
          {!webgl && <FlatDoor />}
        </section>

        <section className="stop say at-r" data-stop="rim" aria-label="How the team works">
          <div className="col">
            <p className="tag" data-rise>Cut into the rim</p>
            <p className="line" data-rise>{MANIFESTO[0]}</p>
            <p className="line" data-rise>{MANIFESTO[1]}</p>
          </div>
        </section>

        <section className="stop say" data-stop="bolts">
          <div className="col">
            <p className="tag" data-rise>The bolts</p>
            <p className="line big" data-rise>{MANIFESTO[2]}</p>
          </div>
        </section>

        <section className="stop play" data-stop="dial" aria-labelledby="try-h">
          <div className="col">
            <h2 className="title" id="try-h" data-rise>Try the door.</h2>
            <div className="lock" data-rise>
              <div className="read">
                <button type="button" className="turn" aria-label="Turn the dial back" onPointerDown={(e) => { e.preventDefault(); startHold(-1); }} onPointerUp={stopHold} onPointerLeave={stopHold} onPointerCancel={stopHold} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); turnDial(-STEP); } }}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
                </button>
                <div className="dial-num" ref={slider} role="slider" tabIndex={0} aria-label="The dial. Arrow keys turn it." aria-valuemin={0} aria-valuemax={99} aria-valuenow={0} onKeyDown={dialKey}>
                  <span className="caret" aria-hidden="true" /><span ref={num}>00</span>
                </div>
                <button type="button" className="turn" aria-label="Turn the dial on" onPointerDown={(e) => { e.preventDefault(); startHold(1); }} onPointerUp={stopHold} onPointerLeave={stopHold} onPointerCancel={stopHold} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); turnDial(STEP); } }}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
              <p className="seq"><span className="lbl">Dialled</span> <span ref={seqEl} className="digits">__  __  __</span></p>
              <p className="how">Turn one way, then back. Each turn back sets a number.</p>
              <div className="acts">
                <button type="button" className="handle" onClick={() => tryHandle()} onKeyDown={handleKey}>Turn the handle</button>
                <button type="button" className="snd" aria-pressed={sound} onClick={toggleSound}>{sound ? 'Sound on' : 'Sound off'}</button>
              </div>
              <div className={`verdict${verdict ? ' is-in' : ''}`} aria-live="polite">
                {verdict ? (
                  <div key={verdict.k} className="v-in">
                    <p className="no"><span className="lamp" aria-hidden="true" />{verdict.no}{verdict.dialled && <span className="dd"> {verdict.dialled}</span>}</p>
                    <p className="lead">{DRIVE.lead}</p>
                    <p className="tries">Tries <span ref={count}>{verdict.k + 1}</span></p>
                  </div>
                ) : <p className="idle"><span className="lamp off" aria-hidden="true" />The lamp is off.</p>}
              </div>
            </div>
          </div>
        </section>

        <section className="stop sec at-r" data-stop="record" id="record">
          <div className="col">
            <h2 className="title" data-rise>{RECORD.title}</h2>
            <p className="lead" data-rise>{RECORD.rule}</p>
            <p className="event" data-rise><b>{RECORD.when}</b> {RECORD.name}, {RECORD.where}</p>
            <ul className="results">
              {RECORD.results.map((r) => <li data-rise key={r.who}><h3>{r.what}</h3><p><b>{r.who}</b> {r.more}</p></li>)}
            </ul>
            <p data-rise><A className="more" href={RECORD.more.href}>{RECORD.more.label}</A></p>
          </div>
        </section>

        <section className="stop sec" data-stop="drive" id="drive">
          <div className="col">
            <h2 className="title" data-rise>{DRIVE.title}</h2>
            <p className="lead" data-rise>{DRIVE.lead}</p>
            <ol className="boxes">
              {DRIVE.items.map((d, i) => (
                <li key={d.term} data-box data-rise>
                  <button type="button" className={box === i ? 'is-on' : undefined} aria-pressed={box === i}
                    onPointerEnter={(e) => { if (e.pointerType !== 'touch') { boxHover.current = i; } }} onPointerLeave={() => { boxHover.current = -1; }}
                    onFocus={() => { boxHover.current = i; }} onBlur={() => { boxHover.current = -1; }}
                    onClick={() => { boxPinned.current = i; setBox(i); }}>
                    <span className="no">{String(i + 1).padStart(2, '0')}</span>
                    <span className="term">{d.term}</span>
                    <span className="txt">{d.text}</span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="shut" data-rise>Each box comes out a finger’s width. Then it stops.</p>
            <p data-rise><A className="more" href={DRIVE.more.href}>{DRIVE.more.label}</A></p>
          </div>
        </section>

        <section className="stop sec at-r" data-stop="people" id="people">
          <div className="col">
            <h2 className="title" data-rise>{PEOPLE.title}</h2>
            <p className="tag" data-rise>Two keys, two hooks</p>
            <ul className="coaches">
              {PEOPLE.coaches.map((c, i) => (
                <li data-rise key={c.name} onPointerEnter={(e) => { if (e.pointerType !== 'touch') vault.swing[i] = 0.6; }}>
                  <h3>{c.name}</h3>
                  <p className="role">{c.role}</p>
                  <p>{c.bio}</p>
                  <button type="button" className="ring" onClick={() => { vault.swing[i] = 1; }}>Swing the key</button>
                </li>
              ))}
            </ul>
            <p className="lead" data-rise>{PEOPLE.count}</p>
            <p data-rise><A className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A></p>
          </div>
        </section>

        <section className="stop sec join" data-stop="join" id="join">
          <div className="col">
            <p className="line" data-rise>{MANIFESTO[3]}</p>
            <h2 className="title" data-rise>{JOIN.title}</h2>
            <p className="tag" data-rise>How you get a key</p>
            <p className="lead" data-rise>{JOIN.lead}</p>
            <ol className="ways">
              {JOIN.paths.map((p, i) => (
                <li key={p.id} data-rise>
                  <a href={p.href} rel="noopener"><span className="n">{['I', 'II', 'III'][i]}</span><span className="name">{p.name}</span><span className="what">{p.line}</span></a>
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
        <div className="col">
          <p className="last" data-rise>{FOOTER.line}</p>
          <ul data-rise>{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <ul data-rise className="pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
          <small>Draft 2, version 18. Not the live site.</small>
        </div>
      </footer>
    </div>
  );
}
