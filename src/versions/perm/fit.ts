// The fitting engine. Every big line on the page is set in Archivo with its wdth axis,
// and is re-solved whenever the seam moves so that it fills its half exactly:
// first by condensing or stretching (62% to 125%), and only past those limits by size.

export const LH = 0.86;
const STEPS = [62, 72, 82, 92, 102, 112, 125];

/** Shared, mutable state. Read inside the ticker; never put it in React state. */
export const store = {
  s: 0.5, // where the seam is: 0 is all bone, 1 is all black (the black half's share)
  v: 0,
  base: 0.5,
  lean: 0,
  drag: null as null | number,
  phone: false,
  vw: 1440,
  vh: 900,
  open: 0, // the drive column
  j: 0, // the join split
  ready: false,
};

let meas: HTMLSpanElement | null = null;
const cache = new Map<string, number[]>();

export function initMeasure(host: HTMLElement) {
  meas = document.createElement('span');
  meas.className = 'fitrow measure';
  meas.setAttribute('aria-hidden', 'true');
  host.appendChild(meas);
  cache.clear();
  return () => { meas?.remove(); meas = null; };
}

/** Widths of a line at a 100px size, sampled across the wdth axis. */
export function widths(text: string): number[] {
  const hit = cache.get(text);
  if (hit) return hit;
  if (!meas) return STEPS.map(() => text.length * 60);
  meas.textContent = text;
  meas.style.fontSize = '100px';
  const out = STEPS.map((st) => {
    meas!.style.fontStretch = st + '%';
    return meas!.getBoundingClientRect().width || 1;
  });
  cache.set(text, out);
  return out;
}

export function widthAt(text: string, st: number) {
  const w = widths(text);
  for (let i = 0; i < STEPS.length - 1; i++) {
    if (st <= STEPS[i + 1]) {
      const t = (st - STEPS[i]) / (STEPS[i + 1] - STEPS[i]);
      return w[i] + (w[i + 1] - w[i]) * Math.max(0, t);
    }
  }
  return w[w.length - 1];
}

/** The size at which a line fills W at a given stretch. */
export const sizeAt = (text: string, W: number, st: number) => (W * 100) / widthAt(text, st);

/** Solve stretch and size so `text` is exactly W wide, preferring size S. cap: never grow past S. */
export function solve(text: string, W: number, S: number, cap = false): [number, number] {
  const w = widths(text);
  const need = (W * 100) / S; // width required at 100px
  if (need <= w[0]) return [STEPS[0], (W * 100) / w[0]];
  if (need >= w[w.length - 1]) return [125, cap ? S : Math.min((W * 100) / w[w.length - 1], S * 1.6)];
  for (let i = 0; i < STEPS.length - 1; i++) {
    if (need <= w[i + 1]) {
      const t = (need - w[i]) / (w[i + 1] - w[i]);
      return [STEPS[i] + (STEPS[i + 1] - STEPS[i]) * t, S];
    }
  }
  return [100, S];
}

export type Row = { el: HTMLElement; text: string; get: () => [number, number, boolean?] | null; live: boolean };
const rows = new Set<Row>();

export function addRow(r: Row) {
  rows.add(r);
  if (store.ready) apply(r);
  return () => { rows.delete(r); };
}

function apply(r: Row) {
  const g = r.get();
  if (!g || !(g[0] > 4) || !(g[1] > 1)) { r.el.style.fontSize = '0px'; return; }
  const [st, sz] = solve(r.text, g[0] * 0.995, g[1], g[2]);
  r.el.style.fontStretch = st.toFixed(2) + '%';
  r.el.style.fontSize = sz.toFixed(2) + 'px';
}

export function update(all: boolean) {
  if (!store.ready) return;
  rows.forEach((r) => { if (all || r.live) apply(r); });
}

/** Break a line into n rows of roughly equal length, never inside a word. */
export function splitRows(text: string, n: number): string[] {
  const words = text.split(' ');
  if (n <= 1 || words.length <= 1) return [text];
  const total = text.length;
  const out: string[] = [];
  let cur: string[] = [];
  let used = 0;
  words.forEach((w, i) => {
    const left = n - out.length;
    const target = (total - used) / left;
    const curLen = cur.join(' ').length;
    const withW = curLen ? curLen + 1 + w.length : w.length;
    const remainingWords = words.length - i;
    if (cur.length && left > 1 && (Math.abs(withW - target) > Math.abs(curLen - target)) && remainingWords >= left - 1) {
      out.push(cur.join(' '));
      used += curLen + 1;
      cur = [w];
    } else cur.push(w);
  });
  out.push(cur.join(' '));
  return out;
}

export const padX = () => Math.max(16, Math.min(44, store.vw * 0.028));
