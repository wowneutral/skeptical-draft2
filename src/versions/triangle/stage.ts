// Shared between the DOM and the scene, read every frame, never React state.
export const stage = {
  f: 0, // which view, as a float through the stops
  px: 0, py: 0, // pointer, -1..1
  drag: 0, vel: 0, held: false, // degrees of swing round the plinth
  hover: -1, // which way in is pointed at (lights its side)
  phone: false,
  opened: false,
  stops: [] as number[],
  onBand: null as null | ((v: number) => void),
  onEdge: null as null | ((y: number, l: number, w: number) => void),
};
