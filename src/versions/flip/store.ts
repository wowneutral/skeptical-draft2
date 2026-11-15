// Shared, mutable state between the page and the scene. Never React state per frame.
export type Face = 0 | 1; // 0 = debater face (question mark), 1 = coach face (wreath)
export type Role = 'hero' | 'edge' | 'seal' | 'dial' | 'split' | 'call';

export const coin = {
  /** which face shows when the coin is at rest */
  face: 0 as Face,
  /** toss: idle, fly, settle, edge */
  phase: 'intro' as 'intro' | 'idle' | 'fly' | 'settle' | 'edge',
  t: 0,
  /** flight */
  T: 1.4, theta0: 0, omega: 20, lift: 1,
  /** settle */
  k: 0, alpha0: 0.6, dur: 1.6, onEdge: false,
  /** where the toss happens */
  slot: 'hero' as 'hero' | 'call',
  dial: 0,
  coachHover: -1,
  sound: false,
  onLand: null as null | ((face: Face | -1, slot: 'hero' | 'call') => void),
  onClick: null as null | ((n: number) => void),
};

/** Start a toss. speed 0..1 from the flick. */
export function toss(speed: number, slot: 'hero' | 'call') {
  if (coin.phase === 'fly' || coin.phase === 'settle') return false;
  const s = Math.max(0, Math.min(1, speed));
  coin.slot = slot;
  coin.phase = 'fly';
  coin.t = 0;
  coin.T = 1.15 + s * 0.6;
  coin.lift = 0.65 + s * 0.5;
  // half turns: a real, random number of them, so the face is a fair coin
  const halfTurns = Math.floor(7 + s * 10 + Math.random() * 6);
  const jitter = (Math.random() - 0.5) * 2.6; // up to ~75 degrees off flat at landing
  coin.theta0 = coin.face * Math.PI;
  coin.omega = (halfTurns * Math.PI + jitter) / coin.T;
  // very rarely, it stays up
  coin.onEdge = Math.random() < 1 / 60;
  return true;
}
