// The editor's red marks: margin notes (buttons) and the strokes they make in the text.
// Every stroke is a plain SVG path drawn with stroke-dashoffset, never a handwriting font.

export type Key = 'disp' | 'para' | 'ital' | 'bf' | 'list' | 'col' | 'del' | 'stet';

const wave = (() => {
  let d = 'M0 50';
  for (let x = 0; x < 100; x += 8) d += ` Q ${x + 2} 8 ${x + 4} 50 T ${x + 8} 50`;
  return d;
})();

/** In-text stroke shapes, drawn in a 100 by 100 box that stretches to the target. */
const PATH: Record<string, string> = {
  ellipse: 'M54 5 C 84 3, 99 22, 98 50 C 97 80, 74 97, 46 96 C 17 95, 2 78, 3 50 C 4 23, 24 6, 62 9',
  under: 'M0 52 C 30 46, 68 56, 100 48',
  wave,
  strike: 'M-2 58 C 28 46, 66 60, 102 44',
  dots: 'M0 50 H100',
  bracket: 'M100 2 L 18 4 L 16 96 L 100 98',
  para: 'M90 6 L 24 6 L 24 94 L 90 94',
  cols: 'M30 0 L 32 100 M70 0 L 68 100',
};

export function Stk({ k, shape, cls = '' }: { k: Key; shape: keyof typeof PATH; cls?: string }) {
  if (shape === 'dots') return <span className={`stk stk-dots ${cls}`} data-for={k} aria-hidden="true" />;
  return (
    <svg className={`stk stk-${shape} ${cls}`} data-for={k} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d={PATH[shape]} pathLength={1} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** An inline pin that carries a stroke without taking any width in the line. */
export function Pin({ k, shape }: { k: Key; shape: keyof typeof PATH }) {
  return (
    <span className="pin" aria-hidden="true">
      <Stk k={k} shape={shape} />
    </span>
  );
}

/** Margin symbols, 24 by 24. */
const SYM: Record<Key, string> = {
  disp: 'M12 21 V4 M6 10 L12 3.5 L18 10',
  para: 'M17 4 H9 V20 H17',
  ital: 'M3 16 C 9 14.5, 15 17, 21 15',
  bf: 'M2 15 Q 4 9 6 15 T 10 15 T 14 15 T 18 15 T 22 15',
  list: 'M9 2 H4 V22 H9',
  col: 'M9 3 V21 M15 3 V21',
  del: 'M2 18 C 7 4, 15 2, 13 11 C 11 18, 6 14, 11 10 C 15 7, 19 10, 22 4',
  stet: 'M4 16 h0.01 M9 16 h0.01 M14 16 h0.01 M19 16 h0.01',
};

const LABEL: Record<Key, string> = {
  disp: 'disp', para: '¶', ital: 'ital', bf: 'bf', list: 'list', col: 'col', del: 'del', stet: 'stet',
};

const SAYS: Record<Key, string> = {
  disp: 'Set at display size',
  para: 'New paragraph',
  ital: 'Set in italic',
  bf: 'Set in bold',
  list: 'Stack as a list',
  col: 'Set in columns',
  del: 'Delete',
  stet: 'Let it stand',
};

export function Note({ k }: { k: Key }) {
  return (
    <button type="button" className="note" data-note={k} aria-pressed="false" aria-label={`${LABEL[k]}: ${SAYS[k].toLowerCase()}`}>
      <svg className="sym" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d={SYM[k]} pathLength={1} />
      </svg>
      <span className="nl">{LABEL[k]}</span>
      <svg className="tick" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 13 L9 19 L21 5" pathLength={1} />
      </svg>
    </button>
  );
}

/** One proof unit: the margin with its notes, and the text it marks. */
export function Ln({ id, keys, cls = '', children, as: As = 'div' }: { id?: string; keys: Key[]; cls?: string; children: React.ReactNode; as?: 'div' | 'header' | 'li' }) {
  return (
    <As className={`ln ${cls}`} data-keys={keys.join(' ')} id={id}>
      <div className="mg">{keys.map((k) => <Note key={k} k={k} />)}</div>
      <div className="tx">{children}</div>
    </As>
  );
}
