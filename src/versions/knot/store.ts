// What the page tells the scene, and what the scene tells the page. Plain mutable state, read per frame.
export const knot = {
  f: 0, // target stage from the scroll: 0 hero ... 6 ending
  shown: 0, // the stage the ropes are actually at (sprung)
  ready: false, // the opening has played
  give: 0, // how far the loose end is pulled, 0..1 (a keyboard pull sets it too)
  hold: false, // a pull is under way (pointer or key)
  jam: false, // the last crossing is jammed (drive)
  pointer: { x: 0.7, y: 0.6, in: false }, // in screen fractions
  drag: null as null | { x: number; y: number }, // pointer position while pulling, screen px
  near: false, // pointer is over the loose end
  endPx: { x: -999, y: -999 }, // the loose end on screen
  phone: false,
  onOpen: null as null | (() => void),
};
