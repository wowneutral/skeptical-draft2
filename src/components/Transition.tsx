// The page transition: an ordered-dither cover. A small canvas, one pixel per
// cell, scaled up crisp. It rises over the old page, the route changes under
// it, and it dissolves off the new one.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import gsap from 'gsap';
import { ALL as VERSIONS } from '@/registry';
import { still } from '@/lib/utils';

type Api = { go: (to: string) => void; ready: () => void };
const Ctx = createContext<Api>({ go: () => {}, ready: () => {} });
export const useTransition = () => useContext(Ctx);

const CELL = 14;
const B8 = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];
const colorFor = (path: string) => VERSIONS.find((v) => path === `/${v.slug}` || path.startsWith(`/${v.slug}/`) || path.startsWith(`/${v.slug}-`))?.color ?? '#050505';
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

export function TransitionProvider({ children }: { children: ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({ t: still ? 0 : 1, color: colorFor(location.pathname), busy: false });
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const draw = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const { t, color } = state.current;
    const w = Math.ceil(window.innerWidth / CELL), h = Math.ceil(window.innerHeight / CELL);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    c.style.visibility = t <= 0 ? 'hidden' : 'visible';
    c.style.pointerEvents = t > 0.02 ? 'auto' : 'none';
    if (t <= 0) return;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(w, h);
    const [r, g, b] = rgb(color);
    const edge = t * 1.05;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      // Each cell switches at its own threshold; lower rows switch first, so the cover rises.
      const v = (B8[(y & 7) * 8 + (x & 7)] / 64) * 0.42 + (1 - y / h) * 0.58;
      const o = (y * w + x) * 4;
      img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = v < edge ? 255 : 0;
    }
    ctx.putImageData(img, 0, 0);
  }, []);

  const api = useMemo<Api>(() => ({
    go(to) {
      if (to === location.pathname || state.current.busy) return;
      if (still) { navigate(to); return; }
      state.current.busy = true;
      state.current.color = colorFor(to);
      gsap.killTweensOf(state.current);
      gsap.to(state.current, { t: 1, duration: 0.6, ease: 'power2.in', onUpdate: draw, onComplete: () => navigate(to) });
    },
    ready() {
      if (still) { state.current.t = 0; draw(); return; }
      gsap.killTweensOf(state.current);
      gsap.to(state.current, { t: 0, duration: 0.8, delay: 0.1, ease: 'power2.out', onUpdate: draw, onComplete: () => { state.current.busy = false; } });
    },
  }), [draw, navigate]);

  useEffect(() => { draw(); }, [draw, pathname]);
  // Back and forward buttons skip the cover but must never leave it up.
  useEffect(() => { const t = setTimeout(() => { if (state.current.t >= 1) api.ready(); }, 2500); return () => clearTimeout(t); }, [pathname, api]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <canvas ref={canvas} aria-hidden="true" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 200, imageRendering: 'pixelated' }} />
    </Ctx.Provider>
  );
}

/** A link between versions that plays the cover. */
export function Go({ to, className, children, ...rest }: { to: string; className?: string; children: ReactNode } & Omit<React.ComponentProps<'a'>, 'href'>) {
  const { go } = useTransition();
  return (
    <a href={to} className={className} onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); go(to); }} {...rest}>
      {children}
    </a>
  );
}
