// The game. One canvas, one loop, no React inside it: the page listens to the
// events and keeps the flow. Everything is drawn as thin lines; the title and
// the drive's folders are real extrusions turned in three dimensions (wire.ts).
import MARKS from '@/lib/marks.json';
import { clamp, lerp } from '@/lib/utils';
import GLYPHS from './glyphs.json';
import { WAVES, TOTAL, type Item, type Result } from './data';
import { drawSolid, euler, mul, project, shape, shapeOf, type Cam, type Mat, type Shape, type SolidStyle } from './wire';

export type Phase = 'attract' | 'card' | 'play' | 'paused' | 'over';
export type Hud = { score: number; combo: number; mult: number; lives: number; wave: number };
export type Sfx = 'start' | 'catch' | 'clean' | 'drop' | 'wave' | 'clear' | 'life' | 'lost' | 'won' | 'pause' | 'tick';
export type Events = {
  phase(p: Phase): void;
  hud(h: Hud): void;
  caught(it: Item): void;
  dropped(it: Item): void;
  wave(i: number): void;
  waveDone(i: number): void;
  reset(): void;
  over(r: Result): void;
  sfx(name: Sfx, n?: number): void;
};

export const INK = '#e8f1ff', YOU = '#4fe9ff', HOT = '#ff3158', BG = '#04060a';
const MONO = '"Chivo Mono", ui-monospace, Menlo, monospace';
const BIG = '"Unbounded Variable", "Chivo Mono", sans-serif';
const TAU = Math.PI * 2;
const LIVES = 3;
const CAP = (GLYPHS as { capHeight: number }).capHeight;
const TITLE = 'THEDROP.';

const QUIPS = ['Conceded.', 'Silence is consent.', 'That one flows through.', 'No answer. Noted.', 'Cold conceded.', 'The judge wrote that down.', 'Too slow. It stands.', 'Extend what, exactly?'];

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const outBack = (t: number) => { const c = 1.70158; const u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; };
const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const bounce = (t: number) => {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};

type Spr = { c: HTMLCanvasElement; w: number; h: number };
type Faller = {
  it: Item | null; kind: 'card' | 'folder' | 'mark' | 'stop';
  x: number; y: number; x0: number; w: number; h: number; vy: number;
  t: number; seed: number; sway: number; missed: boolean; skip: boolean;
  spr: Spr | null; hot: Spr | null; size: number;
};
type Part = { k: 0 | 1 | 2; x: number; y: number; vx: number; vy: number; r: number; vr: number; len: number; t: number; life: number; col: string; g: number };
type Flyer = { spr: Spr; x0: number; y0: number; x1: number; y1: number; cx: number; cy: number; t: number; hold: number };
type Stamp = { x: number; y: number; t: number; quip: string; small: boolean };
type Pop = { x: number; y: number; t: number; life: number; text: string; col: string; size: number; big: boolean };
type Spawn = { it: Item; at: number; xf: number; sp: number; sway: number; y0: number };
type Letter = {
  ch: string; s: Shape; line: 0 | 1; pen: number; lx: number; ly: number; k: number; delay: number;
  free: boolean; gone: boolean; px: number; py: number; vx: number; vy: number; rx: number; ry: number; rz: number; wx: number; wy: number; wz: number; back: number;
};

function wrap(g: CanvasRenderingContext2D, font: string, text: string, max: number): string[] {
  g.font = font;
  const out: string[] = []; let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && g.measureText(next).width > max) { out.push(line); line = word; } else line = next;
  }
  if (line) out.push(line);
  return out;
}

export class Game {
  phase: Phase = 'attract';
  private before: Phase = 'play';
  private g: CanvasRenderingContext2D;
  private mg: CanvasRenderingContext2D;
  w = 0; h = 0; private dpr = 1;
  /** Where the flow is, so a caught card knows which way to fly. */
  side: 'right' | 'top' = 'right';
  private raf = 0; private last = 0; private now = 0;
  private seen = true; private dead = false;
  private ro: ResizeObserver; private io: IntersectionObserver;

  // the catcher
  cx = 0; private cvx = 0; target = 0; private keys = { l: false, r: false }; private mode: 'pointer' | 'keys' = 'pointer';
  private squash = 1; private glow = 0; private trail: number[] = [];
  private lastInput = -10;
  cy = 0; floor = 0; cw = 170;

  // the round
  score = 0; combo = 0; maxCombo = 0; lives = LIVES; wave = 0; caught = 0; drops = 0;
  fallers: Faller[] = [];
  private parts: Part[] = []; private flyers: Flyer[] = []; private stamps: Stamp[] = []; private pops: Pop[] = [];
  private queue: Spawn[] = []; private waveT = 0; private left = 0; private waveDrops = 0;
  private cardT = 0; private inter = 0; private ending = 0; private won = false;
  private shake = 0; private flash = 0; private stop = 0; private slow = 1;
  private sprites = new Map<string, Spr>();
  private fs = 16; private cardMax = 320; private fold = 50;
  private lanes = 0;
  /** Prep time: a meter you can spend to slow the round down. */
  prep = 1; private prepOn = false; private prepK = 0; private prepOut = 0;

  // the title and the attract loop
  private letters: Letter[] = []; private titleT = 0; private titleOn = true; private tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  private tk = 0; private tcx = 0; private tcy = 0;
  private mark: Shape; private drift: { x: number; y: number; s: number; v: number; a: number; r: number }[] = [];
  private attractT = 0; private stopT = 4; private stopAway = false;
  private m1: Mat = new Float32Array(9); private m2: Mat = new Float32Array(9); private m3: Mat = new Float32Array(9);
  private p2: [number, number] = [0, 0];
  private glyph = new Map<string, { s: Shape; adv: number; off: number }>();
  private tray: Shape | null = null; private fire = 0;
  private overT = 0;

  static best = 0;

