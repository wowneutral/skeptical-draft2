// Shared, mutable state between the page and the scene. Never React state per frame.

/** A pose for one part of the page.
 *  x, y: where the herm sits on screen (lens shift, fraction of the viewport; +x right, +y up).
 *  zoom: camera zoom. turn: extra yaw of the herm. side: where the key light hangs (-1 left, 0 overhead, 1 right).
 *  key: how bright the gallery is. */
export type View = { x: number; y: number; zoom: number; turn: number; side: number; key: number };

export const WIDE: Record<string, View> = {
  hero: { x: 0.235, y: 0.02, zoom: 1, turn: 0, side: -1, key: 1 },
  creed: { x: -0.25, y: 0.02, zoom: 1.02, turn: -0.16, side: 1, key: 1 },
  yes: { x: 0, y: 0.03, zoom: 0.94, turn: 0, side: -1, key: 1 },
  no: { x: 0, y: 0.03, zoom: 0.94, turn: 0, side: 1, key: 1 },
  record: { x: 0.25, y: 0.02, zoom: 1.04, turn: 0.16, side: -1, key: 1 },
  drive: { x: -0.25, y: 0.02, zoom: 1.04, turn: -0.12, side: 1, key: 0.95 },
  people: { x: 0.25, y: 0.02, zoom: 1.04, turn: 0.1, side: -1, key: 1 },
  join: { x: 0, y: 0.17, zoom: 0.62, turn: 0, side: 0, key: 1 },
  end: { x: 0, y: 0.2, zoom: 0.6, turn: 0, side: 0, key: 0.28 },
};

export const PHONE: Record<string, View> = {
  hero: { x: 0, y: 0.135, zoom: 0.75, turn: 0, side: -1, key: 1 },
  creed: { x: 0, y: 0.135, zoom: 0.75, turn: -0.16, side: 1, key: 1 },
  yes: { x: 0, y: 0.135, zoom: 0.75, turn: 0, side: -1, key: 1 },
  no: { x: 0, y: 0.135, zoom: 0.75, turn: 0, side: 1, key: 1 },
  record: { x: 0, y: 0.135, zoom: 0.75, turn: 0.16, side: -1, key: 1 },
  drive: { x: 0, y: 0.135, zoom: 0.75, turn: -0.12, side: 1, key: 0.95 },
  people: { x: 0, y: 0.135, zoom: 0.75, turn: 0.1, side: -1, key: 1 },
  join: { x: 0, y: 0.135, zoom: 0.75, turn: 0, side: 0, key: 1 },
  end: { x: 0, y: 0.135, zoom: 0.75, turn: 0, side: 0, key: 0.3 },
};

export const rig = {
  /** Anchor centres down the page, in document pixels, with the pose each one asks for. */
  anchors: [] as { s: number; e: number; top: number; v: string }[],
  /** The visitor's own turn, in radians, its velocity, and whether a hand is on it. */
  user: 0,
  vel: 0,
  drag: false,
  /** Pointer lean, -1..1. */
  lean: 0,
  /** The lights coming up, 0..1. */
  intro: 0,
  loaded: false,
};

/** Give it a push. It always comes to rest in profile. */
export function push(dir: number, still: boolean) {
  if (still) { rig.user = (Math.round(rig.user / Math.PI) + dir) * Math.PI; rig.vel = 0; return; }
  rig.vel += dir * 7.4;
}
