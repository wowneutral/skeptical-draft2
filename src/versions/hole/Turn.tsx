import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { gsap, scrollToY } from '@/lib/scroll';
import { clamp, still } from '@/lib/utils';
import { GLYPHS } from './glyphs';

/** Where the die-cut sits: k = glyph height as a share of the sheet height, x = anchor across, at = which glyph edge the anchor is, cy = centre down. */
export type Place = { k: number; x: number; at: 'l' | 'r' | 'c'; cy: number };
export type Cut = { g: string; desk: Place; phone: Place; field: 'left' | 'right' };
type Tone = 'dark' | 'light';

/** Pointer, shared by every sheet: the page under each cut drifts a little against it, so the cut reads as depth. */
const ptr = { x: 0, y: 0, sx: 0, sy: 0 };
if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', (e) => {
    ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
    ptr.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
}

const PAPER = { dark: '#0e0e0e', light: '#eeeae0' };
const WALL = { dark: '#34322d', light: '#bdb6a6' };
const EDGE = { dark: 'rgba(238,234,224,0.42)', light: 'rgba(255,255,255,0.9)' };
const BACK = { dark: '#2a2925', light: '#d8d2c4' };

function place(c: Cut, W: number, H: number) {
  const phone = W <= 820 && H > W;
  const p = phone ? c.phone : c.desk;
  const g = GLYPHS[c.g];
  const s = (p.k * H) / g.h;
  const gw = g.w * s;
  const cx = p.at === 'l' ? p.x * W + gw / 2 : p.at === 'r' ? p.x * W - gw / 2 : p.x * W;
  const cy = p.cy * H;
  return { g, s, cx, cy };
}

type Props = {
  id: string;
  tone: Tone;
  under: Tone;
  cut: Cut;
  label: string;
  first?: boolean;
  print: ReactNode;
  spread: (copy: boolean) => ReactNode;
};

