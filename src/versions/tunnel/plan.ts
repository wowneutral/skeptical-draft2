// Where every phrase stands in the corridor. The DOM carries the same words
// (one section per phrase); the camera keyframes are measured from those sections.
import { HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN } from '@/content';

export type Phrase = {
  id: string; text: string;
  size: number;          // cap height, metres
  x: number; y: number;  // centre of the block
  ry: number;            // turned toward the aisle
  max: number;           // line length in caps
  align: 'left' | 'center' | 'right';
  z: number;
};

export const GAP = 15;          // metres between phrases
export const VIEW = 7.4;        // how far the camera stands from the phrase it reads
export const EYE = 1.75;

type Raw = Omit<Phrase, 'z'>;
const RAW: Raw[] = [
  { id: 'p0', text: HERO.pitch[0], size: 0.86, x: 0, y: 2.05, ry: 0, max: 8.6, align: 'center' },
  { id: 'p1', text: HERO.pitch[1], size: 0.7, x: 1.7, y: 2.35, ry: -0.22, max: 7.2, align: 'right' },
  { id: 's0', text: HERO.statement[0], size: 1.05, x: -1.6, y: 1.55, ry: 0.24, max: 9, align: 'left' },
  { id: 's1', text: HERO.statement[1], size: 0.74, x: 1.5, y: 2.6, ry: -0.2, max: 6.6, align: 'right' },
  { id: 's2', text: HERO.statement[2], size: 0.84, x: 0, y: 2.0, ry: 0, max: 8, align: 'center' },
  { id: 'm0', text: MANIFESTO[0], size: 0.5, x: -1.5, y: 2.3, ry: 0.22, max: 11, align: 'left' },
  { id: 'm1', text: MANIFESTO[1], size: 0.5, x: 1.5, y: 2.2, ry: -0.22, max: 11, align: 'right' },
  { id: 'm2', text: MANIFESTO[2], size: 0.46, x: -1.3, y: 2.4, ry: 0.2, max: 12, align: 'left' },
  { id: 'm3', text: MANIFESTO[3], size: 0.5, x: 0, y: 2.25, ry: 0, max: 12.5, align: 'center' },
  { id: 'record', text: RECORD.title, size: 1.2, x: 0, y: 1.9, ry: 0, max: 20, align: 'center' },
  { id: 'drive', text: DRIVE.title, size: 1.2, x: -0.6, y: 1.9, ry: 0.1, max: 20, align: 'center' },
  { id: 'people', text: PEOPLE.title, size: 1.2, x: 0.6, y: 1.9, ry: -0.1, max: 20, align: 'center' },
  { id: 'join', text: JOIN.title, size: 1.9, x: 0, y: 1.6, ry: 0, max: 20, align: 'center' },
];

export function phrases(phone: boolean): Phrase[] {
  return RAW.map((r, i) => ({
    ...r,
    x: phone ? r.x * 0.12 : r.x,
    ry: phone ? r.ry * 0.3 : r.ry,
    size: phone ? r.size * (r.size > 1 ? 0.6 : r.size >= 0.7 ? 0.52 : 0.66) : r.size,
    max: phone ? Math.min(r.max, r.size > 1 ? 4.6 : r.size >= 0.7 ? 7.2 : 5.4) : r.max,
    align: phone ? 'center' : r.align,
    y: phone ? r.y + 0.15 : r.y,
    z: -i * GAP,
  }));
}

/** The far wall. */
export const OPEN_AT = (n: number) => -(n - 1) * GAP - 14;   // corridor ends here and the room opens
export const WALL_AT = (n: number) => -(n - 1) * GAP - 40;
export const WALL_VIEW = 21;

/** Camera keyframes, measured from the DOM on every resize. */
export type Key = { y: number; i: number };  // i: phrase index, or -1 for the wall
export const rig = {
  keys: [] as Key[],
  pointer: { x: 0, y: 0, has: false },
  ripple: { t: -10, x: 0, y: 0 },
  intro: 0,       // 0 dark, 1 lit
};
