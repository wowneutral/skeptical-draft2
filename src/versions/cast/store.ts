// Shared, mutable, never rendered: the page writes it, the scene reads it every frame.
export type V3 = [number, number, number];
export type Pose = { cam: V3; tgt: V3; yaw: number; explode: number; fov: number };
export type Key = Pose & { y: number };

export const st = {
  keys: [] as Key[],
  /** Turntable: what the hand added to the turn, and how fast it is still going. */
  spin: { a: 0, v: 0, held: false },
  pointer: { x: 0, y: 0 },
  /** A tap knocks the dot: it hops and settles. */
  knock: 0,
  /** Which way in is chosen at Join: the object turns a little toward it. */
  path: 0,
  labels: [] as { a: HTMLElement | null; line: SVGPathElement | null; pin: SVGCircleElement | null }[],
  overlay: null as HTMLElement | null,
  opened: false,
};

/** Shots, in page order. Each is tied to a place on the page by index.tsx. */
export function shots(phone: boolean): Record<string, Pose> {
  if (phone) return {
    hero:      { cam: [1.2, 2.4, 21], tgt: [0.05, 0.5, 0], yaw: 0.42, explode: 0, fov: 24 },
    statement: { cam: [-4.5, 0.9, 17], tgt: [0.2, -0.3, 0], yaw: -0.25, explode: 0, fov: 24 },
    apart0:    { cam: [3.5, 2.4, 15.5], tgt: [0.2, 1.4, 0], yaw: 0.35, explode: 0.1, fov: 26 },
    apart1:    { cam: [4.5, 3.2, 16.5], tgt: [-0.15, 1.75, 0], yaw: 0.55, explode: 1, fov: 26 },
    hook:      { cam: [2.6, 4.4, 10.5], tgt: [-0.1, 2.25, 0], yaw: 0.2, explode: 0.85, fov: 26 },
    dot:       { cam: [-1.4, 0.7, 6.2], tgt: [0.95, 0.15, 0.3], yaw: -0.2, explode: 0.85, fov: 26 },
    join:      { cam: [0, 1.8, 17], tgt: [0, 0.2, 0], yaw: 0, explode: 0, fov: 24 },
    end:       { cam: [0, 3.2, 22], tgt: [0, 1.6, 0], yaw: 0, explode: 0, fov: 22 },
    close:     { cam: [0, 3.4, 34], tgt: [0, -3.2, 0], yaw: 0, explode: 0, fov: 22 },
  };
  return {
    hero:      { cam: [1.4, 2.0, 11.8], tgt: [-1.75, 1.55, 0], yaw: 0.42, explode: 0, fov: 22 },
    statement: { cam: [-6, 0.8, 12.5], tgt: [3.2, 1.5, 0], yaw: -0.25, explode: 0, fov: 22 },
    apart0:    { cam: [3, 2.2, 14], tgt: [0, 1.5, 0], yaw: 0.35, explode: 0.1, fov: 22 },
    apart1:    { cam: [4, 3, 14], tgt: [0.1, 1.85, 0], yaw: 0.55, explode: 1, fov: 22 },
    hook:      { cam: [3.4, 3.4, 7.4], tgt: [-1.1, 2.75, 0], yaw: 0.2, explode: 0.85, fov: 24 },
    dot:       { cam: [-2.4, 0.55, 5.4], tgt: [1.6, 0.42, 0.3], yaw: -0.2, explode: 0.85, fov: 24 },
    join:      { cam: [0, 1.6, 15], tgt: [-1.9, 1.5, 0], yaw: 0, explode: 0, fov: 22 },
    end:       { cam: [0, 3, 21], tgt: [0, 2.0, 0], yaw: 0, explode: 0, fov: 20 },
    close:     { cam: [0, 3.2, 28], tgt: [0, -1.8, 0], yaw: 0, explode: 0, fov: 20 },
  };
}
