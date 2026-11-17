// The ten characters and the line each one starts. Every line is lifted from content.ts, never retyped.
import { DRIVE, HERO, JOIN, RECORD } from '@/content';

const sentences = (s: string) => s.split(/(?<=\.)\s+/);

export type Line = {
  ch: string;
  /** the full line, for screen readers and labels */
  line: string;
  /** the line after its first letter, broken into two rows */
  a: string;
  b: string;
  /** where the line lives on the page */
  id: string;
};

const make = (line: string, cut: number, id: string): Line => {
  const w = line.split(' ');
  return { ch: line[0], line, a: w.slice(0, cut).join(' ').slice(1), b: w.slice(cut).join(' '), id };
};

export const S = make(sentences(JOIN.paths[0].text[3])[0], 3, 'line-s');
export const K = make(DRIVE.items[1].text, 2, 'line-k');
export const E = make(HERO.statement[2], 1, 'line-e');
export const P = make(sentences(JOIN.lead)[0], 3, 'line-p');
export const T = make(HERO.statement[1], 2, 'line-t');
export const I = make(sentences(RECORD.rule)[1], 3, 'line-i');
export const C = make(HERO.pitch[1], 2, 'line-c');
export const A = make(HERO.pitch[0], 2, 'line-a');
export const L = make(sentences(DRIVE.lead)[0], 4, 'line-l');

export const LINES: Line[] = [S, K, E, P, T, I, C, A, L];
/** the tenth character */
export const MARK = { ch: '?', line: JOIN.title, id: 'join' };
export const CHARS = [...LINES.map((l) => ({ ch: l.ch, line: l.line, id: l.id })), MARK];

/** which characters belong to which section: those stay black in the masthead */
export const OWN: Record<string, number[]> = {
  pitch: [7, 6],
  statement: [4, 2],
  record: [5],
  drive: [8, 1],
  people: [6],
  join: [3, 0, 9],
  end: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
};
