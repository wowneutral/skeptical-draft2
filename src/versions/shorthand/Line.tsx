import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { still } from '@/lib/utils';
import { unitsFor, type Unit } from './sh';
import { register, state, type Entry, type Mode, type Size } from './engine';

export function Sym({ s }: { s: string }) {
  if (s === '@r' || s === '@l')
    return (
      <svg className="sh-arrow" viewBox="0 0 100 112" aria-hidden="true" style={s === '@l' ? { transform: 'scaleX(-1)' } : undefined}>
        <path d="M6 60 H84 M54 28 L88 60 L54 92" fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="square" />
      </svg>
    );
  return <>{s}</>;
}

/** The shorthand of a sentence, small, symbols in red (for the reduced-motion view). */
export function Mini({ text, note }: { text: string; note?: boolean }) {
  const u = unitsFor(text);
  return (
    <span className={note ? 'sh-note' : 'sh-mini'} aria-hidden="true">
      {u.map((x, i) =>
        x.k === 'swap' ? (
          <span key={i} className="u-red">
            <Sym s={x.sym} />
          </span>
        ) : x.k === 'keep' ? (
          <span key={i}>{x.ch}</span>
        ) : null,
      )}
    </span>
  );
}

function render(units: Unit[]) {
  const out: ReactNode[] = [];
  let word: ReactNode[] = [];
  let wk = 0;
  const flush = () => {
    if (word.length) out.push(<span className="u-w" key={'w' + wk++}>{word}</span>);
    word = [];
  };
  units.forEach((u, i) => {
    if (u.k === 'swap') {
      word.push(
        <span key={i} className="u-s" data-u="s">
          <span className="u-sym">
            <Sym s={u.sym} />
          </span>
          <span className="u-in">{u.word}</span>
        </span>,
      );
      return;
    }
    if (u.ch === ' ') {
      flush();
      out.push(
        u.k === 'keep' ? (
          <span key={i} className="u-sp" data-u="k">
            {' '}
          </span>
        ) : (
          <span key={i} className="u-sp" data-u="p">
            <span className="u-in">{' '}</span>
          </span>
        ),
      );
      return;
    }
    const el =
      u.k === 'keep' ? (
        <span key={i} className="u-k" data-u="k">
          {u.ch}
        </span>
      ) : (
        <span key={i} className="u-g" data-u="g">
          <span className="u-in">{u.ch}</span>
        </span>
      );
    word.push(el);
  });
  flush();
  return out;
}

type Props = {
  text: string;
  size?: Size;
  mode?: Mode;
  as?: 'p' | 'h2' | 'h3' | 'div' | 'span' | 'dt';
  className?: string;
  /** false when a parent already is the control */
  press?: boolean;
  force?: () => number | null;
  rate?: number;
  /** show the reduced-motion layout */
  calm?: boolean;
};

export function Line({ text, size = 'l', mode = 'wrap', as = 'p', className = '', press = true, force, rate = 4.2 }: Props) {
  const units = useMemo(() => unitsFor(text), [text]);
  const rootRef = useRef<HTMLElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const forceRef = useRef(force);
  forceRef.current = force;
  const entryRef = useRef<Entry | null>(null);

  useEffect(() => {
    if (still) return;
    const root = rootRef.current!;
    const tx = textRef.current!;
    const vars: Entry['vars'] = [];
    const keeps: HTMLElement[] = [];
    const els = tx.querySelectorAll<HTMLElement>('[data-u]');
    let nv = 0;
    els.forEach((el) => el.dataset.u !== 'k' && nv++);
    let vi = 0;
    els.forEach((el) => {
      const k = el.dataset.u;
      if (k === 'k') keeps.push(el);
      else {
        vars.push({
          el,
          kind: k === 's' ? 'swap' : k === 'p' ? 'space' : 'grow',
          inner: el.querySelector<HTMLElement>('.u-in')!,
          sym: k === 's' ? el.querySelector<HTMLElement>('.u-sym')! : undefined,
          w0: 0,
          w1: 0,
          frac: nv > 1 ? vi / (nv - 1) : 0,
        });
        vi++;
      }
    });
    const e: Entry = {
      root,
      text: tx,
      mode,
      size,
      vars,
      keeps,
      keepEm: 0,
      fsShort: 0,
      fsFull: 0,
      capPx: 0,
      W: 0,
      force: () => (forceRef.current ? forceRef.current() : null),
      user: null,
      hover: false,
      rate,
      p: 0,
      applied: -1,
      ready: false,
    };
    entryRef.current = e;
    return register(e);
  }, [mode, size, rate]);

  const Tag = as as 'p';
  if (still) {
    return (
      <Tag className={`sh-line sz-${size} calm ${className}`}>
        <Mini text={text} />
        <span className="sh-full">{text}</span>
      </Tag>
    );
  }

  const inner = (
    <>
      <span className="sr-only-x">{text}</span>
      <span className="sh-body">
        {mode !== 'fixed' && units.some((u) => u.k !== 'keep') && <Mini text={text} note />}
        <span className="sh-text" aria-hidden="true" ref={textRef}>
          {render(units)}
        </span>
      </span>
    </>
  );

  const onClick = () => {
    const e = entryRef.current;
    if (!e || state.suppress) return;
    e.user = e.p > 0.5 ? 0 : 1;
  };

  return (
    <Tag className={`sh-line sz-${size} m-${mode} ${className}`}>
      {press ? (
        <button
          type="button"
          className="sh-btn"
          ref={(n) => void (rootRef.current = n)}
          onClick={onClick}
          onPointerEnter={(ev) => ev.pointerType === 'mouse' && entryRef.current && (entryRef.current.hover = true)}
          onPointerLeave={() => entryRef.current && (entryRef.current.hover = false)}
        >
          {inner}
        </button>
      ) : (
        <span className="sh-btn" ref={(n) => void (rootRef.current = n)}>
          {inner}
        </span>
      )}
    </Tag>
  );
}
