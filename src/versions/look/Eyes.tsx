// The eyes. One drawing, one rig of springs, two ways to place it:
// <Eyes> is the pair that lives in the hero, docks in the top-right corner while
// you read and comes back full size for the ending; <LocalEyes> is the same pair
// sitting in a section (the record, the drive, the people) with that section's look.
import { forwardRef, useEffect, useId, useRef, type RefObject } from 'react';
import { gsap } from '@/lib/scroll';
import { clamp, coarse, lerp, smooth, still } from '@/lib/utils';
import { brain, EXPR, KEYS, Spring, now, type Expr, type Face, type Mood } from './rig';

const VW = 1000, VH = 470;
const EYES = [{ cx: 270, cy: 318, m: 1 }, { cx: 730, cy: 318, m: -1 }];
const ALMOND = 'M -172 0 C -112 -150 112 -150 172 0 C 112 150 -112 150 -172 0 Z';

const browD = (ba: number) => {
  const a = ba * 70;
  return `M -152 -12 Q 0 ${-30 - a} 150 -30 L 156 24 Q 0 ${22 - a} -152 12 Z`;
};
function mix(a: Expr, b: Expr, t: number): Expr {
  const f = (x: Face, y: Face) => Object.fromEntries(KEYS.map((k) => [k, lerp(x[k], y[k], t)])) as Face;
  return { L: f(a.L, b.L), R: f(a.R, b.R), pupil: lerp(a.pupil, b.pupil, t) };
}

/** The SVG. Rendered once; the rig writes its attributes every frame. */
const Drawing = forwardRef<SVGSVGElement>(function Drawing(_, ref) {
  const uid = useId().replace(/[^a-z0-9]/gi, '');
  return (
    <svg ref={ref} viewBox={`0 0 ${VW} ${VH}`} width="100%" height="100%" overflow="visible">
      <defs><clipPath id={`al${uid}`}><path d={ALMOND} /></clipPath></defs>
      <g className="pair">
        {EYES.map((E, i) => (
          <g key={i} data-eye={i} transform={`translate(${E.cx} ${E.cy}) scale(${E.m} 1)`}>
            <g className="ball">
              <path d={ALMOND} className="white" />
              <g clipPath={`url(#al${uid})`}>
                <g className="iris">
                  <circle r="68" className="ring" />
                  <circle r="30" className="pupil" />
                  <circle r="12" cx="-24" cy="-26" className="glint" />
                </g>
                <path className="lid-up lid" />
                <path className="lid-lo lid" />
                <path className="edge-up edge" />
                <path className="edge-lo edge lo" />
              </g>
              <path d={ALMOND} className="rim" />
            </g>
            <g className="lines">
              <path d="M -214 -18 L -268 -58" />
              <path d="M -222 4 L -284 4" />
              <path d="M -214 26 L -268 66" />
            </g>
            <g className="brow"><path /></g>
          </g>
        ))}
      </g>
    </svg>
  );
});

type Box = { x: number; y: number; w: number };
type Look = { mood: Mood; target: { x: number; y: number } | null; roll: [number, number] | null };

