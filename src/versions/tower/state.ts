// What the page and the scene share, written outside React so nothing re-renders per frame.

/** One camera position: distance from the tower, azimuth, eye height, look-up angle, lens, and lens shift (in screen units). */
export type Shot = { d: number; az: number; h: number; pitch: number; fov: number; sx: number; sy: number };

export const TOWER = { a: 2.8, H: 48 };

/** Desktop and phone framings for each stop, in page order. The tower sits right on wide screens, centred and low on phones. */
export const SHOTS: { name: string; wide: Shot; phone: Shot }[] = [
  { name: 'top',       wide: { d: 430, az: 0.15, h: 1.6, pitch: 0, fov: 15, sx: 0, sy: -0.62 },       phone: { d: 470, az: 0.15, h: 1.6, pitch: 0, fov: 15, sx: 0, sy: -0.8 } },
  { name: 'manifesto', wide: { d: 230, az: 0.3, h: 1.6, pitch: 0, fov: 19, sx: 0.5, sy: -0.76 },      phone: { d: 260, az: 0.3, h: 1.6, pitch: 0, fov: 17, sx: 0, sy: -0.86 } },
  { name: 'record',    wide: { d: 66, az: 0.62, h: 1.6, pitch: 0.06, fov: 32, sx: 0.46, sy: -0.66 }, phone: { d: 74, az: 0.62, h: 1.6, pitch: 0.04, fov: 34, sx: 0, sy: -0.8 } },
  { name: 'drive',     wide: { d: 11.5, az: 0.42, h: 1.7, pitch: 0.12, fov: 40, sx: 0.68, sy: -0.5 }, phone: { d: 13, az: 0.42, h: 1.7, pitch: 0.06, fov: 46, sx: 0, sy: -0.66 } },
  { name: 'people',    wide: { d: 30, az: 1.05, h: 1.6, pitch: 0.2, fov: 34, sx: 0.5, sy: -0.55 },  phone: { d: 32, az: 1.05, h: 1.6, pitch: 0.12, fov: 40, sx: 0, sy: -0.72 } },
  { name: 'join',      wide: { d: 6.4, az: 0.785, h: 1.0, pitch: 1.18, fov: 52, sx: 0.48, sy: -0.1 }, phone: { d: 6.4, az: 0.785, h: 1.0, pitch: 1.18, fov: 58, sx: 0, sy: -0.4 } },
  { name: 'end',       wide: { d: 1100, az: 0.15, h: 1.6, pitch: 0, fov: 14, sx: 0, sy: -0.12 },       phone: { d: 1100, az: 0.15, h: 1.6, pitch: 0, fov: 14, sx: 0, sy: 0.45 } },
];

export const tw = {
  /** Scroll position (px) at which each shot is fully reached. */
  stops: [] as number[],
  /** Held to step back: 0 walking in, 1 stepped all the way back. */
  holding: false,
  hold: 0,
  /** Extra azimuth from dragging, and its velocity. */
  az: 0,
  azV: 0,
  dragging: false,
  /** Arrow keys on the tower button. */
  keyTurn: 0,
  /** The opening: the tower comes out of the haze. */
  intro: 0,
  /** Current superellipse exponent, for anyone who wants it. */
  n: 2,
  /** Reduced motion: which of the two still frames to show (0 far, 1 near). */
  frame: 0,
};
