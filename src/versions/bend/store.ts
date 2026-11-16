// Shared, mutable, read every frame by the scene. Never React state.
export type Wave = { x: number; z: number; t: number; a: number };
export const store = {
  // Camera, from the scroll: azimuth and elevation in degrees, distance.
  az: -12, el: 6, d: 10.5,
  // 0 in the water, 1 laid straight across the top of the glass (The record).
  auto: 0,
  // The hand: lift along the glass (world units) and lean (0 upright, 1 resting on the rim).
  lift: 0, lean: 1, held: false,
  // Lift it out and keep it there (button, tap, end of the page).
  out: false,
  // Opening drop has played.
  opened: false,
  waves: [] as Wave[],
  over: false,
  onOut: null as null | ((out: boolean) => void),
};
