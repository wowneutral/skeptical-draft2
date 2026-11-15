// The two kinds of ink on the page: words the pen writes, and marks it makes on the type.
import { useEffect, useRef, type ReactNode } from 'react';
import { markStrokes, WORDS, writer, type Job, type MarkKind } from './ink';
import { isPhone } from '@/lib/utils';

const blank = (id: string, host: HTMLElement, svg: SVGSVGElement, kind: Job['kind']): Job => ({
  id, order: 0, kind, host, svg, build: () => {}, strokes: [], th: 3, pad: 0, pen: () => 380, speed: 1500, at: 0.78, els: [], state: 'idle',
  si: 0, sd: 0, phase: 'travel', t: 0, hop: { from: [0, 0], to: [0, 0], dur: 0.1 },
});

const orderOf = (el: HTMLElement) => { const r = el.getBoundingClientRect(); return r.top + window.scrollY + r.left * 0.01; };

function useJob(make: () => Job | null) {
  useEffect(() => {
    const job = make(); if (!job) return;
    job.order = orderOf(job.host);
    writer.add(job);
    let raf = 0, w = job.host.offsetWidth, h = job.host.offsetHeight;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const nw = job.host.offsetWidth, nh = job.host.offsetHeight;
        if (Math.abs(nw - w) < 2 && Math.abs(nh - h) < 2) return;
        w = nw; h = nh; job.order = orderOf(job.host);
        if (job.kind === 'mark') writer.rebuild(job);
      });
    });
    ro.observe(job.host);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); writer.remove(job); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** A word the pen writes. The svg is sized in em, so it follows the heading's font size by itself. */
export function InkWord({ text, id, speed = 1500, pen = 3, at = 0.78, hold = false, className }: { text: string; id: string; speed?: number; pen?: number; at?: number; hold?: boolean; className?: string }) {
  const host = useRef<HTMLSpanElement>(null), svg = useRef<SVGSVGElement>(null);
  const g = WORDS[text];
  useJob(() => {
    if (!host.current || !svg.current || !g) return null;
    const j = blank(id, host.current, svg.current, 'word');
    j.strokes = g.strokes as [number, number][][]; j.th = g.th; j.speed = speed; j.at = at; j.hold = hold;
    j.pen = () => Math.min(isPhone() ? 520 : 1100, parseFloat(getComputedStyle(host.current!).fontSize) * pen);
    return j;
  });
  if (!g) return <span className={className}>{text}</span>;
  const pad = 60, x0 = Math.min(0, g.box[0]) - pad, x1 = Math.max(g.w, g.box[2]) + pad, y0 = Math.min(-700, g.box[1]) - pad, y1 = Math.max(80, g.box[3]) + pad;
  return (
    <span ref={host} className={`iw ${className ?? ''}`} aria-hidden="true" data-word={id}>
      <svg ref={svg} viewBox={`${x0} ${y0} ${x1 - x0} ${y1 - y0}`} style={{ width: `${(x1 - x0) / 1000}em`, height: `${(y1 - y0) / 1000}em`, marginLeft: `${x0 / 1000}em`, marginRight: `${-(x1 - g.w) / 1000}em` }} />
    </span>
  );
}

/** A mark the pen makes on a piece of type: a circle, an underline, a bracket, a correction. */
export function Mark({ kind, id, children, th = 3.4, at = 0.72, speed = 1700, className, pen = 400 }: { kind: MarkKind; id: string; children?: ReactNode; th?: number; at?: number; speed?: number; className?: string; pen?: number }) {
  const host = useRef<HTMLSpanElement>(null), svg = useRef<SVGSVGElement>(null);
  useJob(() => {
    if (!host.current || !svg.current) return null;
    const j = blank(id, host.current, svg.current, 'mark');
    j.th = th; j.speed = speed; j.at = at;
    j.pen = () => (isPhone() ? pen * 0.72 : pen);
    j.build = () => {
      const el = host.current!, w = el.offsetWidth, h = el.offsetHeight;
      const P = kind === 'fix' ? Math.max(60, h * 1.6) : kind === 'bracket' ? 50 : 40;
      j.strokes = markStrokes(kind, w, h, id);
      const s = svg.current!;
      s.setAttribute('viewBox', `${-P} ${-P} ${w + 2 * P} ${h + 2 * P}`);
      Object.assign(s.style, { left: `${-P}px`, top: `${-P}px`, width: `${w + 2 * P}px`, height: `${h + 2 * P}px` });
    };
    return j;
  });
  return (
    <span ref={host} className={`mk mk-${kind} ${className ?? ''}`}>
      {children}
      <svg ref={svg} className="mk-svg" aria-hidden="true" />
    </span>
  );
}
