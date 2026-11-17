// The arithmetic of the overhang, and the little shared state the page and the scene talk through.
// Nothing here is drawn on the page: the maths is the reason the stack stands, never a caption.

/** Block length, height, depth; plinth height. The plinth's top edge is y = 0 and its arris is x = 0. */
export const L = 2, H = 0.32, D = 0.92, P = 3.2;

/** Harmonic overhang: in a stack of n, the block k from the top sits 1/(2k) of a length past the one under it. */
export function rightEdge(idx: number, n: number) {
  // idx counts from the bottom (0) to the top (n - 1).
  let s = 0;
  for (let m = n - idx; m <= n; m++) s += 1 / (2 * m);
  return L * s;
}
export const centreX = (idx: number, n: number) => rightEdge(idx, n) - L / 2;
export const centreY = (idx: number) => H * (idx + 0.5);

/** Camera stops: hero, manifesto, record, drive, people, join, footer. */
export type Stop = { p: [number, number, number]; t: [number, number, number]; fov: number; ox: number; oy: number };
export const DESK: Stop[] = [
  { p: [0.7, 1.75, 13], t: [0.55, 1.05, 0], fov: 25, ox: 0.2, oy: 0 },
  { p: [-3.4, 3.4, 11.8], t: [0.6, 1.2, 0], fov: 25, ox: 0.23, oy: 0 },
  { p: [3.8, -1.1, 7], t: [1.2, 1.45, 0], fov: 36, ox: 0.25, oy: 0 },
  { p: [14.5, 2.2, 1.1], t: [0.4, 1.1, 0], fov: 20, ox: 0.22, oy: 0 },
  { p: [3.4, 0.8, 14], t: [0.4, 1.2, 0], fov: 25, ox: 0.2, oy: 0 },
  { p: [0.2, 2.3, 16.5], t: [0.3, 1.25, 0], fov: 25, ox: 0, oy: 0.17 },
  { p: [0.4, 4.6, 19], t: [0.5, 1.2, 0], fov: 25, ox: 0, oy: 0.15 },
];
export const PHONE: Stop[] = [
  { p: [0.5, 0.3, 17], t: [0.45, 1.25, 0], fov: 38, oy: 0.24, ox: 0 },
  { p: [-3, 2.2, 16.5], t: [0.5, 1.2, 0], fov: 38, oy: 0.24, ox: 0 },
  { p: [3.8, -1.7, 12], t: [1.2, 1.9, 0], fov: 42, oy: 0.16, ox: 0 },
  { p: [17, 2, 1.1], t: [0.4, 1.2, 0], fov: 30, oy: 0.24, ox: 0 },
  { p: [2.6, 0.5, 17], t: [0.5, 1.2, 0], fov: 38, oy: 0.24, ox: 0 },
  { p: [0.2, 1.3, 20], t: [0.4, 1.1, 0], fov: 38, oy: 0.24, ox: 0 },
  { p: [0.4, 4.2, 20], t: [0.5, 1.1, 0], fov: 38, oy: 0.24, ox: 0 },
];
export const JOIN_STOP = 5;

/** Shared, mutable, read every frame. */
export const S = {
  anchors: [0] as number[],
  f: 0,
  phone: false,
  push: 0, // time a keyboard push was asked for
  fallen: false,
  probe: [] as number[][], // where each block is on screen, for tests
};
