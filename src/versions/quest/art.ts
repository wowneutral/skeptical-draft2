// Sixteen colours, a 3x5 pixel font and every sprite, all drawn by hand here.
export const PAL = [
  '#12121c', '#1f2236', '#2e3352', '#464d73', '#6e7699', '#aab0c8', '#f4f0e0', '#ffd27a',
  '#ef9a48', '#c2533b', '#6b2c3c', '#2f5a4c', '#79b386', '#4a3226', '#8c5b3b', '#5aa0c8',
];
// One step darker for every colour: the night falls through this table.
export const DARK = [0, 0, 1, 2, 3, 4, 5, 8, 9, 10, 1, 1, 11, 0, 13, 2];
export const RGB = PAL.map((h) => parseInt(h.slice(1), 16));

type Ctx = CanvasRenderingContext2D;
export const px = (c: Ctx, x: number, y: number, w: number, h: number, i: number) => {
  c.fillStyle = PAL[i];
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

const G: Record<string, string> = {
  A: '.#.|#.#|###|#.#|#.#', B: '##.|#.#|##.|#.#|##.', C: '.##|#..|#..|#..|.##', D: '##.|#.#|#.#|#.#|##.', E: '###|#..|##.|#..|###',
  F: '###|#..|##.|#..|#..', G: '.##|#..|#.#|#.#|.##', H: '#.#|#.#|###|#.#|#.#', I: '###|.#.|.#.|.#.|###', J: '..#|..#|..#|#.#|.#.',
  K: '#.#|#.#|##.|#.#|#.#', L: '#..|#..|#..|#..|###', M: '#.#|###|###|#.#|#.#', N: '##.|#.#|#.#|#.#|#.#', O: '.#.|#.#|#.#|#.#|.#.',
  P: '##.|#.#|##.|#..|#..', Q: '.#.|#.#|#.#|##.|.##', R: '##.|#.#|##.|#.#|#.#', S: '.##|#..|.#.|..#|##.', T: '###|.#.|.#.|.#.|.#.',
  U: '#.#|#.#|#.#|#.#|###', V: '#.#|#.#|#.#|#.#|.#.', W: '#.#|#.#|###|###|#.#', X: '#.#|#.#|.#.|#.#|#.#', Y: '#.#|#.#|.#.|.#.|.#.',
  Z: '###|..#|.#.|#..|###', '.': '...|...|...|...|.#.', '?': '##.|..#|.#.|...|.#.', '!': '.#.|.#.|.#.|...|.#.', ':': '...|.#.|...|.#.|...',
  "'": '.#.|.#.|...|...|...', ' ': '...|...|...|...|...',
};
const glyph = (ch: string) => (G[ch] ?? G[' ']).replace(/\|/g, '');
export const textW = (s: string) => s.length * 4 - 1;
export function text(c: Ctx, s: string, x: number, y: number, col: number, shadow = -1) {
  const up = s.toUpperCase();
  for (let k = 0; k < up.length; k++) {
    const g = glyph(up[k]);
    for (let r = 0; r < 5; r++)
      for (let q = 0; q < 3; q++)
        if (g[r * 3 + q] === '#') {
          if (shadow >= 0) px(c, x + k * 4 + q, y + r + 1, 1, 1, shadow);
          px(c, x + k * 4 + q, y + r, 1, 1, col);
        }
  }
}
export const textC = (c: Ctx, s: string, cx: number, y: number, col: number, sh = -1) => text(c, s, Math.round(cx - textW(s) / 2), y, col, sh);

// Sprites as rows of hex palette digits; '.' is transparent.
export function sprite(rows: string[], flip = false) {
  const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d')!;
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '.' || ch === ' ') return;
    px(c, flip ? w - 1 - x : x, y, 1, 1, parseInt(ch, 16));
  }));
  return cv;
}

