// One display word, built as clipped copies of the same text so every cut is pixel exact.
// The main cut opens a gap that holds the section's body. Any press or horizontal drag
// across the word makes a second, temporary cut at that height that opens and springs shut.
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { gsap, ScrollTrigger } from '@/lib/scroll';
import { still } from '@/lib/utils';

type Props = {
  text: string;
  /** Height of the main cut above the baseline, in em. Null: no main cut (the word stays whole until you cut it). */
  cut?: number | null;
  /** reserve: the gap's height is held in the layout and the halves part inside it. flow: the page grows as it opens. */
  mode?: 'reserve' | 'flow';
  /** Where the closed word rests inside a reserved gap: 0.5 centred, 1 the bottom half never moves (only the top lifts). */
  bias?: number;
  /** load: opens on mount. scroll: arrives and opens as it reaches the middle of the screen. manual: follows `open`. */
  trigger?: 'load' | 'scroll' | 'manual';
  open?: boolean;
  /** Largest font size in px, given the viewport width and height. */
  max?: (w: number, h: number) => number;
  align?: 'left' | 'center';
  /** The footer line: it can be scored but it does not come apart. */
  whole?: boolean;
  label: string;
  onPress?: () => void;
  expanded?: boolean;
  delay?: number;
  className?: string;
  children?: ReactNode;
};

type State = {
  fs: number; H: number; c0: number; G: number; W: number; tw: number; tl: number;
  base: number; f: number; draw: number; u: number; cu: number; du: number; dir: number; shake: number; on: boolean;
};

const LH = 1;
let refreshT = 0;
/** Many words re-measure at once when the face arrives: refresh the triggers once, after they settle. */
const refreshSoon = () => {
  window.clearTimeout(refreshT);
  refreshT = window.setTimeout(() => ScrollTrigger.refresh(), 250);
};

function Glyphs({ text }: { text: string }) {
  // The question mark is the one red glyph on the page.
  const parts = text.split('?');
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && <span className="cx-q">?</span>}
        </span>
      ))}
    </>
  );
}

