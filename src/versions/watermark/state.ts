// What the page tells the scene. Plain mutable values, read every frame.
export type Pose = { lift: number; side: number; cover: number; bright: number; up: number; zoom: number };
export type Key = Pose & { a: number; b: number };

export const st = {
  keys: [] as Key[],
  /** drag offset on the lift, springs back to 0 on release */
  hold: 0,
  dragging: false,
  /** the button: 1 keeps the sheet up */
  pinned: 0,
  /** pointer, -1..1 */
  px: 0, py: 0,
  /** when the pointer last moved (seconds, performance clock) */
  moved: -100,
  /** a way in that has focus: -1, 0, 1 for the lamp, or null */
  aim: null as number | null,
  phone: false,
  ready: false,
};

const REST: Pose = { lift: 0, side: 0, cover: 0, bright: 0, up: 0, zoom: 1 };
const sm = (t: number) => t * t * (3 - 2 * t);

export function sample(y: number): Pose {
  const k = st.keys;
  if (!k.length) return REST;
  if (y <= k[0].a) return k[0];
  for (let i = 0; i < k.length; i++) {
    const c = k[i];
    if (y <= c.b) return c;
    const n = k[i + 1];
    if (!n) return c;
    if (y < n.a) {
      const t = sm((y - c.b) / Math.max(1, n.a - c.b));
      return {
        lift: c.lift + (n.lift - c.lift) * t, side: c.side + (n.side - c.side) * t, cover: c.cover + (n.cover - c.cover) * t,
        bright: c.bright + (n.bright - c.bright) * t, up: c.up + (n.up - c.up) * t, zoom: c.zoom + (n.zoom - c.zoom) * t,
      };
    }
  }
  return k[k.length - 1];
}
