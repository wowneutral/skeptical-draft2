// The brand's roman Bodoni question mark as one iron casting (hook and dot,
// joined by a steel pin), plus the canvas maps for the iron and the stone.
import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import MARKS from '@/lib/marks.json';

/** The mark stands H tall. Its local origin is the bottom of the dot. */
export const H = 3;
const K = H / MARKS.roman.h;
const wy = (y: number) => (770 - y) * K;
export const DEPTH = 0.36;

function shapes(d: string) {
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
  return out.map((s) => {
    const raw = s.getPoints(24);
    const pts = raw.filter((p, i) => i === 0 || p.distanceTo(raw[i - 1]) > 1e-4);
    if (pts.length > 2 && pts[0].distanceTo(pts[pts.length - 1]) < 1e-4) pts.pop();
    if (THREE.ShapeUtils.isClockWise(pts)) pts.reverse();
    return pts;
  });
}

function centroid(pts: THREE.Vector2[]) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length], c = p.x * q.y - q.x * p.y;
    a += c; cx += (p.x + q.x) * c; cy += (p.y + q.y) * c;
  }
  a /= 2;
  return { a: Math.abs(a), x: cx / (6 * a), y: cy / (6 * a) };
}

/** Cheap smooth value noise for the wear pattern. */
function noise3(x: number, y: number, z: number) {
  const s = Math.sin(x * 3.1 + Math.sin(y * 2.3) * 1.7) + Math.sin(y * 4.7 + Math.sin(z * 3.9 + x)) + Math.sin(z * 5.3 + Math.sin(x * 2.9 - y * 1.3));
  return s / 3;
}

export type Casting = { hook: THREE.BufferGeometry; dot: THREE.BufferGeometry; attach: THREE.Vector3; pin: { x: number; y0: number; y1: number } };

export function cast(low: boolean): Casting {
  const [hookPts, dotPts] = shapes(MARKS.roman.d);
  const ch = centroid(hookPts), cd = centroid(dotPts);
  const comX = (ch.x * ch.a + cd.x * cd.a) / (ch.a + cd.a);
  const make = (pts: THREE.Vector2[]) => {
    let g: THREE.BufferGeometry = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
      depth: DEPTH, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.035, bevelSegments: low ? 3 : 5, curveSegments: 1, steps: 1,
    });
    g.translate(0, 0, -DEPTH / 2);
    g = toCreasedNormals(g, 0.7);
    // Wear: bright where hands would have rubbed, on the bevels and the outer edges, patchy.
    const pos = g.getAttribute('position'), nor = g.getAttribute('normal');
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const nz = Math.abs(nor.getZ(i));
      const bevel = nz > 0.08 && nz < 0.97 ? 1 : 0;
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const n = noise3(x * 2.2, y * 2.2, z * 2.2) * 0.5 + 0.5;
      const grip = Math.exp(-Math.pow((y - 2.2) / 0.9, 2)) * 0.5 + 0.5; // the crown is handled most
      const w = bevel * Math.min(1, Math.max(0, (n - 0.28) * 2.2)) * grip;
      col[i * 3] = w; col[i * 3 + 1] = n; col[i * 3 + 2] = 0;
    }
    g.setAttribute('wear', new THREE.BufferAttribute(col, 3));
    g.computeBoundingBox();
    return g;
  };
  const hook = make(hookPts), dot = make(dotPts);
  // Where the wire meets the crown: straight above the centre of mass, on the top surface.
  const probe = new THREE.Mesh(hook, new THREE.MeshBasicMaterial());
  const ray = new THREE.Raycaster(new THREE.Vector3(comX, 10, 0), new THREE.Vector3(0, -1, 0));
  const hit = ray.intersectObject(probe)[0];
  const top = hit ? hit.point.y : hook.boundingBox!.max.y;
  (probe.material as THREE.Material).dispose();
  // The pin from the foot of the stem down into the dot.
  const stemX = -97 * K;
  return { hook, dot, attach: new THREE.Vector3(comX, top, 0), pin: { x: stemX, y0: dot.boundingBox!.max.y - 0.08, y1: hook.boundingBox!.min.y + 0.08 } };
}

function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

/** Blackened iron: casting grain, scale, and faint file marks. Grey in, used as roughness and bump. */
export function ironMap(size = 512) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!;
  const r = rng(11);
  const im = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) { const v = 168 + (r() - 0.5) * 70; im.data.set([v, v, v, 255], i * 4); }
  g.putImageData(im, 0, 0);
  for (let i = 0; i < 90; i++) {
    const x = r() * size, y = r() * size, rad = 14 + r() * 80;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const dark = r() < 0.55;
    gr.addColorStop(0, dark ? `rgba(70,70,70,${0.18 + r() * 0.2})` : `rgba(235,235,235,${0.12 + r() * 0.15})`);
    gr.addColorStop(1, 'rgba(128,128,128,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // pits from the sand mould
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(30,30,30,${0.25 + r() * 0.4})`;
    g.beginPath(); g.arc(r() * size, r() * size, 0.5 + r() * 1.6, 0, 6.29); g.fill();
  }
  // file marks, one direction
  g.strokeStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 160; i++) {
    const y = r() * size, x = r() * size, l = 20 + r() * 90;
    g.lineWidth = 0.5 + r(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + l * 0.12); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.3, 1.3); t.anisotropy = 4;
  return t;
}

/** Pale limestone flags: colour and roughness, one tile of 4 by 4 slabs. */
export function stoneMaps(size = 1024) {
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = size; return c; };
  const cc = mk(), rc = mk();
  const g = cc.getContext('2d')!, h = rc.getContext('2d')!;
  const r = rng(5);
  g.fillStyle = '#cfc9be'; g.fillRect(0, 0, size, size);
  h.fillStyle = '#c8c8c8'; h.fillRect(0, 0, size, size);
  const n = 2, s = size / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const t = (r() - 0.5) * 16;
    g.fillStyle = `rgb(${207 + t},${201 + t},${190 + t * 0.8})`;
    g.fillRect(i * s, j * s, s, s);
  }
  // fossil flecks and clouds
  for (let i = 0; i < 260; i++) {
    const x = r() * size, y = r() * size, rad = 10 + r() * 70;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const d = r() < 0.6;
    gr.addColorStop(0, d ? `rgba(150,140,125,${0.06 + r() * 0.08})` : `rgba(250,248,240,${0.08 + r() * 0.1})`);
    gr.addColorStop(1, 'rgba(200,190,180,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    const gh = h.createRadialGradient(x, y, 0, x, y, rad);
    gh.addColorStop(0, d ? 'rgba(235,235,235,0.18)' : 'rgba(120,120,120,0.2)'); gh.addColorStop(1, 'rgba(200,200,200,0)');
    h.fillStyle = gh; h.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  for (let i = 0; i < 4000; i++) {
    const x = r() * size, y = r() * size;
    g.fillStyle = `rgba(120,110,95,${0.08 + r() * 0.14})`; g.fillRect(x, y, 1 + r() * 2, 1 + r() * 2);
  }
  // joints
  g.strokeStyle = 'rgba(96,90,80,0.32)'; g.lineWidth = 1.4;
  h.strokeStyle = 'rgba(255,255,255,0.6)'; h.lineWidth = 2;
  for (let i = 0; i <= n; i++) {
    for (const ctx of [g, h]) {
      ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * s); ctx.lineTo(size, i * s); ctx.stroke();
    }
  }
  const map = new THREE.CanvasTexture(cc); map.colorSpace = THREE.SRGBColorSpace;
  const rough = new THREE.CanvasTexture(rc);
  for (const t of [map, rough]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
  return { map, rough };
}
