// The lean: one number (the row offset, in tiles) shared by every wall on the page.
// Rows only ever move sideways. Nothing rotates, nothing skews.
import { gsap } from '@/lib/scroll';
import { still } from '@/lib/utils';

export type WallRec = {
  el: HTMLElement;
  rows: HTMLElement[];
  /** Rows that hold letters or buttons: never wrapped, so their contents stay put. */
  fixed: boolean[];
  mid: number;
  cols: number;
  /** Per-wall lean factor (1 leans with the page, 0 is laid level). */
  f: number;
  fv: number;
  fT: number;
  scale: number;
  /** 0..1 per row: how far each course has been laid. */
  laid: { p: number }[];
  vis: boolean;
  w: number;
  W: number;
};

export const walls = new Set<WallRec>();
export const S = {
  k: 0.25, // current offset, fraction of a tile
  kT: 0.25,
  hold: 1, // 1 = leaning, 0 = held level
  holdV: 0,
  held: false,
};
export const MAXK = 0.3;

let running = false;
function spring(x: number, v: number, t: number, dt: number, stiff = 170, damp = 13) {
  v += (t - x) * stiff * dt;
  v *= Math.exp(-damp * dt);
  return [x + v * dt, v];
}

function frame(_t: number, dms: number) {
  const dt = Math.min(dms, 50) / 1000;
  if (still) {
    S.k = S.kT;
    S.hold = S.held ? 0 : 1;
  } else {
    S.k += (S.kT - S.k) * (1 - Math.exp(-9 * dt));
    [S.hold, S.holdV] = spring(S.hold, S.holdV, S.held ? 0 : 1, dt, 260, 16);
  }
  for (const r of walls) {
    if (still) r.f = r.fT;
    else [r.f, r.fv] = spring(r.f, r.fv, r.fT, dt, 150, 12);
    if (!r.vis) continue;
    const W = r.W;
    const k = S.k * S.hold * r.f * r.scale;
    for (let i = 0; i < r.rows.length; i++) {
      let o = (i - r.mid) * k * W;
      if (!r.fixed[i]) {
        o = ((o % (2 * W)) + 2 * W) % (2 * W);
        if (o > W) o -= 2 * W;
      }
      const p = r.laid[i]?.p ?? 1;
      if (p < 1) o += (1 - p) * (i % 2 ? -1 : 1) * (r.w + 4 * W);
      r.rows[i].style.transform = `translate3d(${o.toFixed(2)}px,0,0)`;
    }
  }
}

function onMove(e: PointerEvent) {
  if (still || e.pointerType !== 'mouse') return;
  const x = e.clientX / window.innerWidth - 0.5;
  S.kT = MAXK * Math.tanh(x * 4.2);
}
function onDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button === 0) S.held = true;
}
function onUp(e: PointerEvent | Event) {
  if ('pointerType' in e && (e as PointerEvent).pointerType !== 'mouse') return;
  S.held = false;
}

// Touch: a sideways drag leans the wall, a finger held still levels it.
let drag: { x: number; x0: number; y0: number } | null = null;
let holdTimer = 0;
function tStart(e: TouchEvent) {
  if (e.touches.length !== 1) return;
  const t = e.touches[0];
  drag = { x: t.clientX, x0: t.clientX, y0: t.clientY };
  clearTimeout(holdTimer);
  holdTimer = window.setTimeout(() => { S.held = true; }, 180);
}
function tMove(e: TouchEvent) {
  if (!drag) return;
  const t = e.touches[0];
  if (Math.abs(t.clientX - drag.x0) > 8 || Math.abs(t.clientY - drag.y0) > 8) { clearTimeout(holdTimer); S.held = false; }
  const dx = t.clientX - drag.x;
  drag.x = t.clientX;
  if (!still) S.kT = Math.max(-MAXK, Math.min(MAXK, S.kT + (dx / window.innerWidth) * 1.1));
}
function tEnd() {
  clearTimeout(holdTimer);
  drag = null;
  S.held = false;
}
function onBlur() { tEnd(); }
function noMenu(e: Event) { if (S.held && drag) e.preventDefault(); }

export function start() {
  if (running) return () => {};
  running = true;
  gsap.ticker.add(frame);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  window.addEventListener('blur', onBlur);
  window.addEventListener('touchstart', tStart, { passive: true });
  window.addEventListener('touchmove', tMove, { passive: true });
  window.addEventListener('touchend', tEnd, { passive: true });
  window.addEventListener('touchcancel', tEnd, { passive: true });
  window.addEventListener('contextmenu', noMenu);
  return () => {
    running = false;
    gsap.ticker.remove(frame);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('touchstart', tStart);
    window.removeEventListener('touchmove', tMove);
    window.removeEventListener('touchend', tEnd);
    window.removeEventListener('touchcancel', tEnd);
    window.removeEventListener('contextmenu', noMenu);
    S.k = S.kT = 0.25; S.hold = 1; S.held = false;
  };
}
