// The rubbing engine. A 2D canvas per tablet:
//   raised  the stone's height map (255 = face of the stone, 0 = cut or off the stone), softened for a bevel
//   acc     how much graphite the sheet has taken at each pixel (0..1)
//   tooth   the paper's grain, one tile shared by every sheet
// Graphite only lands where the stone is raised, and catches the peaks of the paper first.

export const FACE = '"EB Garamond Variable", "EB Garamond", Georgia, serif';
const TS = 512;
let TOOTH: Float32Array | null = null;

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function valueNoise(size: number, cells: number, rand: () => number) {
  const g = new Float32Array(cells * cells);
  for (let i = 0; i < g.length; i++) g[i] = rand();
  const out = new Float32Array(size * size);
  const k = cells / size;
  for (let y = 0; y < size; y++) {
    const gy = y * k, y0 = Math.floor(gy), fy = gy - y0, sy = fy * fy * (3 - 2 * fy);
    const r0 = (y0 % cells) * cells, r1 = ((y0 + 1) % cells) * cells;
    for (let x = 0; x < size; x++) {
      const gx = x * k, x0 = Math.floor(gx), fx = gx - x0, sx = fx * fx * (3 - 2 * fx);
      const c0 = x0 % cells, c1 = (x0 + 1) % cells;
      const a = g[r0 + c0] + (g[r0 + c1] - g[r0 + c0]) * sx;
      const b = g[r1 + c0] + (g[r1 + c1] - g[r1 + c0]) * sx;
      out[y * size + x] = a + (b - a) * sy;
    }
  }
  return out;
}

/** Paper tooth: fine grain, laid fibres and a faint cloud, tileable. */
export function tooth() {
  if (TOOTH) return TOOTH;
  const rand = rng(71);
  const n = new Float32Array(TS * TS);
  for (let i = 0; i < n.length; i++) n[i] = rand();
  // soften the white noise a little so the grain has body
  const b = new Float32Array(TS * TS);
  for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
    let s = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s += n[((y + j + TS) % TS) * TS + ((x + i + TS) % TS)] * (i === 0 && j === 0 ? 2 : 1);
    b[y * TS + x] = s / 10;
  }
  // fibres, mostly laid one way
  for (let f = 0; f < 2600; f++) {
    const x0 = rand() * TS, y0 = rand() * TS, len = 6 + rand() * 34, a = (rand() - 0.5) * 0.9 + (rand() < 0.2 ? Math.PI / 2 : 0);
    const amp = (rand() - 0.45) * 0.22;
    for (let t = 0; t < len; t++) {
      const x = Math.floor(x0 + Math.cos(a) * t + TS) % TS, y = Math.floor(y0 + Math.sin(a) * t + TS) % TS;
      b[y * TS + x] += amp;
    }
  }
  const c1 = valueNoise(TS, 8, rand), c2 = valueNoise(TS, 32, rand);
  let mn = 9, mx = -9;
  for (let i = 0; i < b.length; i++) {
    b[i] = (b[i] - 0.5) * 1.6 + (c1[i] - 0.5) * 0.35 + (c2[i] - 0.5) * 0.25;
    if (b[i] < mn) mn = b[i]; if (b[i] > mx) mx = b[i];
  }
  for (let i = 0; i < b.length; i++) b[i] = (b[i] - mn) / (mx - mn);
  TOOTH = b;
  return b;
}

export type Layout = { font: number; h: number; pad: number; lead: number };
export type Opts = { maxFont: number; hint?: number; weight?: number; track?: number; padX?: number; padY?: number; lead?: number; seed?: number; align?: 'center' | 'left' };
export type Box = { word: string; x0: number; y0: number; x1: number; y1: number };

let meas: CanvasRenderingContext2D | null = null;
function measure(text: string, font: string, track: number, size: number) {
  meas ??= document.createElement('canvas').getContext('2d')!;
  meas.font = font;
  let w = 0;
  for (const ch of text) w += meas.measureText(ch).width + track * size;
  return w - track * size;
}

