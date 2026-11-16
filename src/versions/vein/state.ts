// What the page tells the stone, and what the stone tells the page. Read inside useFrame, never React state.
export const N = 12; // slices in the block
export const CENTRE = N / 2; // the centre cut: plane 6

export type Drag = { kind: 'take' | 'back' | 'book'; i: number; x0: number; s0: number; s: number; vx: number; lastX: number; lastT: number };

export const vs = {
  /** Which part of the site is being read: 0 pitch, 1 manifesto, 2 record, 3 drive, 4 people, 5 join, 6 end. */
  stop: 0,
  /** Slices taken (+) or put back (-) by hand since the last stop. */
  delta: 0,
  /** Slices off the block right now (what the hands see). */
  count: 0,
  hover: false,
  drag: null as Drag | null,
  /** Hand-held opening of the book at Join, added to the hinge. */
  bookPush: 0,
  /** Seconds since the stone first appeared. */
  t: 0,
  ready: false,
  onReady: null as null | (() => void),
};

export function resetVs() {
  vs.stop = 0; vs.delta = 0; vs.count = 0; vs.hover = false; vs.drag = null; vs.bookPush = 0; vs.t = 0; vs.ready = false;
}

/** Keyboard path: take the next slice or put one back. */
export function nudge(dir: 1 | -1) {
  if (vs.stop === 5) return;
  const base = vs.stop <= 4 ? vs.stop + 1 : 0;
  const next = Math.max(0, Math.min(N - 1, base + vs.delta + dir));
  vs.delta = next - base;
}