const HEAD_D = ['....0000....', '...0dddd0...', '..0dddddd0..', '..0deeeed0..', '..0e0ee0e0..', '..0eeeeee0..', '...0eeee0...'];
const HEAD_U = ['....0000....', '...0dddd0...', '..0dddddd0..', '..0dddddd0..', '..0dddddd0..', '..0edddde0..', '...0eeee0...'];
const HEAD_S = ['....0000....', '...0dddd0...', '..0ddddddd0.', '..0dddeeee0.', '..0ddee0e0..', '..0ddeeeee0.', '...0eeeee0..'];
const BODY_D = ['..08866880..', '.0888888880.', '.0e888888e0.', '..00888800..'];
const BODY_U = ['..08888880..', '.0888888880.', '.0e888888e0.', '..00888800..'];
const BODY_S = ['...0888880..', '..08888880..', '..088e8880..', '...008800...'];

// Legs: [x, lift] for two legs, per frame.
function legs(c: Ctx, side: boolean, f: number) {
  const L = side ? [[4, 0], [6, 0]] : [[3, 0], [7, 0]];
  if (f === 1) { if (side) { L[0][0] = 3; L[1][0] = 7; L[1][1] = 1; } else L[0][1] = 1; }
  if (f === 3) { if (side) { L[0][0] = 5; L[1][0] = 5; L[0][1] = 1; } else L[1][1] = 1; }
  for (const [x, lift] of L) {
    px(c, x, 11, 2, 2 - lift, 2);
    px(c, x, 13 - lift, 2, 1, 0);
  }
}

/** Frames: dir (0 down, 1 left, 2 right, 3 up) x 4 walk frames (0 stand, 1 step, 2 stand, 3 step). */
export function heroFrames() {
  const out: HTMLCanvasElement[][] = [];
  for (let d = 0; d < 4; d++) {
    out[d] = [];
    for (let f = 0; f < 4; f++) {
      const cv = document.createElement('canvas');
      cv.width = 12; cv.height = 15;
      const c = cv.getContext('2d')!;
      const side = d === 1 || d === 2;
      const head = d === 0 ? HEAD_D : d === 3 ? HEAD_U : HEAD_S, body = d === 0 ? BODY_D : d === 3 ? BODY_U : BODY_S;
      legs(c, side, f);
      const bob = f % 2 ? 1 : 0;
      c.drawImage(sprite([...head, ...body]), 0, bob);
      if (d === 1) {
        const m = document.createElement('canvas'); m.width = 12; m.height = 15;
        const mc = m.getContext('2d')!; mc.translate(12, 0); mc.scale(-1, 1); mc.drawImage(cv, 0, 0);
        out[d].push(m);
      } else out[d].push(cv);
    }
  }
  return out;
}

export const QMARK = sprite(['.0000.', '066660', '060066', '...066', '..0660', '..060.', '..00..', '..060.', '..00..']);
export const BANG = sprite(['.00.', '0770', '0770', '0770', '.00.', '0770', '.00.']);
export const CAT_SLEEP = sprite(['4...4.....', '44444.....', '44444...4.', '.4444444.4', '.44444444.']);
export const CAT_SIT = [
  sprite(['4...4.....', '44444.....', '47474...4.', '44444...4.', '.4444444..', '.4.4.4.4..']),
  sprite(['4...4.....', '44444.....', '47474....4', '44444...4.', '.4444444..', '..4.4.4.4.']),
];
export const HEART = sprite(['9.9', '999', '.9.']);
export const PEN = sprite(['0ff6666', '0000000']);
export const PASS = sprite(['0000000', '0777770', '07ee770', '0777770', '0000000']);
export const CAN = sprite(['.55.', '9999', '9669', '9999', '.55.']);

// Small icons for the bag, the same art scaled up in the DOM.
export const ICONS: Record<string, string[]> = {
  pen: ['......00', '.....0f0', '....0f0.', '...0f0..', '..0f0...', '.060....', '060.....', '00......'],
  pass: ['00000000', '07777770', '07ee7770', '07777770', '07777e70', '07777770', '00000000'],
  can: ['.0550.', '099990', '096690', '096690', '099990', '099990', '.0550.'],
  empty: ['.0550.', '044440', '043340', '044440', '044340', '044440', '.0440.'],
  cat: ['4...4.....', '44444.....', '47474...4.', '44444...4.', '.4444444..', '.4.4.4.4..'],
};
