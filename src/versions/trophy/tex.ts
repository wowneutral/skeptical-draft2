// Every surface is drawn here on a canvas: marble veining, brushed brass, cut plates.
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

export const SERIF = '"Bodoni Moda Variable", "Bodoni Moda", Didot, serif';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** Honed bone marble. The noise runs on a cylinder so the seam closes around the base. */
export function marbleTexture(phone: boolean) {
  const W = phone ? 384 : 768, H = phone ? 192 : 384;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const n = createNoise3D(rng(7));
  const fbm = (x: number, y: number, z: number) => {
    let a = 0, amp = 0.5, f = 1;
    for (let o = 0; o < 4; o++) { a += amp * n(x * f, y * f, z * f); amp *= 0.5; f *= 2.03; }
    return a;
  };
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const th = (i / W) * Math.PI * 2, y = (j / H) * 2.2;
      const x = Math.cos(th) * 1.4, z = Math.sin(th) * 1.4;
      const w = fbm(x, y, z);
      const t = Math.abs(Math.sin((y * 1.7 + x * 0.6 + w * 3.4) * 2.2));
      const vein = Math.pow(1 - Math.min(1, t / 0.07), 2);
      const t2 = Math.abs(Math.sin((y * 3.1 - z * 1.1 + fbm(z * 2, x * 2, y) * 2.6) * 3.4));
      const fine = Math.pow(1 - Math.min(1, t2 / 0.035), 2) * 0.55;
      const cloud = fbm(x * 0.8 + 9, y * 0.8, z * 0.8) * 0.05;
      const v = Math.max(vein * 0.75, fine);
      const k = (j * W + i) * 4;
      img.data[k] = (234 + cloud * 255 - v * 125) | 0;
      img.data[k + 1] = (229 + cloud * 250 - v * 128) | 0;
      img.data[k + 2] = (220 + cloud * 240 - v * 128) | 0;
      img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping; tex.anisotropy = 4;
  return tex;
}

/** Brushed metal: rows of fine streaks. Used as roughness (and bump on the plates). */
export function brushedCanvas(W: number, H: number, seed = 3) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  const r = rng(seed);
  ctx.fillStyle = 'rgb(118,118,118)'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < H * 3; i++) {
    const y = r() * H, l = 70 + r() * 110;
    ctx.fillStyle = `rgba(${l},${l},${l},${0.08 + r() * 0.14})`;
    ctx.fillRect(r() * W * 0.4 - W * 0.2, y, W * (0.6 + r() * 0.8), 0.6 + r() * 1.1);
  }
  return c;
}

export function brushedTexture() {
  const tex = new THREE.CanvasTexture(brushedCanvas(64, 512, 11));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 2);
  return tex;
}

/** One brass plate: a colour canvas (also the bump) and a roughness canvas. */
export type Plate = { map: THREE.CanvasTexture; rough: THREE.CanvasTexture; draw: (lines: string[], reveal?: number, cut?: number) => number[] };

export function makePlate(W = 1024, H = 512, seed = 5): Plate {
  const base = brushedCanvas(W, H, seed);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const r = document.createElement('canvas'); r.width = W; r.height = H;
  const ctx = c.getContext('2d')!, rx = r.getContext('2d')!;
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const rough = new THREE.CanvasTexture(r); rough.anisotropy = 8;

  /** Lines: first big, the rest smaller. reveal 0..1 cuts left to right; cut draws the cutting line. Returns letter edges (px) of line one. */
  const draw = (lines: string[], reveal = 1, cut = -1) => {
    // brass body
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#d2ae72'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.5; ctx.globalCompositeOperation = 'overlay'; ctx.drawImage(base, 0, 0); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    rx.fillStyle = '#000'; rx.fillRect(0, 0, W, H);
    rx.globalAlpha = 0.85; rx.drawImage(base, 0, 0); rx.globalAlpha = 1;
    rx.fillStyle = 'rgba(40,40,40,0.4)'; rx.fillRect(0, 0, W, H);
    // the engraved inner rule every plate carries
    const ins = H * 0.075;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f6e2b8'; ctx.strokeRect(ins + 1.5, ins + 2, W - ins * 2, H - ins * 2);
    ctx.strokeStyle = '#4a3920'; ctx.strokeRect(ins, ins, W - ins * 2, H - ins * 2);
    rx.lineWidth = 4; rx.strokeStyle = '#c8c8c8'; rx.strokeRect(ins, ins, W - ins * 2, H - ins * 2);

    const edges: number[] = [];
    if (!lines.length) { map.needsUpdate = true; rough.needsUpdate = true; return edges; }
    const sizes = lines.length === 1 ? [H * 0.27] : [H * 0.2, H * 0.105];
    const ys = lines.length === 1 ? [H * 0.5] : [H * 0.43, H * 0.67];
    let cutTop = 0, cutBot = 0;
    const clipW = W * reveal;
    lines.forEach((t, i) => {
      let size = sizes[i] ?? sizes[1];
      const font = (s: number) => `${i === 0 ? 600 : 500} ${s}px ${SERIF}`;
      ctx.font = font(size);
      ctx.letterSpacing = `${(size * (i === 0 ? 0.08 : 0.16)).toFixed(1)}px`;
      let w = ctx.measureText(t).width;
      const max = W - ins * 2 - H * 0.14;
      if (w > max) { size *= max / w; ctx.font = font(size); ctx.letterSpacing = `${(size * (i === 0 ? 0.08 : 0.16)).toFixed(1)}px`; w = ctx.measureText(t).width; }
      const x0 = (W - w) / 2;
      if (i === 0) {
        let acc = x0;
        for (const ch of t) { edges.push(acc); acc += ctx.measureText(ch).width; }
        edges.push(acc);
        cutTop = ys[i] - size * 0.42; cutBot = ys[i] + size * 0.42;
      }
      ctx.save(); rx.save();
      ctx.beginPath(); ctx.rect(0, 0, clipW, H); ctx.clip();
      rx.beginPath(); rx.rect(0, 0, clipW, H); rx.clip();
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillStyle = '#f8e7c4'; ctx.fillText(t, x0, ys[i] + Math.max(1.5, size * 0.03));
      ctx.fillStyle = '#26190b'; ctx.fillText(t, x0, ys[i]);
      rx.font = ctx.font; rx.letterSpacing = ctx.letterSpacing; rx.textBaseline = 'middle';
      rx.fillStyle = '#cfcfcf'; rx.fillText(t, x0, ys[i]);
      ctx.restore(); rx.restore();
    });
    if (cut >= 0) {
      // the cutting line: thin, bright, no glow
      ctx.fillStyle = '#fffaf0';
      ctx.fillRect(cut - 1.5, cutTop, 3, cutBot - cutTop);
    }
    map.needsUpdate = true; rough.needsUpdate = true;
    return edges;
  };
  draw([]);
  return { map, rough, draw };
}
