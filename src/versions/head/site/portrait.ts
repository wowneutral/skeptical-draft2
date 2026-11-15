// The portrait.
//
// The same head, redrawn in nothing but question marks. Every tile reads the
// brightness of the photograph underneath it: a shadow is a faint mark on
// black, a midtone a bright mark on a greying tile, a highlight a paper tile
// with the mark in ink. Black stays black. The tiles keep turning, like the
// bar over the eyes.
//
// It does not appear on its own. `setSpread` takes 0..1 and the tiles arrive
// outward from the eye line, so the doubt starts where the censor is and
// takes over the whole head.

import gsap from 'gsap';
import markData from './marks.json';
import type { Eyes } from './censor';

type Mark = { d: string; w: number; h: number };
const MARKS = markData as Record<'italic' | 'roman', Mark>;

export type Portrait = {
  setSpread: (value: number) => void;
  destroy: () => void;
};

const INK = '#050505';
const PAPER = '#f0f0ec';
const FRAME = 1 / 20;
const COLS = { wide: 54, narrow: 40 };   // tiles across the head box
const TILE_FROM = 0.2, TILE_FULL = 0.62;   // brightness where a tile starts to lighten, and where it is fully paper

export function createPortrait(canvas: HTMLCanvasElement, src: string, eyes: Eyes, seed = 11): Portrait {
  const ctx = canvas.getContext('2d')!;
  const boxW = canvas.clientWidth, boxH = canvas.clientHeight;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const pxW = canvas.width = Math.round(boxW * DPR);
  const pxH = canvas.height = Math.round(boxH * DPR);
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

  // ── the grid, in device px so tiles meet without seams ────────────────
  const cols = boxW < 520 ? COLS.narrow : COLS.wide;
  const size = pxW / cols;
  const rows = Math.ceil(pxH / size);
  const n = cols * rows;
  const edge = (i: number) => Math.round(i * size);

  const lum = new Float32Array(n);        // 0..1 brightness of the photograph at this tile
  const due = new Float32Array(n);        // the spread value at which this tile turns up
  const look = new Uint8Array(n);         // which of the 16 sprites it is showing
  const shown = new Uint8Array(n);

  // Tiles arrive in order of distance from the eye line, with some noise so
  // the front is ragged instead of a clean circle.
  const ex = eyes.x * cols, ey = eyes.y * (pxH / size);
  let far = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const d = Math.hypot(c + 0.5 - ex, (r + 0.5 - ey) * 1.15);
    due[r * cols + c] = d; if (d > far) far = d;
  }
  for (let i = 0; i < n; i++) { due[i] = (due[i] / far) * 0.84 + rnd() * 0.16; look[i] = Math.floor(rnd() * 16); }

  // ── sprites: 2 cuts x 4 turns x mirrored or not, in paper and in ink ───
  const cell = Math.ceil(size);
  const atlas = document.createElement('canvas');
  atlas.width = cell * 16; atlas.height = cell * 2;
  {
    const a = atlas.getContext('2d')!;
    const scale = (cell * 0.72) / MARKS.italic.h;
    const paths = [new Path2D(MARKS.italic.d), new Path2D(MARKS.roman.d)];
    for (let row = 0; row < 2; row++) for (let k = 0; k < 16; k++) {
      a.save();
      a.translate(k * cell + cell / 2, row * cell + cell / 2);
      a.rotate(((k >> 1) & 3) * Math.PI / 2);
      a.scale(k & 8 ? -scale : scale, scale);
      a.fillStyle = row ? INK : PAPER;
      a.fill(paths[k & 1]);
      a.restore();
    }
  }
  // Upright marks should outnumber the turned ones or it stops reading as "?".
  const reroll = (i: number) => { look[i] = rnd() < 0.6 ? (look[i] & 9) : Math.floor(rnd() * 16); };
  for (let i = 0; i < n; i++) reroll(i);

  function paint(i: number) {
    const c = i % cols, r = (i - c) / cols;
    const x = edge(c), y = edge(r), w = edge(c + 1) - x, h = edge(r + 1) - y;
    if (!shown[i]) { ctx.clearRect(x, y, w, h); return; }
    const l = lum[i];
    // Tone is carried twice. The tile itself goes from black through grey to
    // paper as the photograph gets brighter, and the mark on it switches from
    // paper to ink once the tile is light enough to need the contrast.
    const tile = Math.min(1, Math.max(0, (l - TILE_FROM) / (TILE_FULL - TILE_FROM)));
    ctx.globalAlpha = 1;
    ctx.fillStyle = INK; ctx.fillRect(x, y, w, h);
    if (l < 0.03) return;
    if (tile > 0) { ctx.globalAlpha = tile; ctx.fillStyle = PAPER; ctx.fillRect(x, y, w, h); }
    if (tile > 0.5) {
      ctx.globalAlpha = 1;
      ctx.drawImage(atlas, look[i] * cell, cell, cell, cell, x, y, w, h);
    } else {
      ctx.globalAlpha = Math.min(1, 0.3 + l * 2.4);
      ctx.drawImage(atlas, look[i] * cell, 0, cell, cell, x, y, w, h);
    }
    ctx.globalAlpha = 1;
  }

  // ── read the photograph ───────────────────────────────────────────────
  let ready = false, spread = 0, alive = true;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    if (!alive) return;
    const probe = document.createElement('canvas');
    probe.width = cols; probe.height = rows;
    const p = probe.getContext('2d', { willReadFrequently: true })!;
    // The box has the photograph's proportions, so this is the whole image.
    p.drawImage(img, 0, 0, cols, (cols * boxH) / boxW);
    try {
      const data = p.getImageData(0, 0, cols, rows).data;
      for (let i = 0; i < n; i++) {
        const v = (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
        // The same grade the dither uses, so both versions of the head agree.
        lum[i] = Math.pow(Math.min(1, Math.max(0, (v - 0.5) * 1.15 + 0.5)), 1.6);
      }
      ready = true;
      apply();
    } catch { /* an image without CORS headers cannot be read: the dithered head simply stays */ }
  };
  img.src = src;

  function apply() {
    if (!ready) return;
    for (let i = 0; i < n; i++) {
      const on = spread > 0 && spread * 1.02 >= due[i] ? 1 : 0;
      if (on !== shown[i]) { shown[i] = on; paint(i); }
    }
  }

  // ── the clock: a few tiles turn every frame ───────────────────────────
  let acc = 0, visible = true;
  const io = new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; });
  io.observe(canvas);
  function tick(_time: number, deltaMs: number) {
    if (!ready || !visible || still || spread <= 0) return;
    acc += Math.min(0.1, deltaMs / 1000);
    if (acc < FRAME) return;
    acc = 0;
    for (let k = Math.ceil(n * 0.012); k > 0; k--) {
      const i = Math.floor(rnd() * n);
      if (!shown[i] || lum[i] < 0.03) continue;
      reroll(i); paint(i);
    }
  }
  gsap.ticker.add(tick);

  return {
    setSpread(value: number) {
      const v = Math.min(1, Math.max(0, value));
      if (v === spread) return;
      spread = v;
      apply();
    },
    destroy() {
      alive = false;
      img.onload = null;
      gsap.ticker.remove(tick);
      io.disconnect();
      ctx.clearRect(0, 0, pxW, pxH);
    },
  };
}
