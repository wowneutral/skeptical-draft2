// The brand's roman Bodoni question mark as two solid castings: the hook and the dot.
// One world unit is a metre-ish; the whole mark stands H tall, the dot on the floor.
import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import MARKS from '@/lib/marks.json';

export const H = 3;
const K = H / MARKS.roman.h;
/** SVG y (down, centred) to world y (up, floor at 0). */
const wy = (y: number) => (770 - y) * K;
export const DEPTH = 0.42;

function paths(d: string) {
  const out: THREE.Shape[] = [];
  let cur: THREE.Shape | null = null;
  const re = /([MLQZ])([^MLQZ]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const n = (m[2].match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (m[1] === 'M') { if (cur) out.push(cur); cur = new THREE.Shape(); cur.moveTo(n[0] * K, wy(n[1])); }
    else if (m[1] === 'L' && cur) cur.lineTo(n[0] * K, wy(n[1]));
    else if (m[1] === 'Q' && cur) cur.quadraticCurveTo(n[0] * K, wy(n[1]), n[2] * K, wy(n[3]));
  }
  if (cur) out.push(cur);
  // Clean the sampled points (repeated points upset the bevel) and make the winding consistent.
  return out.map((s) => {
    const raw = s.getPoints(28);
    const pts = raw.filter((p, i) => i === 0 || p.distanceTo(raw[i - 1]) > 1e-4);
    if (pts.length > 2 && pts[0].distanceTo(pts[pts.length - 1]) < 1e-4) pts.pop();
    if (THREE.ShapeUtils.isClockWise(pts)) pts.reverse();
    return new THREE.Shape(pts);
  });
}

export type Part = { geo: THREE.BufferGeometry; centre: THREE.Vector3; box: THREE.Box3 };

/** Hook and dot, each centred on its own middle so it can turn about itself. */
export function castParts(low: boolean): { hook: Part; dot: Part } {
  const [hookShape, dotShape] = paths(MARKS.roman.d);
  const make = (s: THREE.Shape): Part => {
    let g: THREE.BufferGeometry = new THREE.ExtrudeGeometry(s, {
      depth: DEPTH, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.045, bevelSegments: low ? 3 : 6, curveSegments: 1, steps: 1,
    });
    g.translate(0, 0, -DEPTH / 2);
    g.computeBoundingBox();
    const box = g.boundingBox!.clone();
    const centre = box.getCenter(new THREE.Vector3());
    g.translate(-centre.x, -centre.y, -centre.z);
    g = toCreasedNormals(g, 0.6);
    g.computeBoundingBox();
    return { geo: g, centre, box };
  };
  return { hook: make(hookShape), dot: make(dotShape) };
}

/** A canvas noise texture: fine casting grain and faint polishing swirls, for roughness and bump. */
export function grain(size = 512) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!;
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const im = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) { const v = 150 + (rnd() - 0.5) * 60; im.data.set([v, v, v, 255], i * 4); }
  g.putImageData(im, 0, 0);
  g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 220; i++) {
    const x = rnd() * size, y = rnd() * size, r = 20 + rnd() * 120, a0 = rnd() * 6.28;
    const dark = rnd() < 0.5;
    g.strokeStyle = dark ? `rgba(40,40,40,${0.05 + rnd() * 0.08})` : `rgba(255,255,255,${0.04 + rnd() * 0.06})`;
    g.lineWidth = 0.6 + rnd() * 1.4;
    g.beginPath(); g.arc(x, y, r, a0, a0 + 0.6 + rnd() * 1.6); g.stroke();
  }
  // A few soft blotches: where the polish is less even.
  for (let i = 0; i < 40; i++) {
    const x = rnd() * size, y = rnd() * size, r = 30 + rnd() * 90;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(210,210,210,${0.08 + rnd() * 0.1})`); gr.addColorStop(1, 'rgba(210,210,210,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.9, 0.9); t.anisotropy = 4;
  return t;
}
