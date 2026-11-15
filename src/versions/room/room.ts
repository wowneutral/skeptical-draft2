// The room as data: every object is a set of parts, every part a list of
// line segments (subdivided so the pen can draw them on) and the solid boxes
// that hide what is behind them. Units are grid squares ("sk"), not metres.
export type V = [number, number, number];
export type Weight = 'thick' | 'thin' | 'dim' | 'chain';
export type Part = { w: Weight; segs: number[]; fills: { s: V; p: V }[]; ex: V };
export type Obj = { id: string; pos: V; rot: number; pen: 0 | 1 | 2; parts: Part[]; click?: 'explode' | 'rattle'; anchors: V[] };

const STEP = 0.11;

class Pen {
  segs: number[] = [];
  fills: { s: V; p: V }[] = [];
  seg(a: V, b: V) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const n = Math.max(1, Math.ceil(L / STEP));
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      this.segs.push(a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0, a[2] + (b[2] - a[2]) * t0, a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1, a[2] + (b[2] - a[2]) * t1);
    }
    return this;
  }
  poly(pts: V[], closed = false) {
    for (let i = 0; i < pts.length - 1; i++) this.seg(pts[i], pts[i + 1]);
    if (closed) this.seg(pts[pts.length - 1], pts[0]);
    return this;
  }
  box(w: number, h: number, d: number, c: V, fill = true) {
    const [x, y, z] = c, a = w / 2, b = h / 2, e = d / 2;
    const P = (i: number, j: number, k: number): V => [x + i * a, y + j * b, z + k * e];
    // bottom ring, top ring, uprights: in drawing order
    this.poly([P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1)], true);
    for (const [i, k] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) this.seg(P(i, -1, k), P(i, 1, k));
    this.poly([P(-1, 1, -1), P(1, 1, -1), P(1, 1, 1), P(-1, 1, 1)], true);
    if (fill) this.fills.push({ s: [w, h, d], p: c });
    return this;
  }
  arc(c: V, r: number, a0: number, a1: number, plane: 'xz' | 'xy' = 'xz', n = 28) {
    const pts: V[] = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * (i / n);
      pts.push(plane === 'xz' ? [c[0] + Math.cos(a) * r, c[1], c[2] + Math.sin(a) * r] : [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, c[2]]);
    }
    return this.poly(pts);
  }
  /** Diagonal hatch over a rectangle in a plane (u along one axis, v along another). */
  hatch(origin: V, u: V, v: V, lu: number, lv: number, gap = 0.09) {
    const at = (s: number, t: number): V => [origin[0] + u[0] * s + v[0] * t, origin[1] + u[1] * s + v[1] * t, origin[2] + u[2] * s + v[2] * t];
    for (let k = gap; k < lu + lv; k += gap) {
      const s0 = Math.max(0, k - lv), s1 = Math.min(lu, k);
      this.seg(at(s0, k - s0), at(s1, k - s1));
    }
    return this;
  }
  part(w: Weight, ex: V = [0, 0, 0]): Part {
    const p = { w, segs: this.segs, fills: this.fills, ex };
    this.segs = []; this.fills = [];
    return p;
  }
}

function chair(p: Pen, z: number, face: 1 | -1, ex: V, x = 0): Part[] {
  // face 1: the sitter looks toward -z (back at +z side)
  const s = face;
  const legs = new Pen();
  for (const [i, k] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) legs.seg([x + i * 0.2, 0, z + k * 0.2], [x + i * 0.2, 0.43, z + k * 0.2]);
  legs.seg([x - 0.2, 0.43, z + s * 0.2], [x - 0.2, 0.92, z + s * 0.22]).seg([x + 0.2, 0.43, z + s * 0.2], [x + 0.2, 0.92, z + s * 0.22]);
  const out: Part[] = [legs.part('thin', [ex[0], ex[1] * 0.2, ex[2] * 0.6])];
  p.box(0.46, 0.04, 0.46, [x, 0.45, z]);
  out.push(p.part('thin', [ex[0], ex[1] + 0.25, ex[2] * 0.8]));
  p.box(0.46, 0.3, 0.035, [x, 0.76, z + s * 0.215]);
  out.push(p.part('thin', [ex[0], ex[1] + 0.55, ex[2] * 1.3]));
  return out;
}

