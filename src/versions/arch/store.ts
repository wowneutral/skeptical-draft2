// What the page and the scene share, outside React: one mutable object.
export type Mode = 'opening' | 'standing' | 'held' | 'fallen' | 'rebuild';

export const S = {
  mode: 'opening' as Mode,
  /** Where each camera key sits on the page, as fractions of the scroll. */
  keys: [0, 0.16, 0.32, 0.48, 0.62, 0.74, 0.86, 1],
  /** Requests from the page: pull the keystone, or build it again. */
  cmd: null as null | 'pull' | 'build',
  listeners: new Set<(m: Mode) => void>(),
  ready: false,
  onReady: null as null | (() => void),
};

export function setMode(m: Mode) {
  if (S.mode === m) return;
  S.mode = m;
  S.listeners.forEach((f) => f(m));
}
