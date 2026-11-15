// The lift: plain mutable state read every frame by the scene and the page.
// Nothing here causes a React render; the page subscribes to a few events.

/** Floors in building order, bottom to top. Index 0 is the basement. */
export const FLOORS = [
  { id: 'drive', label: 'B', name: 'The drive' },
  { id: 'lobby', label: 'L', name: 'Lobby' },
  { id: 'line', label: '2', name: 'How it works' },
  { id: 'record', label: '3', name: 'The record' },
  { id: 'people', label: '4', name: 'The people' },
  { id: 'join', label: '5', name: 'Join. The roof' },
] as const;
export const TOP = FLOORS.length - 1;
/** Floors the scroll rides through, in page order. The basement needs the key. */
export const RIDE = [1, 2, 3, 4, 5];

/** What each floor's light is: the colour that spills into the car when the doors open. */
export const LIGHT = ['#2a3140', '#ffcf8a', '#ffd9a6', '#ff9a7a', '#ffc77a', '#fff6e4'];

export type Phase = 'outside' | 'calling' | 'entering' | 'inside';
type Ev = 'arrive' | 'depart' | 'phase' | 'alarm' | 'status' | 'key' | 'lit' | 'doors';

export const lift = {
  phase: 'outside' as Phase,
  /** Where the car is, in floors (0 basement .. 5 roof). Fractions are between floors. */
  p: 4,
  v: 0,
  /** Where the scroll says the car should be. */
  scrollF: 1,
  /** A floor asked for by a button; wins over the scroll until the visitor scrolls. */
  dest: null as number | null,
  /** How far the doors are open, 0 shut, 1 open. */
  doors: 0,
  dv: 0,
  doorTarget: 0,
  /** The close button was pressed: keep them shut until asked. */
  shut: false,
  /** The floor the doors last opened on, or -1 while travelling. */
  at: -1,
  /** Progress through the current floor's room, 0..1 (for rooms taller than the doorway). */
  roomT: 0,
  /** The basement key is turned. */
  key: false,
  /** Walking in: 0 outside, 1 standing in the car facing the doors. */
  enter: 0,
  /** Shake left from the alarm or a hard stop. */
  shake: 0,
  /** Seconds since the car started or stopped, for the little dip in the camera. */
  jolt: 0,
  /** Lit buttons. */
  lit: new Set<number>(),
  /** Measured scroll ranges, page px: dwell [a, b] for each floor in RIDE. */
  segs: [] as { i: number; a: number; b: number }[],
  gap: 600,
  /** Express: the scroll jumped a long way at once. */
  express: false,
  /** The lobby lights coming on, 0..1. */
  lights: 0,
  t: 0,
};

const subs = new Map<Ev, Set<(x?: number) => void>>();
export function on(ev: Ev, fn: (x?: number) => void) {
  if (!subs.has(ev)) subs.set(ev, new Set());
  subs.get(ev)!.add(fn);
  return () => { subs.get(ev)?.delete(fn); };
}
export function emit(ev: Ev, x?: number) { subs.get(ev)?.forEach((f) => f(x)); }

export function resetLift() {
  Object.assign(lift, { phase: 'outside', p: 4, v: 0, scrollF: 1, dest: null, doors: 0, dv: 0, doorTarget: 0, shut: false, at: -1, roomT: 0, key: false, enter: 0, shake: 0, jolt: 0, express: false, t: 0 });
  lift.lit.clear();
}

/** Scroll position to a floor value: whole numbers on a floor, fractions on the way. */
export function floorAt(y: number) {
  const s = lift.segs;
  if (!s.length) return { f: 1, t: 0 };
  for (let k = 0; k < s.length; k++) {
    const g = s[k];
    if (y <= g.b) {
      if (y >= g.a || k === 0) return { f: g.i, t: Math.min(1, Math.max(0, (y - g.a) / Math.max(1, g.b - g.a))) };
      const prev = s[k - 1];
      return { f: prev.i + Math.min(1, Math.max(0, (y - prev.b) / Math.max(1, g.a - prev.b))) * (g.i - prev.i), t: 0 };
    }
  }
  const last = s[s.length - 1];
  return { f: last.i, t: 1 };
}

/** The page position that puts the car at floor i, at the top of its room. */
export function yFor(i: number) {
  const g = lift.segs.find((x) => x.i === i);
  return g ? g.a + 2 : 0;
}

const sign = (x: number) => (x < 0 ? -1 : 1);

/** One step of the machine. dt in seconds. */
export function step(dt: number) {
  lift.t += dt;
  lift.jolt += dt;
  lift.shake = Math.max(0, lift.shake - dt * 1.6);
  if (lift.phase === 'outside') return;

  const target = lift.phase === 'calling' ? 1 : lift.phase === 'entering' ? 1 : lift.dest ?? lift.scrollF;
  const dist = target - lift.p;
  const moving = Math.abs(dist) > 0.0015 || Math.abs(lift.v) > 0.01;

  if (moving) {
    if (lift.doors > 0.006 || lift.dv > 0.05) {
      lift.doorTarget = 0; // shut first, then go
      if (lift.at >= 0) { lift.at = -1; emit('depart'); }
    } else {
      const fast = lift.express || Math.abs(dist) > 1.6;
      const A = fast ? 5.5 : 2.6, VMAX = fast ? 5.5 : 1.9;
      const want = sign(dist) * Math.min(VMAX, Math.sqrt(2 * A * Math.abs(dist)));
      const before = lift.v;
      lift.v += Math.max(-A * dt * 1.4, Math.min(A * dt * 1.4, want - lift.v));
      if (Math.abs(before) < 0.02 && Math.abs(lift.v) >= 0.02) lift.jolt = 0;
      const next = lift.p + lift.v * dt;
      if ((target - next) * dist <= 0) { lift.p = target; lift.v = 0; lift.jolt = 0; } else lift.p = next;
      lift.doorTarget = 0;
    }
  } else {
    lift.p = target; lift.v = 0; lift.express = false;
    const whole = Math.abs(target - Math.round(target)) < 0.001;
    if (whole) {
      const i = Math.round(target);
      if (lift.at !== i) { lift.at = i; lift.lit.delete(i); emit('lit'); emit('arrive', i); }
      lift.doorTarget = lift.shut ? 0 : i === 0 ? 0.085 : 1;
    } else {
      lift.doorTarget = 0;
      if (lift.at >= 0) { lift.at = -1; emit('depart'); }
    }
  }

  // The doors: heavy, a constant speed through the middle, a small bounce at each end.
  const k = 46, c = 10.5, vmax = lift.doorTarget > lift.doors ? 1.45 : 1.75;
  lift.dv += (k * (lift.doorTarget - lift.doors) - c * lift.dv) * dt;
  lift.dv = Math.max(-vmax, Math.min(vmax, lift.dv));
  lift.doors += lift.dv * dt;
  if (lift.doors < 0) { if (lift.dv < -0.4) lift.shake = Math.max(lift.shake, 0.18); lift.doors = 0; lift.dv = -lift.dv * 0.22; }
}
