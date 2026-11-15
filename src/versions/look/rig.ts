// The look: one pair of eyes, its moods, and the springs between them.
// Everything here is plain numbers, read and written every frame without React.
import { still } from '@/lib/utils';

/** One eye, in its own canonical frame (a left eye; the right one is mirrored). */
export type Face = {
  up: number;    // upper lid closure 0..1
  lo: number;    // lower lid lift 0..1
  by: number;    // brow height, negative is up, in units of 100
  br: number;    // brow rotation, positive is inner end down (cross)
  ba: number;    // brow arch
  sq: number;    // squeeze shut
  ln: number;    // squeeze lines
};
export type Expr = { L: Face; R: Face; pupil: number };

const F = (up: number, lo: number, by: number, br: number, ba: number, sq = 0, ln = 0): Face => ({ up, lo, by, br, ba, sq, ln });

export type Mood =
  | 'sleep' | 'open' | 'skeptic' | 'wide' | 'impressed' | 'narrow' | 'side' | 'shut' | 'peek'
  | 'soft' | 'approve' | 'flinch' | 'annoyed' | 'roll' | 'reading' | 'hmm' | 'straight' | 'eh';

export const EXPR: Record<Mood, Expr> = {
  sleep:     { L: F(1, 0.7, 0.2, 0, 0.2), R: F(1, 0.7, 0.2, 0, 0.2), pupil: 1 },
  open:      { L: F(0.05, 0.05, -0.15, 0, 0.45), R: F(0.05, 0.05, -0.15, 0, 0.45), pupil: 0.9 },
  skeptic:   { L: F(0.28, 0.14, 0.12, 9, 0.15), R: F(0.06, 0.02, -0.72, -9, 0.85), pupil: 0.8 },
  straight:  { L: F(0.3, 0.14, 0.08, 7, 0.2), R: F(0.08, 0.04, -0.6, -7, 0.8), pupil: 0.85 },
  wide:      { L: F(0, 0, -0.8, -5, 0.9), R: F(0, 0, -0.8, -5, 0.9), pupil: 0.55 },
  impressed: { L: F(0, 0.04, -0.85, -8, 1), R: F(0, 0.04, -0.85, -8, 1), pupil: 1.05 },
  narrow:    { L: F(0.6, 0.42, 0.3, 16, -0.1), R: F(0.58, 0.42, 0.26, 15, -0.1), pupil: 0.62 },
  side:      { L: F(0.5, 0.2, 0.2, 12, 0), R: F(0.42, 0.14, -0.2, -2, 0.4), pupil: 0.7 },
  shut:      { L: F(1, 0.55, 0.38, 20, -0.15, 1, 1), R: F(1, 0.55, 0.38, 20, -0.15, 1, 1), pupil: 1 },
  peek:      { L: F(0.82, 0.4, 0.3, 16, 0, 0.2, 0), R: F(1, 0.55, 0.38, 20, -0.15, 1, 1), pupil: 0.6 },
  soft:      { L: F(0.3, 0.38, -0.3, -14, 0.45), R: F(0.3, 0.38, -0.3, -14, 0.45), pupil: 1.25 },
  approve:   { L: F(0.03, 0.56, -0.38, -9, 0.65), R: F(0.03, 0.56, -0.38, -9, 0.65), pupil: 1.4 },
  eh:        { L: F(0.5, 0.3, 0.22, 15, -0.05), R: F(0.26, 0.16, -0.85, -10, 0.95), pupil: 0.55 },
  flinch:    { L: F(1, 0.6, 0.42, 24, -0.2, 1, 1), R: F(1, 0.6, 0.42, 24, -0.2, 1, 1), pupil: 1 },
  annoyed:   { L: F(0.62, 0.3, 0.32, 22, -0.25), R: F(0.62, 0.3, 0.32, 22, -0.25), pupil: 0.5 },
  roll:      { L: F(0.06, 0.1, -0.7, -8, 0.8), R: F(0.06, 0.1, -0.7, -8, 0.8), pupil: 0.7 },
  reading:   { L: F(0.3, 0.12, 0.05, 6, 0.3), R: F(0.24, 0.1, -0.25, -2, 0.55), pupil: 0.9 },
  hmm:       { L: F(0.4, 0.2, 0.2, 10, 0.1), R: F(0.18, 0.08, -0.5, -6, 0.7), pupil: 0.95 },
};

/** The shared state the page writes and the rig reads. */
export const brain = {
  base: 'skeptic' as Mood,
  over: null as Mood | null,
  overUntil: 0,
  overStart: 0,
  /** 1 = nothing checked, 0 = all checked. */
  doubt: 1,
  approved: false,
  peek: false,
  /** A Prove it is under the pointer or focused. */
  hover: false,
  /** How many section pairs are on screen (the docked pair steps aside for them). */
  local: 0,
  pointer: { x: -1, y: -1, t: -1e9, touch: false },
  focus: null as HTMLElement | null,
  focusUntil: 0,
  /** Gaze forced straight at the visitor (the ending). */
  straight: 0,
  /** Small sideways shake (pokes). */
  shake: 0,
  nodAt: -1e9,
  claims: [] as HTMLElement[],
};

export const now = () => performance.now() / 1000;

export function act(mood: Mood, secs: number) {
  brain.over = mood;
  brain.overStart = now();
  brain.overUntil = now() + secs;
}

/** A damped spring on one number. Slight overshoot, settles in about half a second. */
export class Spring {
  x: number; v = 0; t: number;
  constructor(x: number, public k = 170, public c = 17) { this.x = x; this.t = x; }
  step(dt: number) {
    if (still) { this.x = this.t; this.v = 0; return this.x; }
    // Sub-step for stability when frames are long.
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = (this.t - this.x) * this.k - this.v * this.c;
      this.v += a * h;
      this.x += this.v * h;
    }
    return this.x;
  }
}

export const KEYS: (keyof Face)[] = ['up', 'lo', 'by', 'br', 'ba', 'sq', 'ln'];
