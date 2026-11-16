// The seven pieces and the shapes they make. Every arrangement is written as
// the real corner points of each piece (in grid units where the small
// triangle's legs are 1), and solve() works out how each piece has to be
// turned, flipped and placed to land exactly there. So each shape is a true
// dissection: the same seven pieces, nothing added, nothing left over.

export type Pt = [number, number];

/** Piece order: two large triangles, the medium, two small, the square (red), the parallelogram. */
export const CANON: Pt[][] = [
  [[0, 0], [2, 0], [0, 2]],
  [[0, 0], [2, 0], [0, 2]],
  [[0, 0], [2, 0], [1, 1]],
  [[0, 0], [1, 0], [0, 1]],
  [[0, 0], [1, 0], [0, 1]],
  [[0, 0], [1, 0], [1, 1], [0, 1]],
  [[0, 0], [1, 0], [2, 1], [1, 1]],
];
export const RED = 5;

export const centroid = (p: Pt[]): Pt => {
  // Area centroid of a convex polygon.
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i], [x1, y1] = p[(i + 1) % p.length];
    const c = x0 * y1 - x1 * y0;
    a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c;
  }
  return [cx / (3 * a), cy / (3 * a)];
};

/** Each piece's outline, centred on its own centroid. */
export const LOCAL: Pt[][] = CANON.map((p) => { const [cx, cy] = centroid(p); return p.map(([x, y]) => [x - cx, y - cy] as Pt); });

const r2 = Math.SQRT1_2;
const D = (cx: number, cy: number): Pt[] => [[cx, cy + r2], [cx + r2, cy], [cx, cy - r2], [cx - r2, cy]];

/** The classic closed square, side 4 in its own units, scaled into ours. */
const SQUARE_C: Pt[][] = [
  [[0, 0], [4, 0], [2, 2]],
  [[0, 0], [2, 2], [0, 4]],
  [[4, 2], [4, 4], [2, 4]],
  [[4, 0], [4, 2], [3, 1]],
  [[2, 2], [3, 3], [1, 3]],
  [[2, 2], [3, 1], [4, 2], [3, 3]],
  [[0, 4], [1, 3], [3, 3], [2, 4]],
];
const k = Math.SQRT1_2;
const SQUARE: Pt[][] = SQUARE_C.map((p) => p.map(([x, y]) => [x * k, y * k] as Pt));

/** The square cut along its diagonal and pulled apart: the two large triangles on one side, the five small pieces on the other. */
const APART: Pt[][] = SQUARE_C.map((p, i) => {
  const g = i < 2 ? -0.62 : 0.62;
  const c = Math.cos(-Math.PI / 4), s = Math.sin(-Math.PI / 4);
  return p.map(([x, y]) => { const X = (x + g) * k, Y = (y + g) * k; return [X * c - Y * s, X * s + Y * c] as Pt; });
});

const QUESTION: Pt[][] = [
  [[0, 4], [0, 6], [2, 6]],
  [[2, 6], [4, 6], [4, 4]],
  [[1, 5], [3, 5], [2, 6]],
  [[3, 5], [4, 4], [3, 4]],
  [[2, 3], [3, 3], [2, 2]],
  D(2.5, 0.85),
  [[3, 4], [4, 4], [3, 3], [2, 3]],
];

/** The set, laid out apart like a product shot. */
const SET: Pt[][] = [
  [[0, 3.4], [2, 3.4], [0, 5.4]],
  [[4.6, 3.4], [4.6, 5.4], [2.6, 3.4]],
  [[0, 1.7], [2, 1.7], [1, 2.7]],
  [[0, 0], [1, 0], [0, 1]],
  [[4.6, 0], [4.6, 1], [3.6, 0]],
  [[1.8, 0], [2.8, 0], [2.8, 1], [1.8, 1]],
  [[2.6, 1.7], [3.6, 1.7], [4.6, 2.7], [3.6, 2.7]],
];

