// What the page tells the scene and the scene tells the page. Read per frame, never rendered.
export const link = {
  ready: false,
  heroSlot: null as HTMLElement | null,
  joinSlot: null as HTMLElement | null,
  joinSec: null as HTMLElement | null,
  phone: false,
  /** Requests from the keyboard path. */
  openReq: -2 as number, // -2 none, -1 any
  shakeReq: false,
  /** Called once, the first time a link is opened, with the screen point. */
  onOpen: null as null | ((x: number, y: number) => void),
  onHover: null as null | ((on: boolean) => void),
};
