// Outlines, solids and collision hulls for everything that stands on the paper:
// Anton capitals for the word, the plaques and the two coaches, and the brand's
// Bodoni question mark. One world unit is a metre; a capital is two metres tall.
import * as THREE from 'three';
import GLYPHS from './glyphs.json';
import MARKS from '@/lib/marks.json';

export const CAP = 859.38;          // Anton's cap height at 1000 units per em
export const H = 2;                 // a capital, in metres
export const K = H / CAP;           // font units to metres
export const DEPTH = 0.58;          // how thick a letter of the word is
export const QH = 2.34;             // the question mark stands a little taller than the capitals
export const QK = QH / MARKS.italic.h;
export const QDOT = { x: -261.5 * QK, y: (770 - 589.5) * QK, r: 180.5 * QK };       // the dot, from the floor
export const QPIN = { x: -242 * QK, y0: QDOT.y + QDOT.r * 0.6, y1: (770 - 262) * QK + 0.06 };

type P2 = { x: number; y: number };
export type Outline = {
  /** Outer contours and the holes inside them, y up, in metres, centred on the box. */
  shapes: THREE.Shape[];
  /** Sampled outer contours, for collision hulls. */
  rings: P2[][];
  w: number; h: number;
  /** Advance width in metres (letters only). */
  adv: number;
};

/** A path's subpaths as sampled polygons (y flipped to point up), scaled by k. */
function subpaths(d: string, dx: number, k: number, quality: number): { path: THREE.Path; pts: P2[] }[] {
  const out: { path: THREE.Path; pts: P2[] }[] = [];
  let cur: THREE.Path | null = null;
  const X = (v: number) => (v - dx) * k, Y = (v: number) => -v * k;
  const re = /([MLQCZ])([^MLQCZ]*)/g;
  let m: RegExpExecArray | null;
  const close = () => { if (cur) { out.push({ path: cur, pts: [] }); cur = null; } };
  while ((m = re.exec(d))) {
    const n = (m[2].match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (m[1] === 'M') { close(); cur = new THREE.Path(); cur.moveTo(X(n[0]), Y(n[1])); }
    else if (m[1] === 'L' && cur) cur.lineTo(X(n[0]), Y(n[1]));
    else if (m[1] === 'Q' && cur) cur.quadraticCurveTo(X(n[0]), Y(n[1]), X(n[2]), Y(n[3]));
    else if (m[1] === 'C' && cur) cur.bezierCurveTo(X(n[0]), Y(n[1]), X(n[2]), Y(n[3]), X(n[4]), Y(n[5]));
    else if (m[1] === 'Z') close();
  }
  close();
  for (const s of out) {
    const raw = s.path.getPoints(quality);
    // Drop repeated points: they make zero-length edges that upset the bevel.
    s.pts = raw.filter((p, i) => i === 0 || p.distanceTo(raw[i - 1]) > 1e-5).map((p) => ({ x: p.x, y: p.y }));
    const a = s.pts[0], b = s.pts[s.pts.length - 1];
    if (s.pts.length > 2 && Math.hypot(a.x - b.x, a.y - b.y) < 1e-5) s.pts.pop();
  }
  return out.filter((s) => s.pts.length > 2);
}

const area = (p: P2[]) => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i].x * q.y - q.x * p[i].y; } return a / 2; };
const inside = (pt: P2, poly: P2[]) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
};

/** Sort subpaths into solids and holes by containment, and centre the lot on its box. */
function outline(d: string, dx: number, k: number, quality: number, adv = 0, pick?: (i: number) => boolean): Outline {
  let subs = subpaths(d, dx, k, quality);
  if (pick) subs = subs.filter((_, i) => pick(i));
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const s of subs) for (const p of s.pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  for (const s of subs) for (const p of s.pts) { p.x -= cx; p.y -= cy; }
  const order = subs.map((s, i) => ({ s, i, a: Math.abs(area(s.pts)) })).sort((a, b) => b.a - a.a);
  const solids: { pts: P2[]; holes: P2[][] }[] = [];
  for (const o of order) {
    const host = solids.find((S) => inside(o.s.pts[0], S.pts) && !S.holes.some((h) => inside(o.s.pts[0], h)));
    if (host) host.holes.push(o.s.pts); else solids.push({ pts: o.s.pts, holes: [] });
  }
  const v2 = (p: P2[]) => p.map((q) => new THREE.Vector2(q.x, q.y));
  const shapes = solids.map((S) => { const sh = new THREE.Shape(v2(S.pts)); sh.holes = S.holes.map((h) => new THREE.Path(v2(h))); return sh; });
  return { shapes, rings: solids.map((S) => S.pts), w: x1 - x0, h: y1 - y0, adv };
}

const glyph = (ch: string) => GLYPHS.glyphs.find((g) => g.ch === ch);

