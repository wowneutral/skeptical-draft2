// Solid type for the corridor: Bodoni Moda Bold outlines (opentype, see glyphs.json),
// extruded once per character at unit cap height, then merged per phrase.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import FONT from './glyphs.json';

type G = { d: string; a: number };
const GL = FONT.glyphs as Record<string, G>;
const KERN = FONT.kern as Record<string, number>;
export const CAP = FONT.cap; // font units per cap height

type P2 = THREE.Vector2;
function contours(d: string): P2[][] {
  const out: P2[][] = [];
  let cur: THREE.Path | null = null;
  const re = /([MLQCZ])([^MLQCZ]*)/g;
  let m: RegExpExecArray | null;
  const X = (v: number) => v / CAP, Y = (v: number) => -v / CAP;
  const close = () => {
    if (!cur) return;
    const raw = cur.getPoints(4);
    const pts = raw.filter((p, i) => i === 0 || p.distanceTo(raw[i - 1]) > 1e-4);
    if (pts.length > 2 && pts[0].distanceTo(pts[pts.length - 1]) < 1e-4) pts.pop();
    if (pts.length > 2) out.push(pts);
    cur = null;
  };
  while ((m = re.exec(d))) {
    const n = (m[2].match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number);
    if (m[1] === 'M') { close(); cur = new THREE.Path(); cur.moveTo(X(n[0]), Y(n[1])); }
    else if (m[1] === 'L' && cur) cur.lineTo(X(n[0]), Y(n[1]));
    else if (m[1] === 'Q' && cur) cur.quadraticCurveTo(X(n[0]), Y(n[1]), X(n[2]), Y(n[3]));
    else if (m[1] === 'C' && cur) cur.bezierCurveTo(X(n[0]), Y(n[1]), X(n[2]), Y(n[3]), X(n[4]), Y(n[5]));
    else if (m[1] === 'Z') close();
  }
  close();
  return out;
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

const cache = new Map<string, THREE.BufferGeometry | null>();
/** One character, cap height 1, baseline at y 0, pen at x 0. */
export function glyphGeo(ch: string, depth = 0.2): THREE.BufferGeometry | null {
  const key = ch + depth;
  if (cache.has(key)) return cache.get(key)!;
  const g = GL[ch];
  if (!g || !g.d) { cache.set(key, null); return null; }
  const subs = contours(g.d).map((pts) => ({ pts, a: Math.abs(area(pts)) })).sort((a, b) => b.a - a.a);
  const solids: { pts: P2[]; holes: P2[][] }[] = [];
  for (const s of subs) {
    const host = solids.find((S) => inside(s.pts[0], S.pts) && !S.holes.some((h) => inside(s.pts[0], h)));
    if (host) host.holes.push(s.pts); else solids.push({ pts: s.pts, holes: [] });
  }
  const shapes = solids.map((S) => {
    const pts = THREE.ShapeUtils.isClockWise(S.pts) ? S.pts.slice().reverse() : S.pts;
    const sh = new THREE.Shape(pts);
    sh.holes = S.holes.map((h) => new THREE.Path(THREE.ShapeUtils.isClockWise(h) ? h : h.slice().reverse()));
    return sh;
  });
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth, curveSegments: 4, bevelEnabled: true, bevelThickness: 0.022, bevelSize: 0.012, bevelSegments: 2,
  });
  geo.translate(0, 0, -depth / 2);
  cache.set(key, geo);
  return geo;
}

export const advance = (ch: string) => (GL[ch]?.a ?? (ch === ' ' ? 250 : 500)) / CAP;
export const kern = (a: string, b: string) => (KERN[a + b] ?? 0) / CAP;
export const lineWidth = (s: string) => { let w = 0; for (let i = 0; i < s.length; i++) w += advance(s[i]) + (i < s.length - 1 ? kern(s[i], s[i + 1]) : 0); return w; };

/** Greedy word wrap by width in caps. */
export function wrap(text: string, max: number): string[] {
  const words = text.replace(/’/g, '’').split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (cur && lineWidth(t) > max) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** A phrase as one merged solid, centred on x and on its block of lines, size = cap height in metres. */
export function phraseGeo(lines: string[], size: number, align: 'left' | 'center' | 'right' = 'center', lead = 1.42) {
  const parts: THREE.BufferGeometry[] = [];
  const m = new THREE.Matrix4();
  const widths = lines.map(lineWidth);
  const W = Math.max(...widths);
  const H = (lines.length - 1) * lead + 1;
  lines.forEach((line, li) => {
    const w = widths[li];
    let x = align === 'center' ? -w / 2 : align === 'left' ? -W / 2 : W / 2 - w;
    const y = H / 2 - 1 - li * lead;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      const g = glyphGeo(ch === '’' ? '’' : ch);
      if (g) { m.makeTranslation(x, y, 0); const c = g.clone(); c.applyMatrix4(m); parts.push(c); }
      x += advance(ch) + (i < line.length - 1 ? kern(ch, line[i + 1]) : 0);
    }
  });
  const geo = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  geo.scale(size, size, size);
  geo.computeBoundingSphere();
  return { geo, w: W * size, h: H * size };
}
