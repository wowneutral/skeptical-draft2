// The field: copy laid out as an inscription. Every display row sits on a fixed grid
// of letter cells and the rows alternate direction down the whole page, as a plough runs.
import type { CSSProperties, ReactNode } from 'react';
import { still } from '@/lib/utils';

export type Size = 't' | 'xl' | 'l' | 'm' | 'r' | 'e' | 'p' | 'q';
export type Dir = 'ltr' | 'rtl';

export type DBlock = {
  k: 'd';
  key: string;
  text: string;
  size: Size;
  tag: 'h1' | 'h2' | 'h3' | 'p';
  sr?: string;
  id?: string;
  force?: Dir;
  end?: boolean;
  deco?: boolean;
};
export type BBlock = { k: 'b'; key: string; body: ReactNode; cls?: string; id?: string };
export type Block = DBlock | BBlock;

export type Laid =
  | (DBlock & { rows: { text: string; dir: Dir; turn?: boolean }[]; cols: number })
  | (BBlock & { dir: Dir });

export function colsFor(size: Size, w: number) {
  if (w < 640) return { t: 5, xl: 8, l: 12, m: 12, r: 13, e: 9, p: 12, q: 3 }[size];
  if (w < 1024) return { t: 10, xl: 8, l: 12, m: 15, r: 18, e: 11, p: 14, q: 4 }[size];
  return { t: 10, xl: 8, l: 12, m: 16, r: 26, e: 11, p: 14, q: 5 }[size];
}

/** Greedy word wrap into rows of at most c cells. A word longer than a row is cut, as stonecutters did. */
export function wrap(text: string, c: number) {
  const rows: string[] = [];
  let cur = '';
  for (let word of text.split(' ')) {
    while (word.length > c) {
      if (cur) { rows.push(cur); cur = ''; }
      rows.push(word.slice(0, c));
      word = word.slice(c);
    }
    if (!cur) cur = word;
    else if (cur.length + 1 + word.length <= c) cur += ' ' + word;
    else { rows.push(cur); cur = word; }
  }
  if (cur) rows.push(cur);
  return rows;
}

/** One pass down the page: every display row takes the opposite direction of the one before. */
export function lay(blocks: Block[], w: number): Laid[] {
  let dir: Dir = 'rtl';
  let prev: { turn?: boolean } | null = null;
  return blocks.map((b) => {
    if (b.k === 'b') { prev = null; return { ...b, dir }; }
    const cols = colsFor(b.size, w);
    const lines = wrap(b.text.toUpperCase(), cols);
    if (b.force) dir = b.force === 'ltr' ? 'rtl' : 'ltr';
    const rows = lines.map((t) => {
      dir = dir === 'ltr' ? 'rtl' : 'ltr';
      // the row above runs straight on into this one: draw the plough's bend between them
      if (prev && !b.deco && !b.force) prev.turn = true;
      const row: { text: string; dir: Dir; turn?: boolean } = { text: t, dir };
      prev = row;
      return row;
    });
    return { ...b, rows, cols };
  });
}

const glyph = (ch: string) => <span className="g">{ch === '?' ? <span className="q">?</span> : ch === ' ' ? '' : ch}</span>;

export function Row({ text, dir, cols, turn }: { text: string; dir: Dir; cols: number; turn?: boolean }) {
  const chars = [...text];
  const n = chars.length;
  const start = dir === 'ltr' ? 0 : cols - n;
  const turns = dir === 'rtl' && !still;
  return (
    <span className="row" data-dir={dir} data-turn={turns ? '' : undefined} style={{ '--c': cols } as CSSProperties}>
      <span className="rule" />
      {turn && <span className="bend" data-side={dir === 'ltr' ? 'right' : 'left'} />}
      {chars.map((ch, j) => (
        <span className="cell" key={j} style={{ gridColumn: start + j + 1 }} data-sp={ch === ' ' ? '' : undefined}>
          {turns ? (
            <span className="tile">
              <span className="f s">{glyph(chars[n - 1 - j])}</span>
              <span className="f r">{glyph(ch)}</span>
            </span>
          ) : (
            <span className="tile">
              <span className="f">{glyph(ch)}</span>
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

export function Display({ b, onKey }: { b: Extract<Laid, { k: 'd' }>; onKey: (el: HTMLElement) => void }) {
  const Tag = b.tag;
  const turns = !still && !b.deco && b.rows.some((r) => r.dir === 'rtl');
  if (b.deco) {
    return (
      <div className="d deco" data-size={b.size} data-end={b.end ? '' : undefined} aria-hidden="true">
        <span className="rows">{b.rows.map((r, i) => <Row key={i} text={r.text} dir={r.dir} cols={b.cols} />)}</span>
      </div>
    );
  }
  return (
    <Tag
      className="d"
      data-size={b.size}
      data-end={b.end ? '' : undefined}
      id={b.id}
      tabIndex={turns ? 0 : undefined}
      onKeyDown={
        turns
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onKey(e.currentTarget); }
            }
          : undefined
      }
    >
      <span className="sr-only-x">{b.sr ?? b.text}</span>
      <span className="rows" aria-hidden="true">
        {b.rows.map((r, i) => <Row key={i} text={r.text} dir={r.dir} cols={b.cols} turn={r.turn} />)}
      </span>
    </Tag>
  );
}
