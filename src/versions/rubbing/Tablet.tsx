import { useEffect, useRef, useState } from 'react';
import { still, coarse } from '@/lib/utils';
import { FACE, Sheet, layout, type Opts } from './engine';

export type Handle = {
  pass: (dur?: number) => Promise<void>;
  fade: () => Promise<void>;
  fill: () => void;
  coverage: () => number;
  sheet: Sheet;
};

type Props = Opts & {
  /** Lines for a wide and a narrow container. */
  lines: string[];
  narrow?: string[];
  narrowAt?: number;
  /** Rub up by itself when scrolled to, if nobody has. */
  auto?: boolean;
  autoDelay?: number;
  /** Hero only: a hand starts the rubbing if you wait. */
  tease?: boolean;
  className?: string;
  onCover?: (c: number, words: number[]) => void;
  onReady?: (h: Handle) => void;
  onTouched?: () => void;
};

let fontsReady: Promise<unknown> | null = null;
const loadFonts = () => (fontsReady ??= Promise.all([document.fonts.load(`520 100px ${FACE}`), document.fonts.load(`600 100px ${FACE}`)]).catch(() => null));

export function Tablet({ lines, narrow, narrowAt = 640, auto, autoDelay = 250, tease, className, onCover, onReady, onTouched, ...o }: Props) {
  const wrap = useRef<HTMLSpanElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const sheetRef = useRef<Sheet | null>(null);
  const [h, setH] = useState(0);
  const st = useRef({ touched: false, built: 0, done: false, busy: false, cb: { onCover, onTouched } });
  st.current.cb = { onCover, onTouched };
  const key = JSON.stringify([lines, narrow, o.maxFont]);

  useEffect(() => {
    const el = wrap.current!, canvas = cv.current!;
    const sheet = (sheetRef.current ??= new Sheet(canvas));
    let alive = true;
    let width = 0;
    const s = st.current;

    const report = () => {
      const c = sheet.coverage();
      const words = sheet.words.map((b) => sheet.coverage(b));
      if (c > 0.6) s.done = true;
      s.cb.onCover?.(c, words);
    };

    const build = async () => {
      await loadFonts();
      if (!alive) return;
      const w = el.clientWidth;
      if (!w || Math.abs(w - width) < 2) return;
      width = w;
      const ls = narrow && w < narrowAt ? narrow : lines;
      const L = layout(ls, w, o);
      setH(L.h);
      canvas.style.height = L.h + 'px';
      sheet.build(ls, w, L, o);
      if (still || s.done) { sheet.fill(1); s.done = true; }
      s.built++;
      report();
    };
    build();
    const ro = new ResizeObserver(() => build());
    ro.observe(el);

    const handle: Handle = {
      pass: async (dur = 1500) => { if (still) { sheet.fill(1); report(); return; } s.busy = true; await sheet.pass(1, dur); s.busy = false; report(); },
      fade: async () => { s.done = false; if (still) { sheet.acc.fill(0); sheet.all(); sheet.flush(); report(); return; } await sheet.fade(); report(); },
      fill: () => { sheet.fill(1); report(); },
      coverage: () => sheet.coverage(),
      sheet,
    };
    onReady?.(handle);

    // rubbing with a pointer
    let down = false, timer = 0, rubbed = 0;
    const r = () => Math.max(16, Math.min(46, el.clientWidth * 0.03)) * (coarse ? 1.35 : 1);
    const at = (e: PointerEvent) => { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top] as const; };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && !down) return;
      if (s.busy) return;
      const [x, y] = at(e);
      rubbed += sheet.rub(x, y, r());
      // only a real stroke counts as taking over from the hand, not a scroll that started here
      if (!s.touched && rubbed > 160) { s.touched = true; s.cb.onTouched?.(); }
      sheet.flush();
      clearTimeout(timer);
      timer = window.setTimeout(report, 140);
    };
    const press = (e: PointerEvent) => { down = true; sheet.lift(); move(e); };
    const up = () => { down = false; sheet.lift(); };
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerdown', press);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', up);

    // scrolled to: rub it up if nobody has
    let io: IntersectionObserver | null = null;
    if (auto && !still) {
      io = new IntersectionObserver((es) => {
        for (const en of es) {
          if (en.isIntersecting && !s.busy && sheet.coverage() < 0.5) {
            setTimeout(() => { if (alive && !s.busy && sheet.coverage() < 0.5) handle.pass(1700); }, autoDelay);
          }
        }
      }, { threshold: 0.7 });
      io.observe(canvas);
    }

    // the hero: a hand starts the rubbing if you wait
    const timers: number[] = [];
    if (tease && !still) {
      timers.push(window.setTimeout(async () => {
        if (s.touched || !alive) return;
        s.busy = true; await sheet.pass(0.34, 1500); s.busy = false; report();
      }, 1600));
      timers.push(window.setTimeout(async () => {
        if (s.touched || !alive) return;
        s.busy = true; await sheet.pass(1, 2600); s.busy = false; report();
      }, 5600));
    }

    return () => {
      alive = false;
      ro.disconnect(); io?.disconnect();
      timers.forEach(clearTimeout); clearTimeout(timer);
      sheet.stop();
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerdown', press);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      canvas.removeEventListener('pointerleave', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <span ref={wrap} className={'rb-tab ' + (className ?? '')} style={{ minHeight: h || undefined }}>
      <canvas ref={cv} className="rb-cv" aria-hidden="true" />
    </span>
  );
}
