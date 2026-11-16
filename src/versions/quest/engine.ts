// The hallway itself: a tile map, a walker, doors, lights and a dithered night.
// Internal resolution changes with the screen, always at a whole-number scale.
import { CAT_SIT, CAT_SLEEP, DARK, HEART, PASS, PEN, QMARK, BANG, RGB, heroFrames, px, text, textC, textW } from './art';

export const T = 16;
const MW = 66, MH = 20;
type Ent = { id: string; x: number; y: number; w: number; h: number; solid?: boolean; read?: string; act?: string; gone?: boolean };
type Door = { id: string; x: number; y: number; down: boolean; t: number; lock?: 'never' | 'pass'; label: string };
export type Cb = {
  read: (id: string) => void;
  act: (id: string) => void;
  end: () => void;
  sfx: (n: 'step' | 'door' | 'bump') => void;
};

const hash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export class Game {
  cv: HTMLCanvasElement; c: CanvasRenderingContext2D; cb: Cb;
  W = 320; H = 192; scale = 3;
  grid: string[][] = [];
  ents: Ent[] = [];
  doors: Door[] = [];
  map!: HTMLCanvasElement;
  hero = heroFrames();
  p = { x: 6 * T + 8, y: 9 * T + 10, dir: 0, f: 0, ft: 0, moving: false };
  cam = { x: 0, y: 0 };
  keys = new Set<string>();
  path: { x: number; y: number }[] = [];
  goal: Ent | null = null;
  paused = true;
  attract = true;
  lights = true;
  has = new Set<string>();
  cat = { on: false, awake: false, x: 40 * T + 6, y: 17 * T + 10, trail: [] as { x: number; y: number }[], f: 0, heart: 0 };
  ended = false;
  still: boolean;
  t = 0; raf = 0; last = 0;
  near: Ent | null = null;
  flick = 1;

  constructor(cv: HTMLCanvasElement, cb: Cb, still: boolean) {
    this.cv = cv; this.cb = cb; this.still = still;
    this.c = cv.getContext('2d', { willReadFrequently: true })!;
    this.build();
    this.map = this.paintMap();
    this.cam.x = 6 * T - this.W / 2; this.cam.y = 6 * T - this.H / 2;
  }

  // ---------- world ----------
  build() {
    const g = (this.grid = Array.from({ length: MH }, () => Array(MW).fill('#')));
    const carve = (x0: number, y0: number, x1: number, y1: number, ch: string) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch;
    };
    carve(1, 2, 11, 12, 'f'); carve(1, 1, 11, 1, 'W');
    carve(12, 9, 51, 12, '.'); carve(12, 8, 51, 8, 'L');
    carve(13, 2, 24, 6, 'c'); carve(13, 1, 24, 1, 'W');
    carve(14, 15, 25, 18, 'w'); carve(14, 14, 25, 14, 'W');
    carve(34, 15, 40, 18, 'k'); carve(34, 14, 40, 14, 'W');
    carve(52, 2, 64, 17, 'a'); carve(52, 1, 64, 1, 'W');
    for (const x of [15, 16, 21, 22]) g[8][x] = 'N';
    for (const x of [53, 54, 62, 63]) g[1][x] = 'S';
    for (const x of [4, 5, 7, 8]) g[1][x] = 'W';
    for (let x = 26; x <= 31; x++) g[8][x] = 'W';
    for (let x = 33; x <= 39; x++) g[8][x] = 'W';
    this.doors = [
      { id: 'class', x: 18, y: 7, down: false, t: 0, label: 'CLASS' },
      { id: 'drive', x: 37, y: 7, down: false, t: 0, lock: 'never', label: 'DRIVE' },
      { id: 'coach', x: 19, y: 13, down: true, t: 0, label: 'COACHES' },
      { id: 'closet', x: 36, y: 13, down: true, t: 0, lock: 'pass', label: 'SUPPLY' },
    ];
    for (const d of this.doors) { g[d.y][d.x] = 'D'; g[d.y + 1][d.x] = 'D'; }
    const desks: [number, number][] = [[15, 3], [17, 3], [20, 3], [22, 3], [15, 5], [17, 5], [20, 5], [22, 5]];
    this.ents = [
      { id: 'doorA', x: 1, y: 1, w: 2, h: 1, read: 'doorA' },
      { id: 'banner', x: 3, y: 1, w: 7, h: 1, read: 'banner' },
      { id: 'doorB', x: 10, y: 1, w: 2, h: 1, read: 'doorB' },
      { id: 'plaque', x: 6, y: 6, w: 1, h: 1, solid: true, read: 'plaque' },
      { id: 'switch', x: 13, y: 8, w: 1, h: 1, act: 'switch' },
      { id: 'board', x: 15, y: 1, w: 8, h: 1, read: 'board' },
      ...desks.map(([x, y], i) => ({ id: 'desk' + i, x, y, w: 1, h: 1, solid: true })),
      { id: 'pass', x: 22, y: 5, w: 1, h: 1, act: 'pass' },
      { id: 'postings', x: 26, y: 8, w: 6, h: 1, read: 'postings' },
      { id: 'trophy', x: 27, y: 12, w: 4, h: 1, solid: true, read: 'trophy' },
      { id: 'drivesign', x: 33, y: 8, w: 3, h: 1, read: 'drivesign' },
      { id: 'drivedoor', x: 37, y: 8, w: 1, h: 1, read: 'drivedoor' },
      { id: 'keypad', x: 38, y: 8, w: 1, h: 1, act: 'keypad' },
      { id: 'vend', x: 44, y: 9, w: 2, h: 1, solid: true, act: 'vend' },
      { id: 'pen', x: 41, y: 11, w: 1, h: 1, act: 'pen' },
      { id: 'closetdoor', x: 36, y: 13, w: 1, h: 1, act: 'closet' },
      { id: 'desk8', x: 15, y: 16, w: 2, h: 1, solid: true },
      { id: 'desk9', x: 22, y: 16, w: 2, h: 1, solid: true },
      { id: 'plate0', x: 15, y: 16, w: 2, h: 1, read: 'plate0' },
      { id: 'plate1', x: 22, y: 16, w: 2, h: 1, read: 'plate1' },
      { id: 'roster', x: 21, y: 14, w: 4, h: 1, read: 'roster' },
      { id: 'boxes', x: 38, y: 16, w: 3, h: 1, solid: true },
      { id: 'boxes2', x: 39, y: 15, w: 2, h: 1, solid: true },
      { id: 'mop', x: 34, y: 15, w: 1, h: 1, solid: true },
      { id: 'cat', x: 40, y: 17, w: 1, h: 1, act: 'cat' },
      { id: 'joinsign', x: 53, y: 7, w: 1, h: 1, solid: true, read: 'joinsign' },
      { id: 'table', x: 55, y: 9, w: 7, h: 1, solid: true },
      { id: 'sheet0', x: 55, y: 9, w: 2, h: 1, read: 'sheet0' },
      { id: 'sheet1', x: 57, y: 9, w: 3, h: 1, read: 'sheet1' },
      { id: 'sheet2', x: 60, y: 9, w: 2, h: 1, read: 'sheet2' },
      { id: 'plant0', x: 52, y: 2, w: 1, h: 1, solid: true }, { id: 'plant1', x: 64, y: 2, w: 1, h: 1, solid: true },
      { id: 'plant2', x: 52, y: 17, w: 1, h: 1, solid: true }, { id: 'plant3', x: 64, y: 17, w: 1, h: 1, solid: true },
      { id: 'bench', x: 60, y: 14, w: 3, h: 1, solid: true },
    ];
  }

  solidStatic(tx: number, ty: number) {
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
    const ch = this.grid[ty][tx];
    if (ch === 'D') { const d = this.doors.find((d) => d.x === tx && (d.y === ty || d.y + 1 === ty))!; return d.t < 0.7; }
    if ('#WLNS'.includes(ch)) return true;
    return this.ents.some((e) => e.solid && !e.gone && tx >= e.x && tx < e.x + e.w && ty >= e.y && ty < e.y + e.h);
  }
  walkable(tx: number, ty: number) {
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return false;
    const ch = this.grid[ty][tx];
    if (ch === 'D') { const d = this.doors.find((d) => d.x === tx && (d.y === ty || d.y + 1 === ty))!; return !d.lock || (d.lock === 'pass' && this.has.has('pass')); }
    if ('#WLNS'.includes(ch)) return false;
    return !this.ents.some((e) => e.solid && tx >= e.x && tx < e.x + e.w && ty >= e.y && ty < e.y + e.h);
  }

  // ---------- painting the static map once ----------
  paintMap() {
    const cv = document.createElement('canvas');
    cv.width = MW * T; cv.height = MH * T;
    const c = cv.getContext('2d')!;
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) this.tile(c, tx, ty, this.grid[ty][tx]);
    this.decor(c);
    return cv;
  }
  tile(c: CanvasRenderingContext2D, tx: number, ty: number, ch: string) {
    const X = tx * T, Y = ty * T;
    const g = this.grid;
    switch (ch) {
      case '#': {
        px(c, X, Y, T, T, 1);
        const below = g[ty + 1]?.[tx];
        if (below && !'#'.includes(below)) px(c, X, Y + 14, T, 2, 3);
        if (hash(tx, ty) > 0.6) px(c, X + 4 + ((hash(ty, tx) * 8) | 0), Y + 5, 1, 1, 2);
        break;
      }
      case 'W': case 'N': case 'S': case 'L': {
        px(c, X, Y, T, T, 2); px(c, X, Y, T, 2, 3); px(c, X, Y + 13, T, 3, 13); px(c, X, Y + 13, T, 1, 14);
        if (ch === 'L') {
          for (const lx of [0, 8]) {
            px(c, X + lx, Y + 2, 8, 11, 15); px(c, X + lx, Y + 2, 1, 11, 2); px(c, X + lx + 7, Y + 2, 1, 11, 3);
            for (let v = 0; v < 3; v++) px(c, X + lx + 2, Y + 4 + v * 2, 4, 1, 2);
            px(c, X + lx + 5, Y + 10, 1, 2, 6);
          }
        }
        if (ch === 'N') { px(c, X + 1, Y + 3, 14, 9, 13); px(c, X + 2, Y + 4, 12, 7, 7); px(c, X + 7, Y + 4, 1, 7, 8); px(c, X + 2, Y + 7, 12, 1, 8); px(c, X + 1, Y + 12, 14, 1, 5); }
        if (ch === 'S') {
          px(c, X + 1, Y + 2, 14, 11, 4); px(c, X + 2, Y + 3, 12, 9, 1); px(c, X + 7, Y + 3, 1, 9, 4);
          if (hash(tx, 3) > 0.3) px(c, X + 4, Y + 5, 1, 1, 6);
          if (hash(tx, 5) > 0.4) px(c, X + 11, Y + 8, 1, 1, 5);
          if (tx === 63) { px(c, X + 10, Y + 4, 3, 3, 6); px(c, X + 11, Y + 4, 2, 2, 1); }
        }
        break;
      }
      case '.': {
        const o = ((tx + ty) & 1) === 0;
        px(c, X, Y, 8, 8, o ? 4 : 3); px(c, X + 8, Y, 8, 8, o ? 3 : 4); px(c, X, Y + 8, 8, 8, o ? 3 : 4); px(c, X + 8, Y + 8, 8, 8, o ? 4 : 3);
        if (hash(tx, ty) > 0.5) px(c, X + ((hash(tx, ty + 9) * 14) | 0), Y + ((hash(tx + 3, ty) * 14) | 0), 1, 1, 5);
        if (ty === 9) px(c, X, Y, T, 2, 2);
        break;
      }
      case 'f': {
        px(c, X, Y, T, T, 3); px(c, X, Y + 15, T, 1, 2); px(c, X + 15, Y, 1, T, 2);
        for (let k = 0; k < 3; k++) px(c, X + ((hash(tx * 3 + k, ty) * 14) | 0), Y + ((hash(tx, ty * 5 + k) * 14) | 0), 1, 1, k === 0 ? 8 : 4);
        if (ty === 2) px(c, X, Y, T, 2, 2);
        if (tx >= 4 && tx <= 8 && ty >= 9 && ty <= 11) { px(c, X, Y, T, T, 10); if (ty === 9) px(c, X, Y, T, 1, 9); if (ty === 11) px(c, X, Y + 15, T, 1, 9); }
        break;
      }
      case 'c': {
        px(c, X, Y, T, T, 14);
        for (let r = 0; r < 4; r++) { px(c, X, Y + r * 4 + 3, T, 1, 13); px(c, X + ((hash(tx, ty * 4 + r) * 14) | 0), Y + r * 4, 1, 3, 13); }
        if (ty === 2) px(c, X, Y, T, 2, 13);
        break;
      }
      case 'w': {
        px(c, X, Y, T, T, 10);
        for (let k = 0; k < 6; k++) px(c, X + ((hash(tx * 7 + k, ty) * 16) | 0), Y + ((hash(tx, ty * 7 + k) * 16) | 0), 1, 1, 9);
        if (ty === 15) px(c, X, Y, T, 2, 1);
        break;
      }
      case 'k': {
        px(c, X, Y, T, T, 2);
        for (let k = 0; k < 4; k++) px(c, X + ((hash(tx * 5 + k, ty) * 16) | 0), Y + ((hash(tx, ty * 5 + k) * 16) | 0), 1, 1, 1);
        if (ty === 15) px(c, X, Y, T, 2, 1);
        break;
      }
      case 'a': {
        const o = ((tx + ty) & 1) === 0;
        px(c, X, Y, T, T, o ? 5 : 4); px(c, X + 1, Y + 1, 14, 14, o ? 5 : 4); px(c, X, Y, T, 1, o ? 4 : 3); px(c, X, Y, 1, T, o ? 4 : 3);
        if (o) px(c, X + 6, Y + 6, 4, 4, 6);
        if (ty === 2) px(c, X, Y, T, 2, 3);
        break;
      }
      case 'D': {
        const above = g[ty - 1]?.[tx] === 'D';
        if (!above) px(c, X, Y, T, T, 1);
        else px(c, X, Y, T, T, 0);
        break;
      }
    }
  }
  decor(c: CanvasRenderingContext2D) {
    const at = (x: number, y: number) => [x * T, y * T];
    // Front doors: glass, push bars, the two signs.
    for (const [x, label] of [[1, 'JOIN AS A'], [10, 'COACH']] as [number, string][]) {
      const [X, Y] = at(x, 1);
      px(c, X + 1, Y + 1, 30, 15, 13); px(c, X + 2, Y + 2, 13, 14, 1); px(c, X + 17, Y + 2, 13, 14, 1);
      px(c, X + 3, Y + 3, 3, 6, 4); px(c, X + 18, Y + 3, 3, 6, 4);
      px(c, X + 2, Y + 9, 28, 2, 5); px(c, X + 15, Y + 2, 2, 14, 13);
      px(c, X - 2, Y - 9, 36, 9, 6); px(c, X - 1, Y - 8, 34, 7, 11);
      textC(c, label, X + 16, Y - 7, 6);
    }
    textC(c, 'A DEBATER', 1 * T + 16, 2 * T + 3, 5);
    textC(c, 'WITH US', 10 * T + 16, 2 * T + 3, 5);
    // The banner with the pitch, hung across the foyer wall.
    { const X = 3 * T + 2, Y = 1 * T - 6, w = 7 * T - 4;
      px(c, X, Y, w, 30, 10); px(c, X, Y, w, 2, 9); px(c, X, Y + 28, w, 2, 9);
      for (let k = 0; k < w; k += 6) px(c, X + k, Y + 30, 3, 2, 9);
      px(c, X + 4, Y - 4, 1, 4, 5); px(c, X + w - 5, Y - 4, 1, 4, 5);
      textC(c, 'AN INDEPENDENT LD TEAM.', X + w / 2, Y + 6, 6, 0);
      textC(c, 'COACHES WHO STILL COMPETE.', X + w / 2, Y + 17, 7, 0); }
    // Plaque on a stand.
    { const [X, Y] = at(6, 6); px(c, X + 2, Y - 6, 12, 12, 13); px(c, X + 3, Y - 5, 10, 9, 7); px(c, X + 4, Y - 3, 8, 1, 8); px(c, X + 4, Y - 1, 6, 1, 8); px(c, X + 4, Y + 1, 7, 1, 8); px(c, X + 7, Y + 6, 2, 8, 13); px(c, X + 4, Y + 13, 8, 2, 0); }
    // Light switch.
    { const [X, Y] = at(13, 8); px(c, X + 5, Y + 4, 6, 8, 5); px(c, X + 7, Y + 6, 2, 4, 6); }
    // Chalkboard.
    { const X = 15 * T, Y = 1 * T - 10, w = 8 * T;
      px(c, X, Y, w, 24, 13); px(c, X + 2, Y + 2, w - 4, 19, 11); px(c, X + 2, Y + 21, w - 4, 2, 14);
      textC(c, "WE'RE AN INDEPENDENT ENTRY.", X + w / 2, Y + 5, 5);
      for (let r = 0; r < 2; r++) for (let k = 0; k < 9; k++) if (hash(k, r) > 0.25) px(c, X + 8 + k * 13, Y + 12 + r * 4, 6 + ((hash(r, k) * 5) | 0), 1, 12);
      px(c, X + w - 20, Y + 21, 5, 1, 6); }
    // Desks.
    for (const e of this.ents.filter((e) => /^desk[0-7]$/.test(e.id))) {
      const [X, Y] = at(e.x, e.y); px(c, X + 1, Y + 2, 14, 9, 13); px(c, X + 1, Y + 1, 14, 8, 14); px(c, X + 2, Y + 11, 2, 4, 13); px(c, X + 12, Y + 11, 2, 4, 13);
      px(c, X + 4, Y + 13, 8, 3, 2);
      if (hash(e.x, e.y) > 0.5) px(c, X + 4, Y + 3, 5, 3, 6);
    }
    // Postings wall: a cork board of paper.
    { const X = 26 * T, Y = 8 * T - 8, w = 6 * T;
      px(c, X, Y, w, 22, 13); px(c, X + 2, Y + 2, w - 4, 18, 14);
      textC(c, 'POSTINGS', X + w / 2, Y - 7, 7, 0);
      const cols = [6, 7, 6, 12, 6, 15, 6, 7];
      for (let k = 0; k < 8; k++) { const x = X + 5 + k * 11, y = Y + 4 + ((hash(k, 9) * 4) | 0); px(c, x, y, 9, 12, cols[k]); px(c, x + 4, y, 1, 1, 9); for (let r = 0; r < 4; r++) px(c, x + 1, y + 3 + r * 2, 5 + ((hash(k, r) * 3) | 0), 1, 3); }
    }
    // Trophy case, against the south wall.
    { const X = 27 * T, Y = 12 * T - 12, w = 4 * T;
      px(c, X, Y, w, 28, 13); px(c, X + 2, Y + 2, w - 4, 20, 1); px(c, X + 2, Y + 12, w - 4, 1, 5);
      for (const [k, h] of [[14, 8], [44, 7]] as [number, number][]) { px(c, X + k, Y + 11 - h, 7, 4, 7); px(c, X + k + 2, Y + 11 - h + 4, 3, h - 4, 8); px(c, X + k + 1, Y + 10, 5, 2, 8); px(c, X + k - 1, Y + 11 - h + 1, 1, 2, 7); px(c, X + k + 7, Y + 11 - h + 1, 1, 2, 7); }
      for (let k = 0; k < 4; k++) px(c, X + 8 + k * 13, Y + 16, 8, 4, k % 2 ? 6 : 5);
      px(c, X + 3, Y + 3, 1, 6, 5); px(c, X + w - 6, Y + 14, 1, 6, 4);
      px(c, X, Y + 22, w, 6, 14); textC(c, 'THE RECORD.', X + w / 2, Y + 23, 6, 13); }
    // Drive sign: a typed list taped on the wall.
    { const X = 33 * T + 2, Y = 8 * T - 6, w = 3 * T - 4;
      px(c, X, Y, w, 20, 6); px(c, X, Y, w, 1, 5); px(c, X + 4, Y - 1, 6, 3, 5); px(c, X + w - 10, Y - 1, 6, 3, 5);
      text(c, 'DRIVE.', X + 3, Y + 3, 0);
      for (let r = 0; r < 7; r++) { px(c, X + 3, Y + 10 + r * 1.4 | 0, 2, 1, 9); px(c, X + 7, Y + 10 + r * 1.4 | 0, 10 + ((hash(r, 2) * 20) | 0), 1, 3); }
    }
    // Keypad.
    { const [X, Y] = at(38, 8); px(c, X + 3, Y + 2, 10, 11, 0); px(c, X + 4, Y + 3, 8, 3, 11);
      for (let r = 0; r < 2; r++) for (let q = 0; q < 3; q++) px(c, X + 4 + q * 3, Y + 7 + r * 3, 2, 2, 5);
      px(c, X + 10, Y + 3, 2, 1, 9); }
    // Vending machine, tall, glowing.
    { const X = 44 * T, Y = 9 * T - 18, w = 2 * T;
      px(c, X, Y, w, 34, 0); px(c, X + 1, Y + 1, w - 2, 32, 9); px(c, X + 3, Y + 3, 19, 22, 1);
      for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) { const col = r === 2 && q === 1 ? 7 : [15, 12, 8, 6][(r + q) % 4]; px(c, X + 4 + q * 5, Y + 4 + r * 5, 3, 4, (r * 4 + q) % 3 === 0 && !(r === 2 && q === 1) ? 2 : col); px(c, X + 4 + q * 5, Y + 8 + r * 5, 4, 1, 4); }
      px(c, X + 24, Y + 4, 5, 10, 1); for (let k = 0; k < 3; k++) px(c, X + 25, Y + 5 + k * 3, 3, 2, k === 1 ? 7 : 4);
      px(c, X + 4, Y + 27, 17, 4, 0); px(c, X + 24, Y + 17, 5, 2, 0);
      textC(c, 'FIZZ', X + 16, Y - 6, 7, 0); }
    // Coaches' desks and name plates.
    for (const x of [15, 22]) {
      const [X, Y] = at(x, 16);
      px(c, X, Y - 4, 32, 14, 13); px(c, X + 1, Y - 5, 30, 12, 14); px(c, X + 2, Y + 9, 3, 6, 13); px(c, X + 27, Y + 9, 3, 6, 13);
      px(c, X + 4, Y - 3, 10, 7, 6); px(c, X + 5, Y - 2, 8, 1, 3); px(c, X + 5, Y, 6, 1, 3);
      px(c, X + 18, Y - 9, 10, 7, 1); px(c, X + 19, Y - 8, 8, 5, 15); px(c, X + 22, Y - 2, 2, 2, 1);
      px(c, X + 8, Y + 4, 16, 5, 7); px(c, X + 8, Y + 8, 16, 1, 8);
    }
    for (const [x, s] of [[15, 'HEAD COACH'], [22, 'ASST. COACH']] as [number, string][]) text(c, s, x * T + 16 - Math.round(textW(s) / 2), 16 * T + 12, 0);
    // Coaches' whiteboard.
    { const X = 21 * T, Y = 14 * T - 6, w = 4 * T;
      px(c, X, Y, w, 20, 4); px(c, X + 1, Y + 1, w - 2, 17, 6);
      textC(c, 'ROSTER', X + w / 2, Y + 3, 3);
      for (let k = 0; k < 8; k++) { px(c, X + 7 + (k % 4) * 13, Y + 10 + ((k / 4) | 0) * 4, 7, 2, k % 2 ? 9 : 15); }
    }
    // Closet: boxes, a mop, shelves.
    for (const [x, y] of [[38, 16], [39, 16], [40, 16], [39, 15], [40, 15]]) { const [X, Y] = at(x, y); px(c, X + 1, Y + 1, 14, 14, 13); px(c, X + 2, Y + 2, 12, 12, 14); px(c, X + 2, Y + 7, 12, 2, 13); px(c, X + 7, Y + 2, 2, 12, 7); }
    { const [X, Y] = at(34, 15); px(c, X + 7, Y - 8, 2, 18, 14); px(c, X + 3, Y + 9, 10, 5, 5); px(c, X + 2, Y + 12, 12, 4, 15); }
    // Join sign and the table of three sheets.
    { const [X, Y] = at(53, 7); px(c, X - 6, Y - 10, 28, 18, 13); px(c, X - 5, Y - 9, 26, 16, 6); textC(c, 'JOIN.', X + 8, Y - 6, 9); px(c, X - 1, Y - 0, 18, 1, 4); px(c, X + 1, Y + 3, 14, 1, 4); px(c, X + 7, Y + 8, 2, 8, 13); }
    { const X = 55 * T, Y = 9 * T - 2, w = 7 * T;
      px(c, X, Y, w, 14, 13); px(c, X, Y - 2, w, 12, 14); px(c, X, Y + 10, w, 6, 10); px(c, X, Y + 10, w, 1, 9);
      textC(c, 'SIGN UP', X + w / 2, Y + 11, 7, 0);
      for (const [k, s] of [[0, 'COMPETE'], [1, 'LECTURE'], [2, 'COACH']] as [number, string][]) {
        const cx = X + 16 + k * 40;
        px(c, cx - 12, Y - 6, 24, 13, 6); px(c, cx - 12, Y - 6, 24, 1, 5);
        textC(c, s, cx, Y - 4, 13);
        for (let r = 0; r < 2; r++) px(c, cx - 9, Y + 3 + r * 2, 18 - r * 5, 1, 4);
      }
      px(c, X + 102, Y - 8, 2, 9, 0); px(c, X + 103, Y - 9, 1, 1, 15); }
    for (const [x, y] of [[52, 2], [64, 2], [52, 17], [64, 17]]) { const [X, Y] = at(x, y); px(c, X + 4, Y + 8, 8, 7, 9); px(c, X + 3, Y + 7, 10, 2, 14); px(c, X + 2, Y - 2, 5, 9, 11); px(c, X + 8, Y - 4, 6, 11, 12); px(c, X + 5, Y - 6, 4, 8, 11); }
    { const [X, Y] = at(60, 14); px(c, X, Y + 2, 48, 8, 13); px(c, X, Y + 1, 48, 6, 14); px(c, X + 3, Y + 9, 3, 5, 13); px(c, X + 42, Y + 9, 3, 5, 13); }
    // The last door: wood, a blank name plate, light under it.
    { const [X, Y] = at(58, 1); px(c, X - 4, Y - 6, 24, 22, 13); px(c, X - 2, Y - 4, 20, 20, 14); px(c, X - 1, Y - 3, 8, 18, 13); px(c, X + 9, Y - 3, 8, 18, 13); px(c, X + 14, Y + 7, 2, 2, 7);
      px(c, X + 1, Y - 13, 14, 7, 6); px(c, X + 1, Y - 13, 14, 1, 5); px(c, X + 1, Y - 7, 14, 1, 4); }
    // Door name plates on the hall.
    for (const d of this.doors) {
      const X = d.x * T + 8, Y = d.down ? (d.y + 1) * T - 1 : d.y * T + 5, w = textW(d.label) + 4;
      if (d.down) { px(c, X - w / 2, d.y * T + 3, w, 8, 6); textC(c, d.label, X, d.y * T + 4, 2); }
      else { px(c, X - w / 2, Y - 2, w, 8, 6); textC(c, d.label, X, Y - 1, 2); }
    }
  }

  // ---------- frame ----------
  resize(cssW: number, cssH: number) {
    const s = cssW < 560 ? 3 : Math.max(2, Math.min(6, Math.round(Math.min(cssW / 330, cssH / 200))));
    this.scale = s;
    this.W = Math.ceil(cssW / s); this.H = Math.ceil(cssH / s);
    this.cv.width = this.W; this.cv.height = this.H;
    this.cv.style.width = this.W * s + 'px'; this.cv.style.height = this.H * s + 'px';
    this.c.imageSmoothingEnabled = false;
    this.light = null;
    if (this.still) this.frame(0);
  }
  start() { this.last = performance.now(); const tick = (now: number) => { this.raf = requestAnimationFrame(tick); const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.frame(dt); }; this.raf = requestAnimationFrame(tick); }
  stop() { cancelAnimationFrame(this.raf); }

  hold(dir: string, on: boolean) { if (on) { this.keys.add(dir); this.path = []; this.goal = null; } else this.keys.delete(dir); }

  frame(dt: number) {
    this.t += dt;
    if (!this.paused && !this.attract) this.move(dt);
    for (const d of this.doors) {
      const cx = d.x * T + 8, cy = (d.y + 1) * T;
      const near = Math.abs(this.p.x - cx) < 14 && Math.abs(this.p.y - cy) < 30;
      const ok = !d.lock || (d.lock === 'pass' && this.has.has('pass'));
      const was = d.t;
      d.t = Math.max(0, Math.min(1, d.t + (near && ok ? 1 : -1) * dt * 5));
      if (this.still && near && ok) d.t = 1;
      if (was === 0 && d.t > 0) this.cb.sfx('door');
    }
    // The last door opens Join when you walk up to it.
    const atEnd = this.p.y < 3 * T + 12 && Math.abs(this.p.x - (58 * T + 8)) < 22;
    if (atEnd && !this.ended && !this.attract) { this.ended = true; this.paused = true; this.keys.clear(); this.path = []; this.cb.end(); }
    if (!atEnd && this.p.y > 4 * T) this.ended = false;
    this.catStep(dt);
    // Camera.
    const tx = this.attract ? 6 * T + 8 - this.W / 2 + (this.still ? 0 : Math.sin(this.t * 0.25) * 6) : this.p.x - this.W / 2;
    const ty = this.attract ? 4 * T - this.H / 2 + 10 : this.p.y - 8 - this.H / 2;
    const k = this.still ? 1 : 1 - Math.exp(-6 * dt);
    this.cam.x += (tx - this.cam.x) * k; this.cam.y += (ty - this.cam.y) * k;
    const mw = MW * T, mh = MH * T;
    this.cam.x = this.W >= mw ? (mw - this.W) / 2 : Math.max(0, Math.min(mw - this.W, this.cam.x));
    this.cam.y = this.H >= mh ? (mh - this.H) / 2 : Math.max(0, Math.min(mh - this.H, this.cam.y));
    this.flick = this.still ? 1 : (Math.sin(this.t * 31) > 0.82 || (this.t % 4.3 < 0.25 && Math.sin(this.t * 90) > 0)) ? 0.15 : 1;
    this.draw();
  }

  move(dt: number) {
    const p = this.p;
    let dx = 0, dy = 0;
    if (this.keys.has('left')) dx -= 1; if (this.keys.has('right')) dx += 1;
    if (this.keys.has('up')) dy -= 1; if (this.keys.has('down')) dy += 1;
    if ((dx || dy) && this.path.length) { this.path = []; this.goal = null; }
    if (!dx && !dy && this.path.length) {
      const n = this.path[0], gx = n.x * T + 8, gy = n.y * T + 10;
      const ex = gx - p.x, ey = gy - p.y, d = Math.hypot(ex, ey);
      if (d < 1.5) { p.x = gx; p.y = gy; this.path.shift(); if (!this.path.length && this.goal) { this.faceTo(this.goal); const g = this.goal; this.goal = null; this.use(g); } }
      else { dx = ex / d; dy = ey / d; }
    }
    p.moving = !!(dx || dy);
    if (p.moving) {
      if (Math.abs(dx) > Math.abs(dy) + 0.01) p.dir = dx < 0 ? 1 : 2; else if (dy) p.dir = dy < 0 ? 3 : 0;
      const n = Math.hypot(dx, dy), sp = 66 * dt;
      const mx = (dx / n) * sp, my = (dy / n) * sp;
      if (!this.hits(p.x + mx, p.y)) p.x += mx; else if (!this.path.length) this.slide(mx, 0);
      if (!this.hits(p.x, p.y + my)) p.y += my; else if (!this.path.length) this.slide(0, my);
      p.ft += dt;
      if (p.ft > 0.13) { p.ft = 0; p.f = (p.f + 1) % 4; if (p.f % 2) this.cb.sfx('step'); }
      if (this.cat.on) { this.cat.trail.push({ x: p.x, y: p.y }); if (this.cat.trail.length > 400) this.cat.trail.shift(); }
    } else { p.f = 0; p.ft = 0.12; }
    this.near = this.probe();
  }
  // Nudge around corners so you do not snag on a doorframe.
  slide(mx: number, my: number) {
    const p = this.p;
    for (const o of [1, -1, 2, -2, 3, -3, 4, -4, 5, -5]) {
      if (mx && !this.hits(p.x, p.y + o) && !this.hits(p.x + mx, p.y + o)) { p.y += Math.sign(o) * 0.8; return; }
      if (my && !this.hits(p.x + o, p.y) && !this.hits(p.x + o, p.y + my)) { p.x += Math.sign(o) * 0.8; return; }
    }
  }
  hits(x: number, y: number) {
    for (const [ox, oy] of [[-4, -3], [4, -3], [-4, 2], [4, 2]]) if (this.solidStatic(Math.floor((x + ox) / T), Math.floor((y + oy) / T))) return true;
    return false;
  }
  probe(): Ent | null {
    const p = this.p, v = [[0, 1], [-1, 0], [1, 0], [0, -1]][p.dir];
    const qx = p.x + v[0] * 12, qy = p.y - 4 + v[1] * 12;
    let best: Ent | null = null, bd = 1e9;
    for (const e of this.ents) {
      if (e.gone || (!e.read && !e.act)) continue;
      if (e.id === 'cat' && this.cat.on) continue;
      const x0 = e.x * T - 3, y0 = e.y * T - 3, x1 = (e.x + e.w) * T + 3, y1 = (e.y + e.h) * T + 3;
      const cx = Math.max(x0, Math.min(x1, qx)), cy = Math.max(y0, Math.min(y1, qy));
      const d = Math.hypot(cx - qx, cy - qy);
      if (d < 5 && d < bd) { bd = d; best = e; }
    }
    if (!best && this.cat.on && Math.hypot(this.cat.x - qx, this.cat.y - 4 - qy) < 12) return { id: 'cat', x: 0, y: 0, w: 0, h: 0, act: 'cat' };
    return best;
  }
  faceTo(e: Ent) {
    const cx = (e.x + e.w / 2) * T, cy = (e.y + e.h / 2) * T;
    const dx = cx - this.p.x, dy = cy - (this.p.y - 4);
    this.p.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : dy < 0 ? 3 : 0;
    this.near = this.probe() ?? e;
  }
  interact() { const e = this.near ?? this.probe(); if (e) this.use(e); }
  use(e: Ent) {
    if (e.read) this.cb.read(e.read);
    else if (e.act) this.cb.act(e.act);
  }
  take(id: string) { const e = this.ents.find((x) => x.id === id); if (e) e.gone = true; this.has.add(id); this.near = this.probe(); }
  wakeCat() { this.cat.on = true; this.cat.awake = true; this.cat.trail = []; const e = this.ents.find((x) => x.id === 'cat'); if (e) e.gone = true; this.cat.heart = 1.5; }
  pet() { this.cat.heart = 1.5; }

  catStep(dt: number) {
    const k = this.cat;
    if (k.heart > 0) k.heart -= dt;
    if (!k.on) return;
    const tr = k.trail, i = tr.length - 22;
    if (i > 0) { const g = tr[i]; const d = Math.hypot(g.x - k.x, g.y - k.y); if (d > 1) { k.x += (g.x - k.x) * Math.min(1, dt * 8); k.y += (g.y - k.y) * Math.min(1, dt * 8); k.f += dt; } tr.splice(0, i - 1); }
  }

  /** Tap or click: walk there by the shortest path, then use what is there. */
  tap(clientX: number, clientY: number, rect: DOMRect) {
    const wx = this.cam.x + ((clientX - rect.left) / rect.width) * this.W, wy = this.cam.y + ((clientY - rect.top) / rect.height) * this.H;
    const tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    let target: Ent | null = null;
    for (const e of this.ents) if (!e.gone && (e.read || e.act) && wx >= e.x * T - 4 && wx < (e.x + e.w) * T + 4 && wy >= e.y * T - 8 && wy < (e.y + e.h) * T + 4) target = e;
    if (this.cat.on && Math.hypot(wx - this.cat.x, wy - this.cat.y) < 12) target = { id: 'cat', x: Math.floor(this.cat.x / T), y: Math.floor(this.cat.y / T), w: 1, h: 1, act: 'cat' };
    const goals: [number, number][] = [];
    if (target) {
      for (let x = target.x - 1; x <= target.x + target.w; x++) for (let y = target.y - 1; y <= target.y + target.h; y++) {
        const inside = x >= target.x && x < target.x + target.w && y >= target.y && y < target.y + target.h;
        if (!inside && this.walkable(x, y) && (x >= target.x && x < target.x + target.w || y >= target.y && y < target.y + target.h)) goals.push([x, y]);
      }
    } else if (this.walkable(tx, ty)) goals.push([tx, ty]);
    else for (const [ox, oy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (this.walkable(tx + ox, ty + oy)) goals.push([tx + ox, ty + oy]);
    const path = this.bfs(goals);
    if (!path) { if (target) this.cb.sfx('bump'); return; }
    this.keys.clear();
    this.path = path; this.goal = target;
    if (!path.length && target) { this.faceTo(target); this.goal = null; this.use(target); }
  }
  bfs(goals: [number, number][]) {
    if (!goals.length) return null;
    const sx = Math.floor(this.p.x / T), sy = Math.floor(this.p.y / T);
    const key = (x: number, y: number) => y * MW + x;
    const G = new Set(goals.map(([x, y]) => key(x, y)));
    const prev = new Map<number, number>(); prev.set(key(sx, sy), -1);
    const q = [key(sx, sy)];
    while (q.length) {
      const cur = q.shift()!;
      if (G.has(cur)) {
        const out: { x: number; y: number }[] = []; let c = cur;
        while (c !== -1 && c !== key(sx, sy)) { out.unshift({ x: c % MW, y: (c / MW) | 0 }); c = prev.get(c)!; }
        if (!out.length) out.push({ x: sx, y: sy });
        return out;
      }
      const x = cur % MW, y = (cur / MW) | 0;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + ox, ny = y + oy, nk = key(nx, ny);
        if (!prev.has(nk) && this.walkable(nx, ny)) { prev.set(nk, cur); q.push(nk); }
      }
    }
    return null;
  }

  // ---------- drawing ----------
  light: Float32Array | null = null;
  lut = new Map(RGB.map((v, i) => [v, i]));
  draw() {
    const c = this.c, cx = Math.round(this.cam.x), cy = Math.round(this.cam.y);
    px(c, 0, 0, this.W, this.H, 0);
    c.drawImage(this.map, -cx, -cy);
    // Doors, opening.
    for (const d of this.doors) {
      const X = d.x * T - cx, Y = (d.down ? d.y + 1 : d.y + 1) * T - cy;
      const o = Math.round(d.t * 13);
      if (!d.down) {
        px(c, X, Y, T, T, 0);
        px(c, X + 1, Y, 14 - o, 15, 14); px(c, X + 2, Y + 1, 12 - o, 13, 13); if (12 - o > 6) { px(c, X + 4, Y + 2, 5, 4, d.lock ? 1 : 7); px(c, X + 11 - o, Y + 8, 2, 2, 7); }
        if (d.lock) px(c, X + 11, Y + 8, 2, 2, 9);
      } else {
        px(c, X, Y - T + 12, T, 4, 0);
        px(c, X, Y, T, T, 0);
        px(c, X + 1, Y, 14 - o, 15, 14); px(c, X + 2, Y + 1, 12 - o, 13, 13); if (12 - o > 6) { px(c, X + 4, Y + 2, 5, 4, d.id === 'closet' ? 1 : 7); px(c, X + 11 - o, Y + 8, 2, 2, 7); }
      }
    }
    // Items still lying about.
    const bob = this.still ? 0 : Math.round(Math.sin(this.t * 4) * 1);
    if (!this.has.has('pen')) { const a = this.t * 0.6; c.drawImage(PEN, 41 * T + 4 - cx, 11 * T + 8 - cy + (Math.sin(a) > 0.99 ? -1 : 0)); }
    if (!this.has.has('pass')) c.drawImage(PASS, 22 * T + 5 - cx, 5 * T + 3 - cy + bob);
    // The cat.
    const k = this.cat;
    if (!k.on) c.drawImage(CAT_SLEEP, 40 * T + 3 - cx, 17 * T + 8 - cy);
    else c.drawImage(CAT_SIT[Math.floor(k.f * 6) % 2], Math.round(k.x - 5) - cx, Math.round(k.y - 6) - cy);
    // The walker.
    const p = this.p, fr = this.hero[p.dir][p.f];
    px(c, Math.round(p.x) - 5 - cx, Math.round(p.y) + 2 - cy, 10, 2, 0);
    c.drawImage(fr, Math.round(p.x) - 6 - cx, Math.round(p.y) - 13 - cy);
    this.shade(cx, cy);
    // Over the night: the question mark (or a bang when there is something to read).
    const qy = Math.round(p.y) - 24 - cy + (this.still ? 0 : Math.round(Math.sin(this.t * 3) * 1.5));
    if (this.near && !this.attract && !this.paused) c.drawImage(BANG, Math.round(p.x) - 2 - cx, qy + 1);
    else c.drawImage(QMARK, Math.round(p.x) - 3 - cx, qy);
    if (k.heart > 0) { const hy = k.on ? k.y - 16 : 17 * T - 2; c.drawImage(HEART, Math.round(k.on ? k.x - 1 : 40 * T + 6) - cx, Math.round(hy - (1.5 - k.heart) * 6) - cy); }
  }

  lightsList(cx: number, cy: number) {
    const L: [number, number, number, number][] = [];
    const add = (x: number, y: number, r: number, i: number) => { if (x + r > cx && x - r < cx + this.W && y + r > cy && y - r < cy + this.H) L.push([x, y, r, i]); };
    if (this.lights) {
      [15, 21, 27, 33, 39, 46, 50].forEach((x, k) => add(x * T, 10.6 * T, 66, k === 3 ? this.flick : 0.95));
      add(6 * T, 4 * T, 96, 1); add(6 * T, 10 * T, 80, 0.9);
    }
    add(18.5 * T, 4 * T, 120, 1.05);
    add(19.5 * T, 16.5 * T, 70, 0.9); add(16 * T, 16 * T, 40, 0.7); add(23 * T, 16 * T, 40, 0.7);
    add(58.5 * T, 6 * T, 130, 1.1); add(58.5 * T, 13 * T, 120, 1);
    for (const x of [15.5, 21.5]) add(x * T, 9 * T, 34, 0.8);
    add(45 * T, 9 * T, 46, 0.9); add(58.5 * T, 1 * T, 40, 0.8);
    add(this.p.x, this.p.y - 6, this.lights ? 34 : 52, this.lights ? 0.55 : 0.8);
    if (this.cat.on) add(this.cat.x, this.cat.y, 14, 0.3);
    return L;
  }
  // Night: every pixel steps down the palette by an ordered dither.
  shade(cx: number, cy: number) {
    const W = this.W, H = this.H;
    const img = this.c.getImageData(0, 0, W, H), d = img.data;
    const bw = Math.ceil(W / 2), bh = Math.ceil(H / 2);
    if (!this.light || this.light.length !== bw * bh) this.light = new Float32Array(bw * bh);
    const lb = this.light, Ls = this.lightsList(cx, cy);
    for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
      const wx = cx + bx * 2 + 1, wy = cy + by * 2 + 1;
      let l = 0.1;
      for (const [x, y, r, i] of Ls) { const dd = Math.hypot(wx - x, wy - y); if (dd < r) { const f = 1 - dd / r; l += i * f * (2 - f); } }
      lb[by * bw + bx] = l > 1 ? 1 : l;
    }
    const BY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      let idx = this.lut.get((d[o] << 16) | (d[o + 1] << 8) | d[o + 2]);
      if (idx === undefined) continue;
      const D = (1 - lb[(y >> 1) * bw + (x >> 1)]) * 3.2;
      let s = Math.floor(D + BY[(y & 3) * 4 + (x & 3)] / 16);
      if (s <= 0) continue;
      if (s > 4) s = 4;
      while (s--) idx = DARK[idx];
      const v = RGB[idx]; d[o] = v >> 16; d[o + 1] = (v >> 8) & 255; d[o + 2] = v & 255;
    }
    this.c.putImageData(img, 0, 0);
  }
}
