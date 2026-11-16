// Shared, mutable state between the page and the scene. Never React state per frame.
export const store = {
  /** Scroll positions where the camera stands in each room: hero, manifesto, record, drive, people, join. */
  stops: [0, 1, 2, 3, 4, 5] as number[],
  /** The question mark's turn, its spin, and whether a pointer is holding it. */
  yaw: 0.35,
  spin: 0,
  held: false,
  /** A turn the page asks for (a button, a Join path), or null. */
  aim: null as number | null,
  /** The near mirror is tilted. */
  tilt: false,
  /** When the opening began (performance.now), or -1. */
  open: -1,
  /** The camera's room, read by the page. */
  room: 0,
  /** Pointer, -1..1. */
  px: 0,
  py: 0,
  /** Called by the scene when something changes that the page shows. */
  onTilt: (_t: boolean) => {},
  invalidate: () => {},
};

export const JOIN_ROOM = 5;
