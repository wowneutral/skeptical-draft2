// Version 30: the flip. Elims start with a coin. The site's two doors are the
// two faces of one struck brass coin; where it lands decides which side tells the page.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import '@fontsource-variable/bodoni-moda/index.css';
import '@fontsource-variable/bodoni-moda/wght-italic.css';
import '@fontsource-variable/archivo/wdth.css';
import './flip.css';
import { HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER, NAV } from '@/content';
import MARKS from '@/lib/marks.json';
import { gsap } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { coin, toss, type Face } from './store';
import { enableSound } from './sound';

const Coin = lazy(() => import('./Coin'));

const SIDE_NAME = ['Debater side', 'Coach side'] as const;
const PATH = (id: string) => JOIN.paths.find((p) => p.id === id)!;
const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** A flat drawing of either face, for the corner coin and for browsers without WebGL. */
function CoinFace({ face, id }: { face: Face; id: string }) {
  const k = 112 / MARKS.italic.h;
  return (
    <svg viewBox="-100 -100 200 200" className="coin-svg" aria-hidden="true">
      <defs>
        <radialGradient id={`g${id}`} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#f6dc9a" /><stop offset="0.55" stopColor="#c9963f" /><stop offset="1" stopColor="#6e4c1a" />
        </radialGradient>
      </defs>
      <circle r="98" fill={`url(#g${id})`} />
      <circle r="90" fill="none" stroke="#5a3d12" strokeWidth="3" opacity="0.6" />
      <circle r="84" fill="none" stroke="#fff3c8" strokeWidth="1.5" strokeDasharray="1.5 4.2" opacity="0.8" />
      {face === 0 ? (
        <path d={MARKS.italic.d} transform={`scale(${k})`} fill="#5a3d12" opacity="0.85" />
      ) : (
        <g fill="#5a3d12" opacity="0.85">
          {Array.from({ length: 9 }, (_, i) => {
            const a = Math.PI / 2 + 0.35 + (i / 8) * 2.0;
            return [1, -1].map((sx) => (
              <ellipse key={`${i}${sx}`} cx={Math.cos(a) * 52 * sx} cy={Math.sin(a) * 52} rx="4" ry="10" transform={`rotate(${((a + Math.PI / 2) * 180) / Math.PI * sx + 35 * sx} ${Math.cos(a) * 52 * sx} ${Math.sin(a) * 52})`} />
            ));
          })}
          <path d="M-26 -20 L26 -30 L28 -20 L-24 -11 Z M-6 -14 h12 v40 h-12 Z M-20 34 h40 l-7 -9 h-26 Z" />
        </g>
      )}
    </svg>
  );
}

/** Your own flips, as tally marks. Kept in this browser only. */
function Tally({ n }: { n: number }) {
  const groups = Math.ceil(n / 5);
  const shown = Math.min(groups, 12);
  return (
    <svg className="tally" viewBox={`0 0 ${Math.max(1, shown) * 44} 40`} role="img" aria-label={`${n} flips so far`}>
      {Array.from({ length: shown }, (_, g) => {
        const c = Math.min(5, n - g * 5);
        return (
          <g key={g} transform={`translate(${g * 44 + 4} 4)`}>
            {Array.from({ length: Math.min(4, c) }, (_, i) => <path key={i} d={`M${i * 7 + 2} 0 q1 16 -1 32`} />)}
            {c === 5 && <path d="M-2 26 L30 6" />}
          </g>
        );
      })}
    </svg>
  );
}

type Tal = { a: number; b: number; e: number };
const readTally = (): Tal => { try { const v = JSON.parse(localStorage.getItem('flip-tally') || ''); if (typeof v.a === 'number') return v; } catch { /* none yet */ } return { a: 0, b: 0, e: 0 }; };

