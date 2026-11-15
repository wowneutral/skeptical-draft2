// The balance itself, as numbers. One beam (a damped pendulum driven by the
// real torque of what sits in each pan), two hangers that swing on their
// chains, and every weight's flight between them. The 3D scene, the flat SVG
// fallback and the readout all read from here; nothing here knows about React.
import { gsap } from '@/lib/scroll';
import { HERO, MANIFESTO, RECORD, DRIVE, PEOPLE } from '@/content';
import { still } from '@/lib/utils';

export const PIV_Y = 3.55; // knife edge height
export const LB = 2.25; // half beam
export const LC = 1.85; // hook to pan
export const STOP = 0.3; // the beam rests on its stops here
export const PAN_R = 0.88;

export type Kind = 'q' | 'cyl' | 'iron' | 'bell' | 'box' | 'coin';
export type Section = 'weigh' | 'manifesto' | 'record' | 'drive' | 'people';
export type W = {
  id: string; label: string; sub?: string; kind: Kind; section: Section | 'q'; mass: number;
  r: number; h: number; // footprint radius and height
  // live state
  side: 'L' | 'R' | null; landed: boolean;
  fly: null | { t: number; dur: number; from: [number, number, number]; to: 'L' | 'R' | 'off' | 'lift'; arc: number; spin: number };
  pos: [number, number, number]; rot: number; tilt: number; scale: number;
};

const mk = (id: string, label: string, kind: Kind, section: W['section'], mass: number, r: number, h: number, sub?: string): W => ({
  id, label, sub, kind, section, mass, r, h, side: null, landed: false, fly: null, pos: [0, 12, 0], rot: 0, tilt: 0, scale: 1,
});

export const WEIGHTS: W[] = [
  mk('q', '?', 'q', 'q', 10, 0.5, 1.3),
  ...HERO.statement.map((s, i) => mk('s' + i, s, 'cyl', 'weigh', 0.7, 0.2, 0.34)),
  ...MANIFESTO.map((s, i) => mk('m' + i, s, 'iron', 'manifesto', 0.8, 0.25, 0.16)),
  ...RECORD.results.map((r, i) => mk('r' + i, `${r.who} ${r.what}.`, 'bell', 'record', 1.2, 0.22, 0.46, r.more)),
  mk('d', DRIVE.title, 'box', 'drive', 3.5, 0.42, 0.36, DRIVE.lead),
  ...PEOPLE.coaches.map((c, i) => mk('p' + i, `${c.name}. ${c.role}.`, 'cyl', 'people', 1.0, 0.23, 0.4)),
  mk('pc', PEOPLE.count, 'coin', 'people', 0.8, 0.27, 0.12),
];
export const byId = (id: string) => WEIGHTS.find((w) => w.id === id)!;
export const Q = WEIGHTS[0];

/** Everything mutable. */
export const S = {
  th: -0.26, om: 0, // beam angle (positive: the team's pan, on the right, goes down) and speed
  ph: [0.0, 0.0], phv: [0, 0], // hanger swing, left and right
  ps: [0, 0], psv: [0, 0], // hanger swing front to back
  hookV: [[0, 0], [0, 0]] as number[][],
  t: 0,
  push: 0, // a held push from the pointer, in torque units
  glow: 0, // the level moment, 1 then fading
  tipped: false,
  levelAt: -1,
  qLift: false,
  free: false,
  opened: false,
  sound: false,
  version: 0, // bumps when what is on the pans changes
  listeners: new Set<() => void>(),
  onLevel: new Set<(up: boolean) => void>(),
  onLand: new Set<(m: number) => void>(),
};
const emit = () => { S.version++; S.listeners.forEach((f) => f()); };
export const subscribe = (f: () => void) => { S.listeners.add(f); return () => { S.listeners.delete(f); }; };

export const massOn = (side: 'L' | 'R') => WEIGHTS.reduce((a, w) => a + (w.side === side && w.landed ? w.mass : 0), 0);