function desk(): Part[] {
  const p = new Pen();
  const parts: Part[] = [];
  p.box(1.3, 0.05, 0.62, [0, 0.725, 0]);
  // a flow sheet and a pen on the desk
  p.poly([[-0.5, 0.752, -0.2], [-0.05, 0.752, -0.2], [-0.05, 0.752, 0.2], [-0.5, 0.752, 0.2]], true);
  for (let i = 1; i < 4; i++) p.seg([-0.5 + i * 0.1125, 0.752, -0.2], [-0.5 + i * 0.1125, 0.752, 0.2]);
  p.seg([0.12, 0.752, 0.05], [0.42, 0.752, -0.08]);
  parts.push(p.part('thin', [0, 0.55, 0]));
  for (const [i, k] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    p.box(0.05, 0.7, 0.05, [i * 0.6, 0.35, k * 0.26]);
    parts.push(p.part('thin', [i * 0.45, -0.02, k * 0.4]));
  }
  p.box(1.15, 0.28, 0.02, [0, 0.52, -0.27]);
  parts.push(p.part('thin', [0, 0.18, -0.55]));
  parts.push(...chair(p, 0.68, 1, [0, 0, 0.9]));
  return parts;
}

function judge(): Part[] {
  const p = new Pen();
  const parts: Part[] = [];
  p.box(1.9, 0.05, 0.8, [0, 0.725, 0]);
  parts.push(p.part('thin', [0, 0.45, 0]));
  for (const [i, k] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    p.box(0.06, 0.7, 0.06, [i * 0.88, 0.35, k * 0.34]);
    parts.push(p.part('thin', [i * 0.5, -0.02, k * 0.4]));
  }
  // three sheets on the table: the three ways in
  [-0.55, 0, 0.55].forEach((x, i) => {
    const a = (i - 1) * 0.12, w = 0.3, d = 0.42, y = 0.754 + i * 0.002;
    const c = Math.cos(a), s = Math.sin(a);
    const R = (u: number, v: number): V => [x + u * c - v * s, y, 0.08 + u * s + v * c];
    p.poly([R(-w / 2, -d / 2), R(w / 2, -d / 2), R(w / 2, d / 2), R(-w / 2, d / 2)], true);
    p.seg(R(-0.1, -0.14), R(0.08, -0.14));
    for (let k = 0; k < 4; k++) p.seg(R(-0.1, -0.06 + k * 0.055), R(0.11 - (k % 2) * 0.05, -0.06 + k * 0.055));
    parts.push(p.part('thin', [(i - 1) * 0.55, 0.75 + (i === 1 ? 0.15 : 0), 0.35]));
  });
  parts.push(...chair(p, -0.68, -1, [0, 0, -0.9]));
  return parts;
}

function lectern(): Part[] {
  const p = new Pen();
  p.box(0.62, 0.06, 0.5, [0, 0.03, 0]);
  const a = p.part('thin', [0, -0.05, 0]);
  p.box(0.3, 0.92, 0.24, [0, 0.52, 0]);
  const b = p.part('thin', [0, 0.1, 0.3]);
  const T: V[] = [[-0.32, 1.13, -0.24], [0.32, 1.13, -0.24], [0.32, 0.98, 0.24], [-0.32, 0.98, 0.24]];
  p.poly(T, true).poly(T.map((v) => [v[0], v[1] - 0.05, v[2]] as V), true);
  for (const v of T) p.seg(v, [v[0], v[1] - 0.05, v[2]]);
  p.seg([0.32, 0.98, 0.24], [0.32, 0.93, 0.26]).seg([-0.32, 0.98, 0.24], [-0.32, 0.93, 0.26]);
  p.fills.push({ s: [0.62, 0.12, 0.46], p: [0, 1.0, 0] });
  const c = p.part('thin', [0, 0.5, 0.1]);
  return [a, b, c];
}

