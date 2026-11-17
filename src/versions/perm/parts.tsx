import { useEffect, useMemo, useRef, type ReactNode, type PointerEvent as RPE, type KeyboardEvent as RKE } from 'react';
import { gsap } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { addRow, LH, padX, sizeAt, solve, splitRows, store } from './fit';

type Get = () => [number, number, boolean?] | null;

/** One line set to fill a width. `live` lines re-solve every frame the seam moves. */
export function FitRow({ text, get, live = true, hide = true, className }: { text: string; get: Get; live?: boolean; hide?: boolean; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const g = useRef(get);
  g.current = get;
  useEffect(() => addRow({ el: ref.current!, text, get: () => g.current(), live }), [text, live]);
  return (
    <span ref={ref} className={'fitrow' + (className ? ' ' + className : '')} aria-hidden={hide || undefined}>
      {text}
    </span>
  );
}

/** Width of one half right now, in px, before padding. */
export const halfW = (side: 'L' | 'R') => (store.phone ? store.vw : (side === 'L' ? store.s : 1 - store.s) * store.vw);

/** A title that fills its half: the real heading text, not a copy. */
export function FitTitle({ text, side, as: Tag = 'h2', max = 150 }: { text: string; side: 'L' | 'R'; as?: 'h2' | 'h3' | 'p'; max?: number }) {
  return (
    <Tag className="ftitle">
      <FitRow
        text={text}
        hide={false}
        get={() => {
          const px = padX();
          const W = halfW(side) - 2 * px;
          const Wmid = (store.phone ? store.vw : store.vw * 0.5) - 2 * px;
          return [W, Math.min(max * (store.phone ? 0.62 : 1), sizeAt(text, Wmid, 100))];
        }}
      />
    </Tag>
  );
}

type Dims = { h: number };

function useDims(ref: React.RefObject<HTMLElement | null>) {
  const dims = useRef<Dims>({ h: 600 });
  useEffect(() => {
    const el = ref.current!;
    const ro = new ResizeObserver(() => {
      dims.current.h = el.clientHeight;
      window.dispatchEvent(new Event('perm:refit'));
    });
    ro.observe(el);
    dims.current.h = el.clientHeight;
    return () => ro.disconnect();
  }, [ref]);
  return dims;
}

/** The seam on a phone: horizontal, inside each pair, under the thumb. */
function PhoneSeam({ pair, onDrag, onPress, label }: { pair: React.RefObject<HTMLElement | null>; onDrag: (f: number | null, release?: boolean) => void; onPress: () => void; label: string }) {
  const st = useRef<{ y: number; moved: boolean } | null>(null);
  const frac = (e: RPE) => {
    const r = pair.current!.getBoundingClientRect();
    return (e.clientY - r.top) / r.height;
  };
  return (
    <div
      className="pseam"
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={25}
      aria-valuemax={75}
      aria-valuenow={50}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        st.current = { y: e.clientY, moved: false };
      }}
      onPointerMove={(e) => {
        if (!st.current) return;
        if (Math.abs(e.clientY - st.current.y) > 6) st.current.moved = true;
        if (st.current.moved) onDrag(frac(e));
      }}
      onPointerUp={(e) => {
        if (!st.current) return;
        const moved = st.current.moved;
        st.current = null;
        if (!moved) onPress();
        else onDrag(frac(e), true);
      }}
      onPointerCancel={() => { st.current = null; onDrag(null, true); }}
      onKeyDown={(e: RKE) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPress(); }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); store.base = Math.max(0.25, store.base - 0.06); }
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); store.base = Math.min(0.75, store.base + 0.06); }
      }}
    >
      <span className="notch" />
    </div>
  );
}

export type SeamHandlers = { onDrag: (f: number | null, release?: boolean) => void; onPress: () => void; onOff: () => void };

/**
 * A pair: two lines, one in each half, each filling its half.
 * With `permable`, pressing the seam interleaves them in bands with Perm. across the middle.
 */
