// Every claim the page makes, and the line in content.ts that backs it.
// Nothing is reworded: a proof is a whole content line, with the sentence that
// does the backing marked. Where there is no further support, the record's rule says so.
import { DRIVE, HERO, JOIN, MANIFESTO, PEOPLE, RECORD, SITE } from '@/content';

export type Proof = { before?: string; mark: string; after?: string; cite: string; none?: boolean };
export type ClaimDef = { id: string; proof: Proof };

const sent = (s: string) => s.split(/(?<=\.)\s+/);
const m0 = sent(MANIFESTO[0]);
const m1 = sent(MANIFESTO[1]);
const m3 = sent(MANIFESTO[3]);
const lead = sent(DRIVE.lead);
const rule = sent(RECORD.rule);
const ks = sent(DRIVE.items[1].text);

export const CLAIMS: Record<string, Proof> = {
  indep: { mark: m0[0], after: ' ' + m0.slice(1).join(' '), cite: 'The manifesto, line one.' },
  coaches: { before: m1[0] + ' ', mark: m1[1], cite: 'The manifesto, line two.' },
  free: { before: m0[0] + ' ', mark: m0.slice(1).join(' '), cite: 'The manifesto, line one.' },
  private: { before: lead[0] + ' ', mark: lead.slice(1).join(' '), cite: 'The drive.' },
  everyone: { mark: MANIFESTO[2], cite: 'The manifesto, line three.' },
  name: { before: m3[0] + ' ', mark: m3.slice(1).join(' '), cite: 'The manifesto, line four.' },
  shong: { mark: RECORD.results[0].more, cite: `The record. ${RECORD.results[0].who}` },
  nina: { mark: RECORD.results[1].more, cite: `The record. ${RECORD.results[1].who}` },
  files: { mark: JOIN.paths[0].text[1], cite: 'Join. Compete.' },
  recordings: { before: rule[0] + ' ', mark: rule.slice(1).join(' '), cite: 'No further support.', none: true },
  count: { mark: m1[0], after: ' ' + m1[1], cite: 'The manifesto, line two.' },
  nathan: { before: ks[0] + ' ', mark: ks.slice(1).join(' '), cite: 'The drive. Ks.' },
};
export const TOTAL = Object.keys(CLAIMS).length;

/** The visible claim text for the ones that are not set inline elsewhere. */
export const TEXT = {
  indep: HERO.pitch[0], coaches: HERO.pitch[1],
  free: HERO.statement[0], private: HERO.statement[1], everyone: HERO.statement[2],
  name: SITE.name + '.',
};
export const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
export { PEOPLE };