/** Springs and blinks for one drawing. `frame` writes it for a box on screen, a mood and a gaze. */
function makeRig(root: SVGSVGElement, startMood: Mood) {
  const parts = [0, 1].map((i) => {
    const g = root.querySelector(`[data-eye="${i}"]`)!;
    const one = <T extends Element>(s: string) => g.querySelector<T>(s)!;
    return {
      brow: one<SVGGElement>('.brow'), browPath: one<SVGPathElement>('.brow path'), ball: one<SVGGElement>('.ball'),
      iris: one<SVGGElement>('.iris'), pupil: one<SVGCircleElement>('.pupil'),
      up: one<SVGPathElement>('.lid-up'), upEdge: one<SVGPathElement>('.edge-up'), lo: one<SVGPathElement>('.lid-lo'), loEdge: one<SVGPathElement>('.edge-lo'),
      lines: one<SVGGElement>('.lines'),
    };
  });
  const pair = root.querySelector<SVGGElement>('.pair')!;
  const start = EXPR[startMood];
  const S = [start.L, start.R].map((f) => Object.fromEntries(KEYS.map((k) => [k, new Spring(f[k], 190, 17)])) as Record<keyof Face, Spring>);
  const G = [0, 1].map(() => ({ x: new Spring(0, 260, 22), y: new Spring(0, 260, 22) }));
  const P = new Spring(start.pupil, 120, 14);
  let blinkAt = now() + 1.4 + Math.random() * 2, blinkLen = 0.16, blinking = -1;

  return (dt: number, t: number, box: Box, look: Look) => {
    const { mood, target, roll } = look;
    let ex = EXPR[mood];
    // The doubt meter: the fewer claims left, the lower the brow and the wider the pupils.
    const relief = 1 - brain.doubt;
    if (mood === 'skeptic' || mood === 'straight') ex = mix(ex, EXPR.hmm, relief * 0.8);
    P.t = ex.pupil * lerp(0.74, 1.25, relief);
    const pupil = P.step(dt);

    let b = 0;
    if (!still) {
      if (blinking < 0 && t > blinkAt && mood !== 'shut' && mood !== 'flinch' && mood !== 'sleep' && mood !== 'peek') {
        blinking = t;
        blinkLen = mood === 'soft' || mood === 'approve' ? 0.7 : Math.random() < 0.2 ? 0.34 : 0.15;
      }
      if (blinking >= 0) {
        const k = (t - blinking) / blinkLen;
        b = k < 1 ? Math.sin(Math.PI * k) : 0;
        if (k >= 1) { blinking = -1; blinkAt = t + 1.8 + Math.random() * 3.6; }
      }
    }

    const nodK = t - brain.nodAt;
    const nod = nodK > 0 && nodK < 2.6 && !still ? Math.sin(nodK * 8.5) * 26 * Math.exp(-nodK * 1.7) : 0;
    const shake = still ? 0 : Math.sin(t * 70) * brain.shake * 16;
    pair.setAttribute('transform', `translate(${shake.toFixed(2)} ${nod.toFixed(2)})`);

    const faces = [ex.L, ex.R];
    EYES.forEach((E, i) => {
      const sp = S[i], pt = parts[i];
      for (const k of KEYS) sp[k].t = faces[i][k];
      const v = Object.fromEntries(KEYS.map((k) => [k, sp[k].step(dt)])) as Face;
      let gx = 0, gy = 0;
      if (roll) [gx, gy] = roll;
      else if (target) {
        const ex0 = box.x + (E.cx / VW) * box.w, ey0 = box.y + (E.cy / VW) * box.w;
        const dx = target.x - ex0, dy = target.y - ey0;
        const K = Math.max(120, box.w * 0.32);
        gx = dx / Math.sqrt(dx * dx + K * K);
        gy = clamp(dy / Math.sqrt(dy * dy + K * K), -1, 0.7);
      } else if (!still) {
        // straight at you, with the small drift of someone actually looking
        gx = Math.sin(t * 0.7 + i) * 0.05; gy = Math.cos(t * 0.53) * 0.05;
      }
      if (mood === 'side') { gx = 0.92; gy = 0.12; }
      if (mood === 'approve') gy = gy * 0.5 - 0.12;
      const gs = G[i];
      gs.x.t = gx; gs.y.t = gy;
      gs.x.k = gs.y.k = roll ? 520 : 260;
      const X = gs.x.step(dt), Y = gs.y.step(dt);

      // a blink closes on a line through the middle, so the lower lid comes up to meet it
      const cLo = lerp(lerp(150, -30, clamp(v.lo, -0.2, 1.2)), Math.min(lerp(150, -30, clamp(v.lo, -0.2, 1.2)), 22), b);
      const upAmt = clamp(v.up + (1 - v.up) * b, 0, 1.05);
      const cUp = lerp(-152, cLo - 2, upAmt);
      pt.up.setAttribute('d', `M -210 -280 L 210 -280 L 210 0 Q 0 ${(2 * cUp).toFixed(1)} -210 0 Z`);
      pt.upEdge.setAttribute('d', `M -210 0 Q 0 ${(2 * cUp).toFixed(1)} 210 0`);
      pt.lo.setAttribute('d', `M -210 280 L 210 280 L 210 0 Q 0 ${(2 * cLo).toFixed(1)} -210 0 Z`);
      pt.loEdge.setAttribute('d', `M -210 0 Q 0 ${(2 * cLo).toFixed(1)} 210 0`);
      const m = (cUp + cLo) / 2;
      const sq = 1 - 0.7 * clamp(v.sq);
      pt.ball.setAttribute('transform', `translate(0 ${m.toFixed(1)}) scale(1 ${sq.toFixed(3)}) translate(0 ${(-m).toFixed(1)})`);
      pt.iris.setAttribute('transform', `translate(${(X * 84 * E.m).toFixed(1)} ${(Y * 50).toFixed(1)})`);
      pt.pupil.setAttribute('r', (30 * clamp(pupil, 0.35, 1.6)).toFixed(1));
      pt.brow.setAttribute('transform', `translate(0 ${(-196 + v.by * 100).toFixed(1)}) rotate(${v.br.toFixed(2)})`);
      pt.browPath.setAttribute('d', browD(v.ba));
      pt.lines.setAttribute('opacity', clamp(v.ln).toFixed(2));
    });
  };
}