export function Turn({ id, tone, under, cut, label, first, print, spread }: Props) {
  const uid = useId().replace(/:/g, '');
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const leaf = useRef<HTMLDivElement>(null);
  const shade = useRef<SVGRectElement>(null);
  const cast = useRef<HTMLDivElement>(null);
  const edge = useRef<SVGRectElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ W: 1440, H: 900 });
  const st = useRef({ peek: 0, pv: 0, pt: 0, open: first && !still ? 0 : 1, drag: null as null | { x: number; y: number; moved: boolean }, moved: false });

  useLayoutEffect(() => {
    const el = stage.current!;
    const read = () => setSize({ W: el.clientWidth, H: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { W, H } = size;
  const { g, s, cx, cy } = place(cut, W, H);
  const gcx = g.x + g.w / 2;
  const gcy = g.y + g.h / 2;
  const T = (o: number, dy = 0) => `translate(${cx} ${cy + dy}) scale(${s * (0.86 + 0.14 * o)}) rotate(${(1 - o) * -5}) translate(${-gcx} ${-gcy})`;
  const Tr = useRef(T);
  Tr.current = T;
  const t = Math.max(3, Math.round(H * 0.006));
  const c = W <= 820 ? 52 : 64; // folded corner
  const corner = `${W - c},${H} ${W},${H - c} ${W},${H}`;
  const fold = `${W - c},${H} ${W},${H - c} ${W - c},${H - c}`;

  // The opening: the first sheet's cut is punched as the page arrives.
  useEffect(() => {
    if (!first || still) return;
    const o = st.current;
    const set = () => {
      svg.current?.querySelectorAll<SVGElement>('[data-g]').forEach((n) => n.setAttribute('transform', Tr.current(o.open, Number(n.dataset.g) || 0)));
    };
    const tw = gsap.to(o, { open: 1, duration: 1.5, delay: 0.25, ease: 'expo.out', onUpdate: set });
    const pr = leaf.current?.querySelectorAll('.h-print > *');
    const tw2 = pr ? gsap.from(pr, { y: 26, opacity: 0, duration: 1.1, delay: 0.55, stagger: 0.08, ease: 'out', clearProps: 'all' }) : null;
    return () => { tw.kill(); tw2?.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll turns the sheet; the corner spring peeks it.
  useEffect(() => {
    if (still) return;
    const o = st.current;
    const tick = () => {
      const w = wrap.current, l = leaf.current, sg = stage.current;
      if (!w || !l || !sg) return;
      const r = w.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < -50 || r.top > vh + 50) return;
      const Hh = sg.clientHeight;
      const p = clamp(-r.top / Math.max(1, r.height - Hh));
      const q = clamp((p - 0.06) / 0.74);
      const e = q * q * (3 - 2 * q);
      const dt = Math.min(0.05, gsap.ticker.deltaRatio(60) / 60);
      o.pv += ((o.pt - o.peek) * 190 - o.pv * 13) * dt;
      o.peek += o.pv * dt;
      const pk = Math.max(-0.05, o.peek) * (1 - e);
      const a = e * 104 + pk * 40;
      l.style.transform = `rotateX(${a.toFixed(2)}deg) rotateY(${(-pk * 10).toFixed(2)}deg)`;
      l.style.visibility = a > 97 ? 'hidden' : 'visible';
      l.style.pointerEvents = e > 0.02 ? 'none' : '';
      const rad = (Math.min(a, 90) * Math.PI) / 180;
      if (shade.current) shade.current.style.opacity = (Math.sin(rad) * 0.32).toFixed(3);
      if (edge.current) edge.current.style.opacity = Math.min(1, Math.sin(rad) * 4).toFixed(3);
      if (cast.current) cast.current.style.opacity = (Math.sin(rad) * (1 - e * 0.6)).toFixed(3);
      ptr.sx += (ptr.x - ptr.sx) * 0.06;
      ptr.sy += (ptr.y - ptr.sy) * 0.06;
      if (inner.current) {
        const k = 1 - e;
        inner.current.style.transform = `translate3d(${(-ptr.sx * 18 * k).toFixed(2)}px, ${(-ptr.sy * 12 * k).toFixed(2)}px, 0)`;
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  const turnPage = () => {
    const w = wrap.current, sg = stage.current;
    if (!w || !sg) return;
    const r = w.getBoundingClientRect();
    scrollToY(window.scrollY + r.top + r.height - sg.clientHeight + 2);
  };

  const down = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (still) return;
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    e.currentTarget.setPointerCapture(e.pointerId);
    st.current.drag = { x: e.clientX, y: e.clientY, moved: false };
  };
  const move = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = st.current.drag;
    if (!d) return;
    const dx = d.x - e.clientX, dy = d.y - e.clientY;
    if (Math.hypot(dx, dy) > 6) d.moved = true;
    st.current.pt = clamp((dy * 0.8 + dx * 0.5) / (H * 0.55), 0, 1.15);
  };
  const up = () => {
    const d = st.current.drag;
    st.current.drag = null;
    if (!d) return;
    st.current.moved = d.moved;
    const far = st.current.pt > 0.62;
    st.current.pt = 0.08;
    if (far) turnPage();
  };

  const cs = still ? 'h-turn is-still' : 'h-turn';
  const copy = still;

  return (
    <>
      <div className={cs} ref={wrap} data-first={first ? '' : undefined}>
        <div className="h-stage" ref={stage}>
          <div className={`h-under h-${under}`} aria-hidden={copy || undefined} inert={copy || undefined}>
            <div className="h-under-in" ref={inner}>{spread(copy)}</div>
            <div className="h-cast" ref={cast} />
          </div>
          <div
            className={`h-leaf h-${tone}`}
            ref={leaf}
          >
            <div className="h-sheet">
              <svg ref={svg} className="h-cut" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <mask id={`${uid}a`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
                    <rect width={W} height={H} fill="#fff" />
                    <path data-g="0" d={g.d} transform={T(st.current.open)} fill="#000" />
                    <polygon points={corner} fill="#000" />
                  </mask>
                  <mask id={`${uid}b`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
                    <rect width={W} height={H} fill="#000" />
                    <path data-g="0" d={g.d} transform={T(st.current.open)} fill="#fff" />
                    <path data-g={t} d={g.d} transform={T(st.current.open, t)} fill="#000" />
                  </mask>
                </defs>
                <rect width={W} height={H} fill={PAPER[tone]} mask={`url(#${uid}a)`} />
                <rect width={W} height={H} fill={WALL[tone]} mask={`url(#${uid}b)`} />
                <path data-g="0" d={g.d} transform={T(st.current.open)} fill="none" stroke={EDGE[tone]} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
                <rect ref={edge} x="0" y={H - t} width={W - c} height={t} fill={WALL[tone]} opacity="0" />
                <polygon className="h-fold" points={fold} fill={BACK[tone]} />
                <rect ref={shade} width={W} height={H} fill="#000" opacity="0" mask={`url(#${uid}a)`} />
              </svg>
              <div className={`h-print h-field-${cut.field}`}>{print}</div>
            </div>
            <button
              type="button"
              className="h-corner"
              aria-label={label}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              onPointerEnter={() => { if (!st.current.drag) st.current.pt = 0.1; }}
              onPointerLeave={() => { if (!st.current.drag) st.current.pt = 0; }}
              onFocus={() => { st.current.pt = 0.1; }}
              onBlur={() => { st.current.pt = 0; }}
              onClick={() => { if (!st.current.moved) turnPage(); st.current.moved = false; }}
            />
          </div>
        </div>
        {!still && <div className="h-anchor" id={id} />}
      </div>
      {still && <div className="h-plain" id={id}><div className={`h-under h-${under} h-flat`}>{spread(false)}</div></div>}
    </>
  );
}
