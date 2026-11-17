// The mobile as numbers. Six steel arms hang one below another from a hook bent
// like the top of a question mark. Every arm is balanced on a wire loop; every
// wire is a weak torsion spring. Nothing here knows about React or three.
import { still } from '@/lib/utils';

export type Kind = 'disc' | 'crescent' | 'leaf' | 'half' | 'drop' | 'dot';
export type Tone = 'black' | 'bone' | 'red';

export type Piece = {
  arm: number; x: number; // where it hangs, in the arm's own coordinates
  wire: number; kind: Kind; size: number; tone: Tone; turn: number;
  stage: number; // the section that hangs it (0: always there)
  mass: number;
  a: number; av: number; // how far it has been hung (0 to 1), and its speed
  sx: number; sz: number; vx: number; vz: number; // pendulum on its own wire
};
export type Arm = {
  d: 1 | -1; a: number; b: number; drop: number; arch: number;
  u: number; // where the loop sits along the arm
  yaw: number; yv: number; tilt: number; tv: number;
  sx: number; sz: number; vx: number; vz: number; // the wire above, swinging
};

export const N = 6;
const mkArm = (i: number, a: number, b: number, drop: number): Arm => ({
  d: i % 2 === 0 ? 1 : -1, a, b, drop, arch: 0.07 * (a + b) * 0.5,
  u: 0, yaw: 0, yv: 0, tilt: 0, tv: 0, sx: 0, sz: 0, vx: 0, vz: 0,
});
export const ARMS: Arm[] = [
  mkArm(0, 2.15, 1.3, 0.85),
  mkArm(1, 1.95, 1.2, 0.9),
  mkArm(2, 1.75, 1.12, 0.9),
  mkArm(3, 1.58, 1.04, 0.88),
  mkArm(4, 1.42, 0.96, 0.86),
  mkArm(5, 1.28, 0.88, 0.84),
];

/** Area of each outline at size 1, so mass follows what you see. */
const AREA: Record<Kind, number> = { disc: Math.PI, crescent: 1.25, leaf: 1.1, half: Math.PI / 2, drop: 1.9, dot: Math.PI };

const mkPiece = (arm: number, where: 'end' | 'mid' | 'child', wire: number, kind: Kind, size: number, tone: Tone, stage: number, turn = 0): Piece => {
  const A = ARMS[arm];
  const x = where === 'end' ? -A.d * A.a : where === 'mid' ? -A.d * A.a * 0.42 : A.d * A.b;
  return { arm, x, wire, kind, size, tone, turn, stage, mass: AREA[kind] * size * size, a: stage === 0 ? 1 : 0, av: 0, sx: 0, sz: 0, vx: 0, vz: 0 };
};

export const PIECES: Piece[] = [
  mkPiece(0, 'end', 0.5, 'disc', 0.5, 'black', 0),
  mkPiece(1, 'end', 0.34, 'crescent', 0.58, 'bone', 0, 0.3),
  mkPiece(2, 'end', 0.4, 'leaf', 0.5, 'black', 0, -0.25),
  mkPiece(3, 'end', 0.3, 'disc', 0.36, 'bone', 0),
  mkPiece(4, 'end', 0.36, 'half', 0.42, 'black', 0, 0.2),
  mkPiece(5, 'end', 0.3, 'leaf', 0.4, 'bone', 0, 0.35),
  mkPiece(5, 'child', 0.95, 'dot', 0.2, 'red', 0),
  // One weight per section, each on the next arm down.
  mkPiece(1, 'mid', 0.42, 'disc', 0.2, 'black', 1),
  mkPiece(2, 'mid', 0.36, 'half', 0.3, 'bone', 2, -0.4),
  mkPiece(3, 'mid', 0.38, 'drop', 0.24, 'black', 3),
  mkPiece(4, 'mid', 0.34, 'crescent', 0.32, 'bone', 4, -0.5),
  mkPiece(5, 'mid', 0.36, 'disc', 0.15, 'black', 5),
];
/** The three shapes the ways in hang from, at Join. */
export const WAYS = [3, 4, 5].map((arm) => PIECES.find((p) => p.arm === arm && p.stage === 0 && p.kind !== 'dot')!);

