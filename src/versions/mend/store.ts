// What the page and the bowl say to each other, outside React.
export const bowl = {
  /** Section float: 0 hero, 1 manifesto, 2 record, 3 drive, 4 people, 5 join, 6 end. */
  f: 0,
  sec: 0,
  /** Breaks asked for. */
  asks: [] as { hold: boolean; hit?: [number, number, number] }[],
  /** True while the drive keeps the bowl apart. */
  hold: false,
  /** Turning by hand. */
  yawV: 0,
  yaw: 0,
  dragging: false,
  /** How many breaks have finished: for the page to read. */
  mended: 0,
  phone: false,
  ready: false,
  reset() { this.f = 0; this.sec = 0; this.asks = []; this.hold = false; this.yawV = 0; this.yaw = 0; this.dragging = false; this.mended = 0; this.ready = false; },
};
