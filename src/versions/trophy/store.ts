// Shared, mutable state between the page and the scene. Never React state per frame.
export const T = {
  /** Sections in order: hero, manifesto, record, drive, people, join, end. */
  sections: [] as HTMLElement[],
  /** User turn on the turntable: angle, velocity, target, flick. */
  turn: { u: -1.1, w: 0, g: 0, flick: 0, drag: false, lastX: 0, lastT: 0 },
  /** Where the camera is in the sequence (0 to 6), and the nearest stop. */
  f: 0,
  stop: 0,
  opened: false,
  openedAt: 0,
  /** The visitor's plate. */
  plate: { text: '', start: 0, dur: 0, ver: 0 },
};

export const FACET = Math.PI / 6;
export const KEY = 'skeptical-trophy-plate';
export function readName() {
  try { return localStorage.getItem(KEY) ?? ''; } catch { return ''; }
}
export function saveName(v: string) {
  try { if (v) localStorage.setItem(KEY, v); else localStorage.removeItem(KEY); } catch { /* private window */ }
}