/** Size the carving to a width in CSS pixels. */
export function layout(lines: string[], cssW: number, o: Opts): Layout {
  const wt = o.weight ?? 520, track = o.track ?? 0.07;
  const widest = Math.max(...lines.map((l) => measure(l, `${wt} 100px ${FACE}`, track, 100)));
  const padX = o.padX ?? 0.07;
  const fit = ((cssW * (1 - padX * 2)) / widest) * 100;
  const font = Math.max(18, Math.min(o.maxFont, fit));
  const lead = o.lead ?? 1.02;
  const pad = font * (o.padY ?? 0.3);
  return { font, h: Math.round((lines.length - 1) * font * lead * 0.78 + font * 0.8 + pad * 2), pad, lead };
}

export class Sheet {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  W = 1; H = 1; dpr = 1;
  raised = new Uint8Array(1);
  slab = new Uint8Array(1);
  acc = new Float32Array(1);
  img: ImageData | null = null;
  words: Box[] = [];
  faceCount = 1;
  dirty = [1e9, 1e9, -1, -1];
  last: [number, number] | null = null;
  autoRaf = 0;
  front = 0;
  hint = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: false })!;
  }

  build(lines: string[], cssW: number, L: Layout, o: Opts) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(1.8e6 / Math.max(1, cssW * L.h)));
    const W = Math.max(2, Math.round(cssW * dpr)), H = Math.max(2, Math.round(L.h * dpr));
    this.W = W; this.H = H; this.dpr = dpr; this.hint = o.hint ?? 0;
    this.canvas.width = W; this.canvas.height = H;
    const rand = rng(o.seed ?? 7);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);

    // the slab, with chipped edges
    const m = Math.round(L.font * 0.14 * dpr);
    const x0 = m, y0 = m, x1 = W - m, y1 = H - m;
    const step = Math.max(10, 18 * dpr);
    const chip = () => (rand() < 0.08 ? rand() * 7 : rand() * 2.2) * dpr;
    g.beginPath(); g.moveTo(x0 + chip(), y0 + chip());
    for (let x = x0; x < x1; x += step) g.lineTo(x, y0 + chip());
    for (let y = y0; y < y1; y += step) g.lineTo(x1 - chip(), y);
    for (let x = x1; x > x0; x -= step) g.lineTo(x, y1 - chip());
    for (let y = y1; y > y0; y -= step) g.lineTo(x0 + chip(), y);
    g.closePath(); g.fillStyle = '#fff'; g.fill();
    // corners knocked off
    g.fillStyle = '#000';
    for (const [cx, cy] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) {
      if (rand() < 0.6) { g.beginPath(); g.arc(cx, cy, (3 + rand() * 9) * dpr, 0, Math.PI * 2); g.fill(); }
    }
    const slabData = g.getImageData(0, 0, W, H).data;

    // the inscription, cut in, a little uneven
    const wt = o.weight ?? 520, track = o.track ?? 0.07;
    const fs = L.font * dpr;
    g.font = `${wt} ${fs}px ${FACE}`;
    g.textBaseline = 'alphabetic';
    g.filter = `blur(${Math.max(0.8, fs * 0.011).toFixed(2)}px)`;
    g.fillStyle = '#000';
    this.words = [];
    const lineH = fs * L.lead * 0.78;
    const top = L.pad * dpr + fs * 0.72;
    lines.forEach((line, li) => {
      const lw = measure(line, `${wt} ${fs}px ${FACE}`, track, fs);
      let x = o.align === 'left' ? (o.padX ?? 0.07) * W : (W - lw) / 2;
      const base = top + li * lineH;
      let wordStart = x, word = '';
      const flush = () => { if (word.trim()) this.words.push({ word, x0: wordStart, x1: x - track * fs, y0: base - fs * 0.72, y1: base + fs * 0.04 }); word = ''; };
      for (const ch of line) {
        if (ch === ' ') { flush(); x += g.measureText(ch).width + track * fs; wordStart = x; continue; }
        if (!word) wordStart = x;
        word += ch;
        const cw = g.measureText(ch).width;
        g.save();
        g.translate(x + cw / 2, base + (rand() - 0.5) * fs * 0.018);
        g.rotate((rand() - 0.5) * 0.016);
        const s = 1 + (rand() - 0.5) * 0.025;
        g.scale(s, s);
        g.fillText(ch, -cw / 2, 0);
        g.restore();
        x += cw + track * fs;
      }
      flush();
    });
    g.filter = 'none';
    // weathering: pits and the odd hairline
    const area = (x1 - x0) * (y1 - y0);
    for (let i = 0; i < area / (900 * dpr * dpr); i++) {
      g.fillStyle = `rgba(0,0,0,${0.25 + rand() * 0.5})`;
      g.beginPath(); g.arc(x0 + rand() * (x1 - x0), y0 + rand() * (y1 - y0), (0.5 + rand() * rand() * 2.6) * dpr, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 0.9 * dpr;
    for (let i = 0; i < 2; i++) {
      let px = x0 + rand() * (x1 - x0), py = y0 + rand() * (y1 - y0);
      g.beginPath(); g.moveTo(px, py);
      for (let k = 0; k < 9; k++) { px += (rand() - 0.3) * 30 * dpr; py += (rand() - 0.5) * 16 * dpr; g.lineTo(px, py); }
      g.stroke();
    }
    const d = g.getImageData(0, 0, W, H).data;
    const und = valueNoise(256, 6, rand);
    this.raised = new Uint8Array(W * H);
    this.slab = new Uint8Array(W * H);
    let faces = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      this.slab[i] = slabData[i * 4];
      const u = und[((y >> 2) & 255) * 256 + ((x >> 2) & 255)];
      const v = d[i * 4] * (0.8 + 0.2 * u);
      this.raised[i] = v;
      if (v > 128) faces++;
    }
    this.faceCount = Math.max(1, faces);
    this.acc = new Float32Array(W * H);
    this.img = this.ctx.createImageData(W, H);
    this.front = 0;
    this.all();
    this.flush();
  }

  all() { this.dirty = [0, 0, this.W, this.H]; }
  mark(x0: number, y0: number, x1: number, y1: number) {
    const d = this.dirty;
    d[0] = Math.max(0, Math.min(d[0], Math.floor(x0))); d[1] = Math.max(0, Math.min(d[1], Math.floor(y0)));
    d[2] = Math.min(this.W, Math.max(d[2], Math.ceil(x1))); d[3] = Math.min(this.H, Math.max(d[3], Math.ceil(y1)));
  }

  /** Composite graphite onto the dirty rectangle. */
  flush() {
    const [dx0, dy0, dx1, dy1] = this.dirty;
    if (dx1 <= dx0 || dy1 <= dy0 || !this.img) return;
    const T = tooth(), px = this.img.data, W = this.W, acc = this.acc, raised = this.raised, hint = this.hint;
    for (let y = dy0; y < dy1; y++) {
      const tr = (y & (TS - 1)) * TS;
      for (let x = dx0; x < dx1; x++) {
        const i = y * W + x, o = i * 4;
        const t = T[tr + (x & (TS - 1))];
        const c = acc[i] * raised[i] / 255;
        let a = 0;
        if (c > 0.002) {
          a = (t - 1 + c * 1.45) * 3.4;
          a = a < 0 ? 0 : a > 1 ? 1 : a;
          a *= (c * 1.7 > 1 ? 1 : c * 1.7) * (0.64 + 0.36 * t);
        }
        // the sheet itself: a whisper of fibre where there is no graphite
        let paper = (0.42 - t) * 0.09;
        if (hint && x > 2 && y > 2 && a < 0.5) {
          // blind emboss: the paper sags into the cuts, so their edges catch the light
          const e = ((raised[i - W * 2 - 2] - raised[i]) / 255) * hint * (1 - a * 2);
          if (e < -0.02) { px[o] = 255; px[o + 1] = 253; px[o + 2] = 247; px[o + 3] = Math.min(1, -e * 0.9) * 255; continue; }
          if (e > paper) paper = e;
        }
        if (paper > a) { px[o] = 70; px[o + 1] = 63; px[o + 2] = 52; px[o + 3] = paper * 255; }
        else { px[o] = 36; px[o + 1] = 35; px[o + 2] = 33; px[o + 3] = a * 248; }
      }
    }
    this.ctx.putImageData(this.img, 0, 0, dx0, dy0, dx1 - dx0, dy1 - dy0);
    this.dirty = [1e9, 1e9, -1, -1];
  }

  stamp(cx: number, cy: number, r: number, s: number) {
    const W = this.W, H = this.H, acc = this.acc, r2 = r * r;
    const xa = Math.max(0, Math.floor(cx - r)), xb = Math.min(W - 1, Math.ceil(cx + r));
    const ya = Math.max(0, Math.floor(cy - r)), yb = Math.min(H - 1, Math.ceil(cy + r));
    for (let y = ya; y <= yb; y++) {
      const dy = y - cy;
      for (let x = xa; x <= xb; x++) {
        const dx = x - cx, q = (dx * dx + dy * dy) / r2;
        if (q >= 1) continue;
        const f = (1 - q) * (1 - q), i = y * W + x;
        const v = acc[i] + s * f * (1 - acc[i] * 0.55);
        acc[i] = v > 1 ? 1 : v;
      }
    }
    this.mark(xa, ya, xb + 1, yb + 1);
  }

  /** Pointer path in CSS pixels. Returns how far it moved (device px). */
  rub(cssX: number, cssY: number, cssR: number) {
    const x = cssX * this.dpr, y = cssY * this.dpr, r = cssR * this.dpr;
    const l = this.last;
    this.last = [x, y];
    if (!l) { this.stamp(x, y, r, 0.04); return 0; }
    const dist = Math.hypot(x - l[0], y - l[1]);
    if (dist > Math.max(r * 6, this.W * 0.6)) return 0; // a jump, not a stroke
    const n = Math.max(1, Math.ceil(dist / (r * 0.28)));
    const s = 0.045 + Math.min(0.07, (dist / r) * 0.02);
    for (let k = 1; k <= n; k++) this.stamp(l[0] + ((x - l[0]) * k) / n, l[1] + ((y - l[1]) * k) / n, r, s);
    return dist;
  }
  lift() { this.last = null; }

  /** One even diagonal pass, the frontier moving from left to right. Returns a promise when it reaches `to`. */
  pass(to = 1, dur = 1500): Promise<void> {
    cancelAnimationFrame(this.autoRaf);
    const W = this.W, H = this.H, acc = this.acc;
    const dx = 0.88, dy = 0.47; // the direction the hand travels
    const soft = Math.max(40, H * 0.22);
    const range = W * dx + H * dy + soft;
    const from = this.front, start = performance.now();
    // streaks along the stroke direction
    const streak = new Float32Array(512);
    const rand = rng(Math.floor(this.W + this.H));
    let v = 0.5;
    for (let i = 0; i < 512; i++) { v += (rand() - 0.5) * 0.35; v = Math.min(1, Math.max(0, v)); streak[i] = v; }
    return new Promise((done) => {
      let prev = from * range;
      const frame = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const p = from + (to - from) * e;
        const front = p * range;
        const lo = prev - soft * 1.2, hi = front;
        for (let y = 0; y < H; y++) {
          const xa = Math.max(0, Math.floor((lo - y * dy) / dx)), xb = Math.min(W, Math.ceil((hi - y * dy) / dx));
          for (let x = xa; x < xb; x++) {
            const proj = x * dx + y * dy;
            const perp = (-x * dy + y * dx) * 0.06;
            const si = ((Math.floor(perp) % 512) + 512) % 512;
            const rag = streak[(si * 7) & 511] * soft * 0.55;
            let k = (front - proj - rag) / soft;
            if (k <= 0) continue;
            k = k > 1 ? 1 : k * k * (3 - 2 * k);
            const target = k * (0.9 + 0.1 * streak[si]);
            const i = y * W + x;
            if (acc[i] < target) acc[i] = target;
          }
        }
        this.mark(Math.max(0, (lo - H * dy) / dx), 0, Math.min(W, hi / dx + 2), H);
        this.flush();
        prev = front;
        this.front = p;
        if (t < 1) this.autoRaf = requestAnimationFrame(frame);
        else done();
      };
      this.autoRaf = requestAnimationFrame(frame);
    });
  }
  stop() { cancelAnimationFrame(this.autoRaf); }

  fill(v = 1) { this.acc.fill(v); this.front = 1; this.all(); this.flush(); }

  /** Fade the graphite off, as if erased. */
  fade(dur = 600): Promise<void> {
    cancelAnimationFrame(this.autoRaf);
    const start = performance.now(), acc = this.acc;
    return new Promise((done) => {
      const frame = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        const k = t < 1 ? 0.84 : 0;
        for (let i = 0; i < acc.length; i++) acc[i] *= k;
        this.all(); this.flush();
        if (t < 1) this.autoRaf = requestAnimationFrame(frame);
        else { this.front = 0; done(); }
      };
      this.autoRaf = requestAnimationFrame(frame);
    });
  }

  /** Fraction of the stone's face that has come up (sampled). */
  coverage(b?: Box) {
    const W = this.W, acc = this.acc, raised = this.raised;
    const x0 = b ? Math.floor(b.x0) : 0, x1 = b ? Math.ceil(b.x1) : W;
    const y0 = b ? Math.floor(b.y0) : 0, y1 = b ? Math.ceil(b.y1) : this.H;
    let n = 0, up = 0;
    for (let y = Math.max(0, y0); y < Math.min(this.H, y1); y += 3) for (let x = Math.max(0, x0); x < Math.min(W, x1); x += 3) {
      const i = y * W + x;
      if (raised[i] > 128) { n++; if (acc[i] > 0.42) up++; }
    }
    return n ? up / n : 0;
  }

  /** The bare stone, lit from the upper left, drawn into a canvas of the same size. */
  stone(target: HTMLCanvasElement) {
    const W = this.W, H = this.H, h = this.raised, slab = this.slab;
    target.width = W; target.height = H;
    const g = target.getContext('2d')!;
    const im = g.createImageData(W, H), px = im.data, T = tooth();
    const rand = rng(3);
    const cloud = valueNoise(256, 10, rand);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x, o = i * 4;
      if (slab[i] < 10) continue;
      const nx = (h[i - 1] - h[i + 1]) / 255, ny = (h[i - W] - h[i + W]) / 255;
      const lit = (-nx * 0.7 - ny * 0.7) * 2.4;
      const t = T[(y & 511) * 512 + (x & 511)], cl = cloud[((y >> 2) & 255) * 256 + ((x >> 2) & 255)];
      const depth = 1 - h[i] / 255;
      let v = 132 + (t - 0.5) * 34 + (cl - 0.5) * 30 - depth * 26;
      v *= 1 + lit;
      v = v < 0 ? 0 : v > 255 ? 255 : v;
      px[o] = v * 0.99; px[o + 1] = v * 0.975; px[o + 2] = v * 0.94; px[o + 3] = slab[i];
    }
    g.putImageData(im, 0, 0);
  }
}