  constructor(private canvas: HTMLCanvasElement, private field: HTMLElement, private ev: Events, private auto = false) {
    this.g = canvas.getContext('2d')!;
    this.mg = document.createElement('canvas').getContext('2d')!;
    this.mark = shape(MARKS.roman.d, 30);
    for (const gl of (GLYPHS as { glyphs: { ch: string; d: string; x: number; advance: number }[] }).glyphs) {
      const s = shape(gl.d, 42);
      this.glyph.set(gl.ch, { s, adv: gl.advance, off: s.ox - gl.x });
      if (!TITLE.includes(gl.ch)) continue;
      this.letters.push({ ch: gl.ch, s, line: 'THE'.includes(gl.ch) ? 0 : 1, pen: s.ox - gl.x, lx: 0, ly: 0, k: 1, delay: 0, free: false, gone: false, px: 0, py: 0, vx: 0, vy: 0, rx: 0, ry: 0, rz: 0, wx: 0, wy: 0, wz: 0, back: 0 });
    }
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(field);
    this.io = new IntersectionObserver(([e]) => {
      this.seen = e.isIntersecting;
      if (e.intersectionRatio < 0.45 && (this.phase === 'play' || this.phase === 'card')) this.pause(true);
    }, { threshold: [0, 0.45, 1] });
    this.io.observe(field);
    this.resize();
    this.cx = this.target = this.w / 2;
    window.addEventListener('pointermove', this.onMove, { passive: true });
    field.addEventListener('pointerdown', this.onDown, { passive: true });
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onBlur);
    // Card sprites are drawn with the page's fonts; draw them again once those have arrived.
    document.fonts?.ready.then(() => { this.sprites.clear(); for (const f of this.fallers) if (f.it && f.kind === 'card') { f.spr = this.card(f.it, false); f.hot = null; } });
    for (const f of [`500 16px ${MONO}`, `700 16px ${MONO}`, `800 40px ${BIG}`]) document.fonts?.load(f).catch(() => {});
    if (auto) this.titleOn = false;
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect(); this.io.disconnect();
    window.removeEventListener('pointermove', this.onMove);
    this.field.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onBlur);
  }

  // ---------------------------------------------------------------- input

  private onMove = (e: PointerEvent) => {
    const r = this.field.getBoundingClientRect();
    if (e.pointerType === 'touch' && (e.clientY < r.top || e.clientY > r.bottom || (e.target as HTMLElement).closest?.('button, a'))) return;
    this.target = clamp(e.clientX - r.left, 0, this.w);
    this.mode = 'pointer';
    this.lastInput = this.now;
    this.tilt.tx = clamp((e.clientX - r.left) / Math.max(1, this.w) - 0.5, -0.7, 0.7);
    this.tilt.ty = clamp((e.clientY - r.top) / Math.max(1, this.h) - 0.5, -0.7, 0.7);
  };
  private onDown = (e: PointerEvent) => { this.onMove(e); };
  private onKey = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const l = e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A', r = e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D';
    const pr = e.key === 'Shift' || e.key === 'ArrowDown' || e.key === 's' || e.key === 'S';
    if (pr && this.seen && (this.phase === 'play' || this.phase === 'card')) { this.setPrep(true); if (e.key === 'ArrowDown') e.preventDefault(); return; }
    if (!l && !r) return;
    if ((e.target as HTMLElement).closest?.('input, textarea, select, [role="slider"]')) return;
    if (!this.seen) return;
    if (l) this.keys.l = true; else this.keys.r = true;
    this.mode = 'keys'; this.lastInput = this.now;
    if (this.phase !== 'paused' && e.key.startsWith('Arrow')) e.preventDefault();
  };
  private onKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.l = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.r = false;
    if (e.key === 'Shift' || e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.setPrep(false);
  };
  private onBlur = () => {
    this.keys.l = this.keys.r = false; this.prepOn = false;
    if (document.hidden || !document.hasFocus()) { if (this.phase === 'play' || this.phase === 'card') this.pause(true); }
  };

  // ---------------------------------------------------------------- layout

  resize = () => {
    const r = this.field.getBoundingClientRect();
    const w = Math.max(200, Math.round(r.width)), h = Math.max(240, Math.round(r.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w === this.w && h === this.h && dpr === this.dpr) return;
    const first = this.w === 0;
    if (!first) { this.cx *= w / this.w; this.target *= w / this.w; }
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    const small = w < 620;
    this.fs = small ? 14 : w > 900 ? 18 : 16;
    this.cardMax = small ? Math.min(w * 0.62, 244) : Math.min(w * 0.42, 400);
    this.fold = small ? 40 : 52;
    this.cw = small ? clamp(w * 0.31, 104, 128) : clamp(w * 0.18, 150, 190);
    this.cy = h - (small ? 142 : 150);
    this.floor = h - (small ? 72 : 78);
    this.sprites.clear();
    // the catcher is a shallow tray: a bracket with thickness, seen from a little above
    const hw = this.cw / 2, th = 5;
    this.tray = shapeOf([{ x: [-hw, -hw, hw, hw, hw - th, hw - th, -hw + th, -hw + th], y: [-20, 8, 8, -20, -20, 3, 3, -20] }]);
    this.layoutTitle();
    if (this.drift.length === 0) for (let i = 0; i < 12; i++) this.drift.push({ x: Math.random(), y: Math.random(), s: rnd(0.5, 1.5), v: rnd(0.012, 0.035), a: rnd(0, TAU), r: rnd(-0.6, 0.6) });
  };

  private layoutTitle() {
    const { w, h } = this;
    const small = w < 620;
    const kx = small ? 0.84 : 1;
    const adv = (line: 0 | 1) => (GLYPHS as { glyphs: { ch: string; advance: number }[] }).glyphs.filter((gl) => TITLE.includes(gl.ch) && ('THE'.includes(gl.ch) ? 0 : 1) === line).reduce((a, gl) => a + gl.advance, 0);
    const w2 = adv(1);
    const k = Math.min((w * (small ? 0.92 : 0.84)) / (w2 * kx), (h * 0.3) / CAP, 0.3);
    const r = small ? 0.44 : 0.36;
    const capA = CAP * k * r, capB = CAP * k, gap = capB * 0.2;
    const total = capA + gap + capB;
    this.tk = k; this.tcx = w / 2; this.tcy = h * (small ? 0.3 : 0.36);
    const baseB = total / 2, baseA = baseB - capB - gap;
    const first: number[] = [NaN, NaN];
    const glyphs = (GLYPHS as { glyphs: { ch: string; x: number }[] }).glyphs;
    this.letters.forEach((L, i) => {
      if (Number.isNaN(first[L.line])) first[L.line] = glyphs[i].x;
      const kk = L.line === 0 ? k * r : k;
      const pen = glyphs[i].x - first[L.line];
      L.k = kk;
      L.lx = (pen + L.pen + 0) * kk * kx - (w2 * k * kx) / 2 + (L.line === 0 ? capB * 0.05 : 0);
      L.ly = (L.line === 0 ? baseA : baseB) + L.s.oy * kk;
      L.delay = L.line === 0 ? 0.05 + i * 0.05 : 0.22 + (i - 3) * 0.085;
      if (L.ch === '.') L.delay += 0.12;
    });
  }

  private kx() { return this.w < 620 ? 0.84 : 1; }

  // ---------------------------------------------------------------- sprites

  private card(it: Item, hot: boolean): Spr {
    const key = it.id + (hot ? '!' : '');
    const hit = this.sprites.get(key);
    if (hit) return hit;
    const d = this.dpr, fs = this.fs, lh = Math.round(fs * 1.36), px = 14, py = 12, M = 18, notch = 9;
    const col = hot ? HOT : INK;
    const bodyFont = `500 ${fs}px ${MONO}`;
    const hs = fs + (it.kind === 'path' ? 7 : 2), headFont = `700 ${hs}px ${MONO}`, hlh = Math.round(hs * 1.3);
    const max = this.cardMax - px * 2;
    const mg = this.mg;
    const head = it.head ? wrap(mg, headFont, it.kind === 'folder' ? it.head.toUpperCase() : it.head, max) : [];
    const body = wrap(mg, bodyFont, it.body, max - (it.kind === 'door' ? 26 : 0));
    let tw = 0;
    mg.font = headFont; for (const l of head) tw = Math.max(tw, mg.measureText(l).width);
    mg.font = bodyFont; for (const l of body) tw = Math.max(tw, mg.measureText(l).width + (it.kind === 'door' ? 26 : 0));
    const tagFont = `600 10px ${MONO}`;
    mg.font = tagFont; const tagW = mg.measureText(it.tag).width + it.tag.length * 1.4;
    const w = Math.ceil(Math.max(tw + px * 2, tagW + 46, 110));
    const hh = head.length ? head.length * hlh + 3 : 0;
    const h = Math.ceil(py * 2 + hh + body.length * lh - (lh - fs) * 0.5 + 4);
    const c = document.createElement('canvas');
    c.width = Math.ceil((w + M * 2) * d); c.height = Math.ceil((h + M * 2 + notch) * d);
    const g = c.getContext('2d')!;
    g.scale(d, d); g.translate(M, M);
    const cut = 7;
    const box = () => {
      g.beginPath();
      g.moveTo(cut, 0); g.lineTo(w - cut, 0); g.lineTo(w, cut); g.lineTo(w, h - cut); g.lineTo(w - cut, h);
      g.lineTo(w / 2 + notch, h); g.lineTo(w / 2, h + notch); g.lineTo(w / 2 - notch, h);
      g.lineTo(cut, h); g.lineTo(0, h - cut); g.lineTo(0, cut); g.closePath();
    };
    box(); g.fillStyle = 'rgba(4,6,10,0.9)'; g.fill();
    g.strokeStyle = col; g.lineWidth = 1.3; g.shadowColor = col; g.shadowBlur = 10; box(); g.stroke();
    g.shadowBlur = 0;
    if (it.kind === 'door' || it.kind === 'path') { g.globalAlpha = 0.55; g.lineWidth = 1; g.strokeRect(4.5, 4.5, w - 9, h - 9); g.globalAlpha = 1; }
    if (it.kind === 'result') {
      // a small rosette, top right
      const rx = w - 17, ry = 17; g.lineWidth = 1.1; g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * TAU) / 10, r = i % 2 ? 3.6 : 8; g.lineTo(rx + Math.cos(a) * r, ry + Math.sin(a) * r); }
      g.closePath(); g.stroke();
    }
    // the tag sits on the top edge
    g.font = tagFont; g.textBaseline = 'middle';
    if ('letterSpacing' in g) (g as unknown as { letterSpacing: string }).letterSpacing = '1.4px';
    g.fillStyle = BG; g.fillRect(12, -6, tagW + 12, 12);
    g.fillStyle = hot ? HOT : YOU; g.fillText(it.tag, 18, 0.5);
    if ('letterSpacing' in g) (g as unknown as { letterSpacing: string }).letterSpacing = '0px';
    g.textBaseline = 'alphabetic'; g.fillStyle = col;
    let y = py + 1;
    g.font = headFont; for (const l of head) { y += hs; g.fillText(l, px, y); y += hlh - hs; }
    if (head.length) y += 3;
    g.font = bodyFont;
    if (head.length && !hot) g.fillStyle = '#b9c7dc';
    body.forEach((l, i) => {
      y += fs; g.fillText(l, px, y);
      if (it.kind === 'door' && i === body.length - 1) {
        const ax = px + g.measureText(l).width + 9, ay = y - fs * 0.34;
        g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + 14, ay); g.moveTo(ax + 9, ay - 5); g.lineTo(ax + 14, ay); g.lineTo(ax + 9, ay + 5); g.stroke();
      }
      y += lh - fs;
    });
    const spr = { c, w, h: h + notch };
    this.sprites.set(key, spr);
    return spr;
  }

  // ---------------------------------------------------------------- the round

  /** Start a round, from the title or from the end screen. */
  start() {
    if (this.phase === 'card' || this.phase === 'play') return;
    this.score = 0; this.combo = 0; this.maxCombo = 0; this.lives = LIVES; this.caught = 0; this.drops = 0;
    this.fallers = []; this.flyers = []; this.stamps = []; this.pops = []; this.queue = [];
    this.inter = 0; this.ending = 0; this.slow = 1; this.won = false; this.stop = 0; this.prep = 1; this.prepOn = false;
    this.ev.reset();
    // The title lets go: every letter falls and breaks on the bottom line.
    if (this.titleOn) {
      for (const L of this.letters) {
        if (L.gone) { L.free = true; continue; }
        L.free = true; L.px = 0; L.py = 0;
        L.vx = L.lx * rnd(0.5, 1.1) + rnd(-60, 60); L.vy = rnd(-520, -180);
        L.wx = rnd(-3, 3); L.wy = rnd(-2.4, 2.4); L.wz = rnd(-2.6, 2.6);
      }
    }
    this.ev.sfx('start');
    this.beginWave(0);
    this.emit();
  }

  private beginWave(i: number) {
    this.wave = i; this.waveDrops = 0; this.left = WAVES[i].items.length;
    this.cardT = i === 0 ? 1.45 : 1.9;
    this.setPhase('card');
    this.ev.wave(i);
    this.ev.sfx('wave', i);
    this.queue = this.script(i); this.waveT = 0;
    this.emit();
  }

  private script(i: number): Spawn[] {
    const items = WAVES[i].items, out: Spawn[] = [];
    let t = 0.1, xf = 0.5;
    const hop = (max: number) => { let n = 0.5; for (let k = 0; k < 30; k++) { n = rnd(0.06, 0.94); const dd = Math.abs(n - xf); if (dd > 0.17 && dd < max) break; } xf = n; return n; };
    const add = (it: Item, x: number, sp: number, gap: number, sway = 0, y0 = 0) => { out.push({ it, at: t, xf: x, sp, sway, y0 }); t += gap; };
    if (i === 0) items.forEach((it, k) => add(it, k === 0 ? 0.5 : hop(0.46), 0.25 + k * 0.006, k < 4 ? 1.4 : 1.15, 0, k === 0 ? 0.22 : 0));
    else if (i === 1) items.forEach((it) => add(it, hop(0.5), 0.275, 1.6, 1));
    else if (i === 2) { add(items[0], hop(0.5), 0.3, 1.45); add(items[1], hop(0.5), 0.31, 1.6); add(items[2], 0.2, 0.34, 0.8); add(items[3], 0.8, 0.34, 1); }
    else if (i === 3) { add(items[0], 0.5, 0.3, 1.75); [0.12, 0.37, 0.62, 0.87, 0.7, 0.45, 0.2].forEach((x, k) => add(items[k + 1], x, 0.345, 0.64)); }
    else if (i === 4) { add(items[0], 0.24, 0.36, 0.95); add(items[1], 0.76, 0.37, 1.05); add(items[2], 0.5, 0.42, 1); }
    else {
      const n = items.length;
      items.forEach((it, k) => {
        const u = k / (n - 1);
        const x = it.lane === undefined ? (k === 0 ? 0.5 : hop(0.5)) : [0.17, 0.5, 0.83][it.lane] + rnd(-0.03, 0.03);
        add(it, x, lerp(0.34, 0.47, u), k === 0 ? 1.5 : lerp(1.05, 0.7, u));
      });
    }
    return out;
  }

  private spawn(s: Spawn) {
    const it = s.it, folder = it.kind === 'folder';
    const spr = folder ? null : this.card(it, false);
    const w = folder ? 2.3 * this.fold : spr!.w, h = folder ? 1.72 * this.fold : spr!.h;
    const m = w / 2 + 10;
    const x = m * 2 >= this.w ? this.w / 2 : clamp(s.xf * this.w, m, this.w - m);
    const room = Math.min(x - m, this.w - m - x);
    this.fallers.push({
      it, kind: folder ? 'folder' : 'card', x, x0: x, y: -h - 6 + s.y0 * this.h, w, h,
      vy: s.sp * this.h * (1 + this.caught * 0.0035), t: 0, seed: rnd(0, TAU), sway: s.sway ? Math.min(46, room) : 0,
      missed: false, skip: false, spr, hot: null, size: 1,
    });
  }

  /** Hold to spend prep time: the round slows while the meter lasts. */
  setPrep(on: boolean) {
    if (on && !this.prepOn && this.prep <= 0.001) { this.prepOut = 1; this.ev.sfx('pause'); }
    this.prepOn = on;
  }

  pause(on?: boolean) {
    const to = on ?? this.phase !== 'paused';
    if (to && (this.phase === 'play' || this.phase === 'card')) { this.before = this.phase; this.setPhase('paused'); this.ev.sfx('pause'); }
    else if (!to && this.phase === 'paused') { this.last = 0; this.setPhase(this.before); this.ev.sfx('pause'); }
  }

  private setPhase(p: Phase) { if (this.phase !== p) { this.phase = p; this.ev.phase(p); } }
  private emit() { this.ev.hud({ score: this.score, combo: this.combo, mult: this.mult(), lives: this.lives, wave: this.wave }); }
  private mult() { return Math.min(6, 1 + Math.floor(this.combo / 5)); }

  private catchIt(f: Faller, clean: boolean) {
    const tip = f.y + f.h;
    this.squash = 0.5; this.glow = 1;
    this.burst(f.x, this.cy - 4, clean ? 18 : 11, YOU);
    this.parts.push({ k: 2, x: this.cx, y: this.cy, vx: 0, vy: 0, r: 12, vr: clean ? 420 : 300, len: 0, t: 0, life: 0.34, col: YOU, g: 0 });
    if (!f.it) { // attract: nothing is scored
      this.ev.sfx('tick');
      if (f.kind === 'stop') { this.stopAway = false; const L = this.letters.find((l) => l.ch === '.'); if (L) { L.gone = false; L.back = this.titleT; } }
      return;
    }
    const before = this.mult();
    this.combo++; this.caught++; this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.prep = Math.min(1, this.prep + 0.06);
    const m = this.mult(), pts = 100 * before + (clean ? 50 : 0);
    this.score += pts;
    this.pops.push({ x: f.x, y: tip - 34, t: 0, life: 0.8, text: clean ? `CLEAN +${pts}` : `+${pts}`, col: clean ? INK : YOU, size: 13, big: false });
    if (m > before) this.pops.push({ x: this.w / 2, y: this.h * 0.4, t: 0, life: 0.9, text: `x${m}`, col: YOU, size: this.w < 620 ? 64 : 110, big: true });
    if (this.combo % 10 === 0 && this.lives < LIVES) {
      this.lives++; this.ev.sfx('life');
      this.pops.push({ x: this.w / 2, y: this.h * 0.52, t: 0, life: 1.2, text: 'BALLOT BACK', col: INK, size: 18, big: false });
    }
    // The card is extended: it lifts off the catcher and flies to the flow.
    const spr = this.card(f.it, false);
    const right = this.side === 'right';
    const x1 = right ? this.w + spr.w * 0.1 : this.w * 0.5, y1 = right ? this.h * 0.3 : -spr.h * 0.3;
    this.flyers.push({ spr, x0: clamp(f.x, spr.w / 2 + 8, Math.max(spr.w / 2 + 8, this.w - spr.w / 2 - 8)), y0: f.kind === 'folder' ? this.cy - spr.h - 40 : f.y, x1, y1, cx: right ? lerp(f.x, x1, 0.45) : f.x, cy: right ? Math.min(f.y, this.h * 0.3) - 120 : this.h * 0.5, t: 0, hold: f.kind === 'folder' ? 0.62 : f.it.body.length > 60 ? 0.3 : 0.12 });
    this.left--;
    this.ev.caught(f.it);
    this.ev.sfx(clean ? 'clean' : 'catch', this.combo);
    this.emit();
  }

  private dropIt(f: Faller) {
    const x = f.x, y = this.floor;
    this.shatter(x, y, f.w, Math.min(f.h, 120), f.it ? 1 : 0.5);
    this.parts.push({ k: 2, x, y, vx: 0, vy: 0, r: 8, vr: 520, len: 0, t: 0, life: 0.4, col: HOT, g: 0 });
    if (!f.it) {
      this.shake = Math.max(this.shake, 5);
      this.stamps.push({ x: clamp(x, 100, this.w - 100), y: this.floor - 74, t: 0, quip: '', small: true });
      if (f.kind === 'stop') { this.stopAway = false; const L = this.letters.find((l) => l.ch === '.'); if (L) { L.gone = false; L.back = this.titleT; } }
      this.ev.sfx('tick');
      return;
    }
    this.combo = 0; this.lives--; this.drops++; this.waveDrops++; this.left--;
    this.shake = 20; this.flash = 1; this.stop = 0.07;
    const sw = this.w < 620 ? 124 : 170;
    this.stamps.push({ x: clamp(x, sw, this.w - sw), y: this.floor - (this.w < 620 ? 150 : 170), t: 0, quip: QUIPS[(this.drops - 1 + Math.floor(f.seed * 7)) % QUIPS.length], small: false });
    this.ev.dropped(f.it);
    this.ev.sfx('drop');
    this.emit();
    if (this.lives <= 0 && !this.ending) { this.ending = 1.5; this.won = false; this.slow = 0.22; this.queue = []; for (const o of this.fallers) o.skip = true; }
  }

  private finish() {
    const best = Math.max(Game.best, this.score), newBest = this.score > Game.best && this.score > 0;
    Game.best = best;
    this.fallers = []; this.slow = 1; this.overT = 0;
    this.setPhase('over');
    this.ev.sfx(this.won ? 'won' : 'lost');
    this.ev.over({ win: this.won, score: this.score, best, newBest, caught: this.caught, dropped: this.drops, total: TOTAL, maxCombo: this.maxCombo });
  }

  private burst(x: number, y: number, n: number, col: string) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + rnd(-1.25, 1.25), v = rnd(160, 560);
      this.parts.push({ k: 1, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 0, vr: 0, len: rnd(6, 16), t: 0, life: rnd(0.28, 0.6), col, g: 900 });
    }
  }

  private shatter(x: number, y: number, w: number, h: number, power: number) {
    const n = Math.round(clamp(w / 14, 8, 26) * (power < 1 ? 0.6 : 1));
    for (let i = 0; i < n; i++) {
      const u = rnd(-0.5, 0.5);
      this.parts.push({ k: 0, x: x + u * w, y: y - rnd(0, h * 0.5), vx: u * rnd(300, 900) * power, vy: rnd(-760, -160) * power, r: rnd(0, TAU), vr: rnd(-9, 9), len: rnd(8, 30), t: 0, life: rnd(0.7, 1.5), col: HOT, g: 1900 });
    }
    for (let i = 0; i < n * 0.7; i++) {
      const a = rnd(-Math.PI, 0), v = rnd(120, 620) * power;
      this.parts.push({ k: 1, x: x + rnd(-w / 2, w / 2), y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 0, vr: 0, len: rnd(4, 10), t: 0, life: rnd(0.3, 0.7), col: HOT, g: 1500 });
    }
    if (this.parts.length > 520) this.parts.splice(0, this.parts.length - 520);
  }

  // ---------------------------------------------------------------- update

  private frame = (ms: number) => {
    if (this.dead) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = this.last ? Math.min(0.05, (ms - this.last) / 1000) : 1 / 60;
    this.last = ms;
    if (!this.seen || this.w === 0) return;
    if (this.phase !== 'paused') this.update(dt);
    this.draw();
  };

  private update(dt: number) {
    this.now += dt;
    this.titleT += dt;
    if (this.phase === 'over') {
      this.overT += dt;
      if (this.won) {
        this.fire -= dt;
        if (this.fire <= 0) {
          this.fire = rnd(0.25, 0.6);
          const x = rnd(0.1, 0.9) * this.w, y = rnd(0.08, 0.5) * this.h, col = Math.random() < 0.6 ? YOU : INK;
          for (let i = 0; i < 22; i++) { const a = (i / 22) * TAU + rnd(-0.1, 0.1), v = rnd(140, 380); this.parts.push({ k: 1, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 0, vr: 0, len: rnd(8, 18), t: 0, life: rnd(0.5, 0.9), col, g: 420 }); }
          this.parts.push({ k: 2, x, y, vx: 0, vy: 0, r: 4, vr: 260, len: 0, t: 0, life: 0.5, col, g: 0 });
        }
      }
    }
    this.shake *= Math.exp(-9 * dt); this.flash *= Math.exp(-7 * dt);
    this.tilt.x += (this.tilt.tx - this.tilt.x) * (1 - Math.exp(-5 * dt));
    this.tilt.y += (this.tilt.ty - this.tilt.y) * (1 - Math.exp(-5 * dt));
    if (this.stop > 0) { this.stop -= dt; return; }
    const spend = this.prepOn && this.prep > 0 && this.phase === 'play' && !this.ending;
    if (spend) this.prep = Math.max(0, this.prep - dt / 3.6);
    this.prepK += ((spend ? 1 : 0) - this.prepK) * (1 - Math.exp(-10 * dt));
    this.prepOut *= Math.exp(-3 * dt);
    const wdt = dt * this.slow * lerp(1, 0.3, this.prepK);
    const live = this.phase === 'play' || this.phase === 'card';

    // The catcher: a spring toward the pointer, or thrust and drag under the keys.
    if (this.phase === 'attract' && this.now - this.lastInput > 2.2) {
      let low: Faller | null = null;
      for (const f of this.fallers) if (!f.missed && !f.skip && (!low || f.y > low.y)) low = f;
      this.target = low ? low.x : this.w / 2 + Math.sin(this.now * 0.7) * this.w * 0.2;
      this.mode = 'pointer';
    }
    const half = this.cw / 2;
    if (this.mode === 'keys') {
      const dir = (this.keys.r ? 1 : 0) - (this.keys.l ? 1 : 0), vmax = Math.max(900, this.w * 1.7);
      if (dir) this.cvx += dir * vmax * 7 * dt; else this.cvx *= Math.exp(-11 * dt);
      if (dir && Math.sign(this.cvx) !== dir) this.cvx *= Math.exp(-22 * dt);
      this.cvx = clamp(this.cvx, -vmax, vmax);
      this.target = this.cx;
    } else {
      const t = clamp(this.target, half * 0.98, this.w - half * 0.98);
      this.cvx += ((t - this.cx) * 300 - this.cvx * 27) * dt;
    }
    this.cx += this.cvx * dt;
    if (this.cx < half * 0.95) { this.cx = half * 0.95; this.cvx = Math.abs(this.cvx) * 0.25; }
    if (this.cx > this.w - half * 0.95) { this.cx = this.w - half * 0.95; this.cvx = -Math.abs(this.cvx) * 0.25; }
    this.squash += (1 - this.squash) * (1 - Math.exp(-14 * dt));
    this.glow *= Math.exp(-5 * dt);
    this.trail.unshift(this.cx); if (this.trail.length > 7) this.trail.pop();

    // Phase timers
    if (this.phase === 'card') { this.cardT -= dt; if (this.cardT <= 0) this.setPhase('play'); }
    if (this.phase === 'play') {
      this.waveT += wdt;
      while (this.queue.length && this.queue[0].at <= this.waveT) this.spawn(this.queue.shift()!);
      if (this.ending > 0) { this.ending -= dt; if (this.ending <= 0) this.finish(); }
      else if (this.left <= 0 && !this.inter) {
        this.inter = 1.0;
        const clean = this.waveDrops === 0;
        if (clean) this.score += 500;
        this.pops.push({ x: this.w / 2, y: this.h * 0.42, t: 0, life: 1.0, text: clean ? 'CLEAN WAVE +500' : this.waveDrops === 1 ? '1 DROPPED' : `${this.waveDrops} DROPPED`, col: clean ? YOU : HOT, size: this.w < 620 ? 20 : 30, big: false });
        this.ev.sfx('clear', clean ? 1 : 0);
        this.emit();
      } else if (this.inter > 0) {
        this.inter -= dt;
        if (this.inter <= 0) {
          this.inter = 0;
          this.ev.waveDone(this.wave);
          if (this.wave + 1 < WAVES.length) this.beginWave(this.wave + 1);
          else { this.won = true; this.score += this.lives * 1000; this.finish(); }
        }
      }
    }
    this.lanes += ((live && this.wave === 5 ? 1 : 0) - this.lanes) * (1 - Math.exp(-3 * dt));

    // Attract loop: question marks fall, and every so often the title's own full stop does.
    if (this.phase === 'attract') {
      this.attractT -= dt;
      if (this.attractT <= 0 && this.titleT > 1.2) {
        this.attractT = rnd(0.55, 1.0);
        const size = rnd(0.055, 0.1) * Math.min(this.h, 900);
        const w = size * (MARKS.roman.w / MARKS.roman.h);
        const x = rnd(w + 20, this.w - w - 20);
        this.fallers.push({ it: null, kind: 'mark', x, x0: x, y: -size - 10, w: w + 16, h: size, vy: rnd(0.2, 0.3) * this.h, t: 0, seed: rnd(0, TAU), sway: 0, missed: false, skip: Math.random() < 0.2, spr: null, hot: null, size });
      }
      this.stopT -= dt;
      const L = this.letters.find((l) => l.ch === '.');
      if (this.stopT <= 0 && L && !L.gone && this.titleOn && this.titleT > 3) {
        this.stopT = rnd(7, 10); this.stopAway = true; L.gone = true;
        const size = L.s.h * L.k;
        this.fallers.push({ it: null, kind: 'stop', x: this.tcx + L.lx, x0: this.tcx + L.lx, y: this.tcy + L.ly - size / 2, w: size + 20, h: size, vy: 0.08 * this.h, t: 0, seed: 0, sway: 0, missed: false, skip: false, spr: null, hot: null, size });
      }
    }

    // Fallers
    for (let i = this.fallers.length - 1; i >= 0; i--) {
      const f = this.fallers[i];
      f.t += wdt;
      if (f.kind === 'stop') f.vy += 900 * wdt;
      f.y += f.vy * wdt * (f.missed ? 1.35 : 1);
      if (f.sway) f.x = f.x0 + Math.sin(f.t * 2.1 + f.seed) * f.sway;
      const tip = f.y + f.h;
      if (!f.missed) {
        if (tip >= this.cy - 8 && tip <= this.cy + 24) {
          const dx = Math.abs(f.x - this.cx);
          if (dx <= half + 8 && !this.ending && !(f.skip && !f.it && this.now - this.lastInput > 2.2)) { this.fallers.splice(i, 1); this.catchIt(f, dx <= this.cw * 0.17); continue; }
        } else if (tip > this.cy + 24) { f.missed = true; if (f.it && f.kind === 'card') f.hot = this.card(f.it, true); }
      } else if (tip >= this.floor + 4) {
        this.fallers.splice(i, 1);
        if (f.skip && f.it) this.shatter(f.x, this.floor, f.w, 60, 0.5); else this.dropIt(f);
      }
    }

    // Title letters once they are let go
    if (this.titleOn) {
      for (const L of this.letters) {
        if (!L.free || L.gone) continue;
        L.vy += 2500 * dt; L.px += L.vx * dt; L.py += L.vy * dt; L.rx += L.wx * dt; L.ry += L.wy * dt; L.rz += L.wz * dt;
        if (this.tcy + L.ly + L.py > this.floor - L.s.h * L.k * 0.3) {
          L.gone = true;
          this.shatter(this.tcx + L.lx + L.px, this.floor, L.s.w * L.k, L.s.h * L.k, 0.75);
          this.shake = Math.max(this.shake, 7);
          this.ev.sfx('tick');
        }
      }
      if (this.letters.every((l) => l.gone && l.free)) this.titleOn = false;
    }

    // Effects
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.t += dt; if (p.t >= p.life) { this.parts.splice(i, 1); continue; }
      if (p.k === 2) { p.r += p.vr * dt; continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      if (p.k === 0 && p.y > this.h + 40) this.parts.splice(i, 1);
    }
    for (let i = this.flyers.length - 1; i >= 0; i--) { const f = this.flyers[i]; f.t += dt; if (f.t > f.hold + 0.62) this.flyers.splice(i, 1); }
    for (let i = this.stamps.length - 1; i >= 0; i--) { const s = this.stamps[i]; s.t += dt; if (s.t > (s.small ? 0.9 : 1.7)) this.stamps.splice(i, 1); }
    for (let i = this.pops.length - 1; i >= 0; i--) { const p = this.pops[i]; p.t += dt; if (p.t > p.life) this.pops.splice(i, 1); }
    for (const d of this.drift) { d.y += d.v * dt * (live ? 1.6 : 1); d.a += d.r * dt; if (d.y > 1.1) { d.y = -0.1; d.x = Math.random(); } }
  }

  // ---------------------------------------------------------------- draw

  private line(col: string, lw: number, a: number, glow = 0.16) {
    const g = this.g;
    g.strokeStyle = col;
    if (glow > 0) { g.globalAlpha = a * glow; g.lineWidth = lw + 6; g.stroke(); }
    g.globalAlpha = a; g.lineWidth = lw; g.stroke();
    g.globalAlpha = 1;
  }

  private draw() {
    const g = this.g, { w, h, dpr } = this;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.save();
    if (this.shake > 0.3) g.translate(rnd(-1, 1) * this.shake, rnd(-1, 1) * this.shake * 0.8);
    this.drawBack();
    // attract marks pass behind the title and fade through the text band, so the words stay readable
    for (const f of this.fallers) if (f.kind === 'mark') this.drawFaller(f);
    if (this.titleOn) this.drawTitle();
    if (this.phase === 'over') this.drawEnd();
    for (const f of this.fallers) if (f.kind !== 'mark') this.drawFaller(f);
    if (this.phase !== 'over') this.drawCatcher();
    this.drawFx();
    g.restore();
    if (this.flash > 0.02) {
      g.globalAlpha = this.flash * 0.3; g.fillStyle = HOT; g.fillRect(0, 0, w, h);
      g.globalAlpha = this.flash; g.strokeStyle = HOT; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
      g.globalAlpha = 1;
    }
  }

  private drawBack() {
    const g = this.g, { w, h } = this, live = this.phase === 'play' || this.phase === 'card' || this.phase === 'paused';
    // the flow's columns, faint
    g.beginPath();
    const cols = w < 620 ? 4 : 6;
    for (let i = 1; i < cols; i++) { const x = Math.round((w * i) / cols) + 0.5; g.moveTo(x, 0); g.lineTo(x, this.cy + 26); }
    g.strokeStyle = INK; g.globalAlpha = 0.055; g.lineWidth = 1; g.stroke(); g.globalAlpha = 1;
    if (live) {
      // the wave's number, very large, behind everything
      const size = Math.min(h * 0.46, w * 0.4);
      g.font = `800 ${size}px ${BIG}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.strokeStyle = INK; g.lineWidth = 1; g.globalAlpha = 0.11;
      g.strokeText(String(this.wave + 1).padStart(2, '0'), w * 0.03, (w < 620 ? 40 : 76) + size * 0.76);
      g.globalAlpha = 1;
    }
    // a ruler down each edge, and the line you answer on
    g.beginPath();
    for (let y = 40; y < this.cy; y += 40) { const l = y % 200 === 0 ? 14 : 6; g.moveTo(0, y + 0.5); g.lineTo(l, y + 0.5); g.moveTo(w, y + 0.5); g.lineTo(w - l, y + 0.5); }
    g.strokeStyle = INK; g.globalAlpha = 0.28; g.lineWidth = 1; g.stroke();
    g.beginPath(); g.setLineDash([2, 10]); g.moveTo(0, this.cy + 6.5); g.lineTo(w, this.cy + 6.5); g.globalAlpha = 0.2; g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
    // drifting question marks, far away
    const cam: Cam = { cx: 0, cy: 0, f: 600 };
    const st: SolidStyle = { stroke: INK, fill: null, lw: 1, alpha: 0.1, back: 0, glow: 0 };
    for (const d of this.drift) {
      const size = 34 * d.s, k = size / MARKS.roman.h;
      cam.cx = d.x * w; cam.cy = d.y * (this.cy + 60) - 30;
      st.alpha = 0.05 + 0.05 * d.s;
      drawSolid(g, this.mark, euler(0, d.a, 0, this.m1), k, k, 0, 0, 0, 0, cam, st);
    }
    // the three lanes of the last wave
    if (this.lanes > 0.02) {
      const names = WAVES[5].items.filter((i) => i.kind === 'path');
      g.font = `600 ${w < 620 ? 10 : 12}px ${MONO}`; g.textAlign = 'center'; g.fillStyle = YOU;
      names.forEach((it, i) => {
        const x = [0.17, 0.5, 0.83][i] * w;
        g.globalAlpha = 0.75 * this.lanes;
        g.fillText((it.head ?? '').toUpperCase(), x, (w < 620 ? 14 : 70));
        g.globalAlpha = 0.14 * this.lanes; g.beginPath(); g.setLineDash([3, 9]); g.moveTo(x, w < 620 ? 22 : 80); g.lineTo(x, this.cy - 30); g.strokeStyle = YOU; g.lineWidth = 1; g.stroke(); g.setLineDash([]);
      });
      g.globalAlpha = 1; g.textAlign = 'left';
    }
    // the floor: a grid running toward you, under the catcher
    const y0 = this.cy + 26, y1 = h + 2, ph = (this.now * (live ? 0.9 : 0.35)) % 1;
    g.beginPath();
    for (let i = 0; i < 7; i++) { const f = (i + ph) / 7, y = Math.round(y0 + (y1 - y0) * f * f) + 0.5; g.moveTo(0, y); g.lineTo(w, y); }
    const n = w < 620 ? 5 : 9;
    for (let j = -n; j <= n; j++) { const xb = w / 2 + (j * w) / (n * 1.1), xt = w / 2 + (j * w) / (n * 1.1) * 0.62; g.moveTo(xt, y0); g.lineTo(xb, y1); }
    g.moveTo(0, y0 + 0.5); g.lineTo(w, y0 + 0.5);
    g.strokeStyle = INK; g.globalAlpha = 0.11; g.lineWidth = 1; g.stroke(); g.globalAlpha = 1;
    // the bottom line
    const last = live && this.lives === 1 ? 0.5 + 0.5 * Math.sin(this.now * 9) : 0;
    const fy = Math.round(this.floor) + 0.5, hot = Math.min(1, 0.55 + this.flash + last * 0.45);
    if (last > 0) { g.fillStyle = HOT; g.globalAlpha = 0.05 + 0.07 * last; g.fillRect(0, fy, w, h - fy); g.globalAlpha = 1; }
    g.beginPath(); g.moveTo(0, fy); g.lineTo(w, fy);
    this.line(HOT, 1.5, hot, 0.22);
    g.font = `600 10px ${MONO}`; g.fillStyle = HOT; g.globalAlpha = 0.95; g.textAlign = 'right';
    g.fillText(last > 0 ? 'LAST BALLOT' : 'DROPPED BELOW THIS LINE', w - 14, fy - 8);
    g.textAlign = 'left'; g.globalAlpha = 1;
    if (live) {
      // prep time: ten cells, between the answer line and the bottom
      const px = 16, py = this.cy + 30, cw = w < 620 ? 7 : 9, n = 10, on = Math.ceil(this.prep * n - 0.001);
      const out = this.prepOut > 0.05;
      g.font = `600 10px ${MONO}`; g.fillStyle = out ? HOT : this.prepK > 0.1 ? YOU : INK; g.globalAlpha = 0.9;
      g.fillText(out ? 'NO PREP LEFT' : 'PREP', px, py - 6);
      for (let i = 0; i < n; i++) {
        g.globalAlpha = i < on ? (this.prepK > 0.1 ? 1 : 0.8) : 0.22;
        g.fillStyle = i < on ? YOU : INK;
        g.fillRect(px + i * (cw + 3), py, cw, 6);
      }
      g.globalAlpha = 1;
      if (this.prepK > 0.02) {
        g.fillStyle = YOU; g.globalAlpha = 0.05 * this.prepK; g.fillRect(0, 0, w, this.cy + 26);
        g.globalAlpha = 0.3 * this.prepK; g.strokeStyle = YOU; g.lineWidth = 1;
        const size = Math.min(w * 0.118, 120);
        g.font = `800 ${size}px ${BIG}`; g.textAlign = 'center';
        g.strokeText('PREP TIME', w / 2, this.cy - 60);
        g.textAlign = 'left'; g.globalAlpha = 1;
      }
    }
  }

  private drawTitle() {
    const g = this.g, t = this.titleT;
    const cam: Cam = { cx: this.tcx, cy: this.tcy, f: 1100 };
    const idle = this.phase === 'attract';
    const gy = this.tilt.x * 0.7 + (idle ? Math.sin(t * 0.5) * 0.3 : 0), gx = -this.tilt.y * 0.5 - 0.16 + (idle ? Math.sin(t * 0.37) * 0.08 : 0);
    const G = euler(gx, gy, 0, this.m1);
    const depth = Math.min(120, CAP * this.tk * 0.5), kx = this.kx();
    const st: SolidStyle = { stroke: INK, fill: BG, lw: 1.6, alpha: 1, back: 0.5, glow: 0.14, hatch: this.w < 620 ? 5 : 7 };
    for (const L of this.letters) {
      if (L.gone) continue;
      let dy = 0, a = 1;
      if (!L.free) {
        const u = (t - (L.back || 0) - (L.back ? 0 : L.delay)) / 0.72;
        if (u <= 0) continue;
        dy = -(this.tcy + L.ly + 220) * (1 - bounce(Math.min(1, u)));
        dy += Math.sin(t * 1.3 + L.lx * 0.01) * 3;
      } else a = 1;
      const R = L.free ? mul(G, euler(L.rx, L.ry, L.rz, this.m2), this.m3) : G;
      const lx = L.lx + L.px, ly = L.ly + L.py + dy;
      // the letter's place, turned with the whole title
      const tx = G[0] * lx + G[1] * ly, ty = G[3] * lx + G[4] * ly, tz = G[6] * lx + G[7] * ly;
      st.stroke = L.ch === '.' ? HOT : INK; st.alpha = a * (L.line === 0 ? 0.9 : 1); st.lw = L.line === 0 ? 1.3 : 1.7;
      drawSolid(g, L.s, R, L.k * kx, L.k, tx, ty, tz, L.line === 0 ? depth * 0.5 : depth, cam, st);
    }
  }

  /** The end of the round, said once more in solid letters: DROPPED. or EXTENDED. */
  private drawEnd() {
    const g = this.g, t = this.overT, small = this.w < 620, kx = small ? 0.84 : 1;
    const word = this.won ? 'EXTENDED.' : 'DROPPED.';
    let adv = 0;
    for (const ch of word) adv += this.glyph.get(ch)?.adv ?? 0;
    const k = Math.min((this.w * (small ? 0.9 : 0.84)) / (adv * kx), (this.h * 0.2) / CAP);
    const cam: Cam = { cx: this.w / 2, cy: this.h * (small ? 0.17 : 0.25), f: 1100 };
    const G = euler(-0.2 + Math.sin(t * 0.43) * 0.08 - this.tilt.y * 0.3, Math.sin(t * 0.55) * 0.34 + this.tilt.x * 0.5, 0, this.m1);
    const st: SolidStyle = { stroke: this.won ? YOU : HOT, fill: BG, lw: 1.6, alpha: 1, back: 0.5, glow: 0.16, hatch: small ? 5 : 7 };
    const depth = Math.min(110, CAP * k * 0.55);
    let pen = -adv / 2, i = 0;
    for (const ch of word) {
      const gl = this.glyph.get(ch);
      if (!gl) continue;
      const u = (t - 0.2 - i * 0.07) / 0.7;
      if (u > 0) {
        const lx = (pen + gl.off) * k * kx;
        // a lost round leaves the letters where they fell, each a little askew
        const askew = this.won ? 0 : Math.sin(i * 12.9898) * 0.11;
        const ly = (CAP / 2 + gl.s.oy) * k + (this.won ? 0 : Math.cos(i * 4.7) * CAP * k * 0.05) - (cam.cy + 260) * (1 - bounce(Math.min(1, u))) + Math.sin(t * 1.2 + i) * 3;
        const R = askew ? mul(G, euler(0, 0, askew, this.m2), this.m3) : G;
        drawSolid(g, gl.s, R, k * kx, k, G[0] * lx + G[1] * ly, G[3] * lx + G[4] * ly, G[6] * lx + G[7] * ly, depth, cam, st);
      }
      pen += gl.adv; i++;
    }
  }

  private drawFaller(f: Faller) {
    const g = this.g;
    if (f.it && !f.skip) {
      // speed lines above it, and a plumb line down to where it will land
      const col = f.missed ? HOT : INK, len = Math.min(110, f.vy * 0.2), top = f.y - 9, tip = f.y + f.h;
      g.beginPath();
      for (const dx of [-f.w / 2 + 12, 0, f.w / 2 - 12]) { g.moveTo(f.x + dx, top); g.lineTo(f.x + dx, top - len * (dx === 0 ? 1 : 0.55)); }
      g.strokeStyle = col; g.globalAlpha = 0.2; g.lineWidth = 1; g.stroke();
      const near = clamp((tip - (this.cy - 300)) / 300);
      if (near > 0 && !f.missed) {
        g.beginPath(); g.setLineDash([3, 7]); g.moveTo(f.x, tip + 5); g.lineTo(f.x, this.cy - 24); g.globalAlpha = 0.1 + 0.4 * near; g.stroke(); g.setLineDash([]);
        g.beginPath(); g.moveTo(f.x - 7, this.cy + 13); g.lineTo(f.x, this.cy + 7); g.lineTo(f.x + 7, this.cy + 13); g.globalAlpha = 0.25 + 0.75 * near; g.lineWidth = 1.5; g.stroke();
      }
      g.globalAlpha = 1;
    }
    if (f.kind === 'card' && f.spr) {
      const spr = f.missed && f.hot ? f.hot : f.spr, d = this.dpr, M = 18;
      const r = Math.sin(f.t * 1.4 + f.seed) * 0.03 + (f.missed ? (f.seed - 3) * 0.05 * Math.min(1, (f.y + f.h - this.cy) / 80) : 0);
      // a slab, not a sticker: it yaws as it falls and shows its back edge
      const yaw = Math.sin(f.t * 1.25 + f.seed * 1.7) * 0.44, sx = Math.cos(yaw), sh = Math.sin(yaw) * 0.075;
      const bx = Math.sin(yaw) * 13, by = -7, hw = spr.w / 2, top = -f.h / 2, bot = f.h / 2 - 9;
      g.save(); g.translate(f.x, f.y + f.h / 2); g.rotate(r);
      if (f.skip) g.globalAlpha = 0.5;
      g.beginPath();
      const c = [[-hw, top], [hw, top], [hw, bot], [-hw, bot]].map(([px, py]) => [px * sx, py + px * sh]);
      c.forEach(([px, py], i) => { if (i) g.lineTo(px + bx, py + by); else g.moveTo(px + bx, py + by); });
      g.closePath();
      for (const [px, py] of c) { g.moveTo(px, py); g.lineTo(px + bx, py + by); }
      g.strokeStyle = f.missed ? HOT : INK; g.lineWidth = 1; g.globalAlpha *= 0.42; g.stroke(); g.globalAlpha = f.skip ? 0.5 : 1;
      g.transform(sx, sh, 0, 1, 0, 0);
      g.drawImage(spr.c, -spr.w / 2 - M, -f.h / 2 - M, spr.c.width / d, spr.c.height / d);
      g.restore(); g.globalAlpha = 1;
      return;
    }
    if (f.kind === 'folder') { this.drawFolder(f); return; }
    // attract: a question mark, or the title's full stop
    const col = f.missed ? HOT : f.kind === 'stop' ? HOT : INK;
    const cam: Cam = { cx: f.x, cy: f.y + f.h / 2, f: 500 };
    let fade = 0.95;
    if (f.kind === 'mark' && this.titleOn) {
      const small = this.w < 620, mid = f.y + f.h / 2;
      const top = this.tcy - CAP * this.tk * 0.9, bot = Math.min(this.cy - 60, this.h * (small ? 0.5 : 0.59) + 200);
      const inBand = Math.min(1, Math.max(0, (mid - top) / 50), Math.max(0, (bot - mid) / 50));
      fade = 0.95 - 0.8 * inBand;
    }
    const st: SolidStyle = { stroke: col, fill: BG, lw: 1.4, alpha: fade, back: 0.4, glow: 0.14 };
    if (f.kind === 'stop') {
      const L = this.letters.find((l) => l.ch === '.')!;
      drawSolid(g, L.s, euler(f.t * 2.2, f.t * 1.6, 0, this.m1), L.k * this.kx(), L.k, 0, 0, 0, Math.min(120, CAP * this.tk * 0.5), cam, st);
    } else {
      const k = f.size / MARKS.roman.h;
      drawSolid(g, this.mark, euler(Math.sin(f.t * 1.1 + f.seed) * 0.25, f.t * 1.5 + f.seed, Math.sin(f.t + f.seed) * 0.12, this.m1), k, k, 0, 0, 0, f.size * 0.16, cam, st);
    }
  }

  private drawFolder(f: Faller) {
    const g = this.g, S = this.fold, W = 2.3 * S, H = 1.5 * S, D = 0.36 * S, tab = 0.22 * S, tw = 0.86 * S;
    const col = f.missed ? HOT : INK;
    const cam: Cam = { cx: f.x, cy: f.y + tab + H / 2, f: 560 };
    const m = euler(0.2 + Math.sin(f.t * 1.5 + f.seed) * 0.16, Math.sin(f.t * 1.9 + f.seed * 2) * 0.62, Math.sin(f.t * 1.2 + f.seed) * 0.07, this.m1);
    const P = (x: number, y: number, z: number) => project(m, x, y, z, 0, 0, 0, cam, this.p2);
    const poly = (pts: number[][], close = true) => { pts.forEach((p, i) => { const q = P(p[0], p[1], p[2]); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); if (close) g.closePath(); };
    const hw = W / 2, hh = H / 2, zf = -D / 2, zb = D / 2;
    const back = [[-hw, hh, zb], [-hw, -hh - tab, zb], [-hw + tw, -hh - tab, zb], [-hw + tw + tab, -hh, zb], [hw, -hh, zb], [hw, hh, zb]];
    const front = [[-hw, hh, zf], [-hw, -hh, zf], [hw, -hh, zf], [hw, hh, zf]];
    g.lineJoin = 'round';
    g.beginPath(); poly(back);
    for (const c of [[-hw, hh], [-hw, -hh], [hw, -hh], [hw, hh]]) poly([[c[0], c[1], zf], [c[0], c[1], zb]], false);
    this.line(col, 1.1, 0.5, 0);
    g.beginPath(); poly(front); g.fillStyle = BG; g.globalAlpha = 0.92; g.fill(); g.globalAlpha = 1;
    this.line(col, 1.6, 1, 0.16);
    // the padlock
    const lk = f.missed ? HOT : YOU, lw = 0.3 * S, lh = 0.23 * S, ly = -0.26 * S, z = zf - 1;
    const jig = f.t < 0.001 ? 0 : Math.sin(f.t * 9 + f.seed) * 0.6;
    g.beginPath();
    poly([[-lw + jig, ly, z], [lw + jig, ly, z], [lw + jig, ly + lh * 2, z], [-lw + jig, ly + lh * 2, z]]);
    const arc: number[][] = [];
    for (let i = 0; i <= 10; i++) { const a = Math.PI + (i / 10) * Math.PI; arc.push([Math.cos(a) * lw * 0.62 + jig, ly - 0.1 * S + Math.sin(a) * lw * 0.72, z]); }
    poly([[-lw * 0.62 + jig, ly, z], ...arc, [lw * 0.62 + jig, ly, z]], false);
    poly([[jig, ly + lh * 0.7, z], [jig, ly + lh * 1.3, z]], false);
    this.line(lk, 1.5, 1, 0.2);
    // the name, set on the face
    const o = P(0, hh - 0.16 * S, z), ox = o[0], oy = o[1];
    const ex = P(1, hh - 0.16 * S, z), exx = ex[0] - ox, exy = ex[1] - oy;
    const ey = P(0, hh - 0.16 * S + 1, z), eyx = ey[0] - ox, eyy = ey[1] - oy;
    g.save(); g.transform(exx, exy, eyx, eyy, ox, oy);
    const name = (f.it?.head ?? '').toUpperCase();
    g.font = `700 ${Math.round(S * 0.31)}px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = col;
    g.fillText(name, 0, 0);
    g.restore(); g.textAlign = 'left';
  }

  private drawCatcher() {
    const g = this.g, hw = this.cw / 2, x = this.cx, y = this.cy;
    const tiltA = clamp(this.cvx * 0.00008, -0.1, 0.1);
    const dim = this.phase === 'attract' && this.now - this.lastInput > 2.2 ? 0.75 : 1;
    // a dashed stem down to the bottom line, like the line you draw down a flow
    g.beginPath(); g.setLineDash([2, 6]); g.moveTo(x, y + 22); g.lineTo(x, this.floor - 2); g.strokeStyle = YOU; g.globalAlpha = 0.4; g.lineWidth = 1; g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
    // afterimages when it moves fast
    const sp = Math.abs(this.cvx);
    if (sp > 500) for (let i = 2; i < this.trail.length; i += 2) {
      g.beginPath(); g.moveTo(this.trail[i] - hw, y + 6); g.lineTo(this.trail[i] + hw, y + 6);
      g.strokeStyle = YOU; g.globalAlpha = Math.min(0.3, (sp - 500) / 2500) * (1 - i / 8); g.lineWidth = 1.5; g.stroke();
    }
    g.globalAlpha = 1;
    if (this.tray) {
      const k = this.glow * 0.55, mix = (a: number, b: number) => Math.round(a + (b - a) * k);
      const st: SolidStyle = { stroke: YOU, fill: `rgb(${mix(4, 79)},${mix(6, 233)},${mix(10, 255)})`, lw: 2, alpha: dim, back: 0.6, glow: 0.2 + this.glow * 0.3 };
      const m = euler(0.52, clamp(this.cvx * 0.00042, -0.6, 0.6), tiltA, this.m1);
      drawSolid(g, this.tray, m, 1 + (1 - this.squash) * 0.22, this.squash, 0, 0, 0, 34, { cx: x, cy: y - 6, f: 620 }, st);
    }
    g.save(); g.translate(x, y); g.rotate(tiltA);
    // the nib
    g.beginPath(); g.moveTo(-8, 6); g.lineTo(0, 21); g.lineTo(8, 6); g.moveTo(0, 12); g.lineTo(0, 21);
    this.line(YOU, 1.5, dim, 0.15);
    // one rule under the bar for each step of the multiplier
    const m = this.mult();
    if (m > 1 && this.phase !== 'attract') {
      g.beginPath();
      for (let i = 1; i < m; i++) { const yy = 6 + i * 5, in2 = 16 + i * 9; g.moveTo(-hw + in2, yy); g.lineTo(-12 - i, yy); g.moveTo(12 + i, yy); g.lineTo(hw - in2, yy); }
      this.line(INK, 1.2, 0.85, 0);
    }
    g.restore();
  }

  private drawFx() {
    const g = this.g, d = this.dpr, M = 18;
    // caught cards on their way to the flow, each on the end of an arrow
    for (const f of this.flyers) {
      const u = clamp((f.t - f.hold) / 0.58), e = u * u * (3 - 2 * u);
      const lift = outCubic(clamp(f.t / 0.22)) * 26;
      const q = (t: number, a: number, b: number, c: number) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
      const y0 = f.y0 - lift;
      if (u > 0) {
        g.beginPath();
        const from = Math.max(0, e - 0.45);
        for (let i = 0; i <= 16; i++) { const t = lerp(from, e, i / 16); const x = q(t, f.x0, f.cx, f.x1), y = q(t, y0, f.cy, f.y1) + f.spr.h * 0.5; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
        this.line(YOU, 1.6, 0.9 * (1 - u * 0.6), 0.2);
      }
      const x = q(e, f.x0, f.cx, f.x1), y = q(e, y0, f.cy, f.y1), s = lerp(1, 0.3, e) * (f.t < 0.16 ? lerp(1.12, 1, f.t / 0.16) : 1);
      g.save(); g.translate(x, y + (f.spr.h / 2) * s); g.scale(s, s); g.globalAlpha = 1 - clamp((u - 0.7) / 0.3);
      g.drawImage(f.spr.c, -f.spr.w / 2 - M, -f.spr.h / 2 - M, f.spr.c.width / d, f.spr.c.height / d);
      g.restore(); g.globalAlpha = 1;
    }
    // sparks, shards, rings
    for (const p of this.parts) {
      const a = 1 - p.t / p.life;
      g.strokeStyle = p.col; g.globalAlpha = Math.min(1, a * 1.6);
      g.beginPath();
      if (p.k === 2) { g.lineWidth = 1.5; g.ellipse(p.x, p.y, p.r, p.r * 0.32, 0, 0, TAU); }
      else if (p.k === 1) { const v = Math.hypot(p.vx, p.vy) || 1; g.lineWidth = 1.4; g.moveTo(p.x, p.y); g.lineTo(p.x - (p.vx / v) * p.len, p.y - (p.vy / v) * p.len); }
      else { const c = Math.cos(p.r) * p.len * 0.5, s = Math.sin(p.r) * p.len * 0.5; g.lineWidth = 1.5; g.moveTo(p.x - c, p.y - s); g.lineTo(p.x + c, p.y + s); }
      g.stroke();
    }
    g.globalAlpha = 1;
    // the stamp
    for (const s of this.stamps) {
      const life = s.small ? 0.9 : 1.7, inn = clamp(s.t / 0.13), sc = lerp(2.6, 1, outBack(inn)), a = inn * (1 - clamp((s.t - (life - 0.35)) / 0.35));
      const size = s.small ? 16 : this.w < 620 ? 30 : 42;
      g.save(); g.translate(s.x, s.y); g.rotate(-0.12); g.scale(sc, sc); g.globalAlpha = a;
      g.font = `800 ${size}px ${BIG}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const tw = g.measureText('DROPPED').width, bw = tw + size * 0.9, bh = size * 1.75;
      g.fillStyle = 'rgba(4,6,10,0.82)'; g.fillRect(-bw / 2, -bh / 2, bw, bh);
      g.strokeStyle = HOT; g.lineWidth = s.small ? 1.5 : 3; g.strokeRect(-bw / 2, -bh / 2, bw, bh);
      if (!s.small) { g.lineWidth = 1; g.strokeRect(-bw / 2 + 6, -bh / 2 + 6, bw - 12, bh - 12); }
      g.fillStyle = HOT; g.fillText('DROPPED', 0, size * 0.06);
      g.restore();
      if (s.quip) {
        g.globalAlpha = clamp((s.t - 0.16) / 0.15) * (1 - clamp((s.t - (life - 0.35)) / 0.35));
        g.font = `500 ${this.w < 620 ? 14 : 16}px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = INK;
        g.fillText(s.quip, s.x + 6, s.y + size * 1.75);
      }
      g.globalAlpha = 1; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    }
    // score pops
    for (const p of this.pops) {
      const u = p.t / p.life;
      g.globalAlpha = p.big ? (1 - u) * 0.9 : Math.min(1, (1 - u) * 2.2);
      g.textAlign = 'center'; g.fillStyle = p.col;
      if (p.big) {
        const s = lerp(0.6, 1.5, outCubic(u));
        g.font = `800 ${p.size * s}px ${BIG}`; g.strokeStyle = p.col; g.lineWidth = 1.5; g.strokeText(p.text, p.x, p.y);
      } else {
        g.font = `${p.size > 16 ? 800 : 600} ${p.size}px ${p.size > 16 ? BIG : MONO}`;
        g.fillText(p.text, p.x, p.y - outCubic(u) * 34);
      }
      g.globalAlpha = 1; g.textAlign = 'left';
    }
  }
}