function door(): Part[] {
  // local: wall plane z=0, opening x -0.5..0.5, swing toward -z (into the room)
  const p = new Pen();
  for (const x of [-0.5, 0.5]) p.seg([x, 0, -0.1], [x, 0.9, -0.1]).seg([x, 0, 0.1], [x, 0.9, 0.1]);
  const jambs = p.part('thick');
  // above the cut plane: dashed by convention
  for (const x of [-0.5, 0.5]) p.seg([x, 0.9, -0.1], [x, 2.1, -0.1]).seg([x, 0.9, 0.1], [x, 2.1, 0.1]);
  p.seg([-0.5, 2.1, -0.1], [0.5, 2.1, -0.1]).seg([-0.5, 2.1, 0.1], [0.5, 2.1, 0.1]);
  const head = p.part('chain', [0, 0.4, 0]);
  const open = (75 * Math.PI) / 180;
  const hx = 0.5, hz = -0.1;
  const dx = -Math.cos(open), dz = -Math.sin(open);
  const L: V[] = [[hx, 0, hz], [hx + dx, 0, hz + dz], [hx + dx, 2.05, hz + dz], [hx, 2.05, hz]];
  p.poly(L, true);
  p.seg([hx + dx * 0.88, 1.0, hz + dz * 0.88], [hx + dx * 0.88, 1.1, hz + dz * 0.88]);
  const leaf = p.part('thin', [-0.3, 0, -0.5]);
  p.arc([hx, 0.002, hz], 1, Math.PI, Math.PI + open);
  const swing = p.part('dim');
  return [jambs, head, leaf, swing];
}

function frame(): Part[] {
  const p = new Pen();
  const R = (w: number, h: number, z = 0): V[] => [[-w / 2, -h / 2, z], [w / 2, -h / 2, z], [w / 2, h / 2, z], [-w / 2, h / 2, z]];
  p.poly(R(1.4, 1.05), true).poly(R(1.24, 0.89, 0.02), true);
  for (const [a, b] of [[0, 0], [1, 1], [2, 2], [3, 3]]) p.seg(R(1.4, 1.05)[a], R(1.24, 0.89, 0.02)[b]);
  const fr = p.part('thin', [0, 0, 0.25]);
  p.poly(R(1.0, 0.72, 0.03), true);
  p.seg([-0.4, 0.26, 0.03], [0.1, 0.26, 0.03]);
  for (const y of [0.06, -0.18]) {
    p.seg([-0.4, y, 0.03], [0.3, y, 0.03]).seg([-0.4, y - 0.07, 0.03], [0.05, y - 0.07, 0.03]);
  }
  const sheet = p.part('thin', [0, 0.05, 0.7]);
  return [fr, sheet];
}

