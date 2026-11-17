// The rattleback as two coupled quantities: spin about the vertical (w) and
// rocking end to end (a, pitch) with a little roll (b) riding on it.
// Rocking always pushes the spin toward the stone's preferred direction
// (w > 0). Spin against that preference feeds the rocking, which grows,
// eats the spin, stops it dead and spins it back. No rigid body solver:
// a small biased exchange of energy, heavily damped, so it feels inevitable.
// Plain mutable state; the page and the scene read and write it every frame.

export type Cmd = { type: 'tap'; end: number } | { type: 'flick'; w: number } | { type: 'reverse' };

export const S = {
  /** Heading of the long axis, radians. */
  yaw: 0.02,
  /** Spin, rad/s. Positive is the way it likes. */
  w: 0,
  /** Pitch (end to end) and its rate. */
  a: 0, va: 0,
  /** Roll (side to side) and its rate. */
  b: 0, vb: 0,
  /** Someone has handled it (or the page has turned it). */
  touched: false,
  /** A finger or mouse is holding it. */
  held: false,
  /** Spin the hand is asking for while held. */
  handW: 0,
  /** Where the camera is among the stops, raw from the scroll and with weight on it. */
  raw: 0, f: 0,
  /** Page positions (scroll y) at which each stop is fully reached. */
  marks: [] as number[],
  /** A screen point to turn toward (drive items, the ways in), or null. */
  aimAt: null as null | { x: number; y: number },
  /** How hard the join section asks it to come to rest pointing. */
  rest: 0,
  /** The stone's centre on screen, written by the scene. */
  sx: 0, sy: 0,
  /** Pointer over the stone. */
  over: false,
  cmds: [] as Cmd[],
  /** The lights have come up. */
  lit: 0,
  /** Seconds since the scene started. */
  t: 0,
};

const TAU = Math.PI * 2;
const KA = (TAU * 2.05) ** 2; // pitch stiffness: about two rocks a second
const KB = (TAU * 2.9) ** 2; // roll stiffness
const G = 2.1; // how hard rocking pushes the spin toward its preference
const H = 0.55; // how hard spin against the preference feeds the rocking
const CA = 1.25; // rocking damping
const NL = 380; // rocking saturation
const MU = 0.045; // spin drag
const C0 = 0.07; // spin friction at the contact

export const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));

/** Advance the stone by dt seconds. aimYaw: a heading to come to rest on, with strength k (0 none). */
export function step(dt: number, aimYaw: number | null, k: number) {
  if (S.cmds.length) S.touched = true;
  for (const c of S.cmds) {
    if (c.type === 'tap') S.va += -2.0 * c.end;
    if (c.type === 'flick') S.w = Math.max(-14, Math.min(14, S.w + c.w));
    if (c.type === 'reverse') S.w = Math.abs(S.w) < 1.2 ? -4.2 : -Math.abs(S.w) * 1.05 - 1.4;
  }
  S.cmds.length = 0;
  const n = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    const R = 0.5 * (S.va * S.va + KA * S.a * S.a) + 0.18 * (S.vb * S.vb + KB * S.b * S.b);
    // The bias: rocking turns into spin one way only.
    let dw = G * R;
    // Drag and contact friction.
    dw -= MU * S.w + Math.sign(S.w) * C0 * Math.min(1, Math.abs(S.w) * 4);
    if (S.held) dw += (S.handW - S.w) * 14;
    if (aimYaw !== null && k > 0) {
      const d = wrap(S.yaw - aimYaw);
      dw += k * (-3.2 * d - 2.6 * S.w);
    }
    S.w += dw * h;
    // Rocking: driven by spin against the preference, damped with it, and
    // nudged twice a turn by the hull so there is always a seed.
    const feed = H * -S.w;
    const seed = 0.55 * Math.abs(S.w) * Math.sin(2 * S.yaw + 0.6);
    const accA = -KA * S.a - (CA - feed + NL * S.a * S.a + (k > 0 ? 2.5 * k : 0)) * S.va + seed;
    S.va += accA * h;
    S.a += S.va * h;
    // Roll follows the pitch a little out of step.
    const accB = -KB * (S.b - 0.32 * S.a) - 3.4 * S.vb;
    S.vb += accB * h;
    S.b += S.vb * h;
    S.yaw += S.w * h;
  }
  S.a = Math.max(-0.2, Math.min(0.2, S.a));
  S.yaw = wrap(S.yaw);
}
