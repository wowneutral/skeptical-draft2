// One leaf of wax: a height map and a colour map drawn on two canvases.
// A cut lowers the height (the renderer turns it into a groove with lit and
// shaded walls) and paints pale wood at the bottom of the groove.
import * as THREE from 'three';

export const CW = 1024, CH = 666;

function rand(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function mottle(ctx: CanvasRenderingContext2D, seed: number, base: string, spots: [string, number, number][]) {
  const r = rand(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, CW, CH);
  for (const [col, n, size] of spots) {
    ctx.fillStyle = col;
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = 0.04 + r() * 0.08;
      ctx.beginPath();
      ctx.ellipse(r() * CW, r() * CH, size * (0.3 + r()), size * (0.2 + r() * 0.6), r() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

export class Wax {
  h = document.createElement('canvas');
  c = document.createElement('canvas');
  h0 = document.createElement('canvas');
  c0 = document.createElement('canvas');
  hx: CanvasRenderingContext2D;
  cx: CanvasRenderingContext2D;
  hTex: THREE.CanvasTexture;
  cTex: THREE.CanvasTexture;
  dirty = true;
  /** What is cut into it now, so a plan can skip work it does not need. */
  key = '';
  marked = false;

  constructor(seed: number) {
    for (const k of [this.h, this.c, this.h0, this.c0]) { k.width = CW; k.height = CH; }
    const h0 = this.h0.getContext('2d')!, c0 = this.c0.getContext('2d')!;
    // the wax is poured, then smoothed by hand: very low, soft undulation
    mottle(h0, seed, '#c4c4c4', [['#d6d6d6', 60, 140], ['#b4b4b4', 60, 120], ['#cfcfcf', 300, 18]]);
    mottle(c0, seed + 7, '#14110e', [['#1d1813', 90, 160], ['#0d0b09', 90, 120], ['#211b15', 400, 10]]);
    this.hx = this.h.getContext('2d', { willReadFrequently: false })!;
    this.cx = this.c.getContext('2d')!;
    this.hx.drawImage(this.h0, 0, 0);
    this.cx.drawImage(this.c0, 0, 0);
    this.hTex = new THREE.CanvasTexture(this.h);
    this.cTex = new THREE.CanvasTexture(this.c);
    this.cTex.colorSpace = THREE.SRGBColorSpace;
    for (const t of [this.hTex, this.cTex]) { t.anisotropy = 8; t.generateMipmaps = true; }
  }

  /** Cut one segment of groove, width w in canvas pixels. Order independent, so strokes can cross. */
  cut(ax: number, ay: number, bx: number, by: number, w: number) {
    const { hx, cx } = this;
    const line = (ctx: CanvasRenderingContext2D, col: string, lw: number) => {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx + 0.01, by); ctx.stroke();
    };
    hx.save();
    hx.globalCompositeOperation = 'darken';
    hx.filter = `blur(${Math.max(1, w * 0.12).toFixed(1)}px)`;
    line(hx, '#6a6a6a', w);
    line(hx, '#2a2a2a', w * 0.62);
    line(hx, '#000000', w * 0.3);
    hx.restore();
    cx.save();
    cx.globalCompositeOperation = 'lighten';
    // lit from the left and low: the left wall is in shadow, the wood floor
    // shows on the right, and the far lip catches a thin highlight
    const at = (ctx: CanvasRenderingContext2D, col: string, lw: number, dx: number, dy: number) => {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax + dx, ay + dy); ctx.lineTo(bx + dx + 0.01, by + dy); ctx.stroke();
    };
    line(cx, '#231c15', w * 0.98);
    at(cx, '#4a3a29', w * 0.5, w * 0.16, w * 0.1);
    at(cx, '#b8996c', w * 0.3, w * 0.2, w * 0.12);
    at(cx, '#e2c99c', w * 0.12, w * 0.24, w * 0.14);
    at(cx, '#6b5a47', w * 0.1, w * 0.46, w * 0.3);
    cx.restore();
    this.dirty = true;
  }

  /** The flat end passes: everything between x0 and x1 is smooth wax again. */
  smooth(x0: number, x1: number) {
    const a = Math.max(0, Math.floor(Math.min(x0, x1)) - 2), b = Math.min(CW, Math.ceil(Math.max(x0, x1)) + 2);
    if (b <= a) return;
    this.hx.drawImage(this.h0, a, 0, b - a, CH, a, 0, b - a, CH);
    this.cx.drawImage(this.c0, a, 0, b - a, CH, a, 0, b - a, CH);
    this.dirty = true;
  }

  clear() { this.smooth(0, CW); this.key = ''; this.marked = false; }

  flush() {
    if (!this.dirty) return;
    this.hTex.needsUpdate = true;
    this.cTex.needsUpdate = true;
    this.dirty = false;
  }
}
