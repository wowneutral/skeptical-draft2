// What the page tells the pinscreen. Read inside useFrame; never a React render.
export const MODES = ['mark', 'eight', 'plaques', 'slabs', 'head', 'flat'] as const;

export const stage = {
  /** which hidden thing presses from behind: index into MODES */
  mode: 0,
  /** a plaque or slab the reader is pointing at, or -1 */
  focus: -1,
  /** 0..1 through the people section: the head turns with it */
  headP: 0.5,
  /** bumped by the level button: every mark is let go */
  level: 0,
  /** the keyboard's press point, 0..1 across and up the frame */
  key: { x: 0.5, y: 0.5, on: false, down: false },
  /** window pointer, -1..1, for the slight turn of the frame */
  look: { x: 0, y: 0 },
};