/** Set by the scene: asks for one more frame when nothing moves on its own. */
export const redraw = { fn: () => {} };

export const S = {
  stage: 0, t: 0, open: still ? 1 : 0, ov: 0, end: 0,
  hovered: -1,
  drag: { j: -1, dx: 0, dy: 0 }, // a shape held by the pointer, and how far it is pulled (world units)
};

const ARM_MASS = 0.08;
/** Everything that hangs below arm i, weighed. */
function below(i: number): number {
  if (i >= N) return 0;
  let m = ARM_MASS;
  for (const p of PIECES) if (p.arm === i) m += p.mass * p.a;
  return m + below(i + 1);
}
/** Where the loop should sit for arm i to balance. */
function balance(i: number) {
  const A = ARMS[i];
  let m = ARM_MASS, mx = ARM_MASS * (-A.d * A.a + A.d * A.b) * 0.5;
  for (const p of PIECES) if (p.arm === i) { m += p.mass * p.a; mx += p.mass * p.a * p.x; }
  const c = below(i + 1);
  m += c; mx += c * A.d * A.b;
  return { u: mx / m, m };
}

/** Settle everything at once: used on load and with reduced motion. */
export function settle() {
  for (const p of PIECES) { p.a = p.stage <= S.stage ? 1 : 0; p.av = 0; p.sx = p.sz = p.vx = p.vz = 0; }
  for (let i = 0; i < N; i++) { const A = ARMS[i]; A.u = balance(i).u; A.tilt = A.tv = 0; A.yv = 0; A.sx = A.sz = A.vx = A.vz = 0; }
  ARMS.forEach((A, i) => { A.yaw = [0.35, -0.2, 0.42, -0.12, 0.28, -0.3][i]; });
}
settle();
for (const p of PIECES) if (p.stage > 0) p.a = 0;
for (let i = 0; i < N; i++) ARMS[i].u = balance(i).u;

const G = 2.4; // how hard an imbalance tips an arm
const KT = 10, CT = 1.5; // tilt spring and damping (underdamped: it overshoots)
const KY = 1.1, CY = 0.5; // torsion of each wire, and air
const GS = 5.5, CS = 0.55; // pendulums