// Physics constants. Torque per unit of imbalance, the restoring stiffness of a
// beam whose centre of mass hangs below the knife edge, inertia and damping.
const A = 1, K = 36, I0 = 5.2, C = 2.6;
export const equilibrium = () => clamp((A * (massOn('R') - massOn('L'))) / K, -STOP, STOP);
function clamp(v: number, a: number, b: number) { return Math.min(b, Math.max(a, v)); }

/** Where a hook is, for the beam angle. */
export function hook(side: 'L' | 'R', th = S.th): [number, number] {
  const s = side === 'R' ? 1 : -1;
  return [s * LB * Math.cos(th), PIV_Y - s * LB * Math.sin(th)];
}
/** Pan centre (top of the dish) in world space. */
export function panCentre(side: 'L' | 'R'): [number, number, number] {
  const i = side === 'L' ? 0 : 1, [hx, hy] = hook(side), ph = S.ph[i], ps = S.ps[i];
  return [hx + LC * Math.sin(ph), hy - LC * Math.cos(ph) * Math.cos(ps), LC * Math.sin(ps)];
}

/** Local slot offsets on a pan for its current, ordered contents. */
function slots(side: 'L' | 'R'): Map<string, [number, number, number]> {
  const on = WEIGHTS.filter((w) => w.side === side && (w.landed || w.fly));
  const out = new Map<string, [number, number, number]>();
  const big = on.filter((w) => w.kind === 'q' || w.kind === 'box');
  const small = on.filter((w) => w.kind !== 'q' && w.kind !== 'box');
  let cy = 0;
  big.forEach((w, i) => {
    if (i === 0) { out.set(w.id, [w.kind === 'q' ? -0.05 : 0, 0, w.kind === 'q' ? -0.1 : 0]); cy = w.h; }
    else out.set(w.id, [0, cy, 0]);
  });
  const ring = big.length ? 0.6 : 0.5;
  const n1 = big.length ? 7 : 6;
  small.forEach((w, i) => {
    if (!big.length && i === 0) { out.set(w.id, [0, 0, 0]); return; }
    const k = big.length ? i : i - 1;
    if (k < n1) { const a = Math.PI * 0.5 + (k / n1) * Math.PI * 2; out.set(w.id, [Math.cos(a) * ring, 0, Math.sin(a) * ring * 0.8]); }
    else { const j = k - n1, a = Math.PI * 0.2 + (j / 6) * Math.PI * 2; out.set(w.id, [Math.cos(a) * ring, 0.36, Math.sin(a) * ring * 0.8]); }
  });
  return out;
}
let slotCache: Record<'L' | 'R', Map<string, [number, number, number]>> = { L: new Map(), R: new Map() };
const reslot = () => { slotCache = { L: slots('L'), R: slots('R') }; };

/** World position of a slot on a pan, carried by the hanger's swing. */
export function slotWorld(side: 'L' | 'R', id: string): [number, number, number] {
  const c = panCentre(side), o = slotCache[side].get(id) ?? [0, 0, 0];
  const i = side === 'L' ? 0 : 1, ph = S.ph[i];
  const x = o[0] * Math.cos(ph) - o[1] * Math.sin(ph), y = o[0] * Math.sin(ph) + o[1] * Math.cos(ph);
  return [c[0] + x, c[1] + 0.06 + y, c[2] + o[2]];
}

/** Send a weight somewhere. */
export function send(w: W, to: 'L' | 'R' | 'off' | 'lift', dur = 0.9) {
  const from: [number, number, number] = [...w.pos];
  if (to === 'L' || to === 'R') {
    if (w.side === to && (w.landed || w.fly)) return;
    w.landed = false; w.side = to;
    if (w.pos[1] > 9 || w.scale < 0.05) { const c = panCentre(to); from[0] = c[0] + (Math.random() - 0.5) * 0.4; from[1] = c[1] + 4.2; from[2] = c[2] + 0.4; }
  } else { w.landed = false; }
  if (still) {
    w.fly = null;
    if (to === 'L' || to === 'R') { w.landed = true; w.scale = 1; }
    else { if (to === 'off') { w.side = null; w.scale = 0; } }
    if (to === 'lift') w.side = null;
    reslot(); emit(); place(w); return;
  }
  const throwing = from[1] < 9 && w.scale > 0.5 && (to === 'L' || to === 'R');
  w.fly = { t: 0, dur, from, to, arc: throwing ? 1.8 : 0, spin: throwing ? (Math.random() < 0.5 ? -1 : 1) * Math.PI * 2 : 0 };
  if (to === 'off' || to === 'lift') { w.side = to === 'lift' ? 'L' : w.side; }
  reslot(); emit();
}

