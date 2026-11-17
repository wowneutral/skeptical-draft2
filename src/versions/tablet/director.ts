// What the tablet is doing, outside React: the hinge, the cord, the two
// leaves of wax and a queue of jobs for the stylus. The page sets the
// section; the scene reads all of this every frame.
import { still } from '@/lib/utils';
import { layout, type Stroke } from './glyphs';
import { CH, CW, Wax } from './wax';

export type Job =
  | { k: 'wait'; t: number; d: number }
  | { k: 'hinge'; to: 0 | 1 }
  | { k: 'sweep'; leaf: 0 | 1; t: number }
  | { k: 'cut'; leaf: 0 | 1; strokes: Stroke[]; width: number; key: string; si: number; pi: number; along: number; air: number; speed: number; focus: boolean };

export const T = {
  section: -1,
  /** 0 tied shut .. 1 untied and open */
  h: 0,
  tug: 0,
  tugV: 0,
  jobs: [] as Job[],
  job: null as Job | null,
  wax: [] as Wax[],
  /** the leaf a phone camera looks at */
  focus: 0 as 0 | 1,
  /** pointer on the wax, in canvas pixels */
  ptr: { on: false, down: false, leaf: 0 as 0 | 1, x: 0, y: 0 },
  /** where the stylus tip is (canvas px on a leaf) while a job runs */
  pen: { leaf: 0 as 0 | 1, x: 0, y: 0, lift: 1, mode: 'rest' as 'rest' | 'cut' | 'sweep' },
  ways: [false, false, false],
  phone: false,
};

export const TITLES: Record<number, [string[] | null, string[] | null]> = {
  0: [['SKEP'], ['TICAL?']],
  1: [['NO SCHOOL.'], ['NO FEE.']],
  2: [['THE'], ['RECORD.']],
  5: [['JOIN.'], null],
  6: [null, null],
};
// with reduced motion the tablet never closes, so these two get titles too
const STILL_TITLES: Record<number, [string[], string[]]> = { 3: [['THE'], ['DRIVE.']], 4: [['THE'], ['PEOPLE.']] };
export const WAYS = ['COMPETE', 'LECTURE', 'COACH'];

const BOX = { x: 70, y: 80, w: CW - 140, h: CH - 160 };

export function initWax() {
  if (T.wax.length) return;
  T.wax = [new Wax(11), new Wax(29)];
  cutNow(0, TITLES[0][0]!, 0);
  cutNow(1, TITLES[0][1]!, 1);
}

function cutJob(leaf: 0 | 1, lines: string[], key: string, box = BOX, cap = 250): Job {
  const { strokes, width } = layout(lines, box, cap, 0.125);
  return { k: 'cut', leaf, strokes, width, key, si: 0, pi: 0, along: 0, air: 0.5, speed: 1700, focus: true };
}

function cutNow(leaf: 0 | 1, lines: string[], _i: number, box = BOX, cap = 250) {
  const w = T.wax[leaf];
  const { strokes, width } = layout(lines, box, cap, 0.125);
  for (const s of strokes) for (let i = 1; i < s.length; i++) w.cut(s[i - 1][0], s[i - 1][1], s[i][0], s[i][1], width);
  w.key = lines.join('/');
}

const wayBox = (i: number) => ({ x: 90, y: 50 + i * ((CH - 100) / 3), w: CW - 180, h: (CH - 100) / 3 });

/** Plan the moves that take the tablet to this section. */
export function goTo(sec: number) {
  if (!T.wax.length) return;
  T.section = sec;
  T.job = null;
  T.jobs = [];
  T.ways = [false, false, false];
  if (still) {
    T.h = 1;
    const t = TITLES[sec] ?? STILL_TITLES[sec] ?? [null, null];
    for (const leaf of [0, 1] as const) {
      T.wax[leaf].clear();
      const lines = t[leaf];
      if (lines) cutNow(leaf, lines, leaf);
    }
    return;
  }
  const closed = sec === 3 || sec === 4;
  const jobs: Job[] = [];
  const dirty = (leaf: 0 | 1) => T.wax[leaf].key !== '' || T.wax[leaf].marked;
  if (closed) {
    for (const leaf of [0, 1] as const) if (dirty(leaf)) jobs.push({ k: 'sweep', leaf, t: -1 });
    jobs.push({ k: 'hinge', to: 0 });
  } else {
    if (T.h < 1) jobs.push({ k: 'hinge', to: 1 });
    const t = TITLES[sec] ?? [null, null];
    const want = (leaf: 0 | 1) => (t[leaf] ? t[leaf]!.join('/') : '');
    const sweep = ([0, 1] as const).filter((leaf) => (want(leaf) !== T.wax[leaf].key || T.wax[leaf].marked) && dirty(leaf) && !(sec === 5 && leaf === 1 && !T.wax[1].marked && T.wax[1].key === ''));
    for (const leaf of sweep) jobs.push({ k: 'sweep', leaf, t: -1 });
    for (const leaf of [0, 1] as const) {
      const lines = t[leaf];
      if (lines && (sweep.includes(leaf) || T.wax[leaf].key !== want(leaf))) jobs.push(cutJob(leaf, lines, want(leaf)));
    }
  }
  T.jobs = jobs;
  T.focus = 0;
}

/** Join: one way in cut per press. */
export function cutWay(i: number) {
  if (!T.wax.length || T.ways[i]) return;
  T.ways[i] = true;
  const near = T.wax[1];
  if (still) {
    if (near.key !== 'ways') { near.clear(); near.key = 'ways'; }
    cutNow(1, [WAYS[i]], 1, wayBox(i), 150);
    near.key = 'ways';
    return;
  }
  if (near.key !== 'ways' && (near.marked || near.key) && !T.jobs.some((j) => j.k === 'sweep' && j.leaf === 1)) T.jobs.push({ k: 'sweep', leaf: 1, t: -1 });
  const j = cutJob(1, [WAYS[i]], 'ways', wayBox(i), 150);
  if (j.k === 'cut') j.speed = 1500;
  T.jobs.push(j);
}

/** The end: smooth the wax blank. */
export function smoothAll() {
  if (!T.wax.length) return;
  if (still) { T.wax.forEach((w) => w.clear()); return; }
  for (const leaf of [0, 1] as const) if (!T.jobs.some((j) => j.k === 'sweep' && j.leaf === leaf)) T.jobs.push({ k: 'sweep', leaf, t: -1 });
}

/** Try to open the bound tablet: the cover lifts against the cord and drops. */
export function tug() {
  if (T.h < 0.05 && !T.job) T.tugV += still ? 0 : 5.5;
}

export const userCut = (leaf: 0 | 1, ax: number, ay: number, bx: number, by: number) => {
  const w = T.wax[leaf];
  if (!w) return;
  w.cut(ax, ay, bx, by, 19);
  w.marked = true;
};