/** One Anton capital, `cap` metres tall. */
export function letter(ch: string, cap = H, quality = 7): Outline {
  const g = glyph(ch);
  if (!g) throw new Error('no outline for ' + ch);
  const k = cap / CAP;
  return outline(g.d, g.x, k, quality, g.advance * k);
}

/** The hook of the brand's question mark (its dot is a ball, made separately). */
export function hook(quality = 9): Outline & { cy: number } {
  const o = outline(MARKS.italic.d, 0, QK, quality, 0, (i) => i === 0);
  // The hook's own box is not the mark's: remember where its centre sits above the floor.
  return { ...o, cy: QH - o.h / 2 };
}

/** A solid letter: extruded, bevelled, centred on its own box. */
export function solid(o: Outline, depth: number, bevel = 0.034, segments = 3): THREE.ExtrudeGeometry {
  const g = new THREE.ExtrudeGeometry(o.shapes, {
    depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: segments, curveSegments: 1,
  });
  g.translate(0, 0, -depth / 2 + bevel);
  g.computeVertexNormals();
  return g;
}

/** Flat lettering (paint on a face or on the floor), set in Anton, centred on the origin. Returns the geometry and its width. */
export function lettering(text: string, cap: number, tracking = 0.04): { geometry: THREE.ShapeGeometry; width: number } {
  const k = cap / CAP;
  const shapes: THREE.Shape[] = [];
  let pen = 0;
  const placed: { o: Outline; x: number; y: number }[] = [];
  for (const ch of text.toUpperCase()) {
    const g = glyph(ch);
    if (!g) { pen += cap * 0.26; continue; }
    if (ch !== ' ' && g.d) {
      const o = outline(g.d, g.x, k, 5);
      // The outline is centred on its box; put it back where the pen is.
      const b = bounds(g.d, g.x, k);
      placed.push({ o, x: pen + b.cx, y: b.cy });
    }
    pen += g.advance * k + cap * tracking;
  }
  const width = pen - cap * tracking;
  for (const p of placed) for (const s of p.o.shapes) {
    const move = (pts: THREE.Vector2[]) => pts.map((q) => new THREE.Vector2(q.x + p.x - width / 2, q.y + p.y - cap / 2));
    const sh = new THREE.Shape(move(s.getPoints()));
    sh.holes = s.holes.map((h) => new THREE.Path(move(h.getPoints())));
    shapes.push(sh);
  }
  return { geometry: new THREE.ShapeGeometry(shapes, 1), width };
}

function bounds(d: string, dx: number, k: number) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const s of subpaths(d, dx, k, 3)) for (const p of s.pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

/** Convex hull of 2D points (monotone chain). */
function hull2(pts: P2[]): P2[] {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const cross = (o: P2, a: P2, b: P2) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo: P2[] = [], up: P2[] = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

/** Clip a polygon to the band y0..y1 (Sutherland and Hodgman; good enough to take a hull from). */
function band(poly: P2[], y0: number, y1: number): P2[] {
  const cut = (inp: P2[], keep: (p: P2) => boolean, y: number) => {
    const out: P2[] = [];
    for (let i = 0; i < inp.length; i++) {
      const a = inp[i], b = inp[(i + 1) % inp.length], ka = keep(a), kb = keep(b);
      if (ka) out.push(a);
      if (ka !== kb) { const t = (y - a.y) / (b.y - a.y); out.push({ x: a.x + (b.x - a.x) * t, y }); }
    }
    return out;
  };
  return cut(cut(poly, (p) => p.y >= y0, y0), (p) => p.y <= y1, y1);
}

/**
 * Collision for a letter: the outline cut into horizontal bands, one convex
 * hull per band, each as the points of a prism `depth` thick. A T keeps its
 * overhang and an L its empty corner, which one hull around the lot would fill.
 */
export function hulls(o: Outline, depth: number, bands = 5, skin = 0.004): Float32Array[] {
  const out: Float32Array[] = [];
  const y0 = -o.h / 2, step = o.h / bands;
  for (let i = 0; i < bands; i++) {
    const pts: P2[] = [];
    for (const r of o.rings) pts.push(...band(r, y0 + i * step - 1e-4, y0 + (i + 1) * step + 1e-4));
    if (pts.length < 3) continue;
    let h = hull2(pts);
    if (h.length < 3) continue;
    // Thin the hull out: a curve sampled every few centimetres is more than a contact solver wants.
    while (h.length > 14) h = h.filter((_, j) => j % 2 === 0);
    const arr = new Float32Array(h.length * 6);
    h.forEach((p, j) => { arr.set([p.x, p.y, depth / 2 - skin, p.x, p.y, -depth / 2 + skin], j * 6); });
    out.push(arr);
  }
  return out;
}

/** A small tiling noise texture, for orange peel on lacquer, tooth on paper and grain on steel. */
export function noiseTexture(size: number, draw: (g: CanvasRenderingContext2D, rnd: () => number, size: number) => void, repeat = 1): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!;
  let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  draw(g, rnd, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 4;
  return t;
}
