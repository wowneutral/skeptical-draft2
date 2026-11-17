import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import marks from '@/lib/marks.json';
import { JOIN, SITE } from '@/content';
import { still } from '@/lib/utils';

type Line = { d: string; len: number };

/** The champion's slot: one red question mark that splits into a bracket of its own. */
export function Join() {
  const root = useRef<HTMLDivElement>(null);
  const qRef = useRef<HTMLDivElement>(null);
  const slots = useRef<(HTMLDivElement | null)[]>([]);
  const [open, setOpen] = useState(still);
  const [picked, setPicked] = useState<boolean[]>([false, false, false]);
  const [lines, setLines] = useState<Line[]>([]);
  const [box, setBox] = useState({ w: 10, h: 10 });

  useEffect(() => {
    if (still) return;
    const el = root.current!;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOpen(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useLayoutEffect(() => {
    const measure = () => {
      const r = root.current, q = qRef.current;
      if (!r || !q) return;
      const R = r.getBoundingClientRect(), Q = q.getBoundingClientRect();
      const phone = window.innerWidth <= 760;
      const out: Line[] = [];
      slots.current.forEach((s) => {
        if (!s) return;
        const rule = s.querySelector('.slot-rule') as HTMLElement;
        const S = rule.getBoundingClientRect();
        const y = S.top - R.top, x = S.left - R.left;
        let d: string, len: number;
        if (!phone) {
          const x0 = Q.right - R.left + 8, y0 = Q.top - R.top + Q.height * 0.62;
          const tx = x0 + (x - x0) * 0.5;
          d = `M${x0} ${y0} H${tx} V${y} H${x + S.width}`;
          len = (tx - x0) + Math.abs(y - y0) + (x + S.width - tx);
        } else {
          const x0 = 6, y0 = Q.bottom - R.top + 6;
          d = `M${x0} ${y0} V${y} H${x + S.width}`;
          len = Math.abs(y - y0) + (x + S.width - x0);
        }
        out.push({ d, len });
      });
      setBox({ w: R.width, h: R.height });
      setLines(out);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (root.current) ro.observe(root.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [picked]);

  const q = marks.roman;
  return (
    <div ref={root} className={`join${open ? ' is-open' : ''}`}>
      <svg className="join-svg" width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} aria-hidden="true">
        {lines.map((l, i) => (
          <g key={i}>
            <path className="j-bone" d={l.d} style={{ strokeDasharray: l.len, strokeDashoffset: open ? 0 : l.len, transitionDelay: `${0.5 + i * 0.14}s` }} />
            <path className="j-red" d={l.d} style={{ strokeDasharray: l.len, strokeDashoffset: picked[i] ? 0 : l.len }} />
          </g>
        ))}
      </svg>
      <div ref={qRef} className="join-q" aria-hidden="true">
        <svg viewBox="-491 -770 982 1540"><path d={q.d} /></svg>
      </div>
      <div className="join-slots">
        {JOIN.paths.map((p, i) => (
          <div key={p.id} ref={(el) => { slots.current[i] = el; }} className={`slot${picked[i] ? ' is-picked' : ''}`} style={{ transitionDelay: `${0.7 + i * 0.14}s` }}>
            <button
              className="slot-head"
              aria-expanded={picked[i]}
              aria-controls={`bk-${p.id}`}
              onClick={() => setPicked((a) => a.map((v, j) => (j === i ? !v : v)))}
            >
              <span className="slot-name">{p.name}</span>
              <span className="slot-line">{p.line}</span>
              <span className="slot-rule" />
            </button>
            <div className="slot-body" id={`bk-${p.id}`}>
              <p className="slot-first">{p.text[0]}</p>
              <div className="slot-more" hidden={!picked[i] && !still}>
                {p.text.slice(1).map((t) => <p key={t}>{t}</p>)}
              </div>
              <a className="go" href={p.href}>{p.line}</a>
            </div>
          </div>
        ))}
      </div>
      <div className="join-foot">
        <p>{JOIN.already.before}<a className="u" href={JOIN.already.href}>{JOIN.already.label}</a></p>
        <p>{JOIN.coach.before}<a className="u" href={JOIN.coach.href}>{JOIN.coach.label}</a></p>
        <p>{JOIN.also} <a className="u" href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
        <p>{JOIN.discord}</p>
      </div>
    </div>
  );
}
