// Shared, mutable state between the page and the room. Never triggers a React render.
export const rig = {
  /** Where the visit is: 0 at the first label, 1 at the second, and so on. */
  at: 0,
  /** How far the lights are up, 0 to 1 (the opening). */
  light: 0,
  /** The sculpture's turn on its plinth, and how fast it is turning. */
  turn: 0,
  spin: 0,
  held: false,
  lastTouch: 0,
  /** Pointer, -1 to 1, for a small lean of the camera. */
  px: 0,
  py: 0,
  phone: false,
  wake: () => {},
};

export type View = { az: number; r: number; h: number; ty: number; fov: number; sx: number; sy: number };

/** One view per label, walking once around the plinth. az 0 looks from the front. */
export const VIEWS_WIDE: View[] = [
  { az: -0.42, r: 10.2, h: 3.9, ty: 3.25, fov: 30, sx: -0.19, sy: 0.02 },  // the label: front, three quarters
  { az: 0.95, r: 9.6, h: 4.6, ty: 3.45, fov: 30, sx: 0.2, sy: 0 },        // wall text: the right flank
  { az: 2.2, r: 8.4, h: 1.7, ty: 3.7, fov: 32, sx: -0.2, sy: 0 },         // the record: low, behind and right
  { az: 3.3, r: 10.4, h: 7.6, ty: 2.9, fov: 30, sx: 0.2, sy: 0 },         // the drive: from above, behind
  { az: 4.75, r: 6.4, h: 4.3, ty: 4.0, fov: 30, sx: -0.18, sy: 0 },       // the people: close, against the window
  { az: 5.9, r: 11.4, h: 3.4, ty: 3.2, fov: 30, sx: 0.22, sy: 0 },        // join: front again
  { az: 6.0, r: 10.6, h: 3.3, ty: 2.7, fov: 40, sx: -0.2, sy: 0.02 },      // the end: from behind the bench
];

export const VIEWS_PHONE: View[] = [
  { az: -0.3, r: 13.4, h: 4.2, ty: 3.2, fov: 34, sx: 0, sy: 0.2 },
  { az: 0.95, r: 12.2, h: 4.8, ty: 3.4, fov: 34, sx: 0, sy: 0.22 },
  { az: 2.2, r: 10.8, h: 1.8, ty: 3.8, fov: 36, sx: 0, sy: 0.22 },
  { az: 3.3, r: 14.2, h: 8.6, ty: 3.1, fov: 34, sx: 0, sy: 0.15 },
  { az: 4.75, r: 9.6, h: 4.3, ty: 3.8, fov: 34, sx: 0, sy: 0.2 },
  { az: 5.9, r: 13.4, h: 3.6, ty: 3.2, fov: 34, sx: 0, sy: 0.24 },
  { az: 6.0, r: 10.8, h: 3.0, ty: 3.3, fov: 46, sx: 0, sy: 0.24 },
];
