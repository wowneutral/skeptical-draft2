// Shared, mutable state between the page and the scene. Never causes a render.
export const MAX = 12;
export const rig = {
  /** How many halvings the page is asking for (from the section on screen). */
  level: 0,
  /** Extra halvings from pressing the arrow. */
  clicks: 0,
  /** The level the arrow has actually reached (integer steps). */
  step: 0,
  /** Drag orbit, radians: target and released flag. */
  yaw: 0,
  pitch: 0,
  held: false,
  /** Pointer resting on the arrow: the shaft quivers a little. */
  hover: false,
  releasedAt: 0,
  /** 0..1: the light between point and plaster at Join. */
  glow: 0,
  /** Called whenever the reached step changes. */
  onStep: null as null | ((n: number) => void),
};
export const want = () => Math.min(MAX, rig.level + rig.clicks);
