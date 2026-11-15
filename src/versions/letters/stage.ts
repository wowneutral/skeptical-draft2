// What the page and the scene tell each other. Plain mutable state, read
// every frame; nothing here causes a React render.
export type Cmd = { type: 'all' } | { type: 'key'; ch: string };

export const stage = {
  /** The page says go: the letters may come down. */
  go: false,
  /** Every letter has landed. */
  opened: false,
  onOpened: null as null | (() => void),
  /** Where the scroll is among the ten stops: 0 is the first, 9 the last, 3.5 halfway from the fourth to the fifth. */
  raw: 0,
  /** The same, with the camera's weight on it. */
  f: 0,
  /** For each stop, the range of page positions (centre of the screen) over which the camera holds still. */
  stops: [] as { a: number; b: number }[],
  /** Which of the three ways in the dot is marking. */
  way: 0,
  /** Things the page asks the scene to do. */
  cmds: [] as Cmd[],
  /** The scene tells the page a locked block was pushed, and where on screen. */
  onLocked: null as null | ((x: number, y: number) => void),
  /** How many shoves so far (the page counts them). */
  shoves: 0,
  /** Camera shake left over from the last landing. */
  shake: 0,
  /** True while the pointer is over something that can be pushed. */
  over: false,
  /** How many more frames to draw. The canvas rests when it reaches zero. */
  wake: 0,
  /** How many more frames the shadows need redrawing. */
  dirty: 0,
};

export function resetStage() {
  stage.go = false; stage.opened = false; stage.raw = 0; stage.f = 0; stage.stops = []; stage.way = 0;
  stage.cmds = []; stage.shoves = 0; stage.shake = 0; stage.over = false; stage.wake = 180; stage.dirty = 4;
}
