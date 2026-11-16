// Version 34's sculpture, built backwards from its shadow.
// A question mark is drawn on the wall, cut into seven bent bars and a dot,
// and every point of every bar is pushed out along its own ray toward the
// spotlight, each bar to a different depth. From the light, every bar lands
// back on its own part of the mark, so at one angle the shadow is exact.
// From anywhere else it is a tangle.
import * as THREE from 'three';

/** The spotlight, the centre of the mark on the wall (z = 0), and the mark's scale. */
export const LIGHT = new THREE.Vector3(-7.5, 2.6, 10.5);
export const WALL = new THREE.Vector3(0.9, 3.3, 0);
export const SCALE = 1.55;
const THICK = 0.22;

// The mark's spine, in mark units (about 2.8 tall), and its stroke width along it.
const SPINE: [number, number][] = [
  [-0.74, 0.84], [-0.6, 1.17], [-0.3, 1.39], [0.06, 1.46], [0.42, 1.36], [0.7, 1.1],
  [0.8, 0.74], [0.7, 0.38], [0.44, 0.1], [0.16, -0.12], [0.05, -0.34], [0.04, -0.66],
];
const WT = [0, 0.1, 0.26, 0.42, 0.53, 0.64, 0.76, 0.86, 1];
const WW = [0.075, 0.075, 0.12, 0.3, 0.37, 0.32, 0.2, 0.15, 0.13];
const BALL = { x: -0.66, y: 0.74, r: 0.25 };
const DOT = { x: 0.045, y: -1.1, r: 0.215 };
/** Where the spine is cut into seven bars. */
const CUTS = [0, 0.17, 0.31, 0.45, 0.58, 0.7, 0.84, 1];
const LAP = 0.014;

/** How far out along its ray each piece sits, and how it bends through depth (7 bars, then the dot). */
const DEPTH = [6.55, 7.95, 6.85, 8.35, 6.4, 7.55, 6.95, 7.25];
const BEND: [number, number][] = [[0.7, -0.5], [-0.8, 0.6], [0.55, 0.9], [-0.6, -0.7], [0.9, 0.4], [-0.5, 0.85], [0.6, -0.6], [0, 0]];

const spine = new THREE.CatmullRomCurve3(SPINE.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal');

function widthAt(t: number) {
  for (let i = 1; i < WT.length; i++) if (t <= WT[i]) { const k = (t - WT[i - 1]) / (WT[i] - WT[i - 1]); const s = k * k * (3 - 2 * k); return WW[i - 1] + (WW[i] - WW[i - 1]) * s; }
  return WW[WW.length - 1];
}

/** The outline of the stroke between two points of the spine. */
function barShape(t0: number, t1: number) {
  const n = Math.max(8, Math.round((t1 - t0) * 120));
  const L: THREE.Vector2[] = [], R: THREE.Vector2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = Math.min(1, Math.max(0, t0 + ((t1 - t0) * i) / n));
    const p = spine.getPointAt(t), d = spine.getTangentAt(t), w = widthAt(t) / 2;
    L.push(new THREE.Vector2(p.x - d.y * w, p.y + d.x * w));
    R.push(new THREE.Vector2(p.x + d.y * w, p.y - d.x * w));
  }
  return new THREE.Shape([...L, ...R.reverse()]);
}

function disc(c: { x: number; y: number; r: number }) {
  const s = new THREE.Shape(); s.absarc(c.x, c.y, c.r, 0, Math.PI * 2, false); return s;
}

/** The flat mark, as 2D shapes, for the page without WebGL and for the dot's outline. */
export function markShapes() {
  return [barShape(0, 1), disc(BALL), disc(DOT)];
}

/** A point of the mark (mark units) pushed out d along its ray toward the light, in world space. */
export function lift(x: number, y: number, d: number, out = new THREE.Vector3()) {
  out.set(WALL.x + x * SCALE, WALL.y + y * SCALE, 0);
  const dir = LIGHT.clone().sub(out).normalize();
  return out.addScaledVector(dir, d);
}

const depthOf = (i: number, x: number, y: number, c: THREE.Vector2) => DEPTH[i] + BEND[i][0] * (x - c.x) + BEND[i][1] * (y - c.y);

