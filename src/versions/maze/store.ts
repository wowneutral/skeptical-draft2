// What the page tells the stone, and what the stone tells the page. Mutable, read every frame.
export const maze = {
  sec: 0,            // which part of the page is being read
  phone: false,
  pointer: { x: 0, y: 0, on: false, down: false }, // pointer in canvas pixels, relative to the canvas centre
  keys: { x: 0, z: 0, t: 0 },                        // arrow keys: a tilt and when it was last pressed
  s: 0,              // where the ball is along the road
  resting: false,    // the ball sits in the dot
  reset: 0,          // bumped to lift the ball back to the way in
  onRest: null as null | ((home: boolean) => void),
  ready: false,
  warp: -1,          // tests only: put the ball somewhere along the road
};
