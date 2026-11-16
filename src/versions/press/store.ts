// Shared, mutable, never rendered: the page writes it, the scene reads it every frame.
export const st = {
  /** Pointer in normalised device coordinates over the hero. */
  pointer: { x: 0, y: 0, inside: false },
  /** How much ink is on the face, 0 to 1. Each print takes some. */
  ink: 1,
  /** Pressing: start time in ms, or -1. */
  press: -1,
  /** Inking on its own (the keyboard path): start time, or -1. */
  auto: -1,
  drag: false,
  prints: 0,
  /** Set by the scene: what the pointer is over, in the hero. */
  hit: (_x: number, _y: number): 'sort' | 'slab' | 'none' => 'none',
  /** Set by the scene: the ink layer of the sheet, for the broadside to show. */
  inkLayer: null as HTMLCanvasElement | null,
  /** Called by the scene each time a print lands. */
  onPrint: null as null | ((n: number, ink: number) => void),
  /** DOM places the sort visits after the opening. */
  recordMark: null as HTMLElement | null,
  joinSlot: null as HTMLElement | null,
  stamp: -1,
  stamped: false,
  lastInk: 1,
};
export type Hit = ReturnType<typeof st.hit>;
