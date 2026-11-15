// One source for every version. Copied from the live site's content.ts.
// Nothing here is invented: results are breaks and speaker awards only.

export const LIVE = 'https://skeptical.pages.dev';
export const live = (p: string) => LIVE + p;

export const SITE = {
  name: 'Skeptical',
  heading: 'Skeptical: an independent Lincoln-Douglas debate team',
  description:
    'Skeptical is a free, independent Lincoln-Douglas debate team: a private prep drive, coaches who still compete, and scrims. Middle school through varsity.',
  email: 'skepticalprep@gmail.com',
  caselist: 'https://opencaselist.com/hsld26/SkepticalIndependent',
  instagram: 'https://www.instagram.com/skeptical_team/',
  discord: 'https://discord.gg/Z5tm2Q6zXX',
  github: 'https://github.com/wowneutral/skeptical',
};

export const HERO = {
  pitch: ['An independent LD team.', 'Coaches who still compete.'],
  doors: [
    { label: 'Join as a debater', href: live('/join/#compete') },
    { label: 'Coach with us', href: live('/join/#coach') },
  ],
  statement: ['Free to join.', 'The prep stays private.', 'Everyone contributes.'],
};

export const MANIFESTO = [
  'We’re an independent entry. No school, no fee.',
  'Eight of us right now. Two coaches, both still competing.',
  'We write the prep, we frontline it, and it stays in the drive.',
  'Yes, the name is a position. No, you don’t have to run it.',
];

export const RECORD = {
  title: 'The record.',
  rule: 'Breaks and speaker awards only. If it isn’t here, it hasn’t happened.',
  when: 'September 2026',
  name: 'National Speech & Debate Season Opener',
  where: 'Lexington, Kentucky',
  results: [
    { who: 'Shong Z.', what: 'Novice champion', more: '3-0 in finals. Second speaker.' },
    { who: 'Nina H.', what: 'Middle school semifinalist', more: 'Top speaker in the division.' },
  ],
  more: { label: 'Every result.', href: live('/record/') },
};

export const DRIVE = {
  title: 'The drive.',
  lead: 'Link from a coach, pinned in the Discord. None of it is public.',
  items: [
    { term: 'Files', text: 'Affs and negs our own debaters wrote, with the frontlines.' },
    { term: 'Ks', text: 'Kritiks. Nathan’s side of the room.' },
    { term: 'Theory', text: 'Shells and tricks.' },
    { term: 'Philosophy', text: 'Phil frameworks.' },
    { term: 'Drills', text: 'For the week between scrims.' },
    { term: 'Recordings', text: 'Rounds. Coming.' },
    { term: 'Briefs', text: 'Topic files for the current resolution, plus prep people have collected.' },
  ],
  more: { label: 'How you get the link.', href: live('/drive/') },
};

export const PEOPLE = {
  title: 'The people.',
  coaches: [
    { name: 'Armaan Seth', role: 'Head coach', bio: 'Still competes in LD. Started Skeptical because he likes coaching and he likes debate.' },
    { name: 'Nathan Shannon', role: 'Assistant coach', bio: 'Runs the K side of the room. Queer theory especially.' },
  ],
  count: 'Eight debaters right now.',
  more: { label: 'More about the coaches.', href: live('/people/') },
};

export const JOIN = {
  title: 'Join.',
  lead: 'Pick what you want to do. More than one is fine.',
  paths: [
    {
      id: 'compete', name: 'Compete', line: 'Debate for Skeptical.', href: live('/join/#compete'),
      text: [
        'Free. Middle school through varsity, brand new or not.',
        'You write prep, you add it to the drive, and it stays there.',
        'Tech rounds go on the caselist. First-year novices stay off it.',
        'Scrims when the coaches call them. Tournaments mostly online, and the coaches enter you.',
      ],
    },
    {
      id: 'lecture', name: 'Lecture', line: 'Teach once.', href: live('/join/#lecture'),
      text: [
        'Run one session on a call with the team: a topic lecture, a drill block, a K you know cold. An hour, yours.',
        'No commitment past that. If it goes well, we ask again.',
      ],
    },
    {
      id: 'coach', name: 'Coach', line: 'Run the room.', href: live('/join/#coach'),
      text: [
        'Volunteer. You keep competing, for Skeptical if you want.',
        'We meet, we debate, we talk, then the head coach decides.',
        'You get the coach role in the Discord, the drive, and your name on this site.',
        'No private messages to students. A practice round is the one exception.',
      ],
    },
  ],
  already: { before: 'Applied already? ', label: 'Check your status', href: live('/status/') },
  coach: { before: 'Coach? ', label: 'Sign in', href: live('/portal/') },
  also: 'Or write to us, or get someone already on the team to bring you in.',
  discord: 'The Discord is where the team lives. Applying gets you in.',
};

