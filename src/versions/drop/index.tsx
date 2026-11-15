// Version 15: the drop. A dropped argument is a conceded argument, so the site
// falls down the screen as arguments and the visitor has to answer every one.
// What is caught is extended onto the flow; what is missed is stamped DROPPED.
// The complete flow sits under the game whatever happens in it.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource-variable/unbounded/wght.css';
import '@fontsource/chivo-mono/400.css';
import '@fontsource/chivo-mono/500.css';
import '@fontsource/chivo-mono/600.css';
import '@fontsource/chivo-mono/700.css';
import './drop.css';
import { FOOTER } from '@/content';
import { gsap, scrollToY } from '@/lib/scroll';
import { cn, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { Game, type Hud, type Phase } from './engine';
import { ITEMS, TOTAL, WAVES, type Marks, type Result } from './data';
import { play, soundOff, soundOn } from './sound';
import { A, Arrow, Body, Extras } from './parts';
import { FlowSheet } from './FlowSheet';

const pad = (n: number, l = 2) => String(n).padStart(l, '0');
const HUD0: Hud = { score: 0, combo: 0, mult: 1, lives: 3, wave: 0 };

const Speaker = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path d="M3 9.5h4l5-4.5v14l-5-4.5H3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    {on
      ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      : <path d="m16 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
  </svg>
);

