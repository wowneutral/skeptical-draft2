// Shared, mutable state between the page and the scene. Never triggers a render.
export type Pose = { yaw: number; el: number; zoom: number };
export type Key = { y: number; p: Pose };

export const store = {
  keys: [] as Key[],
  /** Degrees added to the scroll yaw by dragging or the arrow keys. */
  drag: 0,
  dragAt: -1e9,
  dragging: false,
  /** Column under the pointer, or -1. */
  hover: -1,
  /** Columns knocked since the scene last looked. */
  knocks: [] as number[],
  px: 0,
  py: 0,
  touched: false,
};

const ease = (t: number) => t * t * (3 - 2 * t);

export function poseAt(y: number): Pose | null {
  const k = store.keys;
  if (!k.length) return null;
  if (y <= k[0].y) return k[0].p;
  for (let i = 1; i < k.length; i++) {
    if (y <= k[i].y) {
      const a = k[i - 1], b = k[i];
      const t = ease((y - a.y) / Math.max(1, b.y - a.y));
      return { yaw: a.p.yaw + (b.p.yaw - a.p.yaw) * t, el: a.p.el + (b.p.el - a.p.el) * t, zoom: a.p.zoom + (b.p.zoom - a.p.zoom) * t };
    }
  }
  return k[k.length - 1].p;
}
