// What the page tells the stone, read every frame (never React state).
export const st = {
  /** Where the reader is: 0 at the opening, one whole step per section, 5 at Join, 6 at the end. */
  f: 0,
  /** Pointer, -1 to 1 across the window. */
  px: 0, py: 0,
  /** Strikes asked for from outside the canvas (the keyboard button). */
  asks: 0,
  /** Set by the scene once the stone has its first frame. */
  ready: false,
  onReady: null as null | (() => void),
};