function cabinet(): Part[] {
  // local: front faces +x, centred on z, sits on the floor
  const p = new Pen();
  p.box(0.6, 1.5, 1.0, [0, 0.75, 0]);
  p.hatch([-0.3, 0, 0.5], [1, 0, 0], [0, 1, 0], 0.6, 1.5, 0.075);
  p.hatch([-0.3, 1.5, -0.5], [1, 0, 0], [0, 0, 1], 0.6, 1.0, 0.075);
  const body = p.part('thin', [0, 0, 0]);
  const fx = 0.302;
  for (let k = 0; k < 7; k++) {
    const y0 = 0.06 + k * 0.198, y1 = y0 + 0.18;
    p.poly([[fx, y0, -0.45], [fx, y0, 0.45], [fx, y1, 0.45], [fx, y1, -0.45]], true);
    p.seg([fx + 0.01, (y0 + y1) / 2, -0.14], [fx + 0.01, (y0 + y1) / 2, 0.04]);
  }
  const drawers = p.part('thin', [0, 0, 0]);
  // the lock bar across every drawer and the padlock at the top
  p.seg([fx + 0.03, 0.04, 0.33], [fx + 0.03, 1.46, 0.33]).seg([fx + 0.03, 0.04, 0.37], [fx + 0.03, 1.46, 0.37]);
  p.poly([[fx + 0.04, 1.22, 0.25], [fx + 0.04, 1.22, 0.45], [fx + 0.04, 1.36, 0.45], [fx + 0.04, 1.36, 0.25]], true);
  const sh: V[] = [];
  for (let i = 0; i <= 14; i++) { const a = Math.PI * (i / 14); sh.push([fx + 0.04, 1.36 + Math.sin(a) * 0.08, 0.35 + Math.cos(a) * 0.07]); }
  p.poly(sh);
  const lock = p.part('dim', [0, 0, 0]);
  return [body, drawers, lock];
}

function walls(): Part[] {
  const p = new Pen();
  p.box(10.2, 2.6, 0.2, [0, 1.3, -3.5]);
  p.box(0.2, 2.6, 7.2, [-5, 1.3, 0]);
  const tall = p.part('thick');
  p.box(8.0, 0.9, 0.2, [-1.1, 0.45, 3.5]);
  p.box(1.2, 0.9, 0.2, [4.5, 0.45, 3.5]);
  p.box(0.2, 0.9, 6.8, [5, 0.45, 0]);
  const low = p.part('thick');
  // poché: the hatch where the cut plane passes through the low walls
  for (let x = -5.0; x < 2.85; x += 0.16) p.seg([x, 0.9, 3.6], [Math.min(2.9, x + 0.2), 0.9, 3.4]);
  for (let x = 3.95; x < 5.0; x += 0.16) p.seg([x, 0.9, 3.6], [Math.min(5.1, x + 0.2), 0.9, 3.4]);
  for (let z = -3.3; z < 3.3; z += 0.16) p.seg([4.9, 0.9, z], [5.1, 0.9, Math.min(3.4, z + 0.2)]);
  const poche = p.part('thin');
  // a whiteboard and the clock that is not there
  p.poly([[-2.0, 1.0, -3.39], [1.0, 1.0, -3.39], [1.0, 2.1, -3.39], [-2.0, 2.1, -3.39]], true);
  p.seg([-1.9, 0.96, -3.33], [0.9, 0.96, -3.33]);
  p.seg([-4.89, 0.1, -3.39], [4.89, 0.1, -3.39]).seg([-4.89, 0.1, -3.39], [-4.89, 0.1, 3.39]);
  const board = p.part('thin');
  p.arc([0.7, 2.35, -3.38], 0.16, 0, Math.PI * 2, 'xy', 24);
  const clock = p.part('chain');
  return [tall, low, poche, board, clock];
}

function dims(): Part[] {
  const p = new Pen();
  const tick = (x: number, z: number) => p.seg([x - 0.1, 0, z + 0.1], [x + 0.1, 0, z - 0.1]);
  p.seg([-5.1, 0, 4.4], [5.1, 0, 4.4]);
  for (const x of [-5.1, -1.1, 2.9, 3.9, 5.1]) { p.seg([x, 0, 3.75], [x, 0, 4.55]); tick(x, 4.4); }
  p.seg([6.0, 0, -3.6], [6.0, 0, 3.6]);
  for (const z of [-3.6, -2.3, 0.9, 3.6]) { p.seg([5.25, 0, z], [6.15, 0, z]); p.seg([5.9, 0, z + 0.1], [6.1, 0, z - 0.1]); }
  const d = p.part('dim');
  // the section line A, chain dashed, with its arrows
  p.seg([-6.2, 0.002, 0.9], [6.6, 0.002, 0.9]);
  const cut = p.part('chain');
  for (const x of [-6.2, 6.6]) { p.poly([[x, 0, 0.9], [x, 0, 0.5], [x + (x < 0 ? 0.25 : -0.25), 0, 0.68]]); p.arc([x, 0, 1.25], 0.3, 0, Math.PI * 2, 'xz', 24); }
  const marks = p.part('dim');
  return [d, cut, marks];
}

