// The sheet, drawn on canvases before it is ever lit.
// thick: how much pulp sits at each point (R). Lighter means thinner paper,
//        which glows when the lamp is behind it. Laid lines, chain lines, the
//        cloudy look-through of handmade paper, and the question mark.
// print: the black ink on the front.
// tooth: a small tile of fibre height, repeated, for the raking light.
import MARKS from '@/lib/marks.json';

export const W = 1024, H = 1366; // a 3:4 sheet
export const ASPECT = H / W;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')!] as const;
}

/** The question mark as a Path2D, scaled to height px and centred on (cx, cy). */
function markPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, h: number) {
  const m = MARKS.roman, k = h / m.h;
  ctx.setTransform(k, 0, 0, k, cx, cy);
  return new Path2D(m.d);
}

export function makeThick(): HTMLCanvasElement {
  const [c, ctx] = canvas(W, H);
  const r = rng(93);
  // Base pulp.
  ctx.fillStyle = 'rgb(150,150,150)'; ctx.fillRect(0, 0, W, H);

  // Clouds: the uneven look-through of a handmade sheet. Drawn sharp, blurred once.
  const [cl, cctx] = canvas(W, H);
  for (let i = 0; i < 520; i++) {
    const x = r() * W, y = r() * H, rad = 18 + r() * 90, up = r() < 0.5;
    cctx.fillStyle = up ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
    cctx.beginPath(); cctx.arc(x, y, rad, 0, Math.PI * 2); cctx.fill();
  }
  ctx.filter = 'blur(26px)'; ctx.drawImage(cl, 0, 0);
  cctx.clearRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) {
    const x = r() * W, y = r() * H, rad = 3 + r() * 12;
    cctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    cctx.beginPath(); cctx.arc(x, y, rad, 0, Math.PI * 2); cctx.fill();
  }
  ctx.filter = 'blur(6px)'; ctx.drawImage(cl, 0, 0);
  ctx.filter = 'none';

  // Fibres: short curling strands of thicker pulp.
  ctx.lineCap = 'round';
  for (let i = 0; i < 2600; i++) {
    let x = r() * W, y = r() * H, a = r() * Math.PI * 2;
    const len = 8 + r() * 34;
    ctx.strokeStyle = `rgba(255,255,255,${0.05 + r() * 0.1})`;
    ctx.lineWidth = 0.6 + r() * 1.2;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let s = 0; s < 5; s++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * len / 5; y += Math.sin(a) * len / 5; ctx.lineTo(x, y); }
    ctx.stroke();
  }

  // Laid lines: the fine wires of the mould leave thinner, brighter lines.
  for (let y = 4; y < H; y += 9) {
    ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.011 + y * 0.3) * 0.7);
    ctx.stroke();
  }
  // Chain lines: wider apart, each with a shadow of pulp gathered beside it.
  const chainGap = 118;
  const [ch, hctx0] = canvas(W, H), [cw, wctx] = canvas(W, H);
  for (let x = 46; x < W; x += chainGap) {
    const wob = (r() - 0.5) * 4;
    hctx0.strokeStyle = 'rgba(255,255,255,0.22)'; hctx0.lineWidth = 22;
    hctx0.beginPath(); hctx0.moveTo(x + wob, 0); hctx0.lineTo(x - wob, H); hctx0.stroke();
    wctx.strokeStyle = 'rgba(0,0,0,0.42)'; wctx.lineWidth = 3;
    wctx.beginPath(); wctx.moveTo(x + wob, 0); wctx.lineTo(x - wob, H); wctx.stroke();
  }
  ctx.filter = 'blur(9px)'; ctx.drawImage(ch, 0, 0);
  ctx.filter = 'blur(1px)'; ctx.drawImage(cw, 0, 0);
  ctx.filter = 'none';

  // The watermark: a shaded question mark. Its body is thinner paper, modelled
  // light to dark like a relief, with a rim of thicker pulp around it.
  const cx = W * 0.5, cy = H * 0.6, mh = H * 0.5;
  ctx.save();
  let p = markPath(ctx, cx, cy, mh);
  const k = mh / MARKS.roman.h;
  // thick rim
  ctx.filter = 'blur(10px)'; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 34 / k; ctx.stroke(p);
  // thin body
  ctx.filter = 'blur(3px)'; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill(p);
  ctx.restore();
  // relief: thicker on the lower right inside the body
  const [m, mctx] = canvas(W, H);
  mctx.save(); p = markPath(mctx, cx, cy, mh); mctx.fillStyle = '#fff'; mctx.fill(p); mctx.restore();
  const [sh, sctx] = canvas(W, H);
  sctx.filter = 'blur(12px)'; sctx.drawImage(m, -11, -14);
  sctx.filter = 'none'; sctx.globalCompositeOperation = 'source-in'; sctx.fillStyle = 'rgba(0,0,0,0)';
  // Keep only the part of the shifted mark that falls inside the real one, inverted.
  const [rel, rctx] = canvas(W, H);
  rctx.drawImage(m, 0, 0);
  rctx.globalCompositeOperation = 'destination-out'; rctx.drawImage(sh, 0, 0);
  rctx.globalCompositeOperation = 'source-in'; rctx.fillStyle = 'rgba(255,255,255,0.5)'; rctx.fillRect(0, 0, W, H);
  ctx.filter = 'blur(5px)'; ctx.drawImage(rel, 0, 0); ctx.filter = 'none';
  // and a bright highlight on the upper left edges
  const [hi, hctx] = canvas(W, H);
  hctx.drawImage(m, 0, 0);
  hctx.globalCompositeOperation = 'destination-out'; hctx.filter = 'blur(6px)'; hctx.drawImage(m, 7, 9);
  hctx.globalCompositeOperation = 'source-in'; hctx.filter = 'none'; hctx.fillStyle = 'rgba(0,0,0,0.6)'; hctx.fillRect(0, 0, W, H);
  ctx.filter = 'blur(2px)'; ctx.drawImage(hi, 0, 0); ctx.filter = 'none';
  return c;
}

