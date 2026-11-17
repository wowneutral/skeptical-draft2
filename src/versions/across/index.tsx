// Version 85: the crossword. The site is one printed puzzle with SKEPTICAL? across the middle.
// Every clue is one of the team's own lines with one word lifted out; scrolling types the answers in,
// and the visitor can press any cell and solve it by hand.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import './across.css';
import marks from '@/lib/marks.json';
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';
import { gsap, scroll, scrollToId } from '@/lib/scroll';
import { still, clamp, lerp } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { COLS, ROWS, WORDS, SOL, NUM, WORDS_AT, FIXED, QKEY, key, byId, label, type Word, type Dir } from './grid';

type Cell = { ch: string; src: 'auto' | 'user' | 'fixed'; ok: boolean };
type Cells = Record<number, Cell>;


const CARET = key(3, 4);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function initial(full: boolean): Cells {
  const out: Cells = {};
  for (const [k, ch] of SOL) {
    if (FIXED.has(k)) out[k] = { ch, src: 'fixed', ok: true };
    else if (full) out[k] = { ch, src: 'auto', ok: true };
  }
  return out;
}

function Arrow() {
  return (
    <svg className="arr" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

function Q({ cls }: { cls?: string }) {
  const m = marks.roman;
  return (
    <svg className={cls} viewBox={`${-m.w / 2} ${-m.h / 2} ${m.w} ${m.h}`} aria-hidden="true">
      <path d={m.d} />
    </svg>
  );
}

/** The blank in a clue: one hairline box per letter, filled from the grid as it fills. */
function Boxes({ w, cells }: { w: Word; cells: Cells }) {
  const n = w.word.length;
  return (
    <span className="boxes" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const [r, c] = w.cells[i];
        const cell = cells[key(r, c)];
        const has = cell && cell.ok;
        return (
          <span key={i} className={'bx' + (has ? ' on' : '') + (has && cell.src !== 'user' ? ' acc' : '')}>
            {has ? <span key={cell.ch + cell.src} className="bl">{w.word[i]}</span> : null}
          </span>
        );
      })}
    </span>
  );
}

/** Keep the punctuation after a blank on the same line as the boxes. */
const glue = (t: string) => { const m = t.match(/^[^\s]*/)![0]; return [m, t.slice(m.length)]; };

function Clue({ w, cells, onFill, onHover, big = true }: { w: Word; cells: Cells; onFill: (w: Word) => void; onHover?: (id: string | null) => void; big?: boolean }) {
  const done = w.cells.every(([r, c]) => cells[key(r, c)]?.ok);
  return (
    <button
      type="button"
      className={'clue' + (big ? ' big' : '') + (done ? ' done' : '')}
      onClick={() => onFill(w)}
      onPointerEnter={() => onHover?.(w.id)}
      onPointerLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(w.id)}
      onBlur={() => onHover?.(null)}
    >
      <span className="cl-n">{label(w)}</span>
      <span className="cl-t">
        {w.before}
        <span className="nw"><Boxes w={w} cells={cells} /><span className="sr-only-x">{w.word}</span>{glue(w.after)[0]}</span>
        {glue(w.after)[1]}
      </span>
    </button>
  );
}

function More({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className="more" href={href}>
      <span>{children}</span>
      <Arrow />
    </a>
  );
}

