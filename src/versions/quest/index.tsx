// Version 32: the hallway. A tiny pixel game on a tournament night: walk the
// school hall, read what is posted, try the locked room, and find the door with
// no name on it yet. A journal below keeps everything read, in order.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import '@fontsource/silkscreen/400.css';
import '@fontsource/silkscreen/700.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './quest.css';
import { FOOTER, HERO, JOIN, SITE } from '@/content';
import { still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { scrollToId } from '@/lib/scroll';
import { Game } from './engine';
import { CHAPTERS, ENTRIES, JOURNAL_IDS, type Line } from './data';
import { ICONS, PAL } from './art';
import { sfx, soundOff, soundOn } from './sound';

const Icon = ({ rows, size = 4 }: { rows: string[]; size?: number }) => {
  const w = Math.max(...rows.map((r) => r.length));
  return (
    <svg viewBox={`0 0 ${w} ${rows.length}`} width={w * size} height={rows.length * size} aria-hidden="true" shapeRendering="crispEdges">
      {rows.flatMap((r, y) => [...r].map((ch, x) => (ch === '.' ? null : <rect key={x + '-' + y} x={x} y={y} width="1" height="1" fill={PAL[parseInt(ch, 16)]} />)))}
    </svg>
  );
};

const ext = (href: string) => (href.startsWith('mailto') ? {} : { target: '_blank', rel: 'noreferrer' });

function Lines({ lines, upto = Infinity }: { lines: Line[]; upto?: number }) {
  let n = upto;
  return (
    <>
      {lines.map((ln, i) => {
        if (n <= 0) return null;
        return (
          <p key={i}>
            {ln.map((s, k) => {
              if (n <= 0) return null;
              const t = s.t.slice(0, Math.max(0, n)); n -= s.t.length;
              const shown = t.length < s.t.length ? <>{t}<span className="q-ghost" aria-hidden="true">{s.t.slice(t.length)}</span></> : t;
              if (s.href) return <a key={k} href={s.href} {...ext(s.href)}>{shown}</a>;
              if (s.b) return <strong key={k}>{shown}</strong>;
              return <span key={k}>{shown}</span>;
            })}
          </p>
        );
      })}
    </>
  );
}
const count = (lines: Line[]) => lines.reduce((a, l) => a + l.reduce((b, s) => b + s.t.length, 0), 0);

type Box = { id: string; page: number };
const ITEM_NAMES: Record<string, string> = { pen: 'Pen', pass: 'Hall pass', can: 'Can of fizz', empty: 'Empty can', cat: 'A cat' };
const DIRS: [string, string, string][] = [['up', 'Walk up', 'M6 1 11 9H1z'], ['left', 'Walk left', 'M1 6 9 1v10z'], ['right', 'Walk right', 'M11 6 3 1v10z'], ['down', 'Walk down', 'M6 11 11 3H1z']];
const NO = ['No.', 'Still no.', 'Nope.', 'Not even close.', 'It never opens.', 'Try the table instead.'];

export default function Quest() {
  useVersion('quest');
  const cv = useRef<HTMLCanvasElement>(null), stage = useRef<HTMLElement>(null), wrap = useRef<HTMLDivElement>(null);
  const game = useRef<Game | null>(null);
  const [started, setStarted] = useState(false);
  const [box, setBox] = useState<Box | null>(null);
  const [typed, setTyped] = useState(0);
  const [found, setFound] = useState<string[]>([]);
  const [readAll, setReadAll] = useState(still);
  const [inv, setInv] = useState<string[]>([]);
  const [spin, setSpin] = useState(0);
  const [pad, setPad] = useState(false);
  const [keypad, setKeypad] = useState<{ code: string; no: number; msg: string } | null>(null);
  const [ending, setEnding] = useState(false);
  const [sound, setSound] = useState(false);
  const boxRef = useRef<Box | null>(null); boxRef.current = box;
  const flags = useRef({ vend: 0 });

  const open = useCallback((id: string) => {
    setBox({ id, page: 0 }); setTyped(still ? 1e6 : 0);
    if (game.current) { game.current.paused = true; game.current.keys.clear(); }
    if (JOURNAL_IDS.includes(id)) setFound((f) => (f.includes(id) ? f : [...f, id]));
  }, []);
  const close = useCallback(() => { setBox(null); if (game.current) game.current.paused = false; }, []);
  const give = useCallback((it: string) => { setInv((v) => (v.includes(it) ? v : [...v, it])); sfx('get'); }, []);

  const act = useCallback((a: string) => {
    const g = game.current!;
    if (a === 'switch') { g.lights = !g.lights; open(g.lights ? 'on' : 'off'); sfx('key'); }
    else if (a === 'pen') { g.take('pen'); give('pen'); open('pen'); }
    else if (a === 'pass') { g.take('pass'); give('pass'); open('pass'); }
    else if (a === 'vend') { if (!flags.current.vend++) { give('can'); open('vend1'); } else open('vend2'); }
    else if (a === 'closet') open(g.has.has('pass') ? 'opened' : 'closed');
    else if (a === 'cat') { if (!g.cat.on) { g.wakeCat(); give('cat'); open('cat1'); } else { g.pet(); open('cat2'); } }
    else if (a === 'keypad') { g.paused = true; g.keys.clear(); setKeypad({ code: '', no: 0, msg: 'Enter code.' }); }
  }, [give, open]);

  // The game.
  useEffect(() => {
    const g = new Game(cv.current!, {
      read: (id) => open(id), act, end: () => { setEnding(true); },
      sfx: (n) => sfx(n),
    }, still);
    game.current = g;
    if (import.meta.env.DEV) (window as unknown as { __quest: Game }).__quest = g;
    const fit = () => { const r = wrap.current!.getBoundingClientRect(); g.resize(r.width, r.height); };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(wrap.current!);
    g.start();
    setPad(window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760);
    return () => { g.stop(); ro.disconnect(); soundOff(); };
  }, [act, open]);

  // Typewriter.
  const entry = box ? ENTRIES[box.id] : null, lines = entry ? entry.pages[box!.page] : [];
  const total = count(lines);
  useEffect(() => {
    if (!box || typed >= total) return;
    const h = setTimeout(() => { setTyped((t) => t + 2); if (typed % 6 === 0) sfx('blip'); }, 24);
    return () => clearTimeout(h);
  }, [box, typed, total]);

  const advance = useCallback(() => {
    const b = boxRef.current; if (!b) return;
    const e = ENTRIES[b.id], n = count(e.pages[b.page]);
    if (typed < n) { setTyped(1e6); return; }
    if (b.page + 1 < e.pages.length) { setBox({ id: b.id, page: b.page + 1 }); setTyped(still ? 1e6 : 0); }
    else close();
  }, [typed, close]);

  const start = useCallback(() => {
    if (started) return;
    setStarted(true);
    const g = game.current; if (g) { g.attract = false; g.paused = false; }
    cv.current?.focus({ preventScroll: true });
  }, [started]);

  // Keys.
  useEffect(() => {
    const map: Record<string, string> = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
    const inStage = () => { const r = stage.current?.getBoundingClientRect(); return !!r && r.bottom > innerHeight * 0.5 && r.top < innerHeight * 0.5; };
    const down = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tgt = e.target as HTMLElement;
      if (!inStage()) return;
      if (ending || keypad) { if (e.key === 'Escape') { setEnding(false); setKeypad(null); if (game.current) game.current.paused = false; } return; }
      if (!started) { if (e.key === 'Tab' || e.key === 'Shift') return; if (tgt.closest('a,button') && (e.key === 'Enter' || e.key === ' ')) return; e.preventDefault(); start(); return; }
      if (box) {
        if (['KeyE', 'KeyZ', 'Space', 'Enter', 'NumpadEnter'].includes(e.code)) { if (tgt.closest('a')) return; e.preventDefault(); advance(); }
        else if (e.key === 'Escape') close();
        return;
      }
      const d = map[e.code];
      if (d) { e.preventDefault(); game.current?.hold(d, true); return; }
      if (['KeyE', 'KeyZ', 'Space', 'Enter'].includes(e.code) && !tgt.closest('a,button')) { e.preventDefault(); game.current?.interact(); }
    };
    const up = (e: KeyboardEvent) => { const d = map[e.code]; if (d) game.current?.hold(d, false); };
    addEventListener('keydown', down); addEventListener('keyup', up);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); };
  }, [started, box, ending, keypad, advance, close, start]);

  const onCanvas = (e: React.PointerEvent) => {
    if (!started) { start(); return; }
    if (box) { advance(); return; }
    if (keypad || ending) return;
    game.current?.tap(e.clientX, e.clientY, cv.current!.getBoundingClientRect());
  };

  const toggleSound = async () => { if (sound) { soundOff(); setSound(false); } else { await soundOn(); setSound(true); } };
  const pressKey = (k: string) => {
    if (!keypad) return;
    sfx('key');
    if (k === 'C') return setKeypad({ ...keypad, code: '', msg: 'Enter code.' });
    if (k === 'OK') { sfx('buzz'); const m = NO[Math.min(keypad.no, NO.length - 1)]; return setKeypad({ code: '', no: keypad.no + 1, msg: m }); }
    if (keypad.code.length < 4) setKeypad({ ...keypad, code: keypad.code + k, msg: 'Enter code.' });
  };
  const closeKeypad = () => { setKeypad(null); if (game.current) game.current.paused = false; cv.current?.focus({ preventScroll: true }); };
  const leaveEnd = () => { setEnding(false); const g = game.current; if (g) { g.p.y += 18; g.p.dir = 0; g.paused = false; } cv.current?.focus({ preventScroll: true }); };
  const drink = () => { setInv((v) => v.map((x) => (x === 'can' ? 'empty' : x))); sfx('get'); };

  const show = (id: string) => readAll || found.includes(id);

  return (
    <div className="v-quest">
      <a className="skip-x" href="#main">Skip to content</a>
      <main id="main">
        <h1 className="sr-only-x">{SITE.heading}</h1>
        <section ref={stage} className={'q-stage' + (started ? ' is-on' : '')} aria-label="The hallway game">
          <div ref={wrap} className="q-view">
            <canvas ref={cv} className="q-canvas" tabIndex={-1} onPointerDown={onCanvas} aria-label="A pixel school hallway at night. Walk with the arrow keys or tap where you want to go." role="img" />
            {!started && (
              <div className="q-title" onPointerDown={start}>
                <p className="q-big" aria-hidden="true"><span>SKEP</span><span>TICAL</span></p>
                <p className="q-pitch">{HERO.pitch.map((l) => <span key={l}>{l}</span>)}</p>
                <button type="button" className="q-press" onClick={start}>{pad ? 'Tap to start' : 'Press any key to start'}</button>
              </div>
            )}
            {started && !pad && !box && !keypad && !ending && !found.length && !inv.length && <p className="q-hint" aria-hidden="true">Arrows to walk. Space to read.</p>}
            {box && entry && (
              <div className="q-box" onPointerDown={(e) => { if (!(e.target as HTMLElement).closest('a')) advance(); }}>
                <p className="q-box-t">{entry.title}</p>
                <div className="q-box-b"><Lines lines={lines} upto={typed} /></div>
                <span className={'q-box-n' + (typed >= total ? ' is-done' : '')} aria-hidden="true" />
                <div className="sr-only-x" role="status"><Lines lines={lines} /></div>
              </div>
            )}
            {keypad && (
              <div className="q-keypad" role="dialog" aria-label="Keypad">
                <p className="q-kp-screen">{keypad.code.padEnd(4, '_')}</p>
                <p className="q-kp-msg" role="status">{keypad.msg}</p>
                <div className="q-kp-keys">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map((k) => <button key={k} type="button" onClick={() => pressKey(k)}>{k}</button>)}
                </div>
                <button type="button" className="q-link" onClick={closeKeypad}>Step away</button>
              </div>
            )}
            {ending && <Ending onBack={leaveEnd} />}
          </div>
          <div className="q-corner">
            <button type="button" className="q-link" aria-pressed={sound} onClick={toggleSound}>{sound ? 'Sound on' : 'Sound off'}</button>
            <a className="q-link" href="#journal" onClick={() => setReadAll(true)}>Read instead</a>
          </div>
          <div className={'q-dock' + (started || inv.length ? ' is-on' : '')}>
            {inv.length > 0 && (
              <div className="q-bag" aria-label="Your bag" role="group">
                {inv.map((it) => it === 'pen'
                  ? <button key={it} type="button" className="q-item" onClick={() => { setSpin((s) => s + 1); sfx('key'); }} aria-label={`Spin the pen. Spun ${spin} times.`}><span className="q-spin" style={{ transform: `rotate(${spin * 720}deg)` }}><Icon rows={ICONS.pen} /></span></button>
                  : it === 'can'
                    ? <button key={it} type="button" className="q-item" onClick={drink} aria-label="Drink the fizz"><Icon rows={ICONS.can} /></button>
                    : <span key={it} className="q-item"><Icon rows={ICONS[it]} /><span className="sr-only-x">{ITEM_NAMES[it]}</span></span>)}
              </div>
            )}
            {pad && started && (
              <div className="q-pad">
                <div className="q-dpad">
                  {DIRS.map(([d, l, p]) => (
                    <button key={d} type="button" className={'q-d q-d-' + d} aria-label={l}
                      onPointerDown={(e) => { e.preventDefault(); game.current?.hold(d, true); }}
                      onPointerUp={() => game.current?.hold(d, false)} onPointerLeave={() => game.current?.hold(d, false)} onPointerCancel={() => game.current?.hold(d, false)}>
                      <svg viewBox="0 0 12 12" width="16" height="16" aria-hidden="true"><path d={p} fill="currentColor" /></svg>
                    </button>
                  ))}
                </div>
                <button type="button" className="q-a" onClick={() => (box ? advance() : game.current?.interact())}>Read</button>
              </div>
            )}
          </div>
        </section>

        <section id="journal" className="q-journal" aria-labelledby="q-j">
          <div className="q-j-head">
            <h2 id="q-j">The journal.</h2>
            <p>Everything you read in the hallway, in order.</p>
            <div className="q-j-row">
              <button type="button" className="q-jbtn" aria-pressed={readAll} onClick={() => setReadAll((v) => !v)}>{readAll ? 'Only what I found' : 'Read everything'}</button>
              <a className="q-jbtn" href="#main" onClick={() => scrollToId('main')}>Back to the hall</a>
            </div>
          </div>
          {CHAPTERS.map((c, ci) => (
            <article key={c.id} id={c.id} className="q-ch">
              <p className="q-ch-n" aria-hidden="true">{String(ci + 1).padStart(2, '0')}</p>
              <div className="q-ch-b">
                <h3>{c.title}</h3>
                {c.parts.map((id) => (show(id)
                  ? <div key={id} className="q-part"><h4>{ENTRIES[id].title}</h4>{ENTRIES[id].pages.map((pg, k) => <Lines key={k} lines={pg} />)}</div>
                  : <div key={id} className="q-part q-lock"><h4>{ENTRIES[id].title} <span>Not read yet.</span></h4></div>))}
              </div>
            </article>
          ))}
        </section>
      </main>
      <footer className="q-foot">
        <p className="q-foot-line">{FOOTER.line}</p>
        <ul>{FOOTER.links.map((l) => <li key={l.href}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}</ul>
        <ul className="q-pages">{FOOTER.pages.map((l) => <li key={l.href}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}</ul>
        <p className="q-small">Draft 2, version 32. Not the live site.</p>
      </footer>
    </div>
  );
}

