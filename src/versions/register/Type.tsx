import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { addSheet, type Mode } from './engine';

const clean = (w: string) => w.replace(/[^\p{L}]/gu, '').toLowerCase();

/** Display type set on two plates. `red` words print on the red plate only; question marks always do. */
export function Type({ text, red = [], by = 'char', lines, tail }: { text: string; red?: string[]; by?: 'char' | 'word'; lines?: string[]; tail?: ReactNode }) {
  const reds = red.map((r) => r.toLowerCase());
  const setWord = (w: string, wi: number) => {
    const isRed = reds.includes(clean(w));
    const parts: { s: string; red: boolean }[] = [];
    if (by === 'char') {
      for (const c of Array.from(w)) parts.push({ s: c, red: isRed || c === '?' });
    } else {
      const m = w.match(/^(.*?)(\?*)$/u)!;
      if (m[1]) parts.push({ s: m[1], red: isRed });
      if (m[2]) parts.push({ s: m[2], red: true });
    }
    return (
      <span className="w" key={wi} aria-hidden="true">
        {parts.map((p, i) =>
          p.red ? (
            <span className="u ro" key={i}><span className="r">{p.s}</span></span>
          ) : (
            <span className="u" key={i}><span className="k">{p.s}</span><span className="r">{p.s}</span></span>
          ),
        )}
      </span>
    );
  };
  const rows = lines ?? [text];
  let wi = 0;
  return (
    <span className="ty">
      {rows.map((row, ri) => (
        <span className={lines ? 'ln' : 'ln1'} key={ri}>
          {row.split(' ').map((w, i) => (
            <Fragment key={i}>
              {i > 0 && ' '}
              {setWord(w, wi++)}
            </Fragment>
          ))}
          {ri === rows.length - 1 && tail}
        </span>
      ))}
    </span>
  );
}

/** A printer's register mark, on both plates. */
export function Mark({ at }: { at: string }) {
  const svg = (
    <svg viewBox="0 0 40 40" focusable="false">
      <circle cx="20" cy="20" r="11" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="20" cy="20" r="5" fill="currentColor" />
      <path d="M0 20H40M20 0V40" stroke="currentColor" strokeWidth="1.2" />
      <path d="M15 20H25M20 15V25" stroke="var(--paper)" strokeWidth="1.2" />
    </svg>
  );
  return (
    <span className={`rm ${at}`} aria-hidden="true">
      <span className="rk">{svg}</span>
      <span className="rr">{svg}</span>
    </span>
  );
}

export function Marks() {
  return (
    <>
      <Mark at="tl" />
      <Mark at="tr" />
      <Mark at="bl" />
      <Mark at="br" />
    </>
  );
}

/** Registers its element with the press. */
export function Sheet({ as: Tag = 'div', mode = 'scroll', className, children, id }: { as?: 'div' | 'header' | 'footer' | 'li' | 'section'; mode?: Mode; className?: string; children: ReactNode; id?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    return addSheet(ref.current, mode);
  }, [mode]);
  const T = Tag as 'div';
  return (
    <T ref={ref as React.Ref<HTMLDivElement>} className={`sheet ${className ?? ''}`} id={id}>
      {children}
    </T>
  );
}
