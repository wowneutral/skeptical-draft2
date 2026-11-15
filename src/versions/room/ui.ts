/** DOM nodes the scene writes to every frame. */
export const ui = {
  paths: [] as (SVGPathElement | null)[],
  dots: [] as (SVGGElement | null)[],
  north: null as SVGGElement | null,
  bar: null as HTMLElement | null,
  barLabel: null as HTMLElement | null,
  sheetNo: null as HTMLElement | null,
  sheetName: null as HTMLElement | null,
  mlabel: null as HTMLElement | null,
  flash: null as HTMLElement | null,
  root: null as HTMLElement | null,
};