function gallery(): Part[] {
  const p = new Pen();
  const out: Part[] = [];
  for (let i = 0; i < 8; i++) out.push(...chair(p, 0, 1, [(i - 3.5) * 0.18, 0.15, 0.35], -2.8 + i * 0.8));
  return out;
}

function threeDoors(): Part[] {
  // drawn in at the end: three openings swung into the walls (world coords)
  const p = new Pen();
  const parts: Part[] = [];
  const mk = (h: V, a0: number, a1: number, leaf: V) => {
    p.arc(h, 0.95, a0, a1, 'xz', 30);
    p.seg(h, leaf).seg([h[0], 0, h[2]], [h[0], 2.05, h[2]]).seg([leaf[0], 0, leaf[2]], [leaf[0], 2.05, leaf[2]]).seg([h[0], 2.05, h[2]], [leaf[0], 2.05, leaf[2]]);
    parts.push(p.part('dim'));
  };
  // Compete: left wall, hinge at z 0.2, swings into the room
  mk([-4.9, 0.004, 0.2], Math.PI / 2, 0, [-3.95, 0.004, 0.2]);
  // Lecture: back wall, hinge at x -2.9
  mk([-3.45, 0.004, -3.4], 0, Math.PI / 2, [-3.45, 0.004, -2.45]);
  // Coach: right wall, hinge at z -1.6
  mk([4.9, 0.004, -1.6], -Math.PI / 2, -Math.PI, [4.9, 0.004, -0.65]);
  return parts;
}

export const OBJS: Obj[] = [
  { id: 'walls', pos: [0, 0, 0], rot: 0, pen: 0, parts: walls(), anchors: [[0, 1.3, -3.4]] },
  { id: 'dims', pos: [0, 0, 0], rot: 0, pen: 0, parts: dims(), anchors: [[0, 0, 0]] },
  { id: 'door', pos: [3.4, 0, 3.5], rot: 0, pen: 0, parts: door(), click: 'explode', anchors: [[-0.1, 1.5, 0]] },
  { id: 'frame', pos: [2.85, 1.45, -3.38], rot: 0, pen: 1, parts: frame(), click: 'explode', anchors: [[-0.5, 0.0, 0.05]] },
  { id: 'aff', pos: [-2.0, 0, 0.6], rot: 0, pen: 1, parts: desk(), click: 'explode', anchors: [[0, 0.76, 0]] },
  { id: 'neg', pos: [2.0, 0, 0.6], rot: 0, pen: 1, parts: desk(), click: 'explode', anchors: [[0, 0.76, 0]] },
  { id: 'lectern', pos: [0, 0, 0.35], rot: 0, pen: 1, parts: lectern(), click: 'explode', anchors: [[0, 1.05, 0]] },
  { id: 'judge', pos: [0, 0, -2.2], rot: 0, pen: 1, parts: judge(), click: 'explode', anchors: [[-0.55, 0.76, 0.08], [0, 0.76, 0.08], [0.55, 0.76, 0.08]] },
  { id: 'gallery', pos: [0, 0, 2.6], rot: 0, pen: 1, parts: gallery(), click: 'explode', anchors: [[-2.8, 0.5, 0], [2.8, 0.5, 0]] },
  { id: 'cabinet', pos: [-4.55, 0, -1.7], rot: 0, pen: 1, parts: cabinet(), click: 'rattle', anchors: [[0.3, 1.0, 0]] },
  { id: 'ways', pos: [0, 0, 0], rot: 0, pen: 2, parts: threeDoors(), anchors: [[-4.4, 0.5, 0.7], [-2.95, 0.5, -2.9], [4.4, 0.5, -1.1]] },
];