export function Word({
  text, cut = 0.3, mode = 'reserve', bias = 0.5, trigger = 'scroll', open, max, align = 'left', whole = false,
  label, onPress, expanded, delay = 0, className, children,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const ink = useRef<HTMLDivElement>(null);
  const meas = useRef<HTMLSpanElement>(null);
  const mark = useRef<HTMLSpanElement>(null);
  const gap = useRef<HTMLDivElement>(null);
  const gin = useRef<HTMLDivElement>(null);
  const sl = useRef<(HTMLDivElement | null)[]>([]);
  const ln = useRef<(HTMLElement | null)[]>([]);
  const hasCut = cut !== null && cut !== undefined;
  const st = useRef<State>({ fs: 100, H: 100, c0: 60, G: 0, W: 0, tw: 0, tl: 0, base: 80, f: still ? 1 : 0, draw: still ? 1 : 0, u: 0, cu: -1, du: 0, dir: 1, shake: 0, on: false });
  const maxRef = useRef(max);
  maxRef.current = max;
  const pressRef = useRef(onPress);
  pressRef.current = onPress;

  const apply = () => {
    const s = st.current;
    const r = root.current;
    if (!r) return;
    const b = mode === 'flow' ? 0 : bias;
    const G = hasCut ? s.G : 0;
    const o = s.f * G;
    const topTy = b * (G - o);
    const botTy = topTy + o;
    const region = mode === 'flow' ? o : G;
    r.style.height = `${Math.max(0, s.H + region)}px`;
    // Cut positions in word space.
    const user = s.cu > 0 && s.cu < s.H;
    const cuts: number[] = [];
    if (hasCut) cuts.push(s.c0);
    if (user) cuts.push(s.cu);
    cuts.sort((a, z) => a - z);
    const bounds = [0, ...cuts, s.H];
    const tyAt = (y: number) => {
      let t = 0;
      if (hasCut) t += y < s.c0 ? topTy : botTy;
      else t += G * b;
      if (user && !whole) t += y < s.cu ? -s.u / 2 : s.u / 2;
      return t;
    };
    const txAt = (y: number) => (user ? (whole ? s.shake : (y < s.cu ? 1 : -1) * s.u * 0.22 * s.dir) : 0);
    for (let i = 0; i < 3; i++) {
      const el = sl.current[i];
      if (!el) continue;
      const a = bounds[i];
      const z = bounds[i + 1];
      if (a === undefined || z === undefined) { el.style.visibility = 'hidden'; continue; }
      el.style.visibility = 'visible';
      const top = i === 0 ? '-50%' : `${a}px`;
      const bot = i === bounds.length - 2 ? '-50%' : `${s.H - z}px`;
      el.style.clipPath = `inset(${top} -8% ${bot} -8%)`;
      const mid = (a + z) / 2;
      el.style.transform = `translate3d(${txAt(mid)}px, ${tyAt(mid)}px, 0)`;
    }
    // Red faces of the cuts.
    const L = ln.current;
    const bleed = Math.min(40, s.fs * 0.12);
    const setLine = (el: HTMLElement | null, y: number, sx: number, origin: string, op = 1) => {
      if (!el) return;
      el.style.top = `${y}px`;
      el.style.left = `${s.tl - bleed}px`;
      el.style.width = `${s.tw + bleed * 2}px`;
      el.style.transformOrigin = origin;
      el.style.transform = `scaleX(${sx})`;
      el.style.opacity = String(op);
    };
    if (hasCut) {
      setLine(L[0], s.c0 + topTy, s.draw, 'left center');
      setLine(L[1], s.c0 + botTy, s.draw, 'left center', o > 1.5 ? 1 : 0);
    }
    if (user && whole) {
      // It will not come apart: the knife slides under the baseline instead of through.
      setLine(L[2], s.base + s.fs * 0.09, s.du, s.dir > 0 ? 'left center' : 'right center');
      setLine(L[3], 0, 0, 'left center', 0);
    } else if (user) {
      const e = 0.001;
      setLine(L[2], s.cu + tyAt(s.cu - e), s.du, s.dir > 0 ? 'left center' : 'right center');
      setLine(L[3], s.cu + tyAt(s.cu + e), s.du, s.dir > 0 ? 'left center' : 'right center', s.u > 1 ? 1 : 0);
    } else {
      setLine(L[2], 0, 0, 'left center', 0);
      setLine(L[3], 0, 0, 'left center', 0);
    }
    // The body sits in the gap and is only ever shown in the opening.
    const g = gap.current;
    if (g && hasCut) {
      g.style.top = `${s.c0 + (mode === 'flow' ? 0 : 0)}px`;
      g.style.height = `${G}px`;
      const hidTop = Math.max(0, b * (G - o));
      const hidBot = Math.max(0, (1 - b) * (G - o));
      g.style.clipPath = `inset(${hidTop}px -10% ${hidBot}px -10%)`;
      const vis = G > 0 ? Math.min(1, Math.max(0, (s.f - 0.25) / 0.6)) : 0;
      if (gin.current) gin.current.style.opacity = String(vis);
      g.style.visibility = s.f > 0.01 ? 'visible' : 'hidden';
    }
  };

  const measure = () => {
    const r = root.current;
    const m = meas.current;
    const mk = mark.current;
    if (!r || !m || !mk) return;
    const s = st.current;
    const W = r.clientWidth;
    const mr = m.getBoundingClientRect();
    const w100 = mr.width * 5;
    const base100 = (mk.getBoundingClientRect().bottom - mr.top) * 5;
    const lim = maxRef.current ? maxRef.current(window.innerWidth, window.innerHeight) : 10000;
    const fs = Math.max(24, Math.min(lim, w100 > 0 ? (W / w100) * 100 * 0.995 : 100));
    const oldFs = s.fs;
    s.fs = fs;
    s.W = W;
    s.H = fs * LH;
    s.tw = (w100 * fs) / 100;
    s.tl = align === 'center' ? (W - s.tw) / 2 : 0;
    const base = (base100 / 100) * fs;
    s.base = base;
    s.c0 = hasCut ? base - (cut as number) * fs : -1;
    const G = hasCut && gin.current ? gin.current.offsetHeight : 0;
    if (Math.abs(G - s.G) > 2 || Math.abs(fs - oldFs) > 2) refreshSoon();
    s.G = G;
    r.style.setProperty('--fs', `${fs}px`);
    r.style.setProperty('--tl', `${s.tl}px`);
    apply();
  };

  // Measure now, again when the face arrives, and on resize.
  useLayoutEffect(() => {
    measure();
    let alive = true;
    document.fonts?.ready.then(() => { if (alive) { measure(); ScrollTrigger.refresh(); } });
    const ro = new ResizeObserver(() => measure());
    if (root.current) ro.observe(root.current);
    if (gin.current) ro.observe(gin.current);
    return () => { alive = false; ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const openUp = (d = 0) => {
    const s = st.current;
    gsap.killTweensOf(s, 'draw,f');
    if (still) { s.draw = 1; s.f = 1; apply(); return; }
    const tl = gsap.timeline({ delay: d, onUpdate: apply });
    tl.to(s, { draw: 1, duration: 0.55, ease: 'power3.inOut', onUpdate: apply })
      .to(s, { f: 1, duration: 1.05, ease: 'back.out(1.25)', onUpdate: apply }, 0.42);
  };
  const shut = () => {
    const s = st.current;
    gsap.killTweensOf(s, 'draw,f');
    if (still) { s.f = 0; s.draw = 0; apply(); return; }
    gsap.timeline()
      .to(s, { f: 0, duration: 0.55, ease: 'power3.inOut', onUpdate: apply })
      .to(s, { draw: 0, duration: 0.3, ease: 'power2.in', onUpdate: apply }, 0.4);
  };

  // Arrival and opening.
  useEffect(() => {
    const s = st.current;
    const k = ink.current!;
    if (!hasCut) { s.draw = 0; apply(); }
    if (still) { if (trigger !== 'manual') { s.f = 1; s.draw = 1; apply(); } return; }
    if (trigger === 'load') {
      gsap.fromTo(k, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay });
      openUp(delay + 0.7);
      return;
    }
    if (trigger === 'scroll') {
      gsap.set(k, { opacity: 0, y: 40 });
      const off = () => (mode === 'flow' ? 0 : bias * st.current.G);
      const a = ScrollTrigger.create({
        trigger: root.current, start: () => `top+=${off()} 92%`, once: true, invalidateOnRefresh: true,
        onEnter: () => gsap.to(k, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }),
      });
      const b = hasCut ? ScrollTrigger.create({
        trigger: root.current, start: () => `top+=${off()} 66%`, once: true, invalidateOnRefresh: true,
        onEnter: () => { gsap.to(k, { opacity: 1, y: 0, duration: 0.4, overwrite: true }); openUp(0.1); },
      }) : null;
      return () => { a.kill(); b?.kill(); };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (trigger !== 'manual') return;
    if (open) openUp(0.05);
    else if (st.current.f > 0 || st.current.draw > 0) shut();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // A cut of your own, at the height you choose.
  const rel = useRef(false);
  /** Where along the word the knife is, 0 to 1, from the side it came in. */
  const along = (clientX: number) => {
    const s = st.current;
    const bleed = Math.min(40, s.fs * 0.12);
    const x = clientX - root.current!.getBoundingClientRect().left;
    const span = s.tw + bleed * 2;
    const v = s.dir > 0 ? (x - (s.tl - bleed)) / span : (s.tl + s.tw + bleed - x) / span;
    return Math.min(1, Math.max(0.04, v));
  };
  const release = () => {
    const s = st.current;
    if (rel.current || !s.on) return;
    rel.current = true;
    gsap.killTweensOf(s, 'du');
    const amp = whole ? 0 : Math.max(10, s.H * 0.16);
    const tl = gsap.timeline({ onUpdate: apply, onComplete: () => { s.cu = -1; s.on = false; rel.current = false; apply(); } });
    tl.to(s, { du: 1, duration: whole ? 0.22 : 0.16, ease: 'power2.out', onUpdate: apply });
    if (whole) {
      tl.to(s, { shake: 6, duration: 0.05, ease: 'power1.out', onUpdate: apply }, 0.2)
        .to(s, { shake: 0, duration: 0.8, ease: 'elastic.out(1.2, 0.22)', onUpdate: apply }, 0.25)
        .to(s, { du: 0, duration: 0.4, ease: 'power2.in', onUpdate: apply }, 0.55);
    } else {
      tl.to(s, { u: amp, duration: 0.42, ease: 'back.out(2.4)', onUpdate: apply }, 0.1)
        .to(s, { u: 0, duration: 1.0, ease: 'elastic.out(1, 0.4)', onUpdate: apply }, 1.0)
        .to(s, { du: 0, duration: 0.45, ease: 'power2.in', onUpdate: apply }, 1.5);
    }
  };
  /** A cut of your own, at the height you choose. With `follow` the red line trails the pointer until you let go. */
  const slash = (yLocal: number | null, dir: number, clientX?: number) => {
    const s = st.current;
    if (still) return false;
    if (s.on) return false;
    const b = mode === 'flow' ? 0 : bias;
    const G = hasCut ? s.G : 0;
    const o = s.f * G;
    const topTy = hasCut ? b * (G - o) : G * b;
    let y: number;
    if (yLocal === null) y = s.H * (0.2 + Math.random() * 0.6);
    else y = hasCut && yLocal > s.c0 + topTy + o / 2 ? yLocal - (topTy + o) : yLocal - topTy;
    y = Math.min(s.H * 0.86, Math.max(s.H * 0.14, y));
    if (hasCut && Math.abs(y - s.c0) < s.H * 0.07) y = s.c0 + (y < s.c0 ? -1 : 1) * s.H * 0.07;
    s.on = true;
    rel.current = false;
    s.cu = y; s.dir = dir; s.du = 0; s.u = 0; s.shake = 0;
    if (clientX === undefined || whole) { release(); return true; }
    gsap.to(s, { du: along(clientX), duration: 0.12, ease: 'power2.out', onUpdate: apply });
    return true;
  };

  const drag = useRef<{ x: number; y: number; id: number; cut: boolean } | null>(null);
  const local = (clientY: number) => clientY - root.current!.getBoundingClientRect().top;

  return (
    <div ref={root} className={'cx ' + (className ?? '')} data-align={align}>
      <span className="cx-mw" aria-hidden="true">
        <span className="cx-meas" ref={meas}>
          <Glyphs text={text} />
          <span className="cx-mark" ref={mark} />
        </span>
      </span>
      <div
        ref={ink}
        className="cx-ink"
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-expanded={expanded}
        onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, cut: false }; }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          if (d.cut) {
            const s = st.current;
            if (rel.current || !s.on) return;
            const v = along(e.clientX);
            gsap.to(s, { du: v, duration: 0.12, ease: 'power2.out', overwrite: 'auto', onUpdate: apply });
            if (v > 0.97) release();
            return;
          }
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy) * 1.4) {
            d.cut = true;
            if (slash(local(d.y), Math.sign(dx), e.clientX)) {
              try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* fine */ }
            }
          }
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (d?.cut) { release(); return; }
          if (!d) return;
          if (Math.abs(e.clientY - d.y) > 12) return;
          if (pressRef.current) pressRef.current();
          else slash(local(e.clientY), 1);
        }}
        onPointerCancel={() => { if (drag.current?.cut) release(); drag.current = null; }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          if (pressRef.current) pressRef.current();
          else slash(null, 1);
        }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} className="cx-sl" ref={(el) => { sl.current[i] = el; }} aria-hidden="true">
            <span className="cx-t"><Glyphs text={text} /></span>
          </div>
        ))}
        {[0, 1, 2, 3].map((i) => (
          <i key={i} className="cx-ln" ref={(el) => { ln.current[i] = el; }} aria-hidden="true" />
        ))}
      </div>
      {hasCut && (
        <div className="cx-gap" ref={gap}>
          <div className="cx-gin" ref={gin}>{children}</div>
        </div>
      )}
    </div>
  );
}
