// Shared, mutable state between the page and the scene. Never rendered by React.
export type Pose = { az: number; h: number; r: number; ty: number; fov: number; sx: number; sy: number; up: number };
export type Key = Pose & { y: number };

export const st = {
  keys: [] as Key[],
  /** Pointer pushes waiting for the scene: screen position in NDC and strength. */
  strikes: [] as { x: number; y: number; k: number }[],
  /** Keyboard pushes: a direction in camera terms. */
  nudges: [] as { side: number; k: number }[],
  pointer: { x: 0, y: 0, in: false },
  over: false,
  /** 0 above Join, 1 inside it: the swing dies and the wire lets it down. */
  settle: 0,
  struck: 0,
  onStrike: null as null | ((k: number) => void),
  onOver: null as null | ((v: boolean) => void),
};
