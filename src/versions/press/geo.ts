// The sort: a body of type metal with a nick and two feet, and the brand's
// Bodoni question mark raised on its face, mirrored, the way type is cast.
import * as THREE from 'three';
import MARKS from '@/lib/marks.json';

export const W = 1.12;   // body width (x)
export const D = 1.62;   // body depth (z), the mark's height runs this way
export const HB = 3.0;   // body height to the shoulder
export const FACE = 0.17; // height of the raised face above the shoulder
export const HT = HB + FACE + 0.06;
export const GLYPH = 1.3; // the mark's height on the face
export const M = MARKS.roman;

/** The mark as THREE shapes in a unit where its height is GLYPH, centred, y up. */
export function markShapes(mirror: boolean) {
  const K = GLYPH / M.h;
  const sx = mirror ? -1 : 1;
  const out: THREE.Shape[] = [];
  let cur: THREE.Shape | null = null;
  const re = /([MLQZ])([^MLQZ]*)/g;
  let m: RegExpExecArray | null;
  const X = (v: number) => v * K * sx, Y = (v: number) => -v * K;
  while ((m = re.exec(M.d))) {
    const n = (m[2].match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (m[1] === 'M') { if (cur) out.push(cur); cur = new THREE.Shape(); cur.moveTo(X(n[0]), Y(n[1])); }
    else if (m[1] === 'L' && cur) cur.lineTo(X(n[0]), Y(n[1]));
    else if (m[1] === 'Q' && cur) cur.quadraticCurveTo(X(n[0]), Y(n[1]), X(n[2]), Y(n[3]));
  }
  if (cur) out.push(cur);
  return out.map((s) => {
    const raw = s.getPoints(24);
    const pts = raw.filter((p, i) => i === 0 || p.distanceTo(raw[i - 1]) > 1e-4);
    if (pts.length > 2 && pts[0].distanceTo(pts[pts.length - 1]) < 1e-4) pts.pop();
    if (THREE.ShapeUtils.isClockWise(pts)) pts.reverse();
    return new THREE.Shape(pts);
  });
}

/** The raised face: mirrored mark, a sloped shoulder (the bevel) and a flat printing surface. Group 0 is the surface, 1 the sides. */
export function faceGeometry(low: boolean) {
  const g = new THREE.ExtrudeGeometry(markShapes(true), {
    depth: FACE - 0.05, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.035, bevelSegments: low ? 2 : 4, curveSegments: 1, steps: 1,
  });
  // Shape lies in xy with the mark's top at +y; stand it on the shoulder: extrusion goes up, the mark's top goes to -z.
  g.rotateX(-Math.PI / 2);
  g.translate(0, HB + 0.05, 0);
  g.computeVertexNormals();
  return g;
}

/** The body, by its side profile (z, y): two feet with a groove between, a nick across the front. */
export function bodyGeometry(low: boolean) {
  const s = new THREE.Shape();
  const g = 0.2, fh = 0.2, nickY = 0.95, nr = 0.075;
  s.moveTo(-D / 2, 0);
  s.lineTo(-g, 0); s.lineTo(-g + 0.04, fh); s.lineTo(g - 0.04, fh); s.lineTo(g, 0);
  s.lineTo(D / 2, 0);
  s.lineTo(D / 2, nickY - nr);
  for (let i = 1; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI; s.lineTo(D / 2 - Math.cos(a) * nr, nickY + Math.sin(a) * nr); }
  s.lineTo(D / 2, nickY + nr);
  s.lineTo(D / 2, HB);
  s.lineTo(-D / 2, HB);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: W - 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: low ? 1 : 2, curveSegments: 1 });
  geo.translate(0, 0, -(W - 0.04) / 2);
  geo.rotateY(-Math.PI / 2);
  // Re-project UVs so the pits are the same size on every side.
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), az = Math.abs(n.getZ(i));
    const u = ax > az ? p.getZ(i) : p.getX(i);
    uv.setXY(i, u * 0.45 + (ax > az ? 0.5 : 0), p.getY(i) * 0.45);
  }
  return geo;
}

function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

/** Casting texture: fine pits, faint drag lines from the mould, a few blotches. Bright is rough. */
export function castTexture(size = 512) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!;
  const r = rng(11);
  const im = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) { const v = 168 + (r() - 0.5) * 50; im.data.set([v, v, v, 255], i * 4); }
  g.putImageData(im, 0, 0);
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = `rgba(${r() < 0.5 ? '90,90,90' : '230,230,230'},${0.05 + r() * 0.08})`;
    g.lineWidth = 0.5 + r();
    const x = r() * size; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 6, size); g.stroke();
  }
  for (let i = 0; i < 900; i++) {
    const x = r() * size, y = r() * size, rr = 0.6 + r() * r() * 3.2;
    g.fillStyle = `rgba(70,70,70,${0.25 + r() * 0.4})`; g.beginPath(); g.arc(x, y, rr * 0.7, 0, 6.283); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

const PATH = typeof Path2D !== 'undefined' ? new Path2D(M.d) : null;

/**
 * One impression of the mark, the right way round, centred on (x, y), `px` tall.
 * Ink thins with `ink`: the fill gets lighter and the paper starts to show through.
 */
export function drawPrint(g: CanvasRenderingContext2D, x: number, y: number, px: number, rot: number, ink: number, seed: number) {
  if (!PATH) return;
  const k = px / M.h;
  const r = rng(seed * 977 + 13);
  g.save();
  g.translate(x, y); g.rotate(rot); g.scale(k, k);
  // The squeeze: ink pushed out past the edge of the face, soft and darker.
  g.filter = `blur(${Math.max(0.6, px / 260)}px)`;
  g.strokeStyle = `rgba(14,12,10,${0.5 * ink})`;
  g.lineWidth = 20; g.lineJoin = 'round';
  g.stroke(PATH);
  g.filter = 'none';
  g.fillStyle = `rgba(16,14,12,${0.25 + 0.7 * ink})`;
  g.fill(PATH);
  // The edge holds more ink than the middle.
  g.strokeStyle = `rgba(8,7,6,${0.75 * ink})`;
  g.lineWidth = 7; g.stroke(PATH);
  // Where the face ran dry, the paper shows through in specks.
  g.save(); g.clip(PATH);
  g.globalCompositeOperation = 'destination-out';
  const dry = 1 - ink;
  for (let i = 0; i < 260 + dry * 1500; i++) {
    const sx = (r() - 0.5) * M.w, sy = (r() - 0.5) * M.h, rr = (2 + r() * 9) * (0.4 + dry * 1.2);
    g.globalAlpha = 0.25 + dry * 0.7 * r();
    g.beginPath(); g.ellipse(sx, sy, rr * 1.8, rr, r() * 3, 0, 6.283); g.fill();
  }
  g.restore();
  g.restore();
}

/** The deboss: the mark pressed slightly into the sheet. Dark is lower. */
export function drawDeboss(g: CanvasRenderingContext2D, x: number, y: number, px: number, rot: number) {
  if (!PATH) return;
  const k = px / M.h;
  g.save();
  g.translate(x, y); g.rotate(rot); g.scale(k, k);
  g.filter = `blur(${Math.max(1, px / 140)}px)`;
  g.fillStyle = 'rgba(0,0,0,0.38)';
  g.fill(PATH);
  g.restore();
}