export function Pair({
  left, right, n = [2, 2], className = '', on = false, permable = true, hrefs, seam, tag = 'p', air = 0.12,
}: {
  left: string; right: string; n?: [number, number]; className?: string; on?: boolean; permable?: boolean;
  hrefs?: [string, string]; seam: SeamHandlers; tag?: 'p' | 'h3'; air?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dims = useDims(ref);
  const rowsL = useMemo(() => splitRows(left, n[0]), [left, n]);
  const rowsR = useMemo(() => splitRows(right, n[1]), [right, n]);

  // On a desktop, a pair is exactly as tall as its type at the centre seam, plus a little air.
  useEffect(() => {
    const el = ref.current!;
    const size = () => {
      if (store.phone || !store.ready || hrefs) { el.style.height = ''; el.style.minHeight = ''; return; }
      const Wmid = 0.5 * store.vw - 2 * padX();
      const blk = (rows: string[]) => {
        const S = Math.min(...rows.map((r) => sizeAt(r, Wmid, 74)));
        return rows.reduce((a, r) => a + solve(r, Wmid * 0.995, S)[1] * LH, 0) + (rows.length - 1) * 0.04 * S;
      };
      const h = Math.max(blk(rowsL), blk(rowsR)) + 80 + store.vh * air;
      el.style.height = Math.round(Math.min(h, store.vh * 0.9)) + 'px';
      el.style.minHeight = '0px';
    };
    size();
    window.addEventListener('perm:size', size);
    return () => window.removeEventListener('perm:size', size);
  }, [rowsL, rowsR, hrefs, air]);

  const getter = (side: 'L' | 'R', rows: string[]): Get => () => {
    const H = dims.current.h;
    const px = padX();
    const py = store.phone ? Math.max(14, Math.min(40, H * 0.06)) : 40;
    const k = rows.length;
    if (!store.phone) {
      const W = halfW(side) - 2 * px;
      const Wmid = 0.5 * store.vw - 2 * px;
      const S = Math.min((H - 2 * py) / (k * LH), ...rows.map((r) => sizeAt(r, Wmid, 74)));
      return [W, S];
    }
    const ph = (side === 'L' ? store.s : 1 - store.s) * H;
    const W = store.vw - 2 * px;
    const S = Math.min(Math.max(8, (ph - 2 * py) / (k * LH)), ...rows.map((r) => sizeAt(r, W, 66)));
    return [W, S];
  };

  const Tag = tag;
  const pane = (side: 'L' | 'R', text: string, rows: string[], i: number) => {
    const inner = (
      <>
        <Tag className="sr-only-x">{text}</Tag>
        <span className="stack">
          {rows.map((r, j) => <FitRow key={j} text={r} get={getter(side, rows)} />)}
        </span>
      </>
    );
    return hrefs ? (
      <a className={'pane door ' + side} href={hrefs[i]}>{inner}<span className="arrow" aria-hidden="true" /></a>
    ) : (
      <div className={'pane ' + side}>{inner}</div>
    );
  };

  return (
    <div className={'pair ' + className} ref={ref}>
      {pane('L', left, rowsL, 0)}
      {pane('R', right, rowsR, 1)}
      {!hrefs && !still && <PhoneSeam pair={ref} onDrag={seam.onDrag} onPress={seam.onPress} label="The seam. Drag it, or press for both." />}
      {permable && <PermLayer rowsL={rowsL} rowsR={rowsR} dims={dims} on={on} onOff={seam.onOff} />}
    </div>
  );
}

/** Both sides at once: the halves slide through each other in bands, and one red word sits on the seam. */
function PermLayer({ rowsL, rowsR, dims, on, onOff }: { rowsL: string[]; rowsR: string[]; dims: React.RefObject<Dims>; on: boolean; onOff: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const bands = useMemo(() => {
    const out: { side: 'L' | 'R'; text: string }[] = [];
    for (let i = 0; i < Math.max(rowsL.length, rowsR.length); i++) {
      if (rowsL[i]) out.push({ side: 'L', text: rowsL[i] });
      if (rowsR[i]) out.push({ side: 'R', text: rowsR[i] });
    }
    return out;
  }, [rowsL, rowsR]);
  const mid = Math.ceil(bands.length / 2);
  const bandH = () => dims.current!.h / (bands.length + 1.7);

  useEffect(() => {
    const el = ref.current!;
    const t = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    t.set(el, { autoAlpha: 1 });
    t.fromTo(el.querySelectorAll('.band.L'), { xPercent: -101 }, { xPercent: 0, duration: 0.9, stagger: 0.06 }, 0);
    t.fromTo(el.querySelectorAll('.band.R'), { xPercent: 101 }, { xPercent: 0, duration: 0.9, stagger: 0.06 }, 0.03);
    t.fromTo(el.querySelector('.pband'), { scaleY: 0 }, { scaleY: 1, duration: 0.6 }, 0.25);
    t.fromTo(el.querySelector('.pword'), { scale: 1.35, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.7, ease: 'back.out(2.2)' }, 0.38);
    tl.current = t;
    return () => { t.kill(); };
  }, []);

  useEffect(() => {
    const t = tl.current!;
    if (still) { t.progress(on ? 1 : 0); return; }
    if (on) t.timeScale(1).play(); else t.timeScale(1.8).reverse();
  }, [on]);

  const bandGet = (text: string) => (): [number, number, boolean] => {
    const W = store.vw - 2 * padX();
    return [W * (store.phone ? 1 : 0.78), (bandH() * 0.84) / LH, true];
  };

  return (
    <div className="perm" ref={ref} aria-hidden="true" onClick={onOff}>
      {bands.map((b, i) => (
        <PermFrag key={i} b={b} first={i === mid} bandGet={bandGet} h={bandH} />
      ))}
      {mid >= bands.length && <PermBand h={bandH} />}
    </div>
  );
}

function PermFrag({ b, first, bandGet, h }: { b: { side: 'L' | 'R'; text: string }; first: boolean; bandGet: (t: string) => () => [number, number, boolean]; h: () => number }) {
  return (
    <>
      {first && <PermBand h={h} />}
      <div className={'band ' + b.side}>
        <FitRow text={b.text} get={bandGet(b.text)} live={false} />
      </div>
    </>
  );
}

function PermBand({ h }: { h: () => number }) {
  return (
    <div className="pband">
      <span className="ph L" />
      <span className="ph R" />
      <span className="pword">
        <FitRow text="Perm." live={false} get={() => [Math.min(store.vw * (store.phone ? 0.84 : 0.56), 980), (h() * 1.7 * 1.02) / LH, true]} />
      </span>
    </div>
  );
}

/** Two solid fields under a pair, split at the same seam. Body text lives here, never over the bands. */
export function Fields({ left, right, className = '' }: { left?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={'fields ' + className}>
      <div className="field L">{left}</div>
      <div className="field R">{right}</div>
    </div>
  );
}
