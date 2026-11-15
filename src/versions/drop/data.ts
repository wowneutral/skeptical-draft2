// The site as six waves of arguments. Every word that falls comes from content.ts;
// the only words written here are the wave names for the two parts of the site
// that have no title of their own, and the small tags on the cards.
import { HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN } from '@/content';

export type Kind = 'line' | 'door' | 'event' | 'result' | 'folder' | 'coach' | 'path' | 'sub';

export type Item = {
  id: string;
  wave: number;
  kind: Kind;
  /** The small label on the falling card. */
  tag: string;
  /** A strong first line: a name, a folder, a way in. */
  head?: string;
  /** The words themselves. */
  body: string;
  /** A second, quieter line (the record's where and when). */
  foot?: string;
  href?: string;
  /** Join only: which of the three columns it falls in. */
  lane?: number;
  /** Join only: the path a line belongs to. */
  parent?: string;
};

export type Wave = { id: string; title: string; items: Item[] };

const pad = (n: number) => String(n).padStart(2, '0');

const pitch: Item[] = [
  ...HERO.pitch.map((body, i): Item => ({ id: `pitch-${i}`, wave: 0, kind: 'line', tag: `PITCH ${pad(i + 1)}`, body })),
  ...HERO.statement.map((body, i): Item => ({ id: `stmt-${i}`, wave: 0, kind: 'line', tag: `STATEMENT ${pad(i + 1)}`, body })),
  ...HERO.doors.map((d, i): Item => ({ id: `door-${i}`, wave: 0, kind: 'door', tag: `DOOR ${pad(i + 1)}`, body: d.label, href: d.href })),
];

const position: Item[] = MANIFESTO.map((body, i): Item => ({ id: `line-${i}`, wave: 1, kind: 'line', tag: `LINE ${pad(i + 1)}`, body }));

const record: Item[] = [
  { id: 'rule', wave: 2, kind: 'line', tag: 'RULE', body: RECORD.rule },
  { id: 'event', wave: 2, kind: 'event', tag: 'WHERE', head: RECORD.name, body: `${RECORD.when}. ${RECORD.where}.` },
  ...RECORD.results.map((r, i): Item => ({ id: `result-${i}`, wave: 2, kind: 'result', tag: `RESULT ${pad(i + 1)}`, head: r.who, body: `${r.what}. ${r.more}` })),
];

const drive: Item[] = [
  { id: 'drive-lead', wave: 3, kind: 'line', tag: 'DRIVE', body: DRIVE.lead },
  ...DRIVE.items.map((d, i): Item => ({ id: `folder-${i}`, wave: 3, kind: 'folder', tag: `LOCKED ${pad(i + 1)}`, head: d.term, body: d.text })),
];

const people: Item[] = [
  ...PEOPLE.coaches.map((c, i): Item => ({ id: `coach-${i}`, wave: 4, kind: 'coach', tag: `COACH ${pad(i + 1)}`, head: c.name, body: `${c.role}. ${c.bio}` })),
  { id: 'count', wave: 4, kind: 'line', tag: 'COUNT', body: PEOPLE.count },
];

const paths = JOIN.paths.map((p, lane) => ({
  head: { id: `path-${p.id}`, wave: 5, kind: 'path', tag: `WAY IN ${pad(lane + 1)}`, head: p.name, body: p.line, href: p.href, lane } as Item,
  subs: p.text.map((body, i): Item => ({ id: `sub-${p.id}-${i}`, wave: 5, kind: 'sub', tag: p.name.toUpperCase(), body, lane, parent: p.id })),
}));
const [C, L, K] = paths;
// The three ways in arrive as three streams, one per column, each header ahead of its own lines.
const join: Item[] = [
  { id: 'join-lead', wave: 5, kind: 'line', tag: 'JOIN', body: JOIN.lead },
  C.head, C.subs[0], L.head, C.subs[1], L.subs[0], K.head, C.subs[2], L.subs[1], K.subs[0], C.subs[3], K.subs[1], K.subs[2], K.subs[3],
  { id: 'join-discord', wave: 5, kind: 'line', tag: 'DISCORD', body: JOIN.discord },
  { id: 'join-also', wave: 5, kind: 'line', tag: 'ALSO', body: JOIN.also },
];

export const WAVES: Wave[] = [
  { id: 'pitch', title: 'The pitch.', items: pitch },
  { id: 'position', title: 'The position.', items: position },
  { id: 'record', title: RECORD.title, items: record },
  { id: 'drive', title: DRIVE.title, items: drive },
  { id: 'people', title: PEOPLE.title, items: people },
  { id: 'join', title: JOIN.title, items: join },
];

export const ITEMS: Item[] = WAVES.flatMap((w) => w.items);
export const TOTAL = ITEMS.length;
export const byId = (id: string) => ITEMS.find((i) => i.id === id)!;

export type Mark = 'caught' | 'dropped' | 'unreached';
export type Marks = Record<string, Mark | undefined>;

export type Result = {
  win: boolean;
  score: number;
  best: number;
  newBest: boolean;
  caught: number;
  dropped: number;
  total: number;
  maxCombo: number;
};
