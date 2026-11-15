// The censor.
//
// A redaction bar over the eyes, except the bar is made of question marks and
// it never holds still: every tile keeps turning, flipping and changing weight
// on its own clock. Moving the cursor toward it makes it restless.
//
// It is opaque on purpose. The veil underneath lets the cursor uncover the
// photograph, and the one part it can never uncover is the eyes.

import gsap from 'gsap';
import markData from './marks.json';

type Mark = { d: string; w: number; h: number };
const MARKS = markData as Record<'italic' | 'roman', Mark>;

/** Where the eyes are, as fractions of the image: centre, then size as a share of the image WIDTH. */
export type Eyes = { x: number; y: number; w: number; h: number; angle: number };

export type Censor = {
  /** 0 is nothing, 1 is fully covered. Tiles arrive in a shuffled order in between. */
  setProgress: (value: number) => void;
  destroy: () => void;
};

type Tile = {
  col: number; row: number;
  fringe: boolean;      // outside the bar proper: comes and goes, so the edge is ragged
  on: boolean;
  born: number;         // 0..1, the progress at which this tile turns up
  next: number;         // time of its next change
  turn: number;         // quarter turns
  flip: boolean;
  roman: boolean;
  tone: number;         // 0 bright, 1 mid, 2 dim
  inverse: boolean;     // paper tile, ink mark
};

const INK = '#050505';
const PAPER = '240,240,236';
const TONES = [1, 0.6, 0.3];
const FRINGE = 0.3;      // share of the tiles just outside the bar that are present at any moment
const FRAME = 1 / 24;   // the bar changes at most this often, which reads as mechanical, not jittery

export function createCensor(canvas: HTMLCanvasElement, eyes: Eyes, seed = 7): Censor {
  const ctx = canvas.getContext('2d')!;
  const boxW = canvas.clientWidth, boxH = canvas.clientHeight;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(boxW * DPR);
  canvas.height = Math.round(boxH * DPR);

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

  // ── the grid ──────────────────────────────────────────────────────────
  const barW = eyes.w * boxW, barH = eyes.h * boxW;
  const rows = Math.max(3, Math.min(5, Math.round(barH / 25)));
  const cell = barH / rows;
  const cols = Math.ceil(barW / cell);
  const paths = {
    italic: new Path2D(MARKS.italic.d),
    roman: new Path2D(MARKS.roman.d),
  };
  const markScale = (cell * 0.7) / MARKS.italic.h;

  const tiles: Tile[] = [];
  for (let row = -1; row <= rows; row++) {
    for (let col = -1; col <= cols; col++) {
      const fringe = row < 0 || row >= rows || col < 0 || col >= cols;
      const corner = (row < 0 || row >= rows) && (col < 0 || col >= cols);
      if (corner) continue;
      tiles.push({
        col, row, fringe,
        on: !fringe || rnd() < FRINGE,
        born: fringe ? 0.55 + rnd() * 0.45 : rnd() * 0.8,
        next: 0, turn: 0, flip: false, roman: false, tone: 0, inverse: false,
      });
    }
  }

  function roll(t: Tile) {
    t.turn = rnd() < 0.62 ? 0 : Math.floor(rnd() * 4);
    t.flip = rnd() < 0.3;
    t.roman = rnd() < 0.35;
    const k = rnd();
    t.tone = k < 0.55 ? 0 : k < 0.85 ? 1 : 2;
    t.inverse = rnd() < 0.045;
    if (t.fringe) t.on = rnd() < FRINGE;
  }
  for (const t of tiles) roll(t);

  // ── drawing ───────────────────────────────────────────────────────────
  let progress = 0, drawn = -1, dirty = true;
  const cx = eyes.x * boxW, cy = eyes.y * boxH;
  const rad = (eyes.angle * Math.PI) / 180;
  const left = -(cols * cell) / 2, top = -barH / 2;

  function draw() {
    dirty = false; drawn = progress;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, boxW, boxH);
    if (progress <= 0) return;
    ctx.translate(cx, cy); ctx.rotate(rad);

    // Tiles first, then marks. Neighbouring tiles overlap by a hair so no
    // seam of the face shows between them once the bar is rotated.
    for (const t of tiles) {
      if (!t.on || progress < t.born) continue;
      ctx.fillStyle = t.inverse ? `rgb(${PAPER})` : INK;
      ctx.fillRect(left + t.col * cell - 0.4, top + t.row * cell - 0.4, cell + 0.8, cell + 0.8);
    }
    for (const t of tiles) {
      if (!t.on || progress < t.born) continue;
      ctx.save();
      ctx.translate(left + (t.col + 0.5) * cell, top + (t.row + 0.5) * cell);
      ctx.rotate((t.turn * Math.PI) / 2);
      ctx.scale(t.flip ? -markScale : markScale, markScale);
      ctx.fillStyle = t.inverse ? INK : `rgba(${PAPER},${TONES[t.tone]})`;
      ctx.fill(t.roman ? paths.roman : paths.italic);
      ctx.restore();
    }
  }

  // ── the clock ─────────────────────────────────────────────────────────
  let heat = 0, px = -1e4, py = -1e4, acc = 0, visible = true;

  const onMove = (e: PointerEvent) => { px = e.clientX; py = e.clientY; };
  window.addEventListener('pointermove', onMove, { passive: true });

  // The newest entry, not the first: a pin moves the canvas in the DOM and
  // the observer then reports "left, came back" in a single batch.
  const io = new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; });
  io.observe(canvas);

  function tick(time: number, deltaMs: number) {
    if (!visible) return;
    const dt = Math.min(0.1, deltaMs / 1000);
    acc += dt;
    if (acc < FRAME) return;
    acc = 0;

    if (progress > 0 && !still) {
      // How close the cursor is to the bar, 1 on top of it and 0 a bar-length away.
      const rect = canvas.getBoundingClientRect();
      const d = Math.hypot(px - (rect.left + cx), py - (rect.top + cy));
      const near = Math.max(0, 1 - d / (barW * 0.9));
      heat += (near - heat) * 0.25;

      // While the bar is still arriving it churns; once it is in, it settles
      // to a slow shimmer; the cursor stirs it back up.
      const arriving = progress < 1 ? 1 : 0;
      const pace = 1 / (1 + 5 * Math.max(heat, arriving));
      for (const t of tiles) {
        if (time < t.next) continue;
        roll(t);
        t.next = time + (0.18 + rnd() * 1.5) * pace;
        dirty = true;
      }
    }
    if (dirty || drawn !== progress) draw();
  }
  gsap.ticker.add(tick);

  return {
    setProgress(value: number) {
      progress = Math.min(1, Math.max(0, value));
      // Nothing is ticking for a reader who asked for no motion, so draw now.
      if (still && drawn !== progress) draw();
    },
    destroy() {
      gsap.ticker.remove(tick);
      window.removeEventListener('pointermove', onMove);
      io.disconnect();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
