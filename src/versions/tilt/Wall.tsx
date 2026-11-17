import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { gsap } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { walls, type WallRec } from './lean';

/** A row is plain tiles (null), letters (a string) or tiles you can press (slot renderers). */
export type Slot = (dark: boolean) => ReactNode;
export type RowSpec = null | string | Slot[];

type Props = {
  rows: RowSpec[];
  /** Layout columns: where letters and slots are placed. */
  n: number;
  /** Tiles across the width (n or more; the extra sits evenly at both edges). */
  cols?: number;
  ratio?: number;
  /** Height of the plain courses, if different. */
  plain?: number;
  /** 'lean' follows the page, 'level' is laid level and stays level. */
  mode?: 'lean' | 'level';
  /** Held level from outside (Join: the wall under the pointer). */
  level?: boolean;
  /** Courses slide in from alternate sides: on load, on entering view, or never. */
  lay?: 'load' | 'view' | 'none';
  scale?: number;
  align?: 'center' | 'start';
  className?: string;
  label?: string;
  as?: 'h1' | 'h2' | 'h3' | 'div';
  id?: string;
};

const pos = (c: number, r: number) => (((c + r) % 2) + 2) % 2 === 0;

export function Wall({ rows, n, cols = n, ratio = 1.1, plain, mode = 'lean', level = false, lay = 'view', scale = 1, align = 'center', className = '', label, as = 'div', id }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const rec = useRef<WallRec | null>(null);
  const extra = Math.ceil((cols - n) / 2) + 2;
  const content = rows.map((r) => r !== null);
  const first = content.indexOf(true);
  const last = content.lastIndexOf(true);
  const mid = first < 0 ? (rows.length - 1) / 2 : (first + last) / 2;

  useLayoutEffect(() => {
    const el = ref.current!;
    const rowEls = [...el.querySelectorAll<HTMLElement>(':scope > .tl-row')];
    const doLay = lay !== 'none' && !still;
    const r: WallRec = {
      el, rows: rowEls, fixed: content, mid, cols,
      f: mode === 'level' || doLay ? 0 : 1, fv: 0, fT: mode === 'level' || doLay ? 0 : 1,
      scale, laid: rowEls.map(() => ({ p: doLay ? 0 : 1 })), vis: true, w: el.clientWidth, W: el.clientWidth / cols,
    };
    rec.current = r;
    walls.add(r);
    const ro = new ResizeObserver(() => { r.w = el.clientWidth; r.W = r.w / cols; });
    ro.observe(el);
    let played = !doLay;
    const playLay = () => {
      if (played) return; played = true;
      gsap.to(r.laid, {
        p: 1, duration: 1.05, ease: 'expo.out', stagger: 0.085,
        onComplete: () => { if (mode !== 'level') r.fT = levelRef.current ? 0 : 1; },
      });
    };
    const io = new IntersectionObserver(([e]) => {
      r.vis = e.isIntersecting;
      if (e.isIntersecting && lay === 'view' && e.intersectionRatio > 0.2) playLay();
    }, { threshold: [0, 0.25] });
    io.observe(el);
    let t = 0;
    if (lay === 'load') t = window.setTimeout(playLay, 350);
    return () => { walls.delete(r); ro.disconnect(); io.disconnect(); clearTimeout(t); gsap.killTweensOf(r.laid); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length, n, cols, mode, lay, scale]);

  const levelRef = useRef(level);
  useEffect(() => {
    levelRef.current = level;
    const r = rec.current;
    if (!r || mode === 'level') return;
    if (r.laid.every((l) => l.p >= 1)) r.fT = level ? 0 : 1;
  }, [level, mode]);

  const Tag = as;
  const tiles = (row: RowSpec, ri: number) => {
    const out: ReactNode[] = [];
    const len = row === null ? 0 : row.length;
    const s = align === 'start' ? 0 : Math.floor((n - len) / 2);
    for (let c = -extra; c < n + extra; c++) {
      const dark = pos(c, ri);
      const j = c - s;
      if (row !== null && j >= 0 && j < len) {
        if (typeof row === 'string') {
          const ch = row[j];
          out.push(<span key={c} className={`tl-t ${dark ? 'is-d' : 'is-b'}${ch === ' ' ? '' : ' has-l'}`}>{ch === ' ' ? '' : ch}</span>);
        } else {
          out.push(<div key={c} className="tl-slot">{row[j](dark)}</div>);
        }
      } else out.push(<span key={c} className={`tl-t ${dark ? 'is-d' : 'is-b'}`} />);
    }
    return out;
  };

  return (
    <Tag
      ref={ref as never}
      id={id}
      className={`tl-wall ${className}`}
      style={{ ['--cols' as string]: cols, ['--ratio' as string]: ratio, ['--pr' as string]: plain ?? ratio, ['--extra' as string]: extra, ['--n' as string]: n }}
    >
      {label ? <span className="sr-only-x">{label}</span> : null}
      {rows.map((row, ri) => (
        <div key={ri} className={`tl-row${row === null ? ' is-plain' : ''}`} aria-hidden={Array.isArray(row) ? undefined : true}>
          {tiles(row, ri)}
        </div>
      ))}
    </Tag>
  );
}
