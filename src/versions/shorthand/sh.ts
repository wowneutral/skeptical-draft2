// How a judge would flow the team's own copy. Keys are the exact strings from content.ts.
// Markup: plain characters stay in the shorthand, [text] grows in, {sym|word} cross fades.
// A symbol starting with @ is drawn (@r right arrow, @l left arrow).
export const SH: Record<string, string> = {
  'Free to join.': '{Ø|Free} {$|to join}[.]',
  'The prep stays private.': '[The ]prep {=|stays} priv[ate][.]',
  'Everyone contributes.': 'Every{1|one} contrib[utes][.]',
  'An independent LD team.': '[An ]indep[endent] LD t[ea]m[.]',
  'Coaches who still compete.': 'Coach[es] [who ]still comp[ete][.]',
  'Join as a debater': 'Join [as a ]deb[ater]',
  'Coach with us': 'Coach {w/|with} us',
  'We’re an independent entry. No school, no fee.': 'We[’re an] indep[endent] entry[.] {Ø|No} sch[ool], {Ø|no} {$|fee}[.]',
  'Eight of us right now. Two coaches, both still competing.': '{8|Eight}[ of us right] now. {2|Two} coach[es], both still comp[eting].',
  'We write the prep, we frontline it, and it stays in the drive.': 'We w[rite] [the ]prep, [we ]{FL|frontline}[ it], [and it ]{@r|stays in} [the ]drive[.]',
  'Yes, the name is a position. No, you don’t have to run it.': '{Y|Yes}, [the ]name {=|is} [a ]pos[ition]. {Ø|No}, {u|you} {Ø|don’t} [have to ]run[ it].',
  'Breaks and speaker awards only. If it isn’t here, it hasn’t happened.': 'Br[ea]ks {+|and} sp[ea]k[e]r[ awards] only. If [it ]{Ø|isn’t} here, [it ]{Ø|hasn’t} happ[ened].',
  'September 2026': 'Sep[tember] 2026',
  'National Speech & Debate Season Opener': 'Nat[ional] Sp[eech] & Deb[ate] S[eason] O[pener]',
  'Lexington, Kentucky': 'Lex[ington], K[entuck]y',
  'Novice champion': 'Nov[ice] champ[ion]',
  '3-0 in finals. Second speaker.': '3-0 [in ]finals. {2nd|Second} sp[ea]k[e]r.',
  'Middle school semifinalist': '{MS|Middle school} semi[finalist]',
  'Top speaker in the division.': '{↑|Top} sp[ea]k[e]r [in the ]div[ision].',
  'Link from a coach, pinned in the Discord. None of it is public.': 'Link {@l|from} [a ]coach, pin[ned in the] {D|Discord}. {Ø|None of it is} pub[lic].',
  Files: 'F[iles]',
  Ks: 'K[s]',
  Theory: 'T[heory]',
  Philosophy: 'Phil[osophy]',
  Drills: 'Dr[ills]',
  Recordings: 'Rec[ordings]',
  Briefs: 'Br[iefs]',
  'Eight debaters right now.': '{8|Eight} deb[aters] [right ]now[.]',
  'Still competes in LD. Started Skeptical because he likes coaching and he likes debate.':
    'Still comp[etes] [in ]LD. Start[ed] Skep[tical] {b/c|because} [he ]likes coach[ing] {+|and} [he ]likes deb[ate].',
  'Runs the K side of the room. Queer theory especially.': 'Runs [the ]K side[ of the room]. Queer {T|theory} esp[ecially].',
  'Pick what you want to do. More than one is fine.': 'Pick[ what you want to do]. {>1|More than one} [is ]fine.',
  Compete: 'Comp[ete]',
  Lecture: 'Lec[ture]',
  Coach: 'C[oa]ch',
  'Debate for Skeptical.': 'Deb[ate] [for ]Skep[tical].',
  'Teach once.': 'Teach {1x|once}.',
  'Run the room.': 'Run [the ]room.',
  'The prep is private. This page isn’t.': '[The ]prep {=|is} priv[ate]. [This ]page {Ø|isn’t}.',
};

export type Unit =
  | { k: 'keep'; ch: string }
  | { k: 'grow'; ch: string }
  | { k: 'swap'; sym: string; word: string };

export function parse(markup: string): Unit[] {
  const out: Unit[] = [];
  let i = 0;
  while (i < markup.length) {
    const c = markup[i];
    if (c === '[') {
      const j = markup.indexOf(']', i);
      for (const ch of markup.slice(i + 1, j)) out.push({ k: 'grow', ch });
      i = j + 1;
    } else if (c === '{') {
      const j = markup.indexOf('}', i);
      const [sym, word] = markup.slice(i + 1, j).split('|');
      out.push({ k: 'swap', sym, word });
      i = j + 1;
    } else {
      out.push({ k: 'keep', ch: c });
      i++;
    }
  }
  return out;
}

export const fullOf = (u: Unit[]) => u.map((x) => (x.k === 'swap' ? x.word : x.ch)).join('');
export const shortOf = (u: Unit[]) =>
  u.map((x) => (x.k === 'swap' ? (x.sym === '@r' ? '→' : x.sym === '@l' ? '←' : x.sym) : x.k === 'keep' ? x.ch : '')).join('');

/** Units for a sentence; if the markup does not spell the sentence exactly, the sentence is kept whole. */
export function unitsFor(text: string): Unit[] {
  const m = SH[text];
  if (m) {
    const u = parse(m);
    if (fullOf(u) === text) return u;
  }
  return [...text].map((ch) => ({ k: 'keep' as const, ch }));
}
