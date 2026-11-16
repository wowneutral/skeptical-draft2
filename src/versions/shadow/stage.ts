// Shared state between the page and the scene. Written by pointer, keys and
// scroll; read every frame. Never React state.
export const TAU = Math.PI * 2;
/** How close (radians) the turn has to come before the shadow pulls itself into the mark. */
export const SNAP = 0.15;
/** Where the sculpture starts: far enough round that the shadow is a tangle. */
export const START = 1.32;

export const st = {
  base: START,      // from the scroll
  user: 0,          // from dragging and keys
  uv: 0,            // drag inertia, radians per second
  angle: START + 0.9,
  av: 0,
  dragging: false,
  resolved: false,
  hot: -1,          // which bar the page is pointing at (the drive's seven things)
  side: 0,          // 0 in the opening, 1 once the reading column is in (desktop camera shift)
  px: 0, py: 0,     // pointer, -1..1, for a little parallax
  pulse: 0,
  onResolve: null as null | ((on: boolean) => void),
};

export function nearest(a: number) { const k = Math.round(a / TAU); return { k, d: a - k * TAU }; }