/** The cover sheet: same paper, much heavier, nothing drawn into it. */
export function makeHeavy(): HTMLCanvasElement {
  const [c, ctx] = canvas(512, 683);
  const r = rng(7);
  ctx.fillStyle = 'rgb(235,235,235)'; ctx.fillRect(0, 0, 512, 683);
  ctx.filter = 'blur(14px)';
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    ctx.beginPath(); ctx.arc(r() * 512, r() * 683, 10 + r() * 50, 0, Math.PI * 2); ctx.fill();
  }
  return c;
}

/** Fibre height, a small tile that repeats across the sheet. */
export function makeTooth(): HTMLCanvasElement {
  const n = 256;
  const [c, ctx] = canvas(n, n);
  const r = rng(11);
  const img = ctx.createImageData(n, n);
  for (let i = 0; i < n * n; i++) { const v = 100 + r() * 60; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  ctx.putImageData(img, 0, 0);
  // soften, wrapping at the edges so the tile does not show seams
  const [b, bctx] = canvas(n, n);
  const [t3, tctx] = canvas(n * 3, n * 3);
  for (const dx of [0, n, 2 * n]) for (const dy of [0, n, 2 * n]) tctx.drawImage(c, dx, dy);
  bctx.filter = 'blur(1.4px)';
  bctx.drawImage(t3, -n, -n);
  bctx.filter = 'none';
  bctx.lineCap = 'round';
  for (let i = 0; i < 160; i++) {
    let x = r() * n, y = r() * n, a = r() * 6.28;
    bctx.strokeStyle = `rgba(255,255,255,${0.12 + r() * 0.2})`; bctx.lineWidth = 0.8 + r();
    bctx.beginPath(); bctx.moveTo(x, y);
    for (let s = 0; s < 4; s++) { a += (r() - 0.5); x += Math.cos(a) * 5; y += Math.sin(a) * 5; bctx.lineTo(x, y); }
    bctx.stroke();
  }
  return b;
}

/** The black ink: SKEPTICAL across the head of the sheet, a line at the foot. */
export function makePrint(line: string): HTMLCanvasElement {
  const [c, ctx] = canvas(W, H);
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const word = 'SKEPTICAL';
  let size = 160;
  ctx.font = `600 ${size}px "Bodoni Moda Variable", "Bodoni Moda", serif`;
  // fit the word to 80% of the width, with a little tracking
  const track = 0.06;
  const measure = () => ctx.measureText(word).width + track * size * (word.length - 1);
  size = size * (W * 0.8) / measure();
  ctx.font = `600 ${size}px "Bodoni Moda Variable", "Bodoni Moda", serif`;
  let x = W / 2 - measure() / 2;
  const y = H * 0.2;
  ctx.textAlign = 'left';
  for (const ch of word) { ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + track * size; }
  // a hairline under it, and the line at the foot
  ctx.fillRect(W * 0.1, H * 0.235, W * 0.8, 2);
  ctx.textAlign = 'center';
  ctx.font = `italic 400 ${Math.round(W * 0.034)}px "Bodoni Moda Variable", "Bodoni Moda", serif`;
  ctx.fillText(line, W / 2, H * 0.93);
  return c;
}
