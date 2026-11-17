// Shared, mutable state between the page and the scene. Read inside useFrame; never React state per frame.
export const rig = {
  at: 0,          // which view we are at, 0..5 as a float (hero, manifesto, record, drive, people, join)
  driveU: 0,      // progress through the drive close-up, 0..1
  light: 0,       // the opening: lights come up from 0 to 1
  phone: false,
  px: 0, py: 0,   // pointer, -1..1
  /** Blocks pressed by hand. */
  manual: new Set<number>(),
  /** Held: show the statue as it was on the first screen. */
  original: false,
  /** Set by the scene: replace the next marble block in order (keyboard path). */
  next: () => {},
};
