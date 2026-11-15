// The coin's struck surfaces, drawn on canvases: a height field per face,
// turned into colour (patina in the recesses), roughness (worn high points) and normals.
import * as THREE from 'three';
import MARKS from '@/lib/marks.json';

const RIM: [string, string] = ['SKEPTICAL • JOIN AS A DEBATER • ', 'SKEPTICAL • COACH WITH US • '];
export const SERIF = '"Bodoni Moda Variable", "Bodoni Moda", serif';

function rand(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

/** The second emblem: a laurel wreath around a lectern. */
function wreath(ctx: CanvasRenderingContext2D, R: number) {
  const rw = 0.5 * R;
  ctx.save();
  for (const side of [1, -1]) {
    ctx.save(); ctx.scale(side, 1);
    ctx.lineWidth = R * 0.018; ctx.beginPath();
    ctx.arc(0, 0, rw, Math.PI / 2 + 0.25, Math.PI / 2 + 2.45); ctx.stroke();
    const N = 11;
    for (let i = 0; i < N; i++) {
      const a = Math.PI / 2 + 0.32 + (i / (N - 1)) * 2.05;
      const sz = 1 - i * 0.035;
      for (const off of [1, -1]) {
        const x = Math.cos(a) * rw, y = Math.sin(a) * rw;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2 + off * 0.65);
        ctx.beginPath(); ctx.ellipse(0, -off * R * 0.055 * sz, R * 0.026 * sz, R * 0.068 * sz, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    // berry at the tip
    const at = Math.PI / 2 + 2.5; ctx.beginPath(); ctx.arc(Math.cos(at) * rw, Math.sin(at) * rw, R * 0.024, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // ribbon tie
  ctx.beginPath(); ctx.ellipse(0, rw * 1.0, R * 0.05, R * 0.032, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-R * 0.02, rw); ctx.lineTo(-R * 0.11, rw + R * 0.13); ctx.lineTo(-R * 0.05, rw + R * 0.12); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(R * 0.02, rw); ctx.lineTo(R * 0.11, rw + R * 0.13); ctx.lineTo(R * 0.05, rw + R * 0.12); ctx.closePath(); ctx.fill();
  // lectern: slanted desk, column, foot
  ctx.beginPath();
  ctx.moveTo(-R * 0.25, -R * 0.2); ctx.lineTo(R * 0.25, -R * 0.29); ctx.lineTo(R * 0.27, -R * 0.2); ctx.lineTo(-R * 0.23, -R * 0.12); ctx.closePath(); ctx.fill();
  ctx.fillRect(-R * 0.06, -R * 0.14, R * 0.12, R * 0.4);
  ctx.beginPath(); ctx.moveTo(-R * 0.2, R * 0.32); ctx.lineTo(R * 0.2, R * 0.32); ctx.lineTo(R * 0.13, R * 0.24); ctx.lineTo(-R * 0.13, R * 0.24); ctx.closePath(); ctx.fill();
  // paper on the desk
  ctx.globalAlpha = 0.55; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.moveTo(-R * 0.17, -R * 0.2); ctx.lineTo(R * 0.15, -R * 0.26); ctx.lineTo(R * 0.16, -R * 0.235); ctx.lineTo(-R * 0.16, -R * 0.175); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function heightFace(face: 0 | 1, S: number) {
  const c = document.createElement('canvas'); c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const R = S / 2;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, S, S);
  ctx.translate(R, R);
  // field, slightly dished toward the rim
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
  g.addColorStop(0, '#5c5c5c'); g.addColorStop(0.9, '#4a4a4a'); g.addColorStop(1, '#4a4a4a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
  // raised rim
  ctx.lineWidth = R * 0.075; ctx.strokeStyle = '#e8e8e8'; ctx.beginPath(); ctx.arc(0, 0, R * 0.955, 0, Math.PI * 2); ctx.stroke();
  // beads
  ctx.fillStyle = '#c4c4c4';
  for (let i = 0; i < 96; i++) { const a = (i / 96) * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * R * 0.875, Math.sin(a) * R * 0.875, R * 0.0105, 0, Math.PI * 2); ctx.fill(); }
  // inner line
  ctx.lineWidth = R * 0.012; ctx.strokeStyle = '#b0b0b0'; ctx.beginPath(); ctx.arc(0, 0, R * 0.69, 0, Math.PI * 2); ctx.stroke();
  // lettering round the rim
  const txt = RIM[face]; const n = txt.length;
  ctx.fillStyle = '#dcdcdc'; ctx.font = `700 ${R * 0.105}px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    ctx.save(); ctx.translate(Math.cos(a) * R * 0.785, Math.sin(a) * R * 0.785); ctx.rotate(a + Math.PI / 2); ctx.fillText(txt[i], 0, 0); ctx.restore();
  }
  // emblem
  ctx.fillStyle = '#f2f2f2'; ctx.strokeStyle = '#f2f2f2';
  if (face === 0) {
    const k = (R * 1.12) / MARKS.italic.h;
    ctx.save(); ctx.translate(R * 0.02, R * 0.0); ctx.scale(k, k); ctx.fill(new Path2D(MARKS.italic.d)); ctx.restore();
  } else wreath(ctx, R);
  // soften into relief
  const o = document.createElement('canvas'); o.width = o.height = S;
  const octx = o.getContext('2d')!;
  octx.filter = `blur(${Math.max(1, S / 380)}px)`; octx.drawImage(c, 0, 0);
  octx.filter = 'none'; octx.globalAlpha = 0.35; octx.drawImage(c, 0, 0);
  return octx.getImageData(0, 0, S, S).data;
}

function wearNoise(S: number, seed: number) {
  const c = document.createElement('canvas'); c.width = c.height = S;
  const ctx = c.getContext('2d')!; const r = rand(seed);
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) { // blotches
    ctx.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + r() * 0.05})`;
    ctx.beginPath(); ctx.arc(r() * S, r() * S, S * (0.004 + r() * 0.03), 0, Math.PI * 2); ctx.fill();
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 260; i++) { // hairline scratches
    const x = r() * S, y = r() * S, a = r() * Math.PI, l = S * (0.02 + r() * 0.12);
    ctx.strokeStyle = `rgba(255,255,255,${0.12 + r() * 0.25})`; ctx.lineWidth = Math.max(1, S / 1400);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * l * 0.2, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
  return ctx.getImageData(0, 0, S, S).data;
}

function tex(c: HTMLCanvasElement, srgb: boolean) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8; t.needsUpdate = true;
  return t;
}

export type FaceTex = { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture };

export function faceTextures(face: 0 | 1, S: number): FaceTex {
  const h = heightFace(face, S);
  const w = wearNoise(S, 7 + face * 31);
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
  const cc = mk(), nc = mk(), rc = mk();
  const ci = cc.getContext('2d')!.createImageData(S, S), ni = nc.getContext('2d')!.createImageData(S, S), ri = rc.getContext('2d')!.createImageData(S, S);
  const H = (x: number, y: number) => h[(Math.min(S - 1, Math.max(0, y)) * S + Math.min(S - 1, Math.max(0, x))) * 4] / 255;
  const k = S / 110;
  const lo = [86, 60, 24], hi = [236, 196, 112];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4, v = H(x, y), wn = (w[i] - 128) / 128;
    // normals
    let nx = (H(x - 1, y) - H(x + 1, y)) * k, ny = (H(x, y + 1) - H(x, y - 1)) * k; const nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l;
    ni.data[i] = (nx * 0.5 + 0.5) * 255; ni.data[i + 1] = (ny * 0.5 + 0.5) * 255; ni.data[i + 2] = (nz / l * 0.5 + 0.5) * 255; ni.data[i + 3] = 255;
    // colour: dark patina in the recesses, bright on the worn tops
    const t = Math.min(1, Math.max(0, (v - 0.25) / 0.7 + wn * 0.12));
    const tt = t * t * (3 - 2 * t);
    for (let j = 0; j < 3; j++) ci.data[i + j] = lo[j] + (hi[j] - lo[j]) * tt + wn * 10;
    ci.data[i + 3] = 255;
    // roughness: polished high points, satin field, rough recesses
    const r = 0.5 - v * 0.32 - Math.max(0, wn) * 0.18 + Math.max(0, -wn) * 0.12;
    ri.data[i] = 0; ri.data[i + 1] = Math.min(255, Math.max(18, r * 255)); ri.data[i + 2] = 0; ri.data[i + 3] = 255;
  }
  cc.getContext('2d')!.putImageData(ci, 0, 0); nc.getContext('2d')!.putImageData(ni, 0, 0); rc.getContext('2d')!.putImageData(ri, 0, 0);
  return { map: tex(cc, true), normalMap: tex(nc, false), roughnessMap: tex(rc, false) };
}

/** The reeded edge: fine vertical ridges all the way round. */
export function edgeTextures(): FaceTex {
  const W = 2048, Hh = 64, ridges = 220;
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = Hh; return c; };
  const cc = mk(), nc = mk(), rc = mk();
  const ci = cc.getContext('2d')!.createImageData(W, Hh), ni = nc.getContext('2d')!.createImageData(W, Hh), ri = rc.getContext('2d')!.createImageData(W, Hh);
  const r = rand(99);
  const nick = new Float32Array(W).map(() => (r() < 0.02 ? r() : 0));
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, ph = (x / W) * ridges * Math.PI * 2;
    const s = Math.sin(ph), groove = Math.cos(ph);
    const nx = s * 0.85; const nz = Math.sqrt(1 - nx * nx);
    ni.data[i] = (nx * 0.5 + 0.5) * 255; ni.data[i + 1] = 128; ni.data[i + 2] = (nz * 0.5 + 0.5) * 255; ni.data[i + 3] = 255;
    const bright = 0.75 + groove * 0.25 - nick[x] * 0.4;
    ci.data[i] = 200 * bright; ci.data[i + 1] = 160 * bright; ci.data[i + 2] = 86 * bright; ci.data[i + 3] = 255;
    ri.data[i + 1] = (0.3 - groove * 0.1 + nick[x] * 0.4) * 255; ri.data[i + 3] = 255;
  }
  cc.getContext('2d')!.putImageData(ci, 0, 0); nc.getContext('2d')!.putImageData(ni, 0, 0); rc.getContext('2d')!.putImageData(ri, 0, 0);
  return { map: tex(cc, true), normalMap: tex(nc, false), roughnessMap: tex(rc, false) };
}

/** A soft shadow for the felt. */
export function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(0.55, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