export default function Flip() {
  useVersion('flip');
  const root = useRef<HTMLDivElement>(null), sheet = useRef<HTMLDivElement>(null), shade = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [side, setSide] = useState<Face>(0);
  const [tally, setTally] = useState<Tal>(readTally);
  const [note, setNote] = useState('');
  const [call, setCall] = useState<Face | null>(null);
  const [greet, setGreet] = useState('');
  const [dial, setDial] = useState(0);
  const [sound, setSound] = useState(false);
  const [busy, setBusy] = useState(false);
  const turning = useRef(false);
  const sideRef = useRef<Face>(0);
  useRise(root);

  // the felt colour follows the side
  useEffect(() => {
    sideRef.current = side;
    document.documentElement.style.background = side ? '#e9d9ae' : '#0e2a22';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', side ? '#e9d9ae' : '#0e2a22');
  }, [side]);

  /** The page turns over like a sheet of paper, and comes back told from the other side. */
  const turnTo = useCallback((f: Face) => {
    coin.face = f;
    if (f === sideRef.current || turning.current) return;
    const el = sheet.current;
    if (still || !el) { setSide(f); return; }
    turning.current = true;
    const oy = window.scrollY + window.innerHeight / 2;
    gsap.set(el, { transformOrigin: `50% ${oy}px` });
    gsap.set(el.parentElement, { perspectiveOrigin: `50% ${oy}px` });
    gsap.timeline({ onComplete: () => { turning.current = false; gsap.set(el, { clearProps: 'transform' }); } })
      .to(el, { rotateX: 90, duration: 0.45, ease: 'power3.in' }, 0)
      .to(shade.current, { opacity: 0.85, duration: 0.45, ease: 'power2.in' }, 0)
      .call(() => { flushSync(() => setSide(f)); })
      .fromTo(el, { rotateX: -90 }, { rotateX: 0, duration: 0.8, ease: 'back.out(1.1)' })
      .to(shade.current, { opacity: 0, duration: 0.6, ease: 'power2.out' }, '<');
  }, []);

  const count = (f: Face | -1) => setTally((t) => {
    const n = { ...t, a: t.a + (f === 0 ? 1 : 0), b: t.b + (f === 1 ? 1 : 0), e: t.e + (f === -1 ? 1 : 0) };
    try { localStorage.setItem('flip-tally', JSON.stringify(n)); } catch { /* private window */ }
    return n;
  });

  const landed = useCallback((f: Face | -1, slot: 'hero' | 'call') => {
    count(f);
    setBusy(false);
    if (slot === 'hero') {
      if (f === -1) setNote('On its edge. Nobody gets a side. Reflip.');
      else { setNote(f === sideRef.current ? `${SIDE_NAME[f]} again.` : `${SIDE_NAME[f]} up. The page turns.`); turnTo(f); }
    } else {
      setCall((c) => {
        if (f === -1) setGreet('On its edge. Call it again.');
        else if (c === f) setGreet('You called it. Pick your way in.');
        else setGreet('Wrong call. Come in anyway.');
        return c;
      });
    }
  }, [turnTo]);

  useEffect(() => { coin.onLand = landed; return () => { coin.onLand = null; }; }, [landed]);
  useEffect(() => { coin.dial = dial; }, [dial]);

  const doToss = useCallback((speed: number, slot: 'hero' | 'call') => {
    if (slot === 'call' && call === null) { setGreet('Call a face first.'); return; }
    if (still || !webgl) {
      const r = Math.random();
      const f: Face | -1 = r < 1 / 60 ? -1 : r < 0.5 + 1 / 120 ? 0 : 1;
      if (f !== -1) coin.face = f;
      landed(f, slot);
      return;
    }
    if (toss(speed, slot)) { setBusy(true); if (slot === 'hero') setNote(''); else setGreet(''); }
  }, [call, webgl, landed]);

  // Flick: the faster the thumb goes up, the higher and faster it spins. A tap is a gentle toss.
  const flick = (slot: 'hero' | 'call') => {
    let y0 = 0, t0 = 0, y1 = 0, t1 = 0, on = false;
    return {
      onPointerDown: (e: React.PointerEvent) => { on = true; y0 = y1 = e.clientY; t0 = t1 = performance.now(); (e.target as Element).setPointerCapture?.(e.pointerId); },
      onPointerMove: (e: React.PointerEvent) => { if (on) { y0 = y1; t0 = t1; y1 = e.clientY; t1 = performance.now(); } },
      onPointerUp: (e: React.PointerEvent) => {
        if (!on) return; on = false;
        const dy = y0 - e.clientY, dt = Math.max(8, performance.now() - t0);
        const v = dy / dt; // px per ms, up is positive
        doToss(v > 0.15 ? Math.min(1, v / 2.2) : 0.3, slot);
      },
      onPointerCancel: () => { on = false; },
    };
  };
  const heroFlick = flick('hero'), callFlick = flick('call');

  // Space flips whichever coin you are looking at.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      const t = e.target as HTMLElement;
      if (t.closest('button, a, input, textarea, select')) return;
      const callEl = document.getElementById('call-slot');
      const r = callEl?.getBoundingClientRect();
      const inCall = r && r.top < innerHeight * 0.8 && r.bottom > innerHeight * 0.2;
      if (window.scrollY < innerHeight * 0.5) { e.preventDefault(); doToss(0.6, 'hero'); }
      else if (inCall) { e.preventDefault(); doToss(0.6, 'call'); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [doToss]);

  const toggleSound = async () => {
    if (!sound) { try { await enableSound(); } catch { return; } }
    coin.sound = !sound; setSound(!sound);
  };

  const n = tally.a + tally.b + tally.e;
  const fallback = (f: Face) => (!webgl ? <div className="fallback"><CoinFace face={f} id={`fb${f}`} /></div> : null);
  const coachSide = side === 1;
  const doors = coachSide ? [HERO.doors[1], HERO.doors[0]] : HERO.doors;
  const paths = coachSide ? [PATH('coach'), PATH('lecture'), PATH('compete')] : [PATH('compete'), PATH('lecture'), PATH('coach')];

  // ----- sections
  const manifesto = (
    <section className="sec manifesto" key="m" aria-labelledby="m-h">
      <div className="slot-wrap"><div className="slot edge" data-slot="edge">{fallback(side)}</div><p className="cap">Spun on its edge.</p></div>
      <div className="m-text">
        <h2 id="m-h" className="kicker">Before the round.</h2>
        <ol className="m-lines">
          {MANIFESTO.map((l, i) => <li key={i} data-rise><span className="m-n">{['I', 'II', 'III', 'IV'][i]}</span>{l}</li>)}
        </ol>
      </div>
    </section>
  );

  const lead = coachSide ? (
    <section className="sec lead" key="l" id="side" aria-labelledby="l-h">
      <p className="kicker">Coach side up.</p>
      <h2 id="l-h" className="big">Run the room.</h2>
      <div className="lead-cols">
        {[PATH('coach'), PATH('lecture')].map((p) => (
          <article key={p.id} className="lead-path" data-rise>
            <h3><span className="pn">{p.name}.</span> <span className="pl">{p.line}</span></h3>
            <ul>{p.text.map((t, i) => <li key={i}>{t}</li>)}</ul>
            <A className="door" href={p.href}>{p.id === 'coach' ? HERO.doors[1].label : `${p.name}: ${p.line}`}<span aria-hidden="true"> &rarr;</span></A>
          </article>
        ))}
      </div>
    </section>
  ) : (
    <section className="sec lead" key="l" id="side" aria-labelledby="l-h">
      <p className="kicker">Debater side up.</p>
      <h2 id="l-h" className="big">Compete.</h2>
      <div className="lead-cols one">
        <article className="lead-path" data-rise>
          <h3><span className="pl">{PATH('compete').line}</span></h3>
          <ul>{PATH('compete').text.map((t, i) => <li key={i}>{t}</li>)}</ul>
          <A className="door" href={PATH('compete').href}>{HERO.doors[0].label}<span aria-hidden="true"> &rarr;</span></A>
        </article>
      </div>
    </section>
  );

  const drive = (
    <section className="sec drive" key="d" id="drive" aria-labelledby="d-h">
      <div className="d-head">
        <h2 id="d-h" className="big">{DRIVE.title}</h2>
        <p className="lede">{DRIVE.lead}</p>
      </div>
      <div className="d-body">
        <div className="dial-wrap">
          <div className="slot dial" data-slot="dial">{fallback(side)}</div>
          <span className="index-mark" aria-hidden="true" />
          {DRIVE.items.map((it, i) => {
            const a = -Math.PI / 2 + (i / 7) * Math.PI * 2;
            return <span key={it.term} aria-hidden="true" className={`ring-term${i === dial ? ' on' : ''}`} style={{ left: `${50 + Math.cos(a - (dial / 7) * Math.PI * 2) * 61}%`, top: `${50 + Math.sin(a - (dial / 7) * Math.PI * 2) * 61}%` }}>{it.term}</span>;
          })}
        </div>
        <div className="d-list">
          <p className="cap">Turn the dial. It stays locked.</p>
          <ul>
            {DRIVE.items.map((it, i) => (
              <li key={it.term}>
                <button type="button" className={`d-item${i === dial ? ' on' : ''}`} aria-pressed={i === dial} onClick={() => setDial(i)}>
                  <span className="d-term">{it.term}</span><span className="d-text">{it.text}</span>
                </button>
              </li>
            ))}
          </ul>
          <A className="more" href={DRIVE.more.href}>{DRIVE.more.label}</A>
        </div>
      </div>
    </section>
  );

  const record = (
    <section className="sec record" key="r" id="record" aria-labelledby="r-h">
      <div className="r-text">
        <h2 id="r-h" className="big">{RECORD.title}</h2>
        <p className="rule">{RECORD.rule}</p>
        <p className="event"><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
        <ul className="results">
          {RECORD.results.map((r) => (
            <li key={r.who} data-rise><span className="r-what">{r.what}</span><span className="r-who">{r.who}</span><span className="r-more">{r.more}</span></li>
          ))}
        </ul>
        <A className="more" href={RECORD.more.href}>{RECORD.more.label}</A>
      </div>
      <div className="slot-wrap"><div className="slot seal" data-slot="seal">{fallback(side)}</div><p className="cap">Set face up, as a seal.</p></div>
    </section>
  );

  const people = (
    <section className="sec people" key="p" id="people" aria-labelledby="p-h">
      <h2 id="p-h" className="big">{PEOPLE.title}</h2>
      <div className="slot split" data-slot="split">{!webgl && <div className="fallback two"><CoinFace face={0} id="s0" /><CoinFace face={1} id="s1" /></div>}</div>
      <div className="coaches">
        {PEOPLE.coaches.map((c, i) => (
          <article key={c.name} className="coach" tabIndex={0} aria-label={`${c.name}, ${c.role}`}
            onPointerEnter={() => { coin.coachHover = i; }} onPointerLeave={() => { coin.coachHover = -1; }}
            onFocus={() => { coin.coachHover = i; }} onBlur={() => { coin.coachHover = -1; }}>
            <p className="c-face">{i === 0 ? 'The mark' : 'The wreath'}</p>
            <h3>{c.name}</h3>
            <p className="c-role">{c.role}</p>
            <p className="c-bio">{c.bio}</p>
          </article>
        ))}
      </div>
      <p className="count">{PEOPLE.count}</p>
      <A className="more" href={PEOPLE.more.href}>{PEOPLE.more.label}</A>
    </section>
  );

  const join = (
    <section className="sec join" key="j" id="join" aria-labelledby="j-h">
      <div className="call">
        <div className="call-text">
          <p className="kicker">{JOIN.title}</p>
          <h2 id="j-h" className="big">Call it.</h2>
          <p className="lede">{JOIN.lead}</p>
          <div className="calls" role="group" aria-label="Call a face">
            {([0, 1] as Face[]).map((f) => (
              <button key={f} type="button" className={`call-btn${call === f ? ' on' : ''}`} aria-pressed={call === f} onClick={() => { setCall(f); setGreet(''); }}>
                <CoinFace face={f} id={`c${f}`} /><span>{f === 0 ? 'The mark' : 'The wreath'}</span>
              </button>
            ))}
          </div>
          <button type="button" className="flip-btn" disabled={busy} onClick={() => doToss(0.65, 'call')}>Flip</button>
          <p className="greet" aria-live="polite">{greet || (call === null ? 'Pick a face, then flip.' : 'Flick it, tap it, or press Flip.')}</p>
        </div>
        <div className="slot call-slot" id="call-slot" data-slot="call" {...callFlick}>{fallback(call ?? side)}</div>
      </div>
      <ol className="paths">
        {paths.map((p, i) => (
          <li key={p.id} className={`path${i === 0 ? ' first' : ''}`} data-rise>
            <A href={p.href}>
              <span className="p-name">{p.name}</span>
              <span className="p-line">{p.line}</span>
              <span className="p-text">{p.text[0]}</span>
              <span className="p-go" aria-hidden="true">&rarr;</span>
            </A>
          </li>
        ))}
      </ol>
      <div className="join-small">
        <p>{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A></p>
        <p>{JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A></p>
        <p>{JOIN.also} <A href={FOOTER.links[4].href}>{FOOTER.links[4].label}</A></p>
        <p>{JOIN.discord}</p>
      </div>
    </section>
  );

  const order = coachSide ? [manifesto, lead, people, record, drive, join] : [manifesto, lead, drive, record, people, join];

  return (
    <div ref={root} className={`v-flip side-${side ? 'coach' : 'debater'}`}>
      <a className="skip-x" href="#main">Skip to content</a>
      {webgl && <Suspense fallback={null}><Coin /></Suspense>}
      <div className="turn-shade" ref={shade} aria-hidden="true" />
      <button type="button" className="corner" onClick={() => turnTo(side ? 0 : 1)} aria-label={`${SIDE_NAME[side]} up. Turn to the ${side ? 'debater' : 'coach'} side`}>
        <span className="corner-in" style={{ transform: `rotateY(${side * 180}deg)` }}>
          <span className="cf"><CoinFace face={0} id="k0" /></span>
          <span className="cf back"><CoinFace face={1} id="k1" /></span>
        </span>
      </button>
      <div className="stage">
        <div className="sheet" ref={sheet}>
          <header className="top">
            <span className="word">Skeptical</span>
            <nav aria-label="Sections">{NAV.map((x) => <a key={x.id} href={`#${x.id}`}>{x.label}</a>)}</nav>
          </header>
          <main id="main">
            <section className="hero" aria-labelledby="h1">
              <div className="h-text">
                <p className="kicker side-tag">{SIDE_NAME[side]} up.</p>
                <h1 id="h1" className="pitch">{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</h1>
                <p className="statement">{HERO.statement.map((l) => <span key={l}>{l}</span>)}</p>
                <div className="doors">
                  {doors.map((d, i) => <A key={d.label} className={`door${i === 0 ? ' lead-door' : ''}`} href={d.href}>{d.label}<span aria-hidden="true"> &rarr;</span></A>)}
                </div>
              </div>
              <div className="h-coin">
                <div className="slot hero-slot" data-slot="hero" {...heroFlick} aria-hidden="true">{fallback(side)}</div>
                <div className="h-ctl">
                  <button type="button" className="flip-btn" disabled={busy} onClick={() => doToss(0.65, 'hero')}>Flip</button>
                  <p className="instr">Flick it up, or press space.</p>
                  <button type="button" className="snd" aria-pressed={sound} onClick={toggleSound}>{sound ? 'Sound on' : 'Sound off'}</button>
                </div>
                <p className="note" aria-live="polite">{note}</p>
                <div className="tally-box">
                  <p className="t-h">Your flips</p>
                  {n > 0 ? <Tally n={n} /> : <p className="t-none">None yet.</p>}
                  <p className="t-split">Mark {tally.a}. Wreath {tally.b}.{tally.e ? ` Edge ${tally.e}.` : ''}</p>
                </div>
              </div>
            </section>
            {order}
          </main>
          <footer className="foot">
            <p className="f-line">{FOOTER.line}</p>
            <ul className="f-links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
            <ul className="f-pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
            <p className="f-draft">Draft 2, version 30. Not the live site.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
