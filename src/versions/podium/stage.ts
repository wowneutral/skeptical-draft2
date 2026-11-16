// What the page tells the hall, read every frame by the scene. Never React state.
export const stage = {
  /** Where the speech is: section index plus how far through it. */
  cam: 0,
  /** House lights, 0 dark to 1 up a little (the record). */
  house: 0,
  /** The three marks at Join: how far each spot has come up, from scroll. */
  join: 0,
  /** Which way in is chosen, -1 for none. */
  pick: -1,
  /** Which way in the pointer or focus is on, -1 for none. */
  near: -1,
  /** The close: the spot goes out. */
  end: 0,
  /** The drive: which card is on the lectern. */
  card: 0,
  /** Pointer, -1 to 1. */
  px: 0,
  py: 0,
  /** Set when the scene has drawn its first frame. */
  onReady: null as null | (() => void),
};
