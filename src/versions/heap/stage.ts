// What the page tells the scene, and what the scene tells the page. Read per frame, never through React.
export const stage = {
  /** where we are: 0 the whole heap, 5 one grain */
  f: 0,
  /** the opening light, 0 to 1 */
  open: 0,
  /** which way in is pointed at, or -1 */
  way: -1,
  /** the empty place on the page where the last grain sits */
  dot: null as HTMLElement | null,
  /** presses of the line under the heap, waiting to be spent */
  take: 0,
  /** the scene has drawn its first frame */
  drawn: false,
  onDrawn: null as null | (() => void),
};
