// Shared, mutable state the frame loop reads. Nothing here causes a React render.

/** One framing of the relief and its light.
 *  ax, ay: the point of the relief (0..1 of its box) that is pinned to the screen at sx, sy (0..1 of the viewport, y down).
 *  s: the relief's width as a share of the viewport width. az: where the light sits around the relief (degrees, 180 = left,
 *  90 = above). el: how high the light stands off the wall (degrees; 90 = straight on). band: the share of the viewport
 *  the relief may use from the top; text lives below it. */
export type Frame = { ax: number; ay: number; sx: number; sy: number; s: number; az: number; el: number; band: number };

export const store = {
  /** Keyframes and the scroll position (px) at which each one is reached. Rebuilt on resize. */
  keys: [] as { y: number; f: Frame }[],
  /** Pointer, -1..1, and its damped follow. */
  px: 0, py: 0,
  /** Light held by keyboard or by a drag on the wall, in degrees, added to the plan. */
  hold: { az: 0, el: 0 },
  /** The way in that is chosen at Join (0..2) or -1, and how strongly the light answers it. */
  way: -1,
  /** The current band, in px, written by the loop for the DOM mask. */
  band: 0,
  /** 0..1, the opening: the light comes up from nothing. */
  open: 0,
  /** Last frame the loop produced, for the DOM. */
  cur: null as Frame | null,
};

export const mix = (a: Frame, b: Frame, t: number): Frame => {
  // The light goes the short way round.
  let d = b.az - a.az; while (d > 180) d -= 360; while (d < -180) d += 360;
  const l = (p: number, q: number) => p + (q - p) * t;
  return { ax: l(a.ax, b.ax), ay: l(a.ay, b.ay), sx: l(a.sx, b.sx), sy: l(a.sy, b.sy), s: l(a.s, b.s), az: a.az + d * t, el: l(a.el, b.el), band: l(a.band, b.band) };
};

/** The frame for a scroll position. */
export function frameAt(y: number): Frame | null {
  const k = store.keys; if (!k.length) return null;
  if (y <= k[0].y) return k[0].f;
  for (let i = 0; i < k.length - 1; i++) {
    if (y < k[i + 1].y) {
      const t = (y - k[i].y) / Math.max(1, k[i + 1].y - k[i].y);
      const e = t * t * (3 - 2 * t);
      return mix(k[i].f, k[i + 1].f, e);
    }
  }
  return k[k.length - 1].f;
}
