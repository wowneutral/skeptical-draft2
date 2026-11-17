// Shared, mutable state between the page and the scene. Read inside useFrame; never React state per frame.
export type Stage = { fx: number; fy: number; h: number; stop: number | null; lit: boolean };

const P = Math.PI;
/** One stage per section: where the figure stands, how big, whether it stops (and at what angle), whether the light is on. */
export const DESK: Stage[] = [
  { fx: 0.7, fy: 0.5, h: 0.88, stop: null, lit: false },   // hero
  { fx: 0.72, fy: 0.5, h: 0.8, stop: null, lit: false },   // manifesto
  { fx: 0.27, fy: 0.5, h: 0.84, stop: P / 2, lit: false }, // record: clean profile, facing the text
  { fx: 0.75, fy: 0.5, h: 0.8, stop: P, lit: false },      // drive: its back to you
  { fx: 0.27, fy: 0.5, h: 0.84, stop: null, lit: false },  // people: turning again
  { fx: 0.5, fy: 0.3, h: 0.51, stop: 0, lit: true },      // join: face on, the light up for good
];
export const PHONE: Stage[] = [
  { fx: 0.5, fy: 0.47, h: 0.84, stop: null, lit: false },
  { fx: 0.5, fy: 0.5, h: 0.86, stop: null, lit: false },
  { fx: 0.5, fy: 0.5, h: 0.86, stop: -P / 2, lit: false },
  { fx: 0.5, fy: 0.5, h: 0.86, stop: P, lit: false },
  { fx: 0.5, fy: 0.5, h: 0.86, stop: null, lit: false },
  { fx: 0.5, fy: 0.5, h: 0.9, stop: 0, lit: true },
];

export const rig = {
  sec: 0,            // active section index
  joinTop: 1e5,      // px, top of the join section (the figure rides up with it at the end)
  phone: false,
  still: false,
  ready: false,      // geometry in and first frame drawn
  hold: false,       // press and hold: light up
  drag: false,
  dragDx: 0,         // accumulated pointer travel since last frame, px
  kick: 0,           // keyboard impulse, rad/s
  lean: 0,
  over: false,       // a mouse is resting on the figure: it slows, as if it noticed
  flip: false,       // the manifesto's last line: the turn reverses           // join: -1, 0, 1 toward a hovered path
  light: 0,          // 0..1 as drawn
  /** The hit area over the figure, written by the scene each frame. */
  hit: null as HTMLElement | null,
  hint: null as HTMLElement | null,
};
