// The wall's layout: where every card is pinned (world units, pin point at the
// top centre of each card), which section it belongs to, which strings the
// scroll draws, and which strings the visitor has to find in "connect it".

export type Kind = 'q' | 'pitch' | 'state' | 'door' | 'receipt' | 'index' | 'prog' | 'result' | 'tag' | 'folder' | 'name' | 'sticky' | 'tape' | 'note';

export type CardDef = { id: string; sec: number; x: number; y: number; w: number; kind: Kind; label: string };

export const WORLD = { w: 4800, h: 3150 };

export const CARDS: CardDef[] = [
  // 0: the opening
  { id: 'title', sec: 0, x: 2400, y: 470, w: 760, kind: 'tape', label: 'Skeptical' },
  { id: 'q', sec: 0, x: 2400, y: 640, w: 600, kind: 'q', label: 'The question mark' },
  { id: 'p0', sec: 0, x: 1680, y: 640, w: 640, kind: 'pitch', label: 'An independent LD team.' },
  { id: 'p1', sec: 0, x: 3120, y: 640, w: 640, kind: 'pitch', label: 'Coaches who still compete.' },
  { id: 's0', sec: 0, x: 1640, y: 1110, w: 470, kind: 'state', label: 'Free to join.' },
  { id: 's1', sec: 0, x: 3160, y: 1110, w: 470, kind: 'state', label: 'The prep stays private.' },
  { id: 's2', sec: 0, x: 2400, y: 1470, w: 500, kind: 'state', label: 'Everyone contributes.' },
  { id: 'd0', sec: 0, x: 1760, y: 1470, w: 420, kind: 'door', label: 'Join as a debater' },
  { id: 'd1', sec: 0, x: 3040, y: 1470, w: 420, kind: 'door', label: 'Coach with us' },
  // 1: the claims
  { id: 'claims', sec: 1, x: 860, y: 130, w: 520, kind: 'tape', label: 'The claims.' },
  { id: 'm0', sec: 1, x: 480, y: 300, w: 400, kind: 'receipt', label: 'No school, no fee.' },
  { id: 'm1', sec: 1, x: 1120, y: 280, w: 560, kind: 'index', label: 'Eight of us right now.' },
  { id: 'm2', sec: 1, x: 560, y: 960, w: 560, kind: 'index', label: 'We write the prep.' },
  { id: 'm3', sec: 1, x: 1180, y: 860, w: 520, kind: 'index', label: 'Yes, the name is a position.' },
  // 2: the record
  { id: 'rec', sec: 2, x: 3980, y: 130, w: 520, kind: 'tape', label: 'The record.' },
  { id: 'rule', sec: 2, x: 3640, y: 280, w: 580, kind: 'index', label: 'Breaks and speaker awards only.' },
  { id: 'prog', sec: 2, x: 4300, y: 300, w: 500, kind: 'prog', label: 'The tournament' },
  { id: 'r0', sec: 2, x: 3620, y: 820, w: 500, kind: 'result', label: 'Shong Z.' },
  { id: 'r1', sec: 2, x: 4250, y: 880, w: 500, kind: 'result', label: 'Nina H.' },
  { id: 'rmore', sec: 2, x: 3940, y: 1290, w: 380, kind: 'tag', label: 'Every result.' },
  // 3: the drive
  { id: 'drv', sec: 3, x: 3960, y: 1730, w: 500, kind: 'tape', label: 'The drive.' },
  { id: 'dlead', sec: 3, x: 3380, y: 1870, w: 560, kind: 'index', label: 'None of it is public.' },
  { id: 'f0', sec: 3, x: 3960, y: 1870, w: 400, kind: 'folder', label: 'Files' },
  { id: 'f1', sec: 3, x: 4420, y: 1870, w: 400, kind: 'folder', label: 'Ks' },
  { id: 'f2', sec: 3, x: 3240, y: 2330, w: 400, kind: 'folder', label: 'Theory' },
  { id: 'f3', sec: 3, x: 3680, y: 2330, w: 400, kind: 'folder', label: 'Philosophy' },
  { id: 'f4', sec: 3, x: 4120, y: 2330, w: 400, kind: 'folder', label: 'Drills' },
  { id: 'f5', sec: 3, x: 4560, y: 2330, w: 400, kind: 'folder', label: 'Recordings' },
  { id: 'f6', sec: 3, x: 3700, y: 2760, w: 480, kind: 'folder', label: 'Briefs' },
  { id: 'dmore', sec: 3, x: 4260, y: 2780, w: 380, kind: 'tag', label: 'How you get the link.' },
  // 4: the people
  { id: 'ppl', sec: 4, x: 880, y: 1730, w: 520, kind: 'tape', label: 'The people.' },
  { id: 'c0', sec: 4, x: 580, y: 1870, w: 540, kind: 'name', label: 'Armaan Seth' },
  { id: 'c1', sec: 4, x: 1240, y: 1910, w: 540, kind: 'name', label: 'Nathan Shannon' },
  { id: 'count', sec: 4, x: 620, y: 2480, w: 480, kind: 'index', label: 'Eight debaters right now.' },
  { id: 'pmore', sec: 4, x: 1240, y: 2520, w: 400, kind: 'tag', label: 'More about the coaches.' },
  // 5: join
  { id: 'jn', sec: 5, x: 2400, y: 1810, w: 420, kind: 'tape', label: 'Join.' },
  { id: 'jlead', sec: 5, x: 2400, y: 1960, w: 580, kind: 'index', label: 'Pick what you want to do.' },
  { id: 'j0', sec: 5, x: 1940, y: 2280, w: 410, kind: 'sticky', label: 'Compete' },
  { id: 'j1', sec: 5, x: 2400, y: 2350, w: 410, kind: 'sticky', label: 'Lecture' },
  { id: 'j2', sec: 5, x: 2860, y: 2280, w: 410, kind: 'sticky', label: 'Coach' },
  { id: 'jx', sec: 5, x: 2400, y: 2830, w: 680, kind: 'note', label: 'Applied already?' },
];

