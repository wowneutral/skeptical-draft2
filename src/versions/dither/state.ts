// What the page tells the scene, read every frame without re-rendering React.
export const stage = {
  ready: false,   // the model has loaded
  cell: 28,       // dither cell in CSS pixels, sharpens to 1 as the page opens
  censor: 0,      // 0: the question mark is on the eyes, 1: it has fallen
  end: 0,         // 0..1 across the ending: the print coarsens and goes dark
  lx: 0.62, ly: 0.32, // where the lamp is, in screen fractions
  touched: false, // the visitor has moved the lamp
};
