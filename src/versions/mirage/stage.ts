// The one mutable store the page and the scene share. Never React state per frame.
export const stage = {
  /** Where the camera is in the shot list, a float (0 = hero ... 6 = the end). */
  f: 0,
  /** The visitor's wish: 1 = the top is lifted. */
  lift: 0,
  /** The lid as it is now (0 seated, 1 lifted), written by the scene. */
  lid: 1,
  /** Turn of the object, and its spin, in radians. */
  yaw: 0,
  yawV: 0,
  /** True while the pointer rests on the shell (not on the image). */
  over: false,
  /** Phone layout. */
  phone: false,
  /** Called when the lid lands for the first time. */
  onSeated: null as null | (() => void),
  /** Called whenever the lid changes between seated and lifted. */
  onLid: null as null | ((up: boolean) => void),
};
