// The witness's answers. Every line here is lifted from content.ts as it stands;
// the questions and the keyword lists are the only words written for this version.
import { SITE, HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';

/** One line of an answer. `term` is a second exact string from the content, set in front (a name, a drive item). */
export type Line = { t: string; term?: string; tag?: string };
export type Link = { label: string; href: string };
export type Topic = { id: string; ask?: string; keys: [RegExp, number][]; lines: Line[]; links?: Link[] };

const L = (t: string): Line => ({ t });
const [compete, lecture, coach] = JOIN.paths;
const [armaan, nathan] = PEOPLE.coaches;
const item = (term: string): Line => { const d = DRIVE.items.find((i) => i.term === term)!; return { term: d.term, t: d.text }; };
const footer = (label: string): Link => FOOTER.links.find((l) => l.label === label)!;
const mail: Link = { label: SITE.email, href: `mailto:${SITE.email}` };

/** What the witness says when nothing matches: the second sentence of the record's rule. */
export const RULE_PARTS = RECORD.rule.split(/(?<=\.)\s+/);
export const FALLBACK: Topic = { id: 'nothing', keys: [], lines: [L(RULE_PARTS[RULE_PARTS.length - 1])] };

/** The name line, in the two halves the cross-ex cuts it into. */
export const NAME_PARTS = MANIFESTO[3].split(/(?<=\.)\s+/);

export const TOPICS: Topic[] = [
  {
    id: 'who', ask: 'Who are you?',
    keys: [[/\bwho\b.*\b(you|skeptical|this|yall|y'all|u)\b/, 6], [/\bwhat\b.*\b(is|are|s)\b.*\b(this|skeptical|you)\b/, 5], [/\b(introduce|yourselves?|pitch|elevator)\b/, 3]],
    lines: HERO.pitch.map(L),
  },
  {
    id: 'what',
    keys: [[/\b(ld|lincoln|douglas|describe|description|summary|tldr|explain)\b/, 4], [/\bwhat\b.*\b(kind|sort|type|format|event)\b/, 4]],
    lines: [L(SITE.description)],
  },
  {
    id: 'catch', ask: 'What’s the catch?',
    keys: [[/\b(catch|cost|costs|fee|fees|free|pay|paid|paying|price|priced|money|dues|charge|charges|expensive|cheap|tuition|afford|\$+)\b/, 5], [/\bhow much\b/, 5]],
    lines: HERO.statement.map(L), links: [HERO.doors[0]],
  },
  {
    id: 'school', ask: 'Which school is this?',
    keys: [[/\b(school|schools|independent|independently|affiliat\w*|entry|district|program|club|sponsor\w*|official|nsda|league)\b/, 4]],
    lines: [L(MANIFESTO[0])],
  },
  {
    id: 'size', ask: 'How many of you?',
    keys: [[/\bhow (many|big|large|small)\b/, 5], [/\b(size|members?|roster|squad|headcount|students|kids|debaters|teammates)\b/, 3], [/\b(people|team)\b/, 1]],
    lines: [L(MANIFESTO[1]), L(PEOPLE.count)],
  },
  {
    id: 'prep', ask: 'Who writes the prep?',
    keys: [[/\b(writes?|wrote|written|writing|frontlines?|frontlining|make|makes|made|cut|cuts|cutting|authors?)\b/, 4], [/\bprep\b/, 2], [/\b(buy|bought|purchase\w*|stolen|copied)\b/, 4]],
    lines: [L(MANIFESTO[2])],
  },
  {
    id: 'name', ask: 'Is the name a position?',
    keys: [[/\b(name|named|called|skep|skepticism|scepticism|skeptics?|sceptics?|position|nihilis\w*|doubt\w*)\b/, 5], [/\bwhy\b.*\bskeptical\b/, 6], [/\b(have|need|required?|forced?|made)\b.*\b(run|read)\b/, 6], [/\brun (it|skep)\b/, 6]],
    lines: [L(MANIFESTO[3])],
  },
  {
    id: 'record', ask: 'What have you won?',
    keys: [[/\b(won|win|wins|winning|winners?|results?|record|trophy|trophies|awards?|breaks?|broke|broken|placed|finals|champions?|championships?|success\w*|legit|accomplish\w*|achieve\w*|medals?|speaks|speaker)\b/, 4], [/\b(any|actually) good\b/, 5], [/\b(prove|proof|receipts?|evidence)\b/, 3]],
    lines: [
      L(RECORD.rule),
      { tag: RECORD.results[0].who, term: RECORD.results[0].what, t: RECORD.results[0].more },
      { tag: RECORD.results[1].who, term: RECORD.results[1].what, t: RECORD.results[1].more },
    ],
    links: [RECORD.more],
  },
  {
    id: 'where',
    keys: [[/\b(lexington|kentucky|september|opener|season)\b/, 6], [/\b(where|when)\b.*\b(that|compete|competed|competing|happen\w*|win|won|been|tournaments?)\b/, 7], [/\b(which|what)\b.*\btournaments?\b.*\b(win|won|break|broke|been)\b/, 7], [/\btournaments? (have|did)\b/, 4]],
    lines: [L(RECORD.name), L(RECORD.where), L(RECORD.when)], links: [RECORD.more],
  },
  {
    id: 'shong',
    keys: [[/\b(shong|novice champion)\b/, 8]],
    lines: [{ tag: RECORD.results[0].who, term: RECORD.results[0].what, t: RECORD.results[0].more }],
  },
  {
    id: 'nina',
    keys: [[/\b(nina|semifinal\w*|semis|top speaker)\b/, 8]],
    lines: [{ tag: RECORD.results[1].who, term: RECORD.results[1].what, t: RECORD.results[1].more }],
  },
  {
    id: 'drive', ask: 'Where’s the prep?',
    keys: [[/\b(drive|folder|stored|kept|storage|google)\b/, 4], [/\bwhere\b.*\bprep\b/, 6], [/\b(link|pinned)\b/, 3]],
    lines: [L(DRIVE.lead)], links: [DRIVE.more],
  },
  {
    id: 'inside', ask: 'What’s in the drive?',
    keys: [[/\bwhat\b.*\bin\b.*\b(it|drive|there|folder)\b/, 8], [/\b(inside|contents?|includes?|included|everything|resources|materials?|stuff)\b/, 4], [/\bwhat\b.*\b(get|have|offer)\b/, 3]],
    lines: DRIVE.items.map((d) => ({ term: d.term, t: d.text })), links: [DRIVE.more],
  },
  { id: 'files', keys: [[/\b(affs?|negs?|cases?|files|acs?|ncs?|1ac|1nc|positions)\b/, 5]], lines: [item('Files')] },
  { id: 'ks', keys: [[/\b(k|ks|kritiks?|kritikal|critiques?|critical|queer|pomo|cap|setcol|afropess\w*)\b/, 5]], lines: [item('Ks')] },
  { id: 'theory', keys: [[/\b(theory|shells?|tricks?|topicality|t|friv\w*|spikes?|aprioris?|nibs?)\b/, 5]], lines: [item('Theory')] },
  { id: 'phil', keys: [[/\b(phil|philosophy|frameworks?|kant|util|hobbes|ethics|fw|nc)\b/, 5]], lines: [item('Philosophy')] },
  { id: 'drills', keys: [[/\b(drills?|drilling|redos?|speed|homework)\b/, 5]], lines: [item('Drills')] },
  { id: 'recordings', keys: [[/\b(recordings?|recorded|videos?|footage|watch|film)\b/, 5]], lines: [item('Recordings')] },
  { id: 'briefs', keys: [[/\b(briefs?|topic|topics|resolution|resolutions|cards?|evidence|research)\b/, 5]], lines: [item('Briefs')] },
  {
    id: 'see', ask: 'Can I see it?',
    keys: [[/\b(see|public|private|secret|secrets|access|peek|look|open|share|shared|leak\w*|show|view|download)\b/, 4], [/\bhow\b.*\bget\b.*\b(link|drive|prep|it)\b/, 7]],
    lines: [L(HERO.statement[1]), L(FOOTER.line)], links: [DRIVE.more],
  },
  {
    id: 'coaches', ask: 'Who coaches?',
    keys: [[/\bwho\b.*\b(coach|coaches|coaching|runs?|leads?|teach\w*|in charge|started|founded)\b/, 7], [/\b(coaches|coaching|staff|adults?|leaders?|founder|founded|started)\b/, 3], [/\bcoach\b/, 2]],
    lines: [{ tag: armaan.role, term: armaan.name, t: armaan.bio }, { tag: nathan.role, term: nathan.name, t: nathan.bio }],
    links: [PEOPLE.more],
  },
  { id: 'armaan', keys: [[/\b(armaan|seth|head coach)\b/, 9]], lines: [{ tag: armaan.role, term: armaan.name, t: armaan.bio }], links: [PEOPLE.more] },
  { id: 'nathan', keys: [[/\b(nathan|shannon|assistant)\b/, 9]], lines: [{ tag: nathan.role, term: nathan.name, t: nathan.bio }], links: [PEOPLE.more] },
  {
    id: 'join', ask: 'How do I join?',
    keys: [[/\b(join|joining|signup|apply|applying|application|applications|tryouts?|enroll|register|recruit\w*)\b/, 5], [/\b(sign up|try out|get in|get involved|be part|be a part)\b/, 5]],
    lines: [L(JOIN.lead), ...JOIN.paths.map((p) => ({ term: p.name, t: p.line }))], links: HERO.doors,
  },
  {
    id: 'compete', ask: 'I’m brand new. Can I compete?',
    keys: [[/\b(novices?|beginners?|new|newbie|experience\w*|inexperienced|middle|varsity|jv|grade|grader|age|old|young|eligible|freshman|freshmen|sophomore|junior|senior|never|first)\b/, 4], [/\b(compete|competing|debate for)\b/, 5]],
    lines: [L(compete.line), L(compete.text[0]), L(compete.text[1])], links: [HERO.doors[0]],
  },
  {
    id: 'contribute', ask: 'What do I owe the team?',
    keys: [[/\b(contribut\w*|requirements?|required|expect\w*|commit\w*|obligat\w*|workload|owe|rules|mandatory|responsib\w*)\b/, 5], [/\bhow much (time|work)\b/, 7], [/\bhave to\b/, 2]],
    lines: [L(HERO.statement[2]), L(compete.text[1])],
  },
  {
    id: 'disclose', ask: 'Do you disclose?',
    keys: [[/\b(disclos\w*|caselist|wiki|opencaselist|open source|tech)\b/, 6]],
    lines: [L(compete.text[2])], links: [footer('Caselist')],
  },
  {
    id: 'scrim', ask: 'Do you scrim?',
    keys: [[/\b(scrims?|scrimmages?|practice|practices|online|travel|traveling|enter|entries|schedule|calendar|meet|meets|meetings?|weekly|often)\b/, 5], [/\btournaments?\b/, 3], [/\brounds\b/, 2]],
    lines: [L(compete.text[3])],
  },
  {
    id: 'lecture', ask: 'Can I teach just once?',
    keys: [[/\b(lectur\w*|teach|teaching|guest|session|sessions|workshop|speak|present|once|hour)\b/, 5]],
    lines: [L(lecture.line), ...lecture.text.map(L)], links: [{ label: lecture.name, href: lecture.href }],
  },
  {
    id: 'coachjoin', ask: 'Can I coach?',
    keys: [[/\b(volunteer\w*|hire|hiring|judge|judging)\b/, 6], [/\b(i|we|id|im)\b.*\b(coach|coaching)\b/, 8], [/\bcoach (with|for)\b/, 8], [/\b(become|be) a coach\b/, 8]],
    lines: [L(coach.line), L(coach.text[0]), L(coach.text[1]), L(coach.text[2])], links: [HERO.doors[1]],
  },
  {
    id: 'dm', ask: 'Can a coach message me?',
    keys: [[/\b(dm|dms|dming|message|messages|messaging|texts?|texting|safe|safety|parents?|privately)\b/, 9], [/\bprivate messages?\b/, 9]],
    lines: [L(coach.text[3])],
  },
  {
    id: 'discord', ask: 'Where does the team live?',
    keys: [[/\b(discord|server|chat|community|hang ?out|live|lives|talk)\b/, 5]],
    lines: [L(JOIN.discord)], links: [footer('Discord')],
  },
  {
    id: 'status', ask: 'I applied. Now what?',
    keys: [[/\b(already|status|applied|heard|waiting|pending|accepted|response|reply)\b/, 6]],
    lines: [L(JOIN.discord), L(JOIN.already.before.trim())], links: [{ label: JOIN.already.label, href: JOIN.already.href }],
  },
  {
    id: 'portal',
    keys: [[/\b(sign in|log ?in|login|portal|dashboard|account)\b/, 7]],
    lines: [L(JOIN.coach.before.trim())], links: [{ label: JOIN.coach.label, href: JOIN.coach.href }],
  },
  {
    id: 'contact', ask: 'Who do I write to?',
    keys: [[/\b(contact|email|e-mail|gmail|reach|write to|mail|address|refer\w*|invite|invited|friend|friends|vouch|someone)\b/, 5], [/\bquestions?\b/, 2]],
    lines: [L(JOIN.also)], links: [mail],
  },
  {
    id: 'social',
    keys: [[/\b(instagram|insta|ig|github|socials?|follow|code|repo|tiktok|twitter|youtube)\b/, 6]],
    lines: [L(FOOTER.line)], links: [footer('Instagram'), footer('GitHub')],
  },
  {
    id: 'page',
    keys: [[/\b(website|site|page|webpage)\b/, 4]],
    lines: [L(FOOTER.line)],
  },
];

export const BUTTONS = TOPICS.filter((t) => t.ask);

export const tidy = (s: string) => ` ${s.toLowerCase().replace(/[’‘`']/g, '').replace(/[^a-z0-9$\s-]/g, ' ').replace(/\b(what|where|who|how|when|there)s\b/g, '$1 is').replace(/\s+/g, ' ').trim()} `;

/** Pick the topic a typed question is about. Exact button wording always wins; otherwise the heaviest keyword match. */
export function answer(raw: string): Topic {
  const q = tidy(raw);
  if (q.trim().length < 2) return FALLBACK;
  const exact = BUTTONS.find((t) => tidy(t.ask!) === q);
  if (exact) return exact;
  let best: Topic = FALLBACK, top = 0;
  for (const t of TOPICS) {
    let s = 0;
    for (const [re, w] of t.keys) if (re.test(q)) s += w;
    if (s > top) { top = s; best = t; }
  }
  return best;
}
