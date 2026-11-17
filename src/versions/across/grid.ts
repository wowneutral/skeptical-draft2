// The puzzle. Eleven rows by ten columns, rotationally symmetric, SKEPTICAL? across the middle.
// Every answer is one word lifted out of a real line in content.ts; the clue is that line with the word blanked.
import { HERO, RECORD, DRIVE, PEOPLE, JOIN } from '@/content';

export const ROWS = 11;
export const COLS = 10;

export type Dir = 'a' | 'd';
export type Word = {
  id: string; // also the id of the section it belongs to (or shares)
  answer: string;
  r: number; c: number; dir: Dir;
  sec: string; // section id this word is typed in
  before: string; after: string; // the clue line around the blank
  word: string; // the word as printed in the original line
  fixed?: boolean;
  num?: number;
  cells: [number, number][];
};

/** Split a real line at one word, so the clue is the line itself with a hole in it. */
function cut(line: string, word: string) {
  const i = line.toLowerCase().indexOf(word.toLowerCase());
  if (i < 0) throw new Error('missing word ' + word);
  return { before: line.slice(0, i), word: line.slice(i, i + word.length), after: line.slice(i + word.length) };
}

const theory = DRIVE.items.find((x) => x.term === 'Theory')!;
const W0: Omit<Word, 'cells'>[] = [
  { id: 'join-w', answer: 'JOIN', r: 0, c: 5, dir: 'd', sec: 'pitch', ...cut(HERO.statement[0], 'join') },
  { id: 'session-w', answer: 'SESSION', r: 1, c: 0, dir: 'a', sec: 'lecture', ...cut(JOIN.paths[1].text[0], 'session') },
  { id: 'debate-w', answer: 'DEBATE', r: 2, c: 7, dir: 'd', sec: 'compete', ...cut(JOIN.paths[0].line, 'Debate') },
  { id: 'theory-w', answer: 'THEORY', r: 3, c: 2, dir: 'd', sec: 'drive', ...cut(`${theory.term}. ${theory.text}`, 'Theory') },
  { id: 'once-w', answer: 'ONCE', r: 3, c: 4, dir: 'a', sec: 'lecture', ...cut(JOIN.paths[1].line, 'once') },
  { id: 'skep-w', answer: 'SKEPTICAL?', r: 5, c: 0, dir: 'a', sec: 'people', fixed: true, ...cut(PEOPLE.coaches[0].bio, 'Skeptical') },
  { id: 'room-w', answer: 'ROOM', r: 7, c: 2, dir: 'a', sec: 'coach', ...cut(JOIN.paths[2].line, 'room') },
  { id: 'only-w', answer: 'ONLY', r: 7, c: 4, dir: 'd', sec: 'record', ...cut(RECORD.rule, 'only') },
  { id: 'already-w', answer: 'ALREADY', r: 9, c: 3, dir: 'a', sec: 'join', ...cut(JOIN.already.before.trim(), 'already') },
];

export const WORDS: Word[] = W0.map((w) => ({
  ...w,
  cells: [...w.answer].map((_, i) => (w.dir === 'a' ? [w.r, w.c + i] : [w.r + i, w.c]) as [number, number]),
}));

export const key = (r: number, c: number) => r * COLS + c;

/** The solution: letter per white cell. Throws in dev if two answers disagree at a crossing. */
export const SOL = new Map<number, string>();
for (const w of WORDS) {
  w.cells.forEach(([r, c], i) => {
    const k = key(r, c);
    const ch = w.answer[i];
    if (SOL.has(k) && SOL.get(k) !== ch) throw new Error(`clash at ${r},${c}`);
    SOL.set(k, ch);
  });
}

/** Standard numbering: top to bottom, left to right, a number wherever a word starts. */
export const NUM = new Map<number, number>();
{
  let n = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const starts = WORDS.filter((w) => w.r === r && w.c === c);
      if (starts.length) {
        n++;
        NUM.set(key(r, c), n);
        starts.forEach((w) => (w.num = n));
      }
    }
}

export const WORDS_AT = new Map<number, Word[]>();
for (const w of WORDS) for (const [r, c] of w.cells) {
  const k = key(r, c);
  WORDS_AT.set(k, [...(WORDS_AT.get(k) ?? []), w]);
}

export const FIXED = new Set(WORDS.filter((w) => w.fixed).flatMap((w) => w.cells.map(([r, c]) => key(r, c))));
export const QKEY = key(5, 9);
export const byId = (id: string) => WORDS.find((w) => w.id === id)!;
export const label = (w: Word) => `${w.num} ${w.dir === 'a' ? 'Across' : 'Down'}`;
