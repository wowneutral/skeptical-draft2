// Shared, mutable state between the page and the scene. Never React state per frame.
export type Pin = { x: number; y: number; on: boolean };

export const STOPS = ['hero', 'manifesto', 'people', 'record', 'drive', 'join', 'end'] as const;

export const stage = {
  /** Continuous stop index from the scroll: 0 hero, 1 manifesto, ... */
  f: 0,
  /** Speed of time; negative runs it backwards. */
  speed: 1,
  /** 1 = brass instrument, 0 = sky. */
  inst: 1,
  /** True once the visitor picked a view by hand, so the scroll stops choosing it. */
  manual: false,
  /** Drag offsets for the camera, in radians. */
  yaw: 0,
  pitch: 0,
  yawV: 0,
  /** Which body the camera follows, or '' for none. */
  follow: '',
  followAt: 0,
  /** How closed the ninth orbit is, 0 dashed to 1 solid. */
  close: 0,
  /** Highlighted drive body, -1 for none. */
  hl: -1,
  /** Screen positions of bodies the page pins labels to. */
  pins: {} as Record<string, Pin>,
  /** Simulation time. */
  t: 0,
  dragging: false,
  moved: 0,
  intro: 0,
  onFollow: null as null | ((id: string) => void),
};

export const WORLDS = [
  { a: 5.4, e: 0.05, r: 0.3, kind: 0, c1: '#c96a3c', c2: '#4e2416', atm: '#f0a070', tilt: 0.2, ring: 0 },
  { a: 7.3, e: 0.02, r: 0.44, kind: 2, c1: '#2c6aa2', c2: '#e2ebf0', atm: '#8fc6ff', tilt: 0.41, ring: 0 },
  { a: 9.5, e: 0.07, r: 0.36, kind: 0, c1: '#c2ab7c', c2: '#3c342a', atm: '#e8d4a8', tilt: 0.1, ring: 0 },
  { a: 12.2, e: 0.04, r: 0.92, kind: 1, c1: '#e0bb8c', c2: '#7a4a2c', atm: '#ffd7a8', tilt: 0.47, ring: 1 },
  { a: 15.1, e: 0.06, r: 0.6, kind: 3, c1: '#92dad4', c2: '#25606e', atm: '#b6fff6', tilt: 1.2, ring: 0 },
  { a: 18.0, e: 0.03, r: 0.78, kind: 1, c1: '#d2c79a', c2: '#5f5c3c', atm: '#f2ecc4', tilt: 0.3, ring: 2 },
  { a: 21.0, e: 0.08, r: 0.5, kind: 3, c1: '#5277de', c2: '#18245e', atm: '#8eb0ff', tilt: 0.5, ring: 0 },
  { a: 23.8, e: 0.05, r: 0.3, kind: 0, c1: '#dcaa9c', c2: '#5e3434', atm: '#ffd0c4', tilt: 0.05, ring: 0 },
];

/** Kepler: angular speed falls with distance as a^-1.5. */
export const K = 5.6;
export const NINTH = 27.4;
export const RING = 36;

export const word = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
