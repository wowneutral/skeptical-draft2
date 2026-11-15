// The floor plan: where every letter and prop stands, and the ten camera
// positions the scroll moves between. Two plans: one row on a wide screen,
// two rows (SKEP over TICAL?) on a phone.
import { DEPTH, hook, letter, type Outline } from './geo';

export const WORD = 'SKEPTICAL';
export const STOPS = ['hero', 'm1', 'm2', 'record', 'm3', 'drive', 'people', 'm4', 'join', 'end'] as const;
export type StopName = (typeof STOPS)[number];
export const stopIndex = (n: StopName) => STOPS.indexOf(n);

export type V3 = [number, number, number];
/** Where on the screen the subject should sit, as fractions of the viewport. */
export type Frame = { x0: number; x1: number; y0: number; y1: number };
/**
 * A camera position, described the way a photographer would: what it looks
 * at, from which side (az, degrees round from the front) and how high (el),
 * how much of the set must fit (w by h metres), the lens (fov) and which part
 * of the screen the subject gets. The distance follows from those.
 */
export type Shot = { at: V3; az: number; el: number; w: number; h: number; fov: number; frame: Frame; up?: V3 };
export type Via = { p: V3; t: V3 };

export type Home = { ch: string; o: Outline; x: number; y: number; z: number };
export type Plan = {
  phone: boolean;
  letters: Home[];
  q: { x: number; y: number; z: number; o: ReturnType<typeof hook> };
  /** The counter of the P, the keyhole the camera goes through. */
  key: { x: number; y: number; z: number };
  plinths: { x: number; z: number; yaw: number }[];
  volumes: { x: number; z: number; pitch: number };
  coaches: { x: number; z: number }[];
  pegs: { x: number; z: number }[];
  /** Where the dot waits beside each of the three painted lines, and which way the lines run (turned to face the Join camera). */
  ways: { x: number; z: number; cap: number }[];
  wayYaw: number;
  shots: Record<StopName, Shot>;
  vias: Partial<Record<string, Via[]>>;
};

const TRACK = 0.13;
export const VOL = { w: 0.64, h: 1.62, d: 1.05, gap: 0.045 };
export const COACH_CAP = 3.1;
export const PLINTH = { w: 1.9, h: 1.36, d: 0.74 };
export const PEG = { w: 0.44, h: 0.96, d: 0.17 };

function row(text: string, x0: number, z: number, out: Home[]): number {
  let pen = x0;
  for (const ch of text) {
    const o = letter(ch);
    out.push({ ch, o, x: pen + o.adv / 2, y: o.h / 2, z });
    pen += o.adv + TRACK;
  }
  return pen;
}

/**
 * Along the front to the T, in between the T and the I (under the T's arm), out
 * the back, along the backs of the letters and round the left end to the front again.
 */
function weave(letters: Home[], left: number, z: number): Via[] {
  const T = letters.find((l) => l.ch === 'T')!, I = letters.find((l) => l.ch === 'I')!;
  const xg = (T.x + 0.15 + I.x - I.o.w / 2) / 2, ahead: V3 = [xg, 0.9, z - 6];
  return [
    { p: [xg + 1.8, 0.65, z + 3.4], t: [xg, 0.9, z - 3] },
    { p: [xg, 0.6, z + 2.2], t: ahead },
    { p: [xg, 0.6, z + 1.3], t: ahead },
    { p: [xg, 0.6, z + 0.4], t: ahead },
    { p: [xg, 0.6, z - 0.5], t: [xg - 2.5, 0.9, z - 5] },
    { p: [xg, 0.6, z - 1.3], t: [left + 2, 1, z - 0.6] },
    { p: [xg - 1.2, 0.6, z - 2.1], t: [left + 1.5, 1, z - 0.3] },
    { p: [left - 1.2, 0.6, z - 0.8], t: [left + 1, 1, z] },
    { p: [left - 1.4, 0.4, z + 2.2], t: [left + 2, 1.1, z] },
  ];
}

/** Straight through the counter of the P: a row of points on one line, so the curve between them cannot wander into the letter. */
function through(key: { x: number; y: number; z: number }, far: number): Via[] {
  return [2.3, 1.5, 0.7, -0.1, -0.9].map((dz, i) => ({
    p: [key.x, key.y, key.z + dz] as V3,
    t: (i < 4 ? [key.x, key.y, key.z + dz - 4] : [key.x + 0.1, 1.1, far]) as V3,
  }));
}