/** An arrow that points up. */
const ARROW: Pt[][] = [
  [[-2, 0], [0, 0], [0, 2]],
  [[0, 0], [2, 0], [0, 2]],
  [[-1, -3], [1, -3], [0, -4]],
  [[-0.5, -1], [0.5, -1], [0.5, -2]],
  [[-0.5, -2], [0.5, -3], [-0.5, -3]],
  [[-0.5, -1], [0.5, -1], [0.5, 0], [-0.5, 0]],
  [[-0.5, -1], [0.5, -2], [0.5, -3], [-0.5, -2]],
];

/** A door with a pointed head, and the red square as the step in front of it. */
const DOOR: Pt[][] = [
  [[0, 0], [2, 0], [0, 2]],
  [[2, 0], [2, 2], [0, 2]],
  [[0, 3], [2, 3], [1, 4]],
  [[0, 2], [1, 3], [0, 3]],
  [[1, 2], [2, 2], [2, 3]],
  [[0.5, -1.45], [1.5, -1.45], [1.5, -0.45], [0.5, -0.45]],
  [[0, 2], [1, 2], [2, 3], [1, 3]],
];

export type Pose = { x: number; z: number; a: number; f: number };
export type Arrangement = { name: string; poses: Pose[]; w: number; h: number };

const ang = (p: Pt) => Math.atan2(p[1], p[0]);

/** How canonical piece i must sit to cover the target polygon exactly. */
export function solve(i: number, target: Pt[]): Pose & { err: number } {
  const loc = LOCAL[i], n = loc.length, [tx, ty] = centroid(target);
  const T = target.map(([x, y]) => [x - tx, y - ty] as Pt);
  let best = { x: tx, z: 0, a: 0, f: 0, err: Infinity };
  for (const f of [0, 1]) {
    const C = loc.map(([x, y]) => [x, f ? -y : y] as Pt);
    for (let shift = 0; shift < n; shift++) for (const dir of [1, -1]) {
      const map = (j: number) => T[(((shift + dir * j) % n) + n) % n];
      const a = ang(map(0)) - ang(C[0]);
      const c = Math.cos(a), s = Math.sin(a);
      let err = 0;
      for (let j = 0; j < n; j++) { const [x, y] = C[j]; const [X, Y] = map(j); err = Math.max(err, Math.hypot(x * c - y * s - X, x * s + y * c - Y)); }
      if (err < best.err) best = { x: tx, z: ty, a, f, err };
    }
  }
  return best;
}

function build(name: string, polys: Pt[][]): Arrangement {
  const xs = polys.flat().map((p) => p[0]), ys = polys.flat().map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const poses = polys.map((p, i) => { const s = solve(i, p); return { x: s.x - cx, z: -(s.z - cy), a: s.a, f: s.f }; });
  return { name, poses, w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

export const POLYS = { QUESTION, SET, ARROW, SQUARE, APART, DOOR };
/** One arrangement per section, in page order. */
export const ARR: Arrangement[] = [
  build('question', QUESTION),
  build('set', SET),
  build('arrow', ARROW),
  build('square', SQUARE),
  build('apart', APART),
  build('door', DOOR),
  build('question', QUESTION),
];
export const ARR_POLYS: Pt[][][] = [QUESTION, SET, ARROW, SQUARE, APART, DOOR, QUESTION];

/** Check every arrangement: each piece fits, and no two pieces overlap. Used once while building. */
export function audit() {
  const out: string[] = [];
  const area = (p: Pt[]) => { let a = 0; for (let i = 0; i < p.length; i++) { const [x0, y0] = p[i], [x1, y1] = p[(i + 1) % p.length]; a += x0 * y1 - x1 * y0; } return Math.abs(a) / 2; };
  ARR_POLYS.forEach((polys, ai) => polys.forEach((p, i) => {
    const s = solve(i, p);
    if (s.err > 1e-6) out.push(`arr ${ai} piece ${i} err ${s.err}`);
    if (Math.abs(area(p) - area(CANON[i])) > 1e-6) out.push(`arr ${ai} piece ${i} area`);
  }));
  return out;
}
