// The lift's dimensions, in metres, for a wide screen and for a phone.
export type Geo = ReturnType<typeof makeGeo>;

export function makeGeo(phone: boolean) {
  const g = phone
    ? { phone, W: 1.25, H: 2.1, CW: 1.95, CD: 3.4, CH: 2.8, fov: 62, camY: 1.42, pitch: -0.03, rideZ: 3.22, arriveZ: 2.9, outZ: -4.3, outY: 1.38, outPitch: 0.0, midZ: 1.7, panelShift: 34, PX: 175, letter: 0.37, wordY: 1.22, dialR: 0.25, call: [0.625 + 0.22, 1.1] as [number, number], FH: 3.6, bYaw: 0.42, bX: 0.18 }
    : { phone, W: 2.7, H: 2.25, CW: 4.0, CD: 2.95, CH: 2.95, fov: 58, camY: 1.5, pitch: -0.035, rideZ: 2.78, arriveZ: 2.34, outZ: -3.45, outY: 1.45, outPitch: 0.035, midZ: 1.3, panelShift: 118, PX: 240, letter: 0.46, wordY: 1.36, dialR: 0.34, call: [1.35 + 0.42, 1.12] as [number, number], FH: 3.6, bYaw: 0.5, bX: 0.35 };
  // The rooms sit on a plane a little beyond the doorway. Size it to what can be
  // seen through the doorway from where you stand when the doors are open.
  const zr = -1.15, z0 = 0.1, k = (g.arriveZ - zr) / (g.arriveZ - z0);
  const top = g.camY + (g.H - g.camY) * k, bot = g.camY - g.camY * k;
  const winW = g.W * k, winH = top - bot, bleed = 1.1;
  const room = { z: zr, w: winW * bleed, h: winH * bleed, cy: (top + bot) / 2 };
  const win = { w: winW * g.PX, h: top * g.PX, x: ((room.w - winW) / 2) * g.PX, y: ((room.h - winH) / 2) * g.PX, floor: ((room.h - winH) / 2 + top) * g.PX };
  // The floor runs from the sill to the wall; the shaft view sits just behind the doors.
  const floor = { w: room.w, d: -zr - 0.2 };
  const shaft = { w: g.W * 1.6, h: g.H * 1.4 };
  // Where the floor meets the wall, from the top of the window: the content stops there.
  const wallH = top * g.PX;
  return { ...g, room, win, floor, shaft, wallH };
}
