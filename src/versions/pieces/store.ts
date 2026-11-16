// What the page and the scene share. Plain mutable values: the scene reads them every frame.
export const board = {
  /** Which arrangement the page is on. */
  arr: 0,
  /** Pieces lifted by the text beside them (a drive item, a coach). */
  hl: [] as number[],
  /** Piece with keyboard focus, or -1. */
  focus: -1,
  /** The page asks the scene to turn or slide a piece (keyboard path). */
  turn: (_i: number) => {},
  nudge: (_i: number, _dx: number, _dz: number) => {},
  /** The scene tells the page a piece was moved or turned. */
  onTouch: null as null | ((i: number) => void),
  /** The scene tells the page it has drawn its first frame. */
  onReady: null as null | (() => void),
  /** Bumped by the page to lay every piece back in its place. */
  reset: 0,
  /** Fraction of the canvas width the pieces should centre on (0.5 is the middle). */
  focusX: 0.5,
};
