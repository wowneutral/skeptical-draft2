// Shared, mutable state between the page and the scene. Read inside useFrame; never a React render.
export type Key = 'hero' | 'manifesto' | 'record' | 'drive' | 'people' | 'join' | 'end';

export const st = {
  theta: 0, // true table angle
  omega: 0, // rad/s
  shown: 0, // the angle actually drawn (locked to the figure spacing above the threshold)
  strobe: false,
  drag: false,
  lastUser: -99, // seconds (performance clock) of the last drag or push
  sel: 0, // drive item in the light
  secs: [] as { k: Key; top: number }[],
  k: 'hero' as Key,
  vh: 800,
};

export const now = () => performance.now() / 1000;

/** The section under the middle of the screen. */
export function keyAt(y: number): Key {
  let k: Key = 'hero';
  for (const s of st.secs) if (s.top <= y + st.vh * 0.5) k = s.k;
  return k;
}

export function push(w: number) {
  st.omega = Math.max(-11, Math.min(11, st.omega + w));
  st.lastUser = now();
}
