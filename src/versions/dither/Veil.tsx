// The 2D half of the print: a block of bone grain over text that is still in
// the page. Developing it clears the cells in Bayer order, so the words come
// up out of the same 8x8 matrix the head is printed with.
import { useEffect, useRef, useState } from 'react';
import { still } from '@/lib/utils';

const B8 = (() => {
  const b2 = (x: number, y: number) => ((x % 2) / 2 + ((y % 2) * (y % 2)) * 0.75) % 1;
  const out: number[] = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const v = b2(x >> 2, y >> 2) * 0.0625 + b2(x >> 1, y >> 1) * 0.25 + b2(x, y);
    out.push(v % 1);
  }
  return out;
})();

export function Veil({ open, cell = 5, density = 0.5 }: { open: boolean; cell?: number; density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const p = useRef(still || open ? 1 : 0);
  useEffect(() => {
    const c = ref.current!; const ctx = c.getContext('2d')!;
    let raf = 0, alive = true;
    const draw = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = c.clientWidth, h = c.clientHeight; if (!w || !h) return;
      if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const k = p.current; if (k >= 1) return;
      const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const th = B8[(y % 8) * 8 + (x % 8)];
        if (th < k) continue;
        ctx.fillStyle = '#0a0a0a'; ctx.fillRect(x * cell, y * cell, cell, cell);
        // Grain that drifts with the threshold, like a page under the lamp.
        if (((th * 7.3 + (x * 0.13 + y * 0.07)) % 1) < density) { ctx.fillStyle = '#f2efe8'; ctx.fillRect(x * cell, y * cell, cell, cell); }
      }
    };
    const target = still || open ? 1 : 0;
    const from = p.current, t0 = performance.now(), dur = 820;
    const step = (now: number) => {
      if (!alive) return;
      const t = Math.min(1, (now - t0) / dur);
      // In steps, like a print coming up in a tray.
      p.current = from + (target - from) * Math.floor((1 - Math.pow(1 - t, 3)) * 16) / 16;
      draw();
      if (t < 1) raf = requestAnimationFrame(step); else { p.current = target; draw(); }
    };
    if (from === target || still) draw(); else raf = requestAnimationFrame(step);
    const ro = new ResizeObserver(draw); ro.observe(c);
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); };
  }, [open, cell, density]);
  return <canvas ref={ref} className="dv-veil" aria-hidden="true" />;
}

/** Wraps big type so it develops out of the grain the first time it is seen. */
export function Dev({ children, className, cell = 7 }: { children: React.ReactNode; className?: string; cell?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(still);
  useEffect(() => {
    if (still) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { window.setTimeout(() => setOpen(true), 180); io.disconnect(); } }, { rootMargin: '0px 0px -18% 0px' });
    io.observe(ref.current!);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={'dv-dev ' + (className ?? '')}>
      {children}
      <Veil open={open} cell={cell} density={0.3} />
    </div>
  );
}
