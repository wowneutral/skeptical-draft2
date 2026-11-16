// Everything the hallway says, built from content.ts. Each entry is a thing in
// the world you can read; the journal renders the same lines in the same order.
import { DRIVE, HERO, JOIN, MANIFESTO, PEOPLE, RECORD, SITE } from '@/content';

export type Seg = { t: string; href?: string; b?: boolean };
export type Line = Seg[];
export type Entry = { id: string; title: string; pages: Line[][]; journal?: boolean };

const L = (...s: (string | Seg)[]): Line => s.map((x) => (typeof x === 'string' ? { t: x } : x));
const A = (t: string, href: string): Seg => ({ t, href });
const B = (t: string): Seg => ({ t, b: true });
const event = L(RECORD.when + '. ' + RECORD.name + '. ' + RECORD.where + '.');

const E: Entry[] = [
  { id: 'banner', title: 'The banner.', journal: true, pages: [[L(HERO.pitch[0]), L(HERO.pitch[1])]] },
  { id: 'plaque', title: 'The plaque.', journal: true, pages: [HERO.statement.map((s) => L(s))] },
  { id: 'doorA', title: 'The left door.', journal: true, pages: [[L('A sign on the glass.'), L(A(HERO.doors[0].label, HERO.doors[0].href))]] },
  { id: 'doorB', title: 'The right door.', journal: true, pages: [[L('A sign on the glass.'), L(A(HERO.doors[1].label, HERO.doors[1].href))]] },
  { id: 'board', title: 'The chalkboard.', journal: true, pages: [[L(MANIFESTO[0]), L(MANIFESTO[1])], [L(MANIFESTO[2]), L(MANIFESTO[3])]] },
  { id: 'postings', title: RECORD.title, journal: true, pages: [[L(RECORD.rule)], [event], [L(A(RECORD.more.label, RECORD.more.href))]] },
  { id: 'trophy', title: 'The trophy case.', journal: true, pages: RECORD.results.map((r) => [L(B(r.who)), L(r.what + '.'), L(r.more)]) },
  ...PEOPLE.coaches.map((c, i) => ({ id: 'plate' + i, title: c.name, journal: true, pages: [[L(B(c.role + '.')), L(c.bio)]] })),
  { id: 'roster', title: 'The whiteboard.', journal: true, pages: [[L(PEOPLE.count), L(A(PEOPLE.more.label, PEOPLE.more.href))]] },
  { id: 'drivesign', title: DRIVE.title, journal: true, pages: [
    [L(DRIVE.lead)],
    ...[0, 2, 4, 6].map((k) => DRIVE.items.slice(k, k + 2).map((it) => L(B(it.term + '. '), it.text))),
    [L(A(DRIVE.more.label, DRIVE.more.href))],
  ] },
  ...JOIN.paths.map((p, i) => ({ id: 'sheet' + i, title: p.name + '.', journal: true, pages: [
    [L(B(p.line))],
    ...[0, 2].map((k) => p.text.slice(k, k + 2).map((t) => L(t))).filter((pg) => pg.length),
    [L(A(p.name + ' on the live site.', p.href))],
  ] })),
  { id: 'joinsign', title: JOIN.title, journal: true, pages: [
    [L(JOIN.lead)],
    [L(JOIN.already.before, A(JOIN.already.label, JOIN.already.href)), L(JOIN.coach.before, A(JOIN.coach.label, JOIN.coach.href))],
    [L(JOIN.also), L(A(SITE.email, 'mailto:' + SITE.email))],
    [L(JOIN.discord)],
  ] },

  // Things to find. Not content, not journaled, fact free.
  { id: 'drivedoor', title: 'Locked.', pages: [[L('The handle does not turn.'), L('There is a keypad beside it.')]] },
  { id: 'vend1', title: 'Vending machine.', pages: [[L('You press the only lit button.'), L('Clunk. A can of fizz.')]] },
  { id: 'vend2', title: 'Vending machine.', pages: [[L('Everything else is sold out.')]] },
  { id: 'pen', title: 'A dropped pen.', pages: [[L('Somebody lost a pen.'), L('Yours now. Spin it from the bag.')]] },
  { id: 'pass', title: 'A hall pass.', pages: [[L('A hall pass, left on a desk.'), L('Nobody will ask. Take it anyway.')]] },
  { id: 'closed', title: 'Supply closet.', pages: [[L('The door is shut.'), L('A hall pass would help.')]] },
  { id: 'opened', title: 'Supply closet.', pages: [[L('You show the hall pass to no one.'), L('The door opens anyway.')]] },
  { id: 'cat1', title: 'Something in the dark.', pages: [[L('A cat, asleep on the boxes.')], [L('It opens one eye.'), L('It decides you are fine.')]] },
  { id: 'cat2', title: 'The cat.', pages: [[L('Purr.')]] },
  { id: 'off', title: 'Light switch.', pages: [[L('Click. The hall goes dark.')]] },
  { id: 'on', title: 'Light switch.', pages: [[L('Click. Back on.')]] },
];

export const ENTRIES: Record<string, Entry> = Object.fromEntries(E.map((e) => [e.id, e]));

export const CHAPTERS: { id: string; title: string; where: string; parts: string[] }[] = [
  { id: 'entrance', title: 'The entrance.', where: 'By the front doors.', parts: ['banner', 'plaque', 'doorA', 'doorB'] },
  { id: 'classroom', title: 'The classroom.', where: 'First door on the left.', parts: ['board'] },
  { id: 'record', title: RECORD.title, where: 'The postings wall and the trophy case.', parts: ['postings', 'trophy'] },
  { id: 'people', title: PEOPLE.title, where: 'The coaches’ room.', parts: ['plate0', 'plate1', 'roster'] },
  { id: 'drive', title: DRIVE.title, where: 'The locked room.', parts: ['drivesign'] },
  { id: 'join', title: JOIN.title, where: 'The table at the end of the hall.', parts: ['joinsign', 'sheet0', 'sheet1', 'sheet2'] },
];
export const JOURNAL_IDS = CHAPTERS.flatMap((c) => c.parts);