function step(dt: number) {
  const t = S.t;
  const end = S.end;
  // Hang (or unhang) the weights for the sections reached.
  for (const p of PIECES) {
    if (p.stage === 0) continue;
    const target = p.stage <= S.stage ? 1 : 0;
    p.av += ((target - p.a) * 38 - p.av * 9) * dt;
    p.a = Math.min(1.06, Math.max(0, p.a + p.av * dt));
  }
  // Yaw: a chain of torsion springs, driven by still air.
  const acc: number[] = new Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    const A = ARMS[i];
    const up = i === 0 ? 0 : ARMS[i - 1].yaw;
    let f = -KY * (A.yaw - up) - CY * A.yv;
    if (i < N - 1) f += KY * 0.7 * (ARMS[i + 1].yaw - A.yaw);
    const air = (1 - end) * 0.55 * (Math.sin(t * 0.21 + i * 1.7) + 0.6 * Math.sin(t * 0.13 * (1 + i * 0.17) + i * 2.9));
    f += air;
    f += end * (-2.2 * A.yaw - 1.6 * A.yv);
    const inertia = 0.6 + below(i) * 0.25;
    acc[i] = f / inertia;
  }
  for (let i = 0; i < N; i++) { const A = ARMS[i]; A.yv += acc[i] * dt; A.yaw += A.yv * dt; }
  // Tilt: each arm tips toward its heavier side, then its loop slides to the balance point.
  for (let i = 0; i < N; i++) {
    const A = ARMS[i];
    const { u, m } = balance(i);
    const torque = m * (u - A.u);
    const target = Math.max(-0.42, Math.min(0.42, -G * torque));
    const ta = KT * (target - A.tilt) - CT * A.tv;
    A.tv += ta * dt;
    A.tilt = Math.max(-0.75, Math.min(0.75, A.tilt + A.tv * dt));
    A.u += (u - A.u) * (1 - Math.exp(-0.55 * dt));
    // What an arm does, the arm above feels, a little.
    if (i > 0) ARMS[i - 1].tv -= ta * 0.06 * dt;
    // The wire above swings when the arm jolts.
    A.vx += (-GS / (A.drop + 0.4) * Math.sin(A.sx) - CS * A.vx) * dt - ta * 0.004;
    A.vz += (-GS / (A.drop + 0.4) * Math.sin(A.sz) - CS * A.vz) * dt;
    A.sx += A.vx * dt; A.sz += A.vz * dt;
  }
  // A held shape follows the hand on its wire; its arm feels the pull.
  if (S.drag.j >= 0) {
    const p = PIECES[S.drag.j], A = ARMS[p.arm], L = p.wire + p.size;
    const tx = Math.max(-1.1, Math.min(1.1, Math.atan2(S.drag.dx, L)));
    p.vx += ((tx - p.sx) * 60 - p.vx * 10) * dt;
    const r = p.x - A.u;
    A.tv += Math.max(-3, Math.min(3, S.drag.dy * r * 7)) * dt;
    A.yv += Math.max(-1.2, Math.min(1.2, S.drag.dx * r * 0.7)) * dt;
  }
  for (const p of PIECES) {
    const A = ARMS[p.arm];
    const L = p.wire + p.size;
    p.vx += (-GS / L * Math.sin(p.sx) - CS * p.vx) * dt - A.tv * 0.02 * dt * 60 * 0.02;
    p.vz += (-GS / L * Math.sin(p.sz) - CS * p.vz) * dt;
    p.sx += p.vx * dt; p.sz += p.vz * dt;
  }
}

export function advance(dt: number) {
  if (still) return;
  dt = Math.min(dt, 1 / 24);
  S.t += dt;
  // The opening: lowered on its hook, it lands and bounces once.
  S.ov += ((1 - S.open) * 26 - S.ov * 5.5) * dt;
  S.open += S.ov * dt;
  S.end += ((S.stage >= 6 ? 1 : 0) - S.end) * (1 - Math.exp(-1.2 * dt));
  const n = 3;
  for (let k = 0; k < n; k++) step(dt / n);
}

/** A push at piece j: force in world units, from the pointer. */
export function push(j: number, fx: number, fy: number, fz: number) {
  if (still) return;
  const p = PIECES[j]; const A = ARMS[p.arm];
  const r = p.x - A.u;
  const m = Math.max(0.12, p.mass);
  p.vx += (fx * 1.4) / m * 0.25;
  p.vz += (fz * 1.4) / m * 0.25;
  // torque about the wire: y = z*Fx - x*Fz
  A.yv += (-r * fz * 0.9 + Math.sin(A.yaw) * fx * 0.4) / (0.6 + below(p.arm) * 0.25);
  A.tv += r * fy * 0.8;
  A.vx += fx * 0.08; A.vz += fz * 0.08;
}

/** Everything at once, for the keyboard: a breath of air across the mobile. */
export function gust() {
  if (still) return;
  PIECES.forEach((_, j) => { if (PIECES[j].a > 0.5) push(j, (Math.random() - 0.5) * 0.6, (Math.random() - 0.3) * 0.4, -0.5 - Math.random() * 0.5); });
}

/** A way in was chosen: set that arm swinging. */
export function swing(arm: number) {
  if (still) return;
  const A = ARMS[arm];
  A.yv += 2.6 * (arm % 2 ? -1 : 1);
  A.tv += 1.4;
  A.vx += 0.5; A.vz += 0.35;
  for (const p of PIECES) if (p.arm === arm) { p.vx += 1.2; p.vz -= 0.9; }
}
