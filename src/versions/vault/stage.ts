// Shared state between the page and the 3D vault. Read inside useFrame; never per-frame React state.
export const STOPS = ['hero', 'rim', 'bolts', 'dial', 'record', 'drive', 'people', 'join', 'end'] as const;
export const STEP = (Math.PI * 2) / 100;

export const vault = {
  /** The camera's place along the stops, as a float. */
  f: 0,
  stops: [] as { a: number; b: number }[],
  /** Opening, 0 to 1. */
  open: 0,
  ready: false,
  dial: 0, dialV: 0,
  wheel: 0, wheelV: 0, wheelHeld: false, wheelLock: false,
  lamp: 0, twitch: 0, shake: 0,
  box: -1,
  swing: [0, 0],
  sound: false,
  hover: '' as '' | 'dial' | 'wheel' | 'box',
  onDetent: null as null | ((n: number, dir: number) => void),
  onTry: null as null | (() => void),
  onBox: null as null | ((i: number) => void),
};

/** Turn the dial by an angle and report every detent crossed. */
export function turnDial(da: number) {
  const before = Math.round(vault.dial / STEP);
  vault.dial += da;
  const after = Math.round(vault.dial / STEP);
  if (after !== before) {
    vault.shake = Math.min(1, vault.shake + 0.18);
    vault.onDetent?.(((after % 100) + 100) % 100, Math.sign(after - before));
  }
}

/** Try the handle: the wheel goes as far as the bolts let it, then refuses. */
export function tryHandle() {
  if (vault.wheelLock) return;
  vault.wheelLock = true;
  vault.wheelV = 7;
}

export function refuse() {
  vault.lamp = 1;
  vault.twitch = 1;
  vault.shake = 1;
  vault.onTry?.();
}