export function makePlan(phone: boolean): Plan {
  const letters: Home[] = [];
  const ho = hook();
  let qx: number, x0: number, x1: number, backZ = 0;
  if (!phone) {
    const w = WORD.split('').reduce((s, ch) => s + letter(ch).adv + TRACK, 0) + ho.w + 0.02;
    x0 = -w / 2;
    const end = row(WORD, x0, 0, letters);
    qx = end + 0.02 + ho.w / 2; x1 = qx + ho.w / 2;
  } else {
    backZ = -3.6;
    const w = 'TICAL'.split('').reduce((s, ch) => s + letter(ch).adv + TRACK, 0) + ho.w + 0.02;
    x0 = -w / 2;
    row('SKEP', x0, backZ, letters);
    const end = row('TICAL', x0, 0, letters);
    qx = end + 0.02 + ho.w / 2; x1 = qx + ho.w / 2;
  }
  const P = letters.find((l) => l.ch === 'P')!;
  // Anton's P: the counter sits a little left of the box centre, between 1.15 and 1.63 m up.
  const key = { x: P.x - 0.089, y: 1.39, z: P.z };
  const q = { x: qx, y: ho.cy, z: 0, o: ho };
  const cx = (x0 + x1) / 2;

  if (!phone) {
    const plinths = [{ x: x0 - 2.35, z: 2.15, yaw: 0.2 }, { x: x0 - 0.55, z: 3.5, yaw: 0.09 }];
    const volumes = { x: key.x, z: -9.8, pitch: VOL.w + VOL.gap };
    const coaches = [{ x: 3.3, z: -9.6 }, { x: 5.6, z: -9.6 }];
    const pegs = Array.from({ length: 8 }, (_, i) => ({ x: 4.45 + (i - 3.5) * 0.62, z: -8.25 }));
    const wayYaw = (38 * Math.PI) / 180;
    const ways = [0, 1, 2].map((i) => ({ x: qx - 2.5 + i * Math.sin(wayYaw) * 1.02, z: 4.5 + i * Math.cos(wayYaw) * 1.02, cap: 0.6 }));
    const L = { x0: 0.5, x1: 1, y0: 0.08, y1: 0.96 };       // subject on the right, words on the left
    const shots: Record<StopName, Shot> = {
      hero: { at: [cx, 1.02, 0], az: -7, el: 6.5, w: x1 - x0 + 0.5, h: 2.7, fov: 15, frame: { x0: 0.035, x1: 0.965, y0: 0.4, y1: 0.93 } },
      // Low on the floor in front of the question mark, the hook overhead, the word running away to the left.
      m1: { at: [qx - 1.5, 1.25, 0], az: 58, el: -6, w: 3.4, h: 3.4, fov: 40, frame: { x0: 0.36, x1: 1, y0: 0, y1: 1 } },
      // A worm's eye view from the floor at the front of the word.
      m2: { at: [letters[4].x, 1.1, 0], az: -36, el: -7, w: 4.6, h: 2.5, fov: 36, frame: { x0: 0, x1: 0.62, y0: 0.24, y1: 1 } },
      record: { at: [x0 - 1.45, 0.86, 2.6], az: -24, el: 9, w: 4.9, h: 2.9, fov: 24, frame: L },
      // Close on the P; its counter is the keyhole.
      m3: { at: [key.x, 1.12, DEPTH / 2], az: 36, el: -4, w: 2.3, h: 2.6, fov: 34, frame: { x0: 0.52, x1: 1, y0: 0.14, y1: 0.97 } },
      drive: { at: [volumes.x, 0.86, volumes.z + 0.5], az: 3, el: 4, w: 5.3, h: 2.2, fov: 44, frame: { x0: 0.44, x1: 1, y0: 0.2, y1: 0.95 } },
      people: { at: [4.45, 1.5, -8.9], az: -3, el: 4, w: 5.6, h: 3.9, fov: 44, frame: { x0: 0, x1: 0.52, y0: 0.08, y1: 0.97 } },
      m4: { at: [cx, 0, -0.95], az: 0, el: 89.5, w: x1 - x0 + 1.0, h: 3.6, fov: 20, frame: { x0: 0.03, x1: 0.97, y0: 0.4, y1: 0.97 }, up: [0, 0, -1] },
      join: { at: [qx - 0.75, 0.2, 4.15], az: 38, el: 46, w: 5.6, h: 5.4, fov: 26, frame: { x0: 0, x1: 0.54, y0: 0.08, y1: 0.98 } },
      end: { at: [cx - 0.9, 0.7, -3.2], az: -5, el: 20, w: 17.2, h: 8.6, fov: 18, frame: { x0: 0.02, x1: 0.98, y0: 0.07, y1: 0.62 } },
    };
    const vias: Plan['vias'] = {
      'm1>m2': weave(letters, x0, 0),
      'm3>drive': through(key, volumes.z),
      // Up from behind the word and over it, eyes on the word by halfway.
      'people>m4': [
        { p: [3.2, 6.5, 2.2], t: [3.6, 1.2, -6.5] },
        { p: [cx + 1.2, 20, 3.2], t: [cx, 0.5, -1.6] },
      ],
    };
    return { phone, letters, q, key, plinths, volumes, coaches, pegs, ways, wayYaw, shots, vias };
  }

  // Phone: everything is seen through a window in the top half of the screen.
  const W: Frame = { x0: 0, x1: 1, y0: 0.075, y1: 0.47 };
  const plinths = [{ x: x0 - 1.3, z: -2.3, yaw: -0.62 }, { x: x0 - 1.45, z: 0.75, yaw: -0.62 }];
  // The drive and the people stand a long way back, so a narrow screen can still take them in from behind the word.
  const volumes = { x: key.x, z: backZ - 14, pitch: VOL.w + VOL.gap };
  const px = key.x + 5.4;
  const coaches = [{ x: px - 1.15, z: backZ - 13.8 }, { x: px + 1.15, z: backZ - 13.8 }];
  const pegs = Array.from({ length: 8 }, (_, i) => ({ x: px + (i - 3.5) * 0.62, z: backZ - 12.45 }));
  const wayYaw = (8 * Math.PI) / 180;
  const ways = [0, 1, 2].map((i) => ({ x: x0 + 0.75 + i * Math.sin(wayYaw), z: 3.2 + i * Math.cos(wayYaw), cap: 0.6 }));
  const wordW = x1 - x0;
  const shots: Record<StopName, Shot> = {
    hero: { at: [cx + 0.1, 0.9, backZ / 2], az: -6, el: 35, w: wordW + 1.0, h: 4.1, fov: 20, frame: { x0: 0.02, x1: 0.98, y0: 0.31, y1: 0.77 } },
    m1: { at: [qx - 0.9, 1.2, 0], az: 50, el: -4, w: 3.0, h: 3.0, fov: 44, frame: W },
    m2: { at: [letters[6].x, 1.15, 0], az: -30, el: -8, w: 3.6, h: 2.6, fov: 44, frame: W },
    record: { at: [x0 - 1.4, 0.8, -0.8], az: -38, el: 10, w: 3.9, h: 2.5, fov: 30, frame: W },
    // Over the tops of the front row, down onto the P and its keyhole.
    m3: { at: [key.x, 1.1, backZ + DEPTH / 2], az: 8, el: 33, w: 2.4, h: 3.0, fov: 30, frame: W },
    drive: { at: [volumes.x, 0.86, volumes.z + 0.5], az: 2, el: 4, w: 5.3, h: 2.2, fov: 50, frame: W },
    people: { at: [px, 1.25, backZ - 12.6], az: -3, el: 7, w: 5.6, h: 4.3, fov: 50, frame: W },
    m4: { at: [cx, 0, backZ / 2 - 1.1], az: 0, el: 89.5, w: wordW + 0.6, h: 6.4, fov: 30, frame: W, up: [0, 0, -1] },
    join: { at: [cx + 0.2, 0.3, 2.9], az: 8, el: 36, w: wordW + 0.2, h: 5.6, fov: 34, frame: W },
    end: { at: [cx + 0.2, 0.6, backZ / 2 + 0.6], az: -4, el: 31, w: wordW + 3.6, h: 9.5, fov: 30, frame: W },
  };
  const vias: Plan['vias'] = {
    'm1>m2': weave(letters, x0, 0),
    'm3>drive': through(key, volumes.z),
    'people>m4': [
      { p: [cx + 3.2, 8, 3], t: [px - 1.5, 1.2, backZ - 9] },
      { p: [cx + 0.6, 17, 3.4], t: [cx, 0.5, backZ / 2 - 1.4] },
    ],
  };
  return { phone, letters, q, key, plinths, volumes, coaches, pegs, ways, wayYaw, shots, vias };
}