export type Key = { t: V; yaw: number; pitch: number; dist: number; fov: number; sx: number; sy: number; psy: number; pd: number; cut?: boolean };
const R = Math.PI / 180;
const fit = (h: number, fov: number) => h / 2 / Math.tan((fov * R) / 2);

/** One camera key per section, in the order of the page. */
export const KEYS: Key[] = [
  { t: [0.2, 0.3, 0.3], yaw: 40 * R, pitch: 33 * R, dist: fit(12.2, 14), fov: 14, sx: 0.23, sy: 0.03, psy: -0.2, pd: 1.9 },
  { t: [0.4, 0, 0.3], yaw: 0, pitch: 89.4 * R, dist: fit(12.4, 12), fov: 12, sx: 0.21, sy: 0, psy: -0.19, pd: 1.95 },
  { t: [3.4, 1.0, 3.5], yaw: 14 * R, pitch: 9 * R, dist: 5.6, fov: 42, sx: 0.17, sy: 0, psy: -0.2, pd: 1.5 },
  { t: [2.85, 1.35, -3.38], yaw: 8 * R, pitch: 4 * R, dist: 3.6, fov: 45, sx: 0.16, sy: 0, psy: -0.2, pd: 1.45 },
  { t: [-2.0, 0.72, 0.5], yaw: -18 * R, pitch: 24 * R, dist: 2.7, fov: 50, sx: 0.17, sy: 0.02, psy: -0.2, pd: 1.5, cut: true },
  { t: [2.0, 0.72, 0.5], yaw: 18 * R, pitch: 24 * R, dist: 2.7, fov: 50, sx: 0.17, sy: 0.02, psy: -0.2, pd: 1.5 },
  { t: [-0.6, 0.45, 2.6], yaw: 192 * R, pitch: 22 * R, dist: 5.8, fov: 46, sx: 0.17, sy: 0, psy: -0.2, pd: 1.55 },
  { t: [-4.55, 0.75, -1.7], yaw: 66 * R, pitch: 13 * R, dist: 3.4, fov: 42, sx: 0.17, sy: 0, psy: -0.22, pd: 1.4, cut: true },
  { t: [0, 0.76, -2.15], yaw: 0, pitch: 34 * R, dist: 3.3, fov: 48, sx: 0.17, sy: 0.04, psy: -0.22, pd: 1.6 },
  { t: [0.2, 0, -0.1], yaw: 0, pitch: 89.4 * R, dist: fit(12.6, 12), fov: 12, sx: 0.21, sy: 0, psy: -0.22, pd: 1.95 },
];

/** What each sheet in the title block is called. */
export const SHEETS = ['Axonometric', 'Plan', 'The door', 'The wall', 'Affirmative desk', 'Negative desk', 'The gallery', 'The cabinet', 'The judge’s table', 'Three ways in'];
/** Which object each section points at, and with how many leaders. */
export const FOCUS = ['', '', 'door', 'frame', 'aff', 'neg', 'gallery', 'cabinet', 'judge', 'ways'];

export type Mode = 'persp' | 'plan' | 'elev';
export const st = {
  f: 0,
  centers: [] as number[],
  mode: 'persp' as Mode,
  yawOff: 0, pitchOff: 0, dragging: false,
  explode: {} as Record<string, number>,
  rattle: {} as Record<string, number>,
  measure: { on: false, a: null as V | null, b: null as V | null, hover: null as V | null, dirty: true },
  t0: -1,
  clock: 0,
  reveal: 0,
  ways: 0,
  ready: false,
  onStop: null as null | ((i: number) => void),
};
