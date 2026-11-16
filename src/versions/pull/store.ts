// One mutable store the page writes and the scene reads every frame.
// Nothing here goes through React state, ever.

export const N_PTS = 10;

export type Pt = { x: number; z: number; s: number; r: number };

export const field = {
  /** The visitor's magnet, in dish coordinates (dish radius 1). */
  hand: { x: 0, z: 0, on: 0, seen: false },
  /** Hidden magnets the page places under the dish, section by section. */
  pts: Array.from({ length: N_PTS }, () => ({ x: 0, z: 0, s: 0, r: 0.22 })) as Pt[],
  /** 0..1 how much of the question mark is drawn, and how strongly. */
  glyph: 0,
  glyphOn: 0,
  /** Where the dish sits on screen: 0 centred low, 1 to the right (desktop) or high (phone). */
  side: 0,
  /** Camera elevation mix: 0 product angle, 1 looking down onto the pool. */
  top: 0,
  /** A lean toward a way in, in dish coordinates. */
  lean: { x: 0, z: 0, s: 0 },
  /** Opening pass, 0..1, set once on load. */
  open: 0,
  /** Scroll progress for the sliding strip light. */
  strip: 0,
  /** Projected dish centre and radius on screen in px, written by the scene for the page. */
  screen: { x: 0, y: 0, r: 0 },
  ready: false,
};

export function clearPts() {
  for (const p of field.pts) p.s = 0;
}