/** Strings the scroll pins, by section. */
export const SHOWN: [string, string, number][] = [
  ['p0', 'q', 0], ['p1', 'q', 0], ['s0', 'p0', 0], ['s1', 'p1', 0], ['d0', 's0', 0], ['d1', 's1', 0], ['s2', 'd0', 0], ['s2', 'd1', 0],
  ['m0', 'p0', 1], ['m1', 'p1', 1], ['m2', 's1', 1], ['m3', 'q', 1],
  ['r0', 'prog', 2], ['r1', 'prog', 2], ['rmore', 'rule', 2],
  ['f0', 'dlead', 3], ['f1', 'dlead', 3], ['f2', 'dlead', 3], ['f3', 'dlead', 3], ['f4', 'dlead', 3], ['f5', 'dlead', 3], ['f6', 'dlead', 3], ['dmore', 'dlead', 3],
  ['c1', 'f1', 4], ['c0', 'count', 4], ['pmore', 'c0', 4],
  ['j0', 'jlead', 5], ['j1', 'jlead', 5], ['j2', 'jlead', 5], ['jx', 'jlead', 5],
];

/** The five open questions. Any one of each question's pairs answers it. */
export const QUESTIONS: { id: string; ask: string; pairs: [string, string][]; hint: [string, string] }[] = [
  { id: 'free', ask: 'Is it really free?', pairs: [['m0', 's0']], hint: ['m0', 's0'] },
  { id: 'coach', ask: 'Do the coaches compete?', pairs: [['c0', 'p1'], ['c1', 'p1']], hint: ['c0', 'p1'] },
  { id: 'prep', ask: 'Is the prep private?', pairs: [['dlead', 's1'], ['f0', 's1'], ['f1', 's1'], ['f2', 's1'], ['f3', 's1'], ['f4', 's1'], ['f5', 's1'], ['f6', 's1']], hint: ['dlead', 's1'] },
  { id: 'record', ask: 'Is the record real?', pairs: [['prog', 'rule'], ['r0', 'rule'], ['r1', 'rule']], hint: ['prog', 'rule'] },
  { id: 'in', ask: 'Is there a way in?', pairs: [['j0', 'd0'], ['j2', 'd1']], hint: ['j0', 'd0'] },
];

/** Links the content supports that are not one of the five. They hold too. */
export const EXTRA: [string, string][] = [
  ['s2', 'm2'], ['s2', 'j0'], ['m1', 'c0'], ['m1', 'c1'], ['m1', 'count'], ['m0', 'p0'], ['m3', 'title'], ['j1', 's2'],
  ['c0', 'j2'], ['c1', 'j1'], ['f0', 'm2'], ['dlead', 'm2'], ['j0', 'jlead'], ['q', 'jlead'],
];

export const key = (a: string, b: string) => (a < b ? a + '|' + b : b + '|' + a);

/** Camera stops: centre x, y and the world width and height to fit. */
export type Stop = { x: number; y: number; w: number; h: number; sec: number };
export const STOPS: Stop[] = [
  { x: 2400, y: 1120, w: 2150, h: 1420, sec: 0 },
  { x: 900, y: 700, w: 1600, h: 1250, sec: 1 },
  { x: 3980, y: 780, w: 1600, h: 1400, sec: 2 },
  { x: 3920, y: 2330, w: 1850, h: 1450, sec: 3 },
  { x: 920, y: 2250, w: 1550, h: 1150, sec: 4 },
  { x: 2400, y: 2380, w: 1550, h: 1250, sec: 5 },
  { x: 2400, y: 1575, w: 5100, h: 3400, sec: 6 },
];
export const PHONE_STOPS: Stop[] = [
  { x: 2400, y: 860, w: 860, h: 1500, sec: 0 },
  { x: 1700, y: 900, w: 760, h: 1400, sec: 0 },
  { x: 3120, y: 900, w: 760, h: 1400, sec: 0 },
  { x: 800, y: 560, w: 1250, h: 1400, sec: 1 },
  { x: 860, y: 1100, w: 1250, h: 1400, sec: 1 },
  { x: 3900, y: 560, w: 1250, h: 1400, sec: 2 },
  { x: 3940, y: 1100, w: 1250, h: 1400, sec: 2 },
  { x: 3800, y: 2100, w: 1350, h: 1400, sec: 3 },
  { x: 3960, y: 2650, w: 1350, h: 1400, sec: 3 },
  { x: 900, y: 2150, w: 1250, h: 1400, sec: 4 },
  { x: 2400, y: 2350, w: 1300, h: 1400, sec: 5 },
  { x: 2400, y: 1575, w: 5000, h: 3300, sec: 6 },
];