export const FOOTER = {
  line: 'The prep is private. This page isn’t.',
  links: [
    { label: 'Discord', href: SITE.discord },
    { label: 'Caselist', href: SITE.caselist },
    { label: 'Instagram', href: SITE.instagram },
    { label: 'GitHub', href: SITE.github },
    { label: SITE.email, href: `mailto:${SITE.email}` },
  ],
  pages: [
    { label: 'Resources', href: live('/resources/') },
    { label: 'Status', href: live('/status/') },
    { label: 'Coaches', href: live('/portal/') },
    { label: 'Privacy', href: live('/privacy/') },
    { label: 'Terms', href: live('/terms/') },
  ],
};

export const NAV = [
  { label: 'Record', id: 'record' },
  { label: 'Drive', id: 'drive' },
  { label: 'People', id: 'people' },
  { label: 'Join', id: 'join' },
];


export const VERSIONS = [
  { slug: 'head', n: 1, name: 'The head', color: '#050505', ink: '#f0f0ec', kind: 'From your prompt', text: 'The Laocoön prompt as Skeptical, with the live site’s own head, dither and censor. The pointer uncovers the photograph; the scroll spreads the question marks.' },
  { slug: 'statue', n: 2, name: 'The statue', color: '#050505', ink: '#f0f0ec', kind: 'From your prompt', text: 'The prompt’s bronze horse in a dark gallery: one light from above, a reflecting floor, dust in the beam.' },
  { slug: 'question', n: 3, name: 'The question', color: '#07060b', ink: '#f3f0ea', kind: 'New', text: 'A glass question mark that bends the type behind it. At Join the hook leaves and the dot becomes the full stop.' },
  { slug: 'flow', n: 4, name: 'The flow', color: '#f7f4ea', ink: '#1a36a8', kind: 'New', text: 'The site as a flow sheet. The round plays out as you scroll: our case in blue pen, their column in red, and nobody answers it.' },
  { slug: 'cards', n: 5, name: 'The cards', color: '#e7e6e2', ink: '#111111', kind: 'New, no centrepiece', text: 'The site as a speech doc. Watch a card get cut as you scroll, then set your own speed and highlighter.' },
  { slug: 'ladder', n: 6, name: 'The ladder', color: '#05060c', ink: '#f1ece1', kind: 'New', text: 'Sextus’s ladder. You climb through the cloud into the sunrise, and at the top the ladder falls away.' },
  { slug: 'blocks', n: 7, name: 'The blocks', color: '#2440ff', ink: '#efece3', kind: 'New, no centrepiece', text: 'A tournament poster. Four flat colours, one typeface that bends toward the pointer, and a footer you can throw around.' },
  { slug: 'board', n: 8, name: 'The board', color: '#0a0a0a', ink: '#f2f2ee', kind: 'New, round two', text: 'A postings board. Split-flap tiles turn over to show the pitch, the record and the three ways in.' },
  { slug: 'badge', n: 9, name: 'The badge', color: '#eceae4', ink: '#121212', kind: 'New, round two', text: 'A tournament badge on a lanyard you can grab and swing. The rest of the site is printed like a credential.' },
  { slug: 'terminal', n: 10, name: 'The terminal', color: '#050806', ink: '#d7f5dd', kind: 'New, round two', text: 'The site as a command line. Type record, drive, people or join, or just press the keys on screen.' },
  { slug: 'spread', n: 11, name: 'The spread', color: '#03040a', ink: '#f4f4f8', kind: 'New, round two', text: 'The whole site read to you one word at a time, at whatever speed you can flow. The road speeds up with you.' },
  { slug: 'bento', n: 12, name: 'The bento', color: '#0c0e0d', ink: '#e9efe9', kind: 'New, round two, no centrepiece', text: 'Everything in one grid of tiles, with the numbers counting up and a light that follows the pointer.' },
] as const;
export type VersionSlug = (typeof VERSIONS)[number]['slug'];