/** Whatever was pressed last wins over the section's own look for a moment. */
function overlay(base: Mood, t: number): Mood {
  let mood = base;
  if (brain.approved && (mood === 'skeptic' || mood === 'side' || mood === 'straight')) mood = 'approve';
  if (mood === 'shut' && brain.peek) mood = 'peek';
  if (brain.hover && !brain.approved && mood !== 'shut' && mood !== 'peek') mood = 'eh';
  if (brain.over && t < brain.overUntil) mood = brain.over;
  return mood;
}
function rollNow(t: number): [number, number] | null {
  if (brain.over !== 'roll' || t >= brain.overUntil) return null;
  const k = clamp((t - brain.overStart) / 1.15);
  const a = Math.PI * 0.85 + smooth(k) * Math.PI * 1.35;
  return [Math.cos(a) * 0.95, Math.sin(a) * 0.95];
}

/** Pointer if it moved lately, else the claim nearest the middle of the screen. */
function makeGaze() {
  let nearest: HTMLElement | null = null, at = 0;
  return (t: number, idleStraight = false) => {
    if (brain.focus && t < brain.focusUntil) {
      const r = brain.focus.getBoundingClientRect();
      return { x: r.left + Math.min(r.width, 520) * 0.5, y: r.top + Math.min(r.height, 200) * 0.5 };
    }
    const p = brain.pointer;
    if (p.x >= 0 && (p.touch ? t - p.t < 1.6 : t - p.t < 6)) return { x: p.x, y: p.y };
    if (idleStraight) return null;
    const vh = window.innerHeight;
    if (t - at > 0.3) {
      at = t;
      let best = Infinity; nearest = null;
      for (const c of brain.claims) {
        const r = c.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        const d = Math.abs(r.top + r.height / 2 - vh / 2);
        if (d < best) { best = d; nearest = c; }
      }
    }
    if (!nearest) return null;
    const r = nearest.getBoundingClientRect();
    return { x: r.left + Math.min(r.width, 600) / 2, y: r.top + r.height / 2 };
  };
}

export type Slots = { hero: RefObject<HTMLElement | null>; end: RefObject<HTMLElement | null>; dock: RefObject<HTMLElement | null>; dockEyes: RefObject<HTMLElement | null> };