function Ending({ onBack }: { onBack: () => void }): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="q-end" role="dialog" aria-modal="true" aria-labelledby="q-end-t" tabIndex={-1} ref={ref}>
      <div className="q-end-in">
        <h2 id="q-end-t" className="q-end-t">{JOIN.title}</h2>
        <p className="q-end-lead">{JOIN.lead}</p>
        <div className="q-paths">
          {JOIN.paths.map((p, i) => (
            <a key={p.id} className="q-path" href={p.href} {...ext(p.href)} style={{ animationDelay: `${0.2 + i * 0.12}s` }}>
              <span className="q-path-n">{p.name}.</span>
              <span className="q-path-l">{p.line}</span>
              <span className="q-path-t">{p.text[0]}</span>
            </a>
          ))}
        </div>
        <p className="q-end-s">{JOIN.already.before}<a href={JOIN.already.href} {...ext(JOIN.already.href)}>{JOIN.already.label}</a>. {JOIN.coach.before}<a href={JOIN.coach.href} {...ext(JOIN.coach.href)}>{JOIN.coach.label}</a>.</p>
        <p className="q-end-s">{JOIN.also} <a href={'mailto:' + SITE.email}>{SITE.email}</a></p>
        <div className="q-j-row">
          <button type="button" className="q-link" onClick={onBack}>Back to the hall</button>
          <a className="q-link" href="#journal" onClick={onBack}>Open the journal</a>
        </div>
      </div>
    </div>
  );
}
