import { useEffect, useRef } from 'react';
import { gsap } from '@/lib/scroll';
import { clamp, still } from '@/lib/utils';
import { SITE } from '@/content';

const SYL = ['skep', 'ti', 'cal'];
const DOTS = '·'.repeat(80);

type Body = { x: number; v: number; drag: boolean; px: number; pt: number; start: number; grab: number };

/** The headword. Each syllable is a body on a spring: pull it away at its dot and it snaps back. */
export function Headword({ onReady }: { onReady?: () => void }) {
  const syl = useRef<(HTMLSpanElement | null)[]>([]);
  const lead = useRef<(HTMLSpanElement | null)[]>([]);
  const bodies = useRef<Body[]>(SYL.map(() => ({ x: 0, v: 0, drag: false, px: 0, pt: 0, start: 0, grab: 0 })));
  const kick = useRef<() => void>(() => {});
  const lean = useRef<number[]>(SYL.map(() => 0));

  useEffect(() => {
    const B = bodies.current;
    let wake = 0;
    if (!still) {
      // The opening: the word arrives pulled apart and springs shut.
      const w = window.innerWidth;
      B[0].x = -w * 0.16; B[2].x = w * 0.16; B[1].x = 0;
      wake = performance.now() + 380;
    }
    const K = 230, C = 13.5;
    const render = () => {
      B.forEach((b, i) => {
        const el = syl.current[i];
        if (!el) return;
        const sk = clamp(-b.v * 0.006, -9, 9);
        el.style.transform = `translate3d(${b.x.toFixed(2)}px,0,0) skewX(${sk.toFixed(2)}deg)`;
        const ld = lead.current[i];
        if (ld && i < B.length - 1) ld.style.width = Math.max(0, B[i + 1].x - b.x).toFixed(1) + 'px';
      });
    };
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (now < wake) { render(); return; }
      const dragged = B.findIndex((b) => b.drag);
      B.forEach((b, i) => {
        if (b.drag) return;
        // Neighbours of a dragged syllable lean after it a little.
        const target = dragged >= 0 ? (Math.abs(dragged - i) === 1 ? B[dragged].x * 0.18 : 0) : lean.current[i];
        const a = -K * (b.x - target) - C * b.v;
        b.v += a * dt;
        b.x += b.v * dt;
        // Syllables may not pass through each other.
        if (i > 0 && b.x < B[i - 1].x - 18 && !B[i - 1].drag) { b.x = B[i - 1].x - 18; b.v *= -0.4; }
      });
      render();
    };
    render();
    if (still) return;
    gsap.ticker.add(tick);
    kick.current = () => { B[0].v -= 1500; B[2].v += 1500; B[1].v += (Math.random() - 0.5) * 300; };
    onReady?.();
    return () => { gsap.ticker.remove(tick); };
  }, [onReady]);

  const down = (i: number) => (e: React.PointerEvent<HTMLSpanElement>) => {
    if (still || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const b = bodies.current[i];
    b.drag = true; b.start = e.clientX; b.grab = b.x; b.px = e.clientX; b.pt = performance.now(); b.v = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.dataset.drag = '1';
  };
  const move = (i: number) => (e: React.PointerEvent<HTMLSpanElement>) => {
    const b = bodies.current[i];
    if (!b.drag) return;
    const d = e.clientX - b.start;
    const lim = window.innerWidth * 0.42;
    // Rubber band: the further you pull, the harder it pulls back.
    const x = b.grab + (d / (1 + Math.abs(d) / lim));
    const now = performance.now();
    const dt = Math.max(1, now - b.pt) / 1000;
    b.v = b.v * 0.6 + ((x - b.x) / dt) * 0.4;
    b.x = x; b.px = e.clientX; b.pt = now;
  };
  const up = (i: number) => (e: React.PointerEvent<HTMLSpanElement>) => {
    const b = bodies.current[i];
    if (!b.drag) return;
    b.drag = false;
    b.v = clamp(b.v, -3000, 3000);
    delete e.currentTarget.dataset.drag;
  };

  // Before anyone grabs it, the word leans toward the pointer: it wants to be pulled.
  const hover = (e: React.PointerEvent<HTMLElement>) => {
    if (still || e.pointerType !== 'mouse') return;
    syl.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      const pull = Math.max(0, 1 - d / (r.width * 1.4));
      lean.current[i] = clamp(dx * 0.08, -16, 16) * pull;
    });
  };
  const leave = () => { lean.current = SYL.map(() => 0); };

  return (
    <header className="e-head" onPointerMove={hover} onPointerLeave={leave}>
      <h1 className="e-word">
        <span className="sr-only-x">{SITE.heading}</span>
        <span className="e-word-vis" aria-hidden="true">
          {SYL.map((s, i) => (
            <span
              key={s}
              className="e-syl"
              ref={(el) => { syl.current[i] = el; }}
              onPointerDown={down(i)}
              onPointerMove={move(i)}
              onPointerUp={up(i)}
              onPointerCancel={up(i)}
            >
              {s}
              {i < SYL.length - 1 && (
                <>
                  <span className="e-dot">·</span>
                  <span className="e-lead" ref={(el) => { lead.current[i] = el; }}>{DOTS}</span>
                </>
              )}
            </span>
          ))}
        </span>
      </h1>
      <p className="e-gram">
        <i>adj.</i>
        <button type="button" className="e-pron" onClick={() => kick.current()} aria-label="/ˈskɛp·tɪ·kəl/ sound it out">
          /ˈskɛp·tɪ·kəl/
        </button>
        <span className="e-hint">pull the word apart</span>
      </p>
    </header>
  );
}