function place(w: W) {
  if (w.side && w.landed) { w.pos = slotWorld(w.side, w.id); w.tilt = S.ph[w.side === 'L' ? 0 : 1]; }
  if (w.id === 'q' && S.qLift && !w.landed) { const c = panCentre('L'); w.pos = [c[0], c[1] + 2.1, c[2]]; w.scale = 1; }
}

const easeIn = (t: number) => t * t;
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

function stepFly(w: W, dt: number) {
  const f = w.fly!; f.t = Math.min(1, f.t + dt / f.dur);
  const t = f.t;
  if (f.to === 'L' || f.to === 'R') {
    const to = slotWorld(f.to, w.id);
    const e = f.arc ? t : easeIn(t);
    w.pos = [f.from[0] + (to[0] - f.from[0]) * e, f.from[1] + (to[1] - f.from[1]) * e + Math.sin(Math.PI * t) * f.arc, f.from[2] + (to[2] - f.from[2]) * e];
    w.rot = f.spin * (1 - t);
    w.scale = Math.min(1, w.scale + dt * 5);
    if (t >= 1) {
      w.fly = null; w.landed = true; w.rot = 0; reslot();
      const s = f.to === 'R' ? 1 : -1;
      S.om += s * w.mass * 0.075 * (f.arc ? 1.4 : 1);
      const i = f.to === 'L' ? 0 : 1; S.phv[i] += (Math.random() - 0.5) * 0.5; S.psv[i] += (Math.random() - 0.5) * 0.35;
      S.onLand.forEach((fn) => fn(w.mass)); emit();
    }
  } else if (f.to === 'off') {
    w.pos = [w.pos[0], w.pos[1] + dt * 7 * easeOut(1 - t * 0.5), w.pos[2] + dt * 1.5];
    w.scale = Math.max(0, 1 - t);
    if (t >= 1) { w.fly = null; w.side = null; w.pos = [0, 12, 0]; reslot(); emit(); }
  } else if (f.to === 'lift') {
    const c = panCentre('L'), to: [number, number, number] = [c[0], c[1] + 2.1, c[2]];
    const e = 1 - Math.pow(1 - t, 3);
    w.pos = [f.from[0] + (to[0] - f.from[0]) * e, f.from[1] + (to[1] - f.from[1]) * e, f.from[2] + (to[2] - f.from[2]) * e];
    if (t >= 1) { w.fly = null; w.side = null; reslot(); emit(); }
  }
}

function sign(v: number) { return v > 0.004 ? 1 : v < -0.004 ? -1 : 0; }
let lastSide = -1;