export default function Across() {
  useVersion('across');
  const root = useRef<HTMLDivElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [cells, setCells] = useState<Cells>(() => initial(still));
  const [solved, setSolved] = useState<Set<string>>(() => new Set());
  const [cursor, setCursorS] = useState<{ k: number; dir: Dir } | null>(null);
  const cursorRef = useRef<{ k: number; dir: Dir } | null>(null);
  const setCursor = (v: { k: number; dir: Dir } | null) => { cursorRef.current = v; setCursorS(v); };
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState<string>('top');
  const [hover, setHover] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const cellsRef = useRef(cells);
  cellsRef.current = cells;
  const typing = useRef(new Set<string>());
  const timers = useRef<number[]>([]);
  const view = useRef({ word: 'join-w' });

  const complete = useMemo(() => [...SOL.keys()].every((k) => cells[k]?.ok), [cells]);

  // ---------- typing the answers in ----------
  const typeWord = useCallback((w: Word, delay = 0, step = 85) => {
    if (typing.current.has(w.id)) return delay;
    const todo = w.cells.map(([r, c]) => key(r, c)).filter((k) => !cellsRef.current[k]?.ok);
    if (!todo.length) return delay;
    typing.current.add(w.id);
    let t = delay;
    w.cells.forEach(([r, c]) => {
      const k = key(r, c);
      if (cellsRef.current[k]?.ok) return;
      timers.current.push(
        window.setTimeout(() => {
          setCells((prev) => (prev[k]?.ok ? prev : { ...prev, [k]: { ch: SOL.get(k)!, src: 'auto', ok: true } }));
        }, still ? 0 : t),
      );
      t += still ? 0 : step;
    });
    timers.current.push(window.setTimeout(() => typing.current.delete(w.id), still ? 0 : t + 20));
    return t + 220;
  }, []);

  const fill = useCallback((w: Word) => { setPicked(w.id); typeWord(w); }, [typeWord]);

  // ---------- which section is under the reading line ----------
  useEffect(() => {
    const secs = [...root.current!.querySelectorAll<HTMLElement>('[data-sec]')];
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.sec!);
      },
      { rootMargin: '-48% 0px -48% 0px' },
    );
    secs.forEach((s) => io.observe(s));
    const t = timers.current;
    return () => { io.disconnect(); t.forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    if (active === 'top') return;
    if (active === 'end') {
      let d = 0;
      for (const w of WORDS) d = typeWord(w, d, 45);
      return;
    }
    setPicked(null);
    const ws = WORDS.filter((w) => w.sec === active);
    let d = 120;
    for (const w of ws) d = typeWord(w, d);
  }, [active, typeWord]);

  // ---------- the camera: hero close-up, docked to the left, centred again at the end ----------
  useEffect(() => {
    const el = root.current!;
    const b = board.current!;
    const end = el.querySelector<HTMLElement>('.end-grid')!;
    const heroClue = el.querySelector<HTMLElement>('.hero-clue')!;
    const head = el.querySelector<HTMLElement>('.phead')!;
    const pin = el.querySelector<HTMLElement>('.pin')!;
    let off = 0;
    let last = '';
    const frame = () => {
      const vw = document.documentElement.clientWidth, vh = window.innerHeight;
      const phone = vw <= 820;
      const y = scroll.y;
      const a = ease(clamp(y / (vh * 0.72)));
      const endTop = end.getBoundingClientRect().top;
      let c0, x0, y0, c1, x1, y1, c2, x2, rowsShown = ROWS, o = 0;
      const wv = byId(view.current.word);
      if (!phone) {
        c0 = Math.min(vw * 0.094, vh * 0.17);
        x0 = (vw - COLS * c0) / 2;
        y0 = vh * 0.4 - 5.5 * c0;
        c1 = Math.min((vw * 0.48 - 80) / COLS, (vh - 112) / ROWS);
        x1 = Math.max(32, (vw * 0.48 - COLS * c1) / 2 + 8);
        y1 = (vh - ROWS * c1) / 2;
        c2 = Math.min((vw * 0.45) / COLS, (vh * 0.52) / ROWS);
      } else {
        c0 = c1 = c2 = (vw - 24) / COLS;
        x0 = x1 = 12;
        y0 = Math.max(56, vh * 0.1);
        y1 = 8;
        const mid = wv.dir === 'a' ? wv.r : wv.r + (wv.cells.length - 1) / 2;
        const target = clamp(Math.round(mid - 2), 0, ROWS - 5);
        off += (target - off) * (still ? 1 : 0.12);
        rowsShown = lerp(ROWS, 5, a);
        o = off * a;
      }
      x2 = (vw - COLS * c2) / 2;
      const y2 = endTop + 24;
      const e = ease(clamp((vh * 0.92 - endTop) / (vh * 0.62)));
      let c = lerp(c0, c1, a), x = lerp(x0, x1, a), yy = lerp(y0, y1, a);
      c = lerp(c, c2, e); x = lerp(x, x2, e); yy = lerp(yy, y2, e);
      if (phone) { rowsShown = lerp(rowsShown, ROWS, e); o = lerp(o, 0, e); }
      const top = o * c, bottom = (ROWS - o - rowsShown) * c;
      const sig = [c, x, yy, top, bottom].map((v) => v.toFixed(1)).join();
      if (sig !== last) {
        last = sig;
        b.style.setProperty('--c', c.toFixed(2) + 'px');
        b.style.transform = `translate3d(${x.toFixed(1)}px, ${(yy - top).toFixed(1)}px, 0)`;
        b.style.clipPath = phone ? `inset(${top.toFixed(1)}px -4px ${Math.max(0, bottom).toFixed(1)}px -4px)` : '';
        heroClue.style.opacity = String(clamp(1 - a * (phone ? 5 : 2.6)));
        heroClue.style.visibility = a > (phone ? 0.2 : 0.4) ? 'hidden' : '';
        const dock = phone ? clamp((a - 0.6) / 0.4) * (1 - e) : 0;
        head.style.opacity = String(dock);
        head.style.height = (y1 + 5 * c1 + 56).toFixed(0) + 'px';
        pin.style.top = (y1 + 5 * c1 + 6).toFixed(0) + 'px';
        pin.style.visibility = dock > 0.05 ? '' : 'hidden';
        el.style.setProperty('--headh', (y1 + 5 * c1 + 60).toFixed(0) + 'px');
        el.style.setProperty('--endh', (ROWS * c2 + 48).toFixed(0) + 'px');
      }
    };
    gsap.ticker.add(frame);
    frame();
    return () => gsap.ticker.remove(frame);
  }, []);

  // ---------- solving by hand ----------
  const wordAt = (k: number, dir: Dir) => WORDS_AT.get(k)?.find((w) => w.dir === dir);
  const curWord = cursor ? wordAt(cursor.k, cursor.dir) ?? WORDS_AT.get(cursor.k)?.[0] : undefined;

  const pick = (k: number) => {
    const ws = WORDS_AT.get(k);
    if (!ws) return;
    let dir: Dir = ws[0].dir;
    if (cursor && cursor.k === k && ws.length > 1) dir = cursor.dir === 'a' ? 'd' : 'a';
    else if (cursor && ws.some((w) => w.dir === cursor.dir)) dir = cursor.dir;
    setCursor({ k, dir });
    setPicked((ws.find((w) => w.dir === dir) ?? ws[0]).id);
    input.current?.focus({ preventScroll: true });
  };

  const move = (dr: number, dc: number) => {
    if (!cursor) return;
    let r = Math.floor(cursor.k / COLS) + dr, c = (cursor.k % COLS) + dc;
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      const k = key(r, c);
      if (SOL.has(k)) {
        const dir: Dir = dr ? 'd' : 'a';
        setCursor({ k, dir: WORDS_AT.get(k)!.some((w) => w.dir === dir) ? dir : WORDS_AT.get(k)![0].dir });
        return;
      }
      r += dr; c += dc;
    }
  };

  const step = (w: Word, k: number, d: number) => {
    const i = w.cells.findIndex(([r, c]) => key(r, c) === k);
    const j = clamp(i + d, 0, w.cells.length - 1);
    const [r, c] = w.cells[j];
    return key(r, c);
  };

  const put = (ch: string) => {
    if (!cursor) return;
    const w = curWord!;
    const k = cursor.k;
    if (!FIXED.has(k) && !(cells[k]?.ok && cells[k].src !== 'user')) {
      const ok = SOL.get(k) === ch;
      const next = { ...cells, [k]: { ch, src: 'user' as const, ok } };
      setCells(next);
      if (ok && w.cells.every(([r, c]) => next[key(r, c)]?.ok)) {
        const mine = w.cells.some(([r, c]) => next[key(r, c)].src === 'user');
        if (mine) {
          setSolved((s) => new Set(s).add(w.id));
          timers.current.push(window.setTimeout(() => {
            input.current?.blur();
            setCursor(null);
            scrollToId(w.sec, document.documentElement.clientWidth <= 820 ? -(parseFloat(getComputedStyle(root.current!).getPropertyValue('--headh')) || 0) : 0);
          }, 650));
          return;
        }
      }
    }
    setCursor({ k: step(w, k, 1), dir: w.dir });
  };

  const back = () => {
    if (!cursor) return;
    const k = cursor.k;
    if (cells[k]?.src === 'user') {
      const next = { ...cells };
      delete next[k];
      setCells(next);
      return;
    }
    const w = curWord!;
    const p = step(w, k, -1);
    if (cells[p]?.src === 'user') { const next = { ...cells }; delete next[p]; setCells(next); }
    setCursor({ k: p, dir: w.dir });
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const m: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (m[e.key]) { e.preventDefault(); move(...m[e.key]); return; }
    if (e.key === 'Backspace') { e.preventDefault(); back(); return; }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (cursor) pick(cursor.k); return; }
    if (e.key === 'Escape') { input.current?.blur(); return; }
    if (/^[a-zA-Z]$/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); put(e.key.toUpperCase()); }
  };
  // Phone keyboards send input events, not reliable keydowns.
  const onInput = (e: React.FormEvent<HTMLInputElement>) => {
    const v = e.currentTarget.value;
    e.currentTarget.value = '';
    const ch = v.slice(-1).toUpperCase();
    if (/^[A-Z]$/.test(ch)) put(ch);
  };
  const onFocus = () => {
    setFocused(true);
    if (!cursorRef.current) {
      const w = WORDS.find((x) => !x.fixed && !x.cells.every(([r, c]) => cells[key(r, c)]?.ok)) ?? WORDS[0];
      const free = w.cells.find(([r, c]) => !cells[key(r, c)]?.ok) ?? w.cells[0];
      setCursor({ k: key(...free), dir: w.dir });
      setPicked(w.id);
    }
  };

  // ---------- render the board ----------
  const hi = new Set<number>();
  if (cursor && focused && curWord) curWord.cells.forEach(([r, c]) => hi.add(key(r, c)));
  const accentWord = new Set<number>();
  const won = new Map<number, number>();
  for (const w of WORDS) if (solved.has(w.id)) w.cells.forEach(([r, c], i) => { accentWord.add(key(r, c)); won.set(key(r, c), i); });
  const hov = new Set<number>();
  if (hover) byId(hover).cells.forEach(([r, c]) => hov.add(key(r, c)));
  const centre = (ROWS - 1) / 2;
  const live = new Set<number>();
  for (const w of WORDS) if (w.sec === active) w.cells.forEach(([r, c]) => live.add(key(r, c)));

  const grid: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const k = key(r, c);
      const d = Math.hypot(r - centre, (c - 4.5) * 0.8);
      if (!SOL.has(k)) {
        grid.push(<div key={k} className="sq blk" style={{ '--d': d.toFixed(2) } as React.CSSProperties} />);
        continue;
      }
      const cell = cells[k];
      const n = NUM.get(k);
      const cls = ['sq', 'w'];
      if (hi.has(k) || hov.has(k)) cls.push('hi');
      else if (live.has(k)) cls.push('lv');
      if (cursor && focused && cursor.k === k) cls.push('cur');
      if (FIXED.has(k)) cls.push('fx');
      if (won.has(k)) cls.push('won');
      let state = '';
      if (cell) state = !cell.ok ? 'bad' : cell.src === 'auto' || accentWord.has(k) ? 'acc' : cell.src;
      grid.push(
        <div key={k} className={cls.join(' ')} style={{ '--d': d.toFixed(2), '--i': c, '--wi': won.get(k) ?? 0 } as React.CSSProperties} onPointerDown={(e) => { e.preventDefault(); pick(k); }}>
          {n ? <span className="num">{n}</span> : null}
          {k === QKEY ? (
            <Q cls={'qm' + (complete ? ' acc' : '')} />
          ) : cell ? (
            <span key={cell.ch + cell.src + cell.ok} className={'ch ' + state}>{cell.ch}</span>
          ) : k === CARET && !focused && active === 'top' ? (
            <span className="caret" />
          ) : null}
        </div>,
      );
    }

  const pinWord = (focused && curWord) || (picked ? byId(picked) : WORDS.find((w) => w.sec === active) ?? byId('join-w'));
  view.current.word = pinWord.id;
  const [compete, lecture, coach] = JOIN.paths;
  const sess = byId('session-w');

  return (
    <div className={'v-across' + (still ? ' still' : '') + (complete ? ' complete' : '')} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>

      <aside className="stage" aria-label="The puzzle">
        <div className="phead" aria-hidden="true" />
        <div className="board" ref={board} role="group" aria-label="The crossword. SKEPTICAL? across the middle.">
          <div className="cells" aria-hidden="true">{grid}</div>
          <input
            ref={input}
            className="typer"
            aria-label={curWord ? `Type ${label(curWord)}, ${curWord.answer.length} letters` : 'Type into the crossword'}
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            onKeyDown={onKey}
            onInput={onInput}
            onFocus={onFocus}
            onBlur={() => setFocused(false)}
            style={cursor ? ({ '--r': Math.floor(cursor.k / COLS), '--cc': cursor.k % COLS } as React.CSSProperties) : undefined}
          />
        </div>
        <button type="button" className="pin" onClick={() => fill(pinWord)}>
          <span className="pin-n">{label(pinWord)}</span>
          <span className="pin-t">{pinWord.before}<Boxes w={pinWord} cells={cells} />{pinWord.after}</span>
        </button>
      </aside>

      <header className="hero" id="top" data-sec="top">
        <h1 className="sr-only-x">{SITE.heading}</h1>
        <div className="hero-clue">
          <Clue w={byId('join-w')} cells={cells} onFill={fill} onHover={setHover} />
          <p className="hero-pitch">{HERO.pitch[0]}<br />{HERO.pitch[1]}</p>
        </div>
      </header>

      <main id="main" className="col">
        <section className="sec" id="pitch" data-sec="pitch" aria-label="Skeptical">
          <p className="pitch">{HERO.pitch[0]}<br />{HERO.pitch[1]}</p>
          <div className="statement">
            <Clue w={byId('join-w')} cells={cells} onFill={fill} onHover={setHover} />
            <p className="st">{HERO.statement[1]}</p>
            <p className="st">{HERO.statement[2]}</p>
          </div>
          <div className="doors">
            {HERO.doors.map((d) => (
              <a key={d.href} className="door" href={d.href}><span>{d.label}</span><Arrow /></a>
            ))}
          </div>
          <ol className="manifesto">
            {MANIFESTO.map((l) => <li key={l}>{l}</li>)}
          </ol>
        </section>

        <section className="sec" id="record" data-sec="record" aria-labelledby="h-record">
          <Clue w={byId('only-w')} cells={cells} onFill={fill} onHover={setHover} />
          <h2 id="h-record" className="h2">{RECORD.title}</h2>
          <p className="event"><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
          <ul className="results">
            {RECORD.results.map((r) => (
              <li key={r.who}><span className="who">{r.who}</span><span className="what">{r.what}</span><span className="rm">{r.more}</span></li>
            ))}
          </ul>
          <More href={RECORD.more.href}>{RECORD.more.label}</More>
        </section>

        <section className="sec" id="drive" data-sec="drive" aria-labelledby="h-drive">
          <Clue w={byId('theory-w')} cells={cells} onFill={fill} onHover={setHover} />
          <h2 id="h-drive" className="h2">{DRIVE.title}</h2>
          <p className="lead">{DRIVE.lead}</p>
          <dl className="items">
            {DRIVE.items.map((it) => (
              <div key={it.term} className="it"><dt>{it.term}</dt><dd>{it.text}</dd></div>
            ))}
          </dl>
          <More href={DRIVE.more.href}>{DRIVE.more.label}</More>
        </section>

        <section className="sec" id="people" data-sec="people" aria-labelledby="h-people">
          <Clue w={byId('skep-w')} cells={cells} onFill={fill} onHover={setHover} />
          <h2 id="h-people" className="h2">{PEOPLE.title}</h2>
          <ul className="coaches">
            {PEOPLE.coaches.map((c) => (
              <li key={c.name}><span className="nm">{c.name}</span><span className="role">{c.role}</span><span className="bio">{c.bio}</span></li>
            ))}
          </ul>
          <p className="count">{PEOPLE.count}</p>
          <More href={PEOPLE.more.href}>{PEOPLE.more.label}</More>
        </section>

        <section className="sec" id="join" data-sec="join" aria-labelledby="h-join">
          <Clue w={byId('already-w')} cells={cells} onFill={fill} onHover={setHover} />
          <h2 id="h-join" className="h2">{JOIN.title}</h2>
          <p className="lead">{JOIN.lead}</p>
          <p className="small-l">{JOIN.already.before}<a href={JOIN.already.href}>{JOIN.already.label}</a></p>
          <p className="small-l">{JOIN.coach.before}<a href={JOIN.coach.href}>{JOIN.coach.label}</a></p>
          <p className="small-l">{JOIN.also} <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
          <p className="small-l">{JOIN.discord}</p>
        </section>

        <section className="sec path" id="compete" data-sec="compete" aria-labelledby="h-compete">
          <Clue w={byId('debate-w')} cells={cells} onFill={fill} onHover={setHover} />
          <h3 id="h-compete" className="h3">{compete.name}</h3>
          {compete.text.map((t) => <p key={t}>{t}</p>)}
          <More href={compete.href}>{HERO.doors[0].label}</More>
        </section>

        <section className="sec path" id="lecture" data-sec="lecture" aria-labelledby="h-lecture">
          <Clue w={byId('once-w')} cells={cells} onFill={fill} onHover={setHover} />
          <h3 id="h-lecture" className="h3">{lecture.name}</h3>
          <p>
            <button type="button" className="inline-clue" onClick={() => fill(sess)}>
              <span className="cl-n">{label(sess)}</span>
              {sess.before}<Boxes w={sess} cells={cells} /><span className="sr-only-x">{sess.word}</span>{sess.after}
            </button>
          </p>
          {lecture.text.slice(1).map((t) => <p key={t}>{t}</p>)}
          <More href={lecture.href}>{lecture.name}</More>
        </section>

        <section className="sec path" id="coach" data-sec="coach" aria-labelledby="h-coach">
          <Clue w={byId('room-w')} cells={cells} onFill={fill} onHover={setHover} />
          <h3 id="h-coach" className="h3">{coach.name}</h3>
          {coach.text.map((t) => <p key={t}>{t}</p>)}
          <More href={coach.href}>{HERO.doors[1].label}</More>
        </section>
      </main>

      <footer className="end" data-sec="end">
        <div className="end-grid" aria-hidden="true" />
        <div className="fine">
          <p className="fline">{FOOTER.line}</p>
          <ul className="fl">
            {FOOTER.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
          </ul>
          <ul className="fl">
            {FOOTER.pages.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
          </ul>
          <ol className="key-list" aria-label="Answers">
            {[...WORDS].sort((p, q) => p.num! - q.num!).map((w) => (
              <li key={w.id}><span>{label(w)}</span> {w.answer.replace('?', '')}</li>
            ))}
          </ol>
          <p className="draft">Draft 2, version 85. Not the live site.</p>
        </div>
      </footer>
    </div>
  );
}