export function Eyes({ slots }: { slots: Slots }) {
  const fly = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = fly.current!;
    const frame = makeRig(svg.current!, still ? 'skeptic' : 'sleep');
    const gaze = makeGaze();
    const born = now();
    let opened = still, lastT = born;
    const fade = new Spring(1, 120, 22);
    if (!still) { brain.over = 'sleep'; brain.overUntil = born + 0.5; }

    let baseW = 1;
    const size = () => {
      baseW = Math.max(1, slots.hero.current!.getBoundingClientRect().width);
      el.style.width = `${baseW}px`;
      el.style.height = `${baseW * (VH / VW)}px`;
    };
    size();
    window.addEventListener('resize', size);

    const tick = () => {
      const t = now();
      const dt = Math.min(0.05, Math.max(0.001, t - lastT));
      lastT = t;
      const vh = window.innerHeight;
      if (!opened && t > born + 0.5) { opened = true; brain.over = 'open'; brain.overStart = t; brain.overUntil = t + 0.8; }
      brain.shake *= Math.exp(-dt * 6);

      // hero slot, then the dock, then the ending slot
      const hr = slots.hero.current!.getBoundingClientRect(), dr = slots.dockEyes.current!.getBoundingClientRect();
      const er = slots.end.current?.getBoundingClientRect();
      const t1 = smooth(clamp(-hr.top / Math.max(1, hr.height * 0.95)));
      const t2 = er ? smooth(clamp((vh - er.top) / (vh * 0.7))) : 0;
      let x = lerp(hr.left, dr.left, t1), y = lerp(hr.top, dr.top, t1), w = lerp(hr.width, dr.width, t1);
      if (er) { x = lerp(x, er.left, t2); y = lerp(y, er.top, t2); w = lerp(w, er.width, t2); }
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${(w / baseW).toFixed(4)})`;
      const docked = t1 * (1 - t2);
      // While a section's own pair is on screen, the docked one steps aside.
      fade.t = docked > 0.5 && brain.local > 0 ? 0 : 1;
      const f = fade.step(dt);
      el.style.opacity = f.toFixed(3);
      const d = slots.dock.current!;
      const dop = clamp((docked - 0.55) / 0.35) * f;
      d.style.opacity = dop.toFixed(3);
      d.style.visibility = dop > 0.05 ? 'visible' : 'hidden';
      el.dataset.bg = brain.approved && t2 > 0.5 ? 'red' : 'paper';

      let base: Mood = brain.base;
      if (t2 > 0.6) base = 'straight';
      else if (t1 < 0.5) base = 'skeptic';
      const mood = overlay(base, t);
      const roll = rollNow(t);
      const target = roll ? null : t2 > 0.6 && !(brain.focus && t < brain.focusUntil) ? null : gaze(t, t1 < 0.25 && !coarse);
      frame(dt, t, { x, y, w }, { mood, target, roll });
    };
    gsap.ticker.add(tick);
    tick();
    return () => { gsap.ticker.remove(tick); window.removeEventListener('resize', size); };
  }, [slots]);

  return <div className="fly" ref={fly} aria-hidden="true"><Drawing ref={svg} /></div>;
}

/** The same eyes, set into a section, wearing that section's look. */
export function LocalEyes({ mood, className }: { mood: Mood; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const el = wrap.current!;
    const frame = makeRig(svg.current!, mood);
    const gaze = makeGaze();
    let lastT = now(), on = false;
    const io = new IntersectionObserver(([e]) => {
      const vis = e.isIntersecting && e.intersectionRatio > 0.2;
      if (vis !== on) { on = vis; brain.local += vis ? 1 : -1; }
    }, { threshold: [0, 0.2, 0.5] });
    io.observe(el);
    const tick = () => {
      const t = now();
      const dt = Math.min(0.05, Math.max(0.001, t - lastT));
      lastT = t;
      const r = el.getBoundingClientRect();
      if (r.bottom < -50 || r.top > window.innerHeight + 50) return;
      const m = overlay(mood, t);
      const roll = rollNow(t);
      frame(dt, t, { x: r.left, y: r.top, w: r.width }, { mood: m, target: roll ? null : gaze(t), roll });
    };
    gsap.ticker.add(tick);
    tick();
    return () => { gsap.ticker.remove(tick); io.disconnect(); if (on) brain.local -= 1; };
  }, [mood]);
  return <div ref={wrap} className={`local ${className ?? ''}`} aria-hidden="true"><Drawing ref={svg} /></div>;
}
