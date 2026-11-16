// What the page tells the scene, read every frame (no React state per frame).
export const stage = {
  /** Where the reader is: 0 the opening, 1 the manifesto, 2 record, 3 drive, 4 people, 5 join. */
  f: 0,
  /** The visitor pressed the shell open (only matters on the first screen). */
  open: false,
  /** A drive item being pointed at: which chamber to look into, or -1. */
  focus: -1,
  /** Drag: spin added by the pointer this frame. */
  push: 0,
  dragging: false,
  /** Pointer position over the stage, -1 to 1. */
  px: 0, py: 0,
  /** The keyboard: turn by this much. */
  nudge: 0,
  lit: false,
};