export function step(dtRaw: number) {
  const dt = Math.min(dtRaw, 1 / 30);
  S.t += dt;
  const mL = massOn('L'), mR = massOn('R');
  if (still) {
    S.th = equilibrium(); S.om = 0; S.ph = [0, 0]; S.ps = [0, 0];
  } else {
    // a few substeps keep the stops and the springs honest
    const n = 4, h = dt / n;
    for (let k = 0; k < n; k++) {
      const I = I0 + (mL + mR) * 0.05;
      const drift = S.opened ? Math.sin(S.t * 0.53) * 0.18 + Math.sin(S.t * 1.31 + 1) * 0.08 : 0;
      const tq = A * (mR - mL) * Math.cos(S.th) - K * Math.sin(S.th) - C * S.om + drift + S.push;
      S.om += (tq / I) * h; S.th += S.om * h;
      if (S.th > STOP) { S.th = STOP; if (S.om > 0) S.om *= -0.32; }
      if (S.th < -STOP) { S.th = -STOP; if (S.om < 0) S.om *= -0.32; }
      // the hangers: pendulums hung from moving hooks
      (['L', 'R'] as const).forEach((side, i) => {
        const s = i === 0 ? -1 : 1;
        const vx = -s * LB * Math.sin(S.th) * S.om, vy = -s * LB * Math.cos(S.th) * S.om;
        const ax = (vx - S.hookV[i][0]) / h, ay = (vy - S.hookV[i][1]) / h;
        S.hookV[i] = [vx, vy];
        const g = 9.8, ph = S.ph[i];
        const acc = (-(g + clamp(ay, -30, 30)) * Math.sin(ph) - clamp(ax, -30, 30) * Math.cos(ph)) / LC - 0.9 * S.phv[i];
        S.phv[i] += acc * h; S.ph[i] += S.phv[i] * h;
        const pacc = -(g / LC) * Math.sin(S.ps[i]) - 0.7 * S.psv[i] + (S.opened ? Math.sin(S.t * 0.9 + i * 2) * 0.05 : 0);
        S.psv[i] += pacc * h; S.ps[i] += S.psv[i] * h;
      });
    }
  }
  // the level moment
  const sd = sign(S.th);
  if (sd !== 0 && lastSide !== 0 && sd !== lastSide && S.opened) {
    const up = sd > 0;
    if (S.t - S.levelAt > 1.2) { S.levelAt = S.t; S.glow = 1; S.onLevel.forEach((fn) => fn(up)); }
  }
  if (sd !== 0) lastSide = sd;
  const tipped = S.th > 0.004;
  if (tipped !== S.tipped) { S.tipped = tipped; emit(); }
  S.glow = Math.max(0, S.glow - dt * 0.45);
  for (const w of WEIGHTS) { if (w.fly) stepFly(w, dt); else place(w); }
}

let running = false;
export function start() {
  if (running) return;
  running = true;
  gsap.ticker.add(tick);
}
export function stop() { running = false; gsap.ticker.remove(tick); }
const tick = (_t: number, dms: number) => step(dms / 1000);

export function reset() {
  for (const w of WEIGHTS) { w.side = null; w.landed = false; w.fly = null; w.pos = [0, 12, 0]; w.scale = 1; w.rot = 0; }
  S.th = -0.02; S.om = 0; S.ph = [0, 0]; S.phv = [0, 0]; S.ps = [0, 0]; S.psv = [0, 0]; S.glow = 0; S.qLift = false; S.free = false; S.opened = false; S.levelAt = -1; lastSide = -1;
  reslot();
}

/** The opening: the doubt is dropped into its pan. */
export function open() {
  if (still) { Q.side = 'L'; Q.landed = true; reslot(); S.th = equilibrium(); S.opened = true; lastSide = -1; emit(); return; }
  send(Q, 'L', 1.0);
  setTimeout(() => { S.opened = true; lastSide = -1; }, 1100);
}

export const onTeam = () => WEIGHTS.filter((w) => w.id !== 'q' && w.side === 'R');
export function toggle(id: string) {
  const w = byId(id);
  if (w.side === 'R') send(w, 'off', 0.7); else send(w, 'R');
}
export function setLift(on: boolean) {
  if (S.free) return;
  if (on === S.qLift) return;
  S.qLift = on;
  if (on) send(Q, 'lift', 1.4);
  else { Q.side = null; send(Q, 'L', 0.8); }
}
/** Throw the top weight from one pan into the other. */
export function throwFrom(side: 'L' | 'R') {
  const on = WEIGHTS.filter((w) => w.side === side && w.landed);
  if (!on.length) return false;
  const w = on[on.length - 1];
  send(w, side === 'L' ? 'R' : 'L', 0.95);
  return true;
}
export function setFree(on: boolean) {
  if (on === S.free) return;
  S.free = on;
  if (on) {
    // everything loose: whatever is still in the tray tumbles in, the doubt comes back
    WEIGHTS.forEach((w, i) => { if (w.id !== 'q' && !w.side) setTimeout(() => send(w, Math.random() < 0.6 ? 'R' : 'L', 1.0), i * 90); });
    if (S.qLift || !Q.side) { S.qLift = false; Q.side = null; send(Q, 'L', 0.9); }
  }
}
export function kick(side: 'L' | 'R', amt = 1) { S.om += (side === 'R' ? 1 : -1) * 0.5 * amt; }

reslot();
