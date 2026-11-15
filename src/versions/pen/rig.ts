// What the page and the 3D pen share. The page says where the pen should be;
// the scene says where it is. Plain mutable state, read every frame, never React state.

export type Want = 'hold' | 'write' | 'draw' | 'rest';
export type Trick = 'flat' | 'around' | 'drop';

export const INKS = [
  { name: 'Blue', c: '#1f3fbf', dry: '#2b4bc4' },
  { name: 'Red', c: '#b8231a', dry: '#c03227' },
  { name: 'Black', c: '#16140f', dry: '#2a2721' },
] as const;

export const rig = {
  want: 'hold' as Want,
  /** Where the nib should be, in screen px; lift is how far it is off the paper (px). */
  nib: { x: 0, y: 0, lift: 0, len: 420 },
  /** Hold pose, in screen px: centre, length, angle in the screen plane (deg, counter-clockwise), height. */
  hold: { x: 0, y: 0, len: 700, ang: 120, z: 90, idle: 1 },
  /** Rest pose (the ending): lying flat across the three ways in. */
  rest: { x: 0, y: 0, len: 600, ang: 20 },
  arrived: false,
  writing: false,
  webgl: true,
  ink: 0,
  level: [1, 1, 1] as number[],
  retracted: false,
  /** Commands from the page to the scene. */
  cmds: [] as ({ t: 'trick'; trick: Trick; power: number; dir: number } | { t: 'click' })[],
  /** Where the scene drew the pen this frame, in screen px. */
  screen: { cx: -999, cy: -999, tx: -999, ty: -999, ex: -999, ey: -999, len: 0, busy: false },
  /** Notifications from the scene. */
  on: { click: (_retracted: boolean) => {}, ink: (_i: number) => {}, land: (_hard: number) => {}, whoosh: (_v: number) => {} },
};

export function spendInk(px: number) {
  rig.level[rig.ink] = Math.max(0.04, rig.level[rig.ink] - px * 2.2e-5);
}