export type Piece = { geo: THREE.BufferGeometry; i: number };
export type Rod = { a: THREE.Vector3; b: THREE.Vector3; r: number; shadow: boolean };

export function buildSculpture() {
  const pieces: Piece[] = [];
  const centres: THREE.Vector2[] = [];
  const shapes: THREE.Shape[][] = [];
  for (let i = 0; i < 7; i++) {
    const t0 = Math.max(0, CUTS[i] - (i ? LAP : 0)), t1 = Math.min(1, CUTS[i + 1] + LAP);
    const s = [barShape(t0, t1)];
    if (i === 0) s.push(disc(BALL));
    shapes.push(s);
    const m = spine.getPointAt((CUTS[i] + CUTS[i + 1]) / 2);
    centres.push(new THREE.Vector2(m.x, m.y));
  }
  shapes.push([disc(DOT)]);
  centres.push(new THREE.Vector2(DOT.x, DOT.y));

  shapes.forEach((s, i) => {
    let g: THREE.BufferGeometry = new THREE.ExtrudeGeometry(s, { depth: THICK, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.012, bevelSegments: 3, curveSegments: 40, steps: 1 });
    g.deleteAttribute('uv'); g.deleteAttribute('normal');
    const pos = g.getAttribute('position') as THREE.BufferAttribute, v = new THREE.Vector3();
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
      lift(x, y, depthOf(i, x, y, centres[i]) + z, v);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
    g = mergeClose(g);
    g.computeVertexNormals();
    pieces.push({ geo: g, i });
  });

  // Each bar meets the next where they overlap on the wall: a pin along the ray joins them, and casts only a point.
  const rods: Rod[] = [];
  for (let i = 0; i < 6; i++) {
    const p = spine.getPointAt(CUTS[i + 1]);
    const a = lift(p.x, p.y, depthOf(i, p.x, p.y, centres[i]) + THICK / 2);
    const b = lift(p.x, p.y, depthOf(i + 1, p.x, p.y, centres[i + 1]) + THICK / 2);
    rods.push({ a, b, r: 0.022, shadow: true });
  }
  const box = new THREE.Box3();
  pieces.forEach((p) => { p.geo.computeBoundingBox(); box.union(p.geo.boundingBox!); });
  const centre = box.getCenter(new THREE.Vector3());
  // The armature: a post from the plinth to a hub, and stays to the stem and the dot. They cast nothing.
  const hub = new THREE.Vector3(centre.x, box.min.y + 0.55, centre.z);
  const stem = spine.getPointAt(0.93);
  rods.push({ a: hub.clone(), b: lift(stem.x, stem.y, depthOf(6, stem.x, stem.y, centres[6]) + THICK / 2), r: 0.016, shadow: false });
  rods.push({ a: hub.clone(), b: lift(DOT.x, DOT.y, DEPTH[7] + THICK / 2), r: 0.016, shadow: false });
  const top = box.min.y - 0.42;
  rods.push({ a: new THREE.Vector3(centre.x, top, centre.z), b: hub.clone(), r: 0.03, shadow: false });
  return { pieces, rods, centre, box, top };
}

/** Weld the bevel's duplicate vertices so the normals come out smooth, keeping hard edges where faces meet sharply. */
function mergeClose(g: THREE.BufferGeometry) {
  const pos = g.getAttribute('position');
  const idx: number[] = [], map = new Map<string, number>(), out: number[] = [];
  const nrm: THREE.Vector3[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    nrm.push(new THREE.Vector3().subVectors(c, b).cross(new THREE.Vector3().subVectors(a, b)).normalize());
  }
  // Key by position and by a coarse normal bucket so corners stay crisp while curved sides smooth out.
  for (let i = 0; i < pos.count; i++) {
    const n = nrm[Math.floor(i / 3)];
    const key = `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)},${Math.round(n.x * 1.6)},${Math.round(n.y * 1.6)},${Math.round(n.z * 1.6)}`;
    let j = map.get(key);
    if (j === undefined) { j = out.length / 3; map.set(key, j); out.push(pos.getX(i), pos.getY(i), pos.getZ(i)); }
    idx.push(j);
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  m.setIndex(idx);
  return m;
}