const BallotMark = ({ lost }: { lost: boolean }) => (
  <svg viewBox="0 0 18 22" width="18" height="22" aria-hidden="true" className={lost ? 'is-lost' : undefined}>
    <path d="M1.5 1.5h11l4 4v15h-15z" fill="none" stroke="currentColor" strokeWidth="1.4" />
    {lost ? <path d="m5.5 9 7 7m0-7-7 7" fill="none" stroke="currentColor" strokeWidth="1.6" /> : <path d="m5 12.5 3 3 5.5-6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />}
  </svg>
);

export default function Drop() {
  useVersion('drop');
  const stage = useRef<HTMLElement>(null), field = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef<HTMLDivElement>(null), cardEl = useRef<HTMLDivElement>(null), again = useRef<HTMLButtonElement>(null);
  const game = useRef<Game | null>(null);
  const cardTl = useRef<gsap.core.Timeline | null>(null);
  const overAt = useRef(0), down = useRef<{ x: number; y: number } | null>(null);

  // With reduced motion the page opens on the flow, and the game is a choice.
  const [mode, setMode] = useState<'game' | 'plain'>(still ? 'plain' : 'game');
  const [phase, setPhase] = useState<Phase>('attract');
  const [hud, setHud] = useState<Hud>(HUD0);
  const [marks, setMarks] = useState<Marks>({});
  const [reached, setReached] = useState(-1);
  const [done, setDone] = useState(-1);
  const [result, setResult] = useState<Result | null>(null);
  const [sound, setSound] = useState(false);
  const [card, setCard] = useState<{ i: number; n: number } | null>(null);
  const [best, setBest] = useState(Game.best);
  const [lastId, setLastId] = useState('');
  const soundRef = useRef(false);

  const toggleSound = useCallback(async () => {
    if (soundRef.current) { soundRef.current = false; soundOff(); setSound(false); return; }
    soundRef.current = true; setSound(true);
    const ok = await soundOn();
    if (!ok) { soundRef.current = false; setSound(false); }
  }, []);

  // The engine lives outside React; the page only listens.
  useEffect(() => {
    if (mode !== 'game' || !canvas.current || !field.current) return;
    const el = stage.current!;
    const g = new Game(canvas.current, field.current, {
      phase: setPhase,
      hud: setHud,
      caught: (it) => { setMarks((m) => ({ ...m, [it.id]: 'caught' })); setLastId(it.id); },
      dropped: (it) => {
        setMarks((m) => ({ ...m, [it.id]: 'dropped' })); setLastId(it.id);
        el.classList.remove('is-hit'); void el.offsetWidth; el.classList.add('is-hit');
      },
      wave: (i) => { setReached(i); setCard((c) => ({ i, n: (c?.n ?? 0) + 1 })); },
      waveDone: (i) => setDone(i),
      reset: () => { setMarks({}); setReached(-1); setDone(-1); setResult(null); setHud(HUD0); setLastId(''); },
      over: (r) => {
        overAt.current = performance.now();
        setResult(r); setBest(r.best); setDone(WAVES.length - 1); setReached(WAVES.length - 1);
        // Whatever never fell is filled in and marked, so the flow is complete either way.
        setMarks((m) => { const o = { ...m }; for (const it of ITEMS) if (!o[it.id]) o[it.id] = 'unreached'; return o; });
      },
      sfx: play,
    });
    game.current = g;
    const mq = window.matchMedia('(max-width: 860px)');
    const side = () => { g.side = mq.matches ? 'top' : 'right'; };
    side(); mq.addEventListener('change', side);
    if (import.meta.env.DEV) (window as unknown as { __drop: Game }).__drop = g;
    return () => { mq.removeEventListener('change', side); g.destroy(); game.current = null; soundOff(); soundRef.current = false; };
  }, [mode]);

  const start = useCallback(() => {
    const g = game.current;
    if (!g) return;
    if (window.scrollY > 4) scrollToY(0, true);
    g.start();
  }, []);

  // Keys: space or enter starts and restarts, P or Escape pauses, M is the sound. The arrows belong to the engine.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement, g = game.current;
      if (!g || t.closest?.('input, textarea, select')) return;
      const inView = window.scrollY < window.innerHeight * 0.45;
      if (e.key === ' ' || e.key === 'Enter') {
        if (t.closest?.('a, button') || !inView) return;
        if (g.phase === 'attract' || (g.phase === 'over' && performance.now() - overAt.current > 700)) { e.preventDefault(); start(); }
        else if (g.phase === 'paused') { e.preventDefault(); g.pause(false); }
        else if (e.key === ' ') e.preventDefault();
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (g.phase === 'play' || g.phase === 'card' || g.phase === 'paused') { e.preventDefault(); g.pause(); }
      } else if (e.key === 'm' || e.key === 'M') void toggleSound();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [start, toggleSound]);

  // The live flow keeps its newest line in view.
  useEffect(() => {
    const box = live.current;
    if (!box || !lastId) return;
    const el = box.querySelector<HTMLElement>(`[data-id="${lastId}"]`);
    if (!el) return;
    const top = el.offsetTop + el.offsetHeight - box.clientHeight + 28;
    box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, [lastId, marks]);
  useEffect(() => { if (reached === 0 && !lastId) live.current?.scrollTo({ top: 0 }); }, [reached, lastId]);

  // Between waves: the section's heading takes the whole stage.
  useEffect(() => {
    const el = cardEl.current;
    if (!card || !el) return;
    const rows = el.querySelectorAll<HTMLElement>('.wc-row'), chars = el.querySelectorAll<HTMLElement>('.wc-main span'), rules = el.querySelectorAll<HTMLElement>('.wc-rule'), k = el.querySelector<HTMLElement>('.wc-k');
    const total = card.i === 0 ? 1.45 : 1.9;
    gsap.killTweensOf([el, rows, chars, rules, k]);
    const tl = gsap.timeline();
    tl.set(el, { display: 'grid' })
      .fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.14, ease: 'power1.out' }, 0)
      .fromTo(rules, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'expo.out', stagger: 0.05 }, 0)
      .fromTo(rows, { xPercent: (i) => (i % 2 ? 9 : -9), opacity: 0 }, { xPercent: (i) => (i % 2 ? -3 : 3), opacity: 1, duration: total, ease: 'power1.out' }, 0)
      .fromTo(chars, { yPercent: 115 }, { yPercent: 0, duration: 0.55, ease: 'expo.out', stagger: 0.022 }, 0.05)
      .fromTo(k, { opacity: 0 }, { opacity: 1, duration: 0.2 }, 0.1)
      .to(chars, { yPercent: -115, duration: 0.32, ease: 'power3.in', stagger: 0.012 }, total - 0.42)
      .to(rules, { scaleX: 0, duration: 0.3, ease: 'power3.in' }, total - 0.36)
      .to(el, { opacity: 0, duration: 0.22, ease: 'power1.in' }, total - 0.22)
      .set(el, { display: 'none' });
    cardTl.current = tl;
    return () => { tl.kill(); cardTl.current = null; };
  }, [card]);

  // A pause in the middle of a heading card holds the card too.
  useEffect(() => {
    const tl = cardTl.current;
    if (tl) { if (phase === 'paused') tl.pause(); else if (tl.paused()) tl.play(); }
    if (phase === 'over') {
      const id = window.setTimeout(() => again.current?.focus({ preventScroll: true }), 750);
      return () => clearTimeout(id);
    }
  }, [phase]);

  const caught = useMemo(() => Object.values(marks).filter((m) => m === 'caught').length, [marks]);
  const played = reached >= 0;
  const over = phase === 'over';
  const title = card ? WAVES[card.i].title : '';
  const words = title.split(' ');
  const longest = Math.max(1, ...words.map((w) => w.length));

  const verdict = !result ? '' : !result.win ? 'Round lost.' : result.dropped === 0 ? 'Clean flow.' : 'Round won.';
  const quip = !result ? '' : !result.win ? 'Three drops. The ballot is signed.' : result.dropped === 0 ? 'Nothing dropped. Nothing conceded.' : 'You answered enough of it.';
  const status = over ? `${verdict} ${result?.caught} extended, ${result?.dropped} dropped.` : card && (phase === 'card' || phase === 'play') ? `Wave ${card.i + 1}. ${title}` : '';

  return (
    <div className={cn('v-drop', mode === 'plain' && 'is-plain')}>
      <a className="skip-x" href="#main">Skip to the flow</a>

      {mode === 'plain' ? (
        <header className="plain">
          <p className="k">Skeptical</p>
          <h1>The drop.</h1>
          <p className="say">Drop it and you concede it.</p>
          <p className="note">This page is a catching game. It moves a lot, so it is off. The whole flow is below.</p>
          <p className="acts">
            <button type="button" className="btn" onClick={() => { setMode('game'); window.scrollTo(0, 0); }}>Play it anyway</button>
            <a className="btn is-quiet" href="#flow">Read the flow<Arrow down /></a>
          </p>
        </header>
      ) : (
        <section className="stage" ref={stage} data-phase={phase} data-wave={hud.wave} data-lives={hud.lives} aria-label="The game">
          <h1 className="sr-only-x">The drop.</h1>
          <div
            className="field" ref={field}
            onPointerDown={(e) => { down.current = { x: e.clientX, y: e.clientY }; }}
            onPointerUp={(e) => {
              const d = down.current; down.current = null;
              if (phase !== 'attract' || !d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12) return;
              if ((e.target as HTMLElement).closest('a, button')) return;
              start();
            }}
          >
            <canvas ref={canvas} aria-hidden="true" />

            <div className="hud">
              <p className="h-brand"><span>Skeptical</span><span className="h-sep" aria-hidden="true">/</span><span>The drop</span></p>
              <div className="h-score">
                <p><span className="h-k">Score</span><span className="h-v">{pad(hud.score, 6)}</span></p>
                <p className={cn('h-mult', hud.mult > 1 && 'is-up')}><span className="h-k">Combo</span><span className="h-v">x{hud.mult}<span className="h-pips" aria-hidden="true">{[0, 1, 2, 3, 4].map((i) => <i key={i} className={i < hud.combo % 5 || hud.mult >= 6 ? 'on' : undefined} />)}</span></span></p>
              </div>
              <p className="h-wave"><span className="h-k">Wave {pad(hud.wave + 1)}/{pad(WAVES.length)}</span><span className="h-v">{WAVES[hud.wave].title}</span></p>
              <div className="h-right">
                <p className="h-lives"><span className="sr-only-x">Ballots left: {hud.lives} of 3</span>{[0, 1, 2].map((i) => <BallotMark key={i} lost={i >= hud.lives} />)}</p>
                <button type="button" className="ic" aria-pressed={sound} onClick={() => void toggleSound()} aria-label={sound ? 'Sound on. Turn it off' : 'Sound off. Turn it on'}>
                  <Speaker on={sound} /><span className="ic-t" aria-hidden="true">{sound ? 'Sound on' : 'Sound off'}</span>
                </button>
                <button type="button" className="ic h-pause" onClick={() => game.current?.pause()} aria-label={phase === 'paused' ? 'Resume' : 'Pause'}>
                  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">{phase === 'paused' ? <path d="M8 5.5v13l10-6.5z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /> : <path d="M8.5 5.5v13m7-13v13" fill="none" stroke="currentColor" strokeWidth="1.8" />}</svg>
                </button>
              </div>
            </div>

            {phase === 'attract' && (
              <div className="title">
                <p className="say">Drop it and you concede it.</p>
                <button type="button" className="go-btn" onClick={start}>
                  <span className="on-key">Press space</span><span className="on-tap">Tap to start</span>
                </button>
                <ul className="how">
                  <li><span className="on-key">Mouse or arrow keys</span><span className="on-tap">Drag to move</span></li>
                  <li className="on-key"><kbd>Shift</kbd> prep time</li>
                  <li className="on-tap">Hold prep to slow it</li>
                  <li className="on-key"><kbd>P</kbd> pause</li>
                  <li className="on-key"><kbd>M</kbd> sound</li>
                  {best > 0 && <li className="how-best">Your best {pad(best, 6)}</li>}
                </ul>
                <a className="skip" href="#flow">Skip the game, read the flow<Arrow down /></a>
              </div>
            )}

            {(phase === 'play' || phase === 'card') && (
              <button
                type="button" className="prep"
                onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); game.current?.setPrep(true); }}
                onPointerUp={() => game.current?.setPrep(false)} onPointerCancel={() => game.current?.setPrep(false)}
                onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); game.current?.setPrep(true); } }}
                onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') game.current?.setPrep(false); }}
                onContextMenu={(e) => e.preventDefault()}
              >
                <kbd className="on-key" aria-hidden="true">Shift</kbd><span>Prep</span><span className="sr-only-x">: hold to slow the round</span>
              </button>
            )}

            {phase === 'paused' && (
              <div className="veil">
                <p className="v-big">Paused.</p>
                <button type="button" className="btn" onClick={() => game.current?.pause(false)} autoFocus>Resume <kbd>P</kbd></button>
                <a className="skip" href="#flow">Read the flow instead<Arrow down /></a>
              </div>
            )}

            {over && result && (
              <div className={cn('veil', 'ballot', result.win ? 'is-won' : 'is-lost')}>
                <p className="b-k">Decision</p>
                <h2 className="v-big">{verdict}</h2>
                <p className="b-quip">{quip}</p>
                <dl>
                  <div><dt>Extended</dt><dd>{result.caught}<small>/{result.total}</small></dd></div>
                  <div className={result.dropped ? 'is-bad' : undefined}><dt>Dropped</dt><dd>{result.dropped}</dd></div>
                  <div><dt>Best run</dt><dd>{result.maxCombo}</dd></div>
                  <div><dt>Your score</dt><dd>{pad(result.score, 6)}</dd></div>
                  <div><dt>{result.newBest ? 'New best' : 'Your best'}</dt><dd>{pad(result.best, 6)}</dd></div>
                </dl>
                <p className="acts">
                  <button type="button" className="btn" ref={again} onClick={start}>Play again <kbd className="on-key">space</kbd></button>
                  <a className="btn is-quiet" href="#flow">Read the whole flow<Arrow down /></a>
                </p>
                <p className="b-note">{result.dropped + (TOTAL - result.caught - result.dropped) > 0 ? 'Everything you missed is filled in below, marked.' : 'The whole flow is below.'}</p>
              </div>
            )}
          </div>

          <aside className={cn('live', !lastId && !over && 'is-empty')} aria-label="Your flow">
            <header>
              <h2>Your flow</h2>
              <p className="l-tally"><b>{pad(caught)}</b>/{TOTAL} extended</p>
            </header>
            <div className="l-scroll" ref={live} data-lenis-prevent tabIndex={0} role="group" aria-label="What you have caught">
              <ul className="l-hint">
                <li><span className="hk"><Arrow /></span><span>Catch it and it is extended.</span></li>
                <li><span className="hk hk-no">Dropped</span><span>Miss it and it is conceded.</span></li>
                <li><span className="hk hk-b" aria-hidden="true"><BallotMark lost /><BallotMark lost /><BallotMark lost /></span><span>Three drops lose the round.</span></li>
              </ul>
              {WAVES.map((w, i) => {
                const rows = w.items.filter((it) => marks[it.id]);
                const got = rows.filter((it) => marks[it.id] === 'caught').length;
                return (
                  <section key={w.id} className={cn('lw', i <= reached && 'is-open', i === hud.wave && played && !over && 'is-now')}>
                    <h3><span className="lw-n" aria-hidden="true">{pad(i + 1)}</span><span className="lw-t">{w.title}</span><span className="lw-c">{i <= reached ? `${got}/${w.items.length}` : w.items.length}</span></h3>
                    {rows.length > 0 && (
                      <ol>
                        {rows.map((it) => {
                          const m = marks[it.id]!;
                          return (
                            <li key={it.id} data-id={it.id} className={cn('le', `is-${m}`, it.kind === 'sub' && 'is-sub')}>
                              <span className="le-mk">{m === 'caught' ? <Arrow /> : m === 'dropped' ? 'Dropped' : 'Not reached'}</span>
                              {m === 'dropped' && !over
                                ? <p className="le-gone"><span className="le-bar" aria-hidden="true" /><span>Conceded.</span></p>
                                : <Body it={it} />}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                    {i <= done && <div className="lw-ex"><Extras wave={i} /></div>}
                  </section>
                );
              })}
            </div>
            <a className="skip" href="#flow">Skip the game, read the flow<Arrow down /></a>
          </aside>

          <div className="wavecard" ref={cardEl} aria-hidden="true" style={{ '--len': title.length, '--word': longest } as React.CSSProperties}>
            <span className="wc-rule" />
            <p className="wc-k">Wave {pad((card?.i ?? 0) + 1)} of {pad(WAVES.length)}</p>
            <div className="wc-stack">
              <p className="wc-row wc-ghost">{title}</p>
              <p className="wc-row wc-main">{words.map((w, wi) => <span className="wc-word" key={wi}>{w.split('').map((ch, ci) => <span key={ci}>{ch}</span>)}</span>)}</p>
              <p className="wc-row wc-ghost">{title}</p>
            </div>
            <span className="wc-rule" />
          </div>
          <p className="sr-only-x" role="status">{status}</p>
        </section>
      )}

      <main id="main">
        <FlowSheet marks={marks} played={played} over={over} />
      </main>

      <footer className="foot">
        <div className="yours">
          <p className="k">Your round</p>
          <p className="y-num"><b>{pad(caught)}</b><span>/{TOTAL}</span></p>
          <p className="y-say">{!played ? 'Nothing caught yet.' : over ? `${verdict} ${result?.dropped ?? 0} dropped.` : 'Still falling.'}</p>
          {mode === 'game'
            ? <button type="button" className="btn" onClick={() => { scrollToY(0, true); if (game.current?.phase === 'paused') game.current.pause(false); else start(); }}>{played ? 'Run it back' : 'Play the game'}</button>
            : <button type="button" className="btn" onClick={() => { setMode('game'); window.scrollTo(0, 0); }}>Play it anyway</button>}
        </div>
        <p className="last">{FOOTER.line}</p>
        <ul className="f-links">{FOOTER.links.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <ul className="f-pages">{FOOTER.pages.map((l) => <li key={l.href}><A href={l.href}>{l.label}</A></li>)}</ul>
        <small>The scores on this page are yours, not the team’s. Draft 2, version 15. Not the live site.</small>
      </footer>
    </div>
  );
}
