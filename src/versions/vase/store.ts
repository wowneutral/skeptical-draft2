import type { Frame, Shot } from './frame';

/** Shared between the page and the scene. Nothing here is React state. */
export const st = {
  shot: 'hero' as Shot,
  backT: 0, // 1 when the light should be behind the vase
  bp: 0, // crossfade progress, 0 lit to 1 backlit
  open: 0, // the opening: lights coming up
  rot: 0,
  vel: 0,
  drag: false,
  f: { gx: 0, gy: -1.6, s: 1 } as Frame,
  onFrame: null as null | ((f: Frame, bp: number) => void),
  ready: false,
};
