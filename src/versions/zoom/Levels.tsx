// The ten nested compositions. Each one sits inside a letter of the one before;
// the letter it lives in is marked with data-t. Every word of copy comes from content.ts.
import type { ReactNode } from 'react';
import { HERO, MANIFESTO, RECORD, DRIVE, PEOPLE, JOIN, FOOTER } from '@/content';

export const NAMES = ['The word', 'The pitch', 'The statement', 'The manifesto', 'The record', 'The drive', 'The grain', 'The people', 'Join', 'The way in'];
export const STOPS = ['S', 'k', 'e', 'p', 't', 'i', 'c', 'a', 'l', '?'];
/** Each level's paper and ink, so the camera can feel depth by colour. */
export const PAPER = ['#f5f2ea', '#0b0b0b', '#b3261e', '#f5f2ea', '#0b0b0b', '#efe9dc', '#0b0b0b', '#16245e', '#f5f2ea', '#b3261e'];
/** How much each child plate turns inside its parent's letter, degrees. */
/** The gauge's ink and accent on each level. */
export const INK = ['#0b0b0b', '#f5f2ea', '#f5f2ea', '#0b0b0b', '#f5f2ea', '#0b0b0b', '#f5f2ea', '#f5f2ea', '#0b0b0b', '#f5f2ea'];
export const ACC = ['#b3261e', '#ff6a4d', '#0b0b0b', '#b3261e', '#ff6a4d', '#b3261e', '#ff6a4d', '#ff9a82', '#b3261e', '#0b0b0b'];
export const TURN = [-7, 5, -4, 6, -5, 4, -6, 5, 0];

type P = { flat?: boolean };

/** Wrap one letter of one word so the next level can be set inside it. */
function mark(text: string, word: string, at: number): ReactNode {
  const i = text.indexOf(word);
  if (i < 0) return text;
  const j = i + at;
  return (<>{text.slice(0, j)}<span data-t="counter">{text[j]}</span>{text.slice(j + 1)}</>);
}
const sentences = (s: string) => s.split(/(?<=\.)\s+/);

function Reg() {
  return (
    <div className="zm-reg" aria-hidden="true">
      <i className="zm-r tl" /><i className="zm-r tr" /><i className="zm-r bl" /><i className="zm-r br" />
    </div>
  );
}


export function L0({ flat }: P) {
  const H = flat ? 'h1' : 'div';
  return (
    <div className="zm-in zm-in0">
      <Reg />
      <div className="zm-grid" aria-hidden="true" />
      <H className="zm-word" aria-label={flat ? 'Skeptical: an independent Lincoln-Douglas debate team' : undefined}>
        Skep<br className="zm-br" />tic<span data-t="counter">a</span>l?
      </H>
      <p className="zm-cue">Look closer.</p>
    </div>
  );
}

export function L1({ flat }: P) {
  const H = flat ? 'h2' : 'div';
  return (
    <div className="zm-in zm-in1">
      <Reg />
      <p className="zm-p1a">{HERO.pitch[0]}</p>
      <H className="zm-p1b">{mark(HERO.pitch[1], 'Coaches', 1)}</H>
      <div className="zm-doors">
        {HERO.doors.map((d) => <a key={d.href} data-k={'door' + d.href} href={d.href} tabIndex={flat ? 0 : -1}>{d.label}<b aria-hidden="true">{'→'}</b></a>)}
      </div>
    </div>
  );
}

export function L2(_: P) {
  return (
    <div className="zm-in zm-in2">
      <Reg />
      <p className="zm-s zm-s0">{mark(HERO.statement[0], 'join', 1)}</p>
      <p className="zm-s zm-s1">{HERO.statement[1]}</p>
      <p className="zm-s zm-s2">{HERO.statement[2]}</p>
    </div>
  );
}

export function L3(_: P) {
  const [a, b] = sentences(MANIFESTO[0]);
  return (
    <div className="zm-in zm-in3">
      <Reg />
      <div className="zm-m0">
        <p className="zm-m0a"><span className="zm-num">1</span>{a}</p>
        <p className="zm-m0b">{mark(b ?? '', 'No', 1)}</p>
      </div>
      <ol className="zm-mlist">
        {MANIFESTO.slice(1).map((m, i) => <li key={m}><span className="zm-num">{i + 2}</span><span>{m}</span></li>)}
      </ol>
    </div>
  );
}

export function L4({ flat }: P) {
  const H = flat ? 'h2' : 'div';
  return (
    <div className="zm-in zm-in4" id={flat ? 'record' : undefined}>
      <Reg />
      <H className="zm-rt">{mark(RECORD.title, 'record', 3)}</H>
      <p className="zm-rule">{RECORD.rule}</p>
      <p className="zm-event"><span>{RECORD.when}</span><span>{RECORD.name}</span><span>{RECORD.where}</span></p>
      <ul className="zm-res">
        {RECORD.results.map((r) => (
          <li key={r.who}><span className="zm-who">{r.who}</span><span className="zm-what">{r.what}</span><span className="zm-more">{r.more}</span></li>
        ))}
      </ul>
      <a className="zm-link" data-k="record" href={RECORD.more.href} tabIndex={flat ? 0 : -1}>{RECORD.more.label}</a>
    </div>
  );
}

export function L5({ flat }: P) {
  const H = flat ? 'h2' : 'div';
  return (
    <div className="zm-in zm-in5" id={flat ? 'drive' : undefined}>
      <Reg />
      <H className="zm-dt">The drive<span className="zm-dot" data-t="dot" /><span className="sr-only-x">.</span></H>
      <dl className="zm-items">
        {DRIVE.items.map((d, i) => (
          <div key={d.term} className="zm-item"><dt><span className="zm-num">{i + 1}</span>{d.term}</dt><dd>{d.text}</dd></div>
        ))}
      </dl>
      <a className="zm-link" data-k="drive" href={DRIVE.more.href} tabIndex={flat ? 0 : -1}>{DRIVE.more.label}</a>
    </div>
  );
}

export function L6(_: P) {
  const [a, b] = sentences(DRIVE.lead);
  return (
    <div className="zm-in zm-in6">
      <div className="zm-grain" aria-hidden="true" />
      <p className="zm-g0">{a}</p>
      <p className="zm-g1">{mark(b ?? '', 'None', 1)}</p>
    </div>
  );
}

export function L7({ flat }: P) {
  const H = flat ? 'h2' : 'div';
  return (
    <div className="zm-in zm-in7" id={flat ? 'people' : undefined}>
      <Reg />
      <H className="zm-pt">{PEOPLE.title}</H>
      <div className="zm-coaches">
        {PEOPLE.coaches.map((c, i) => (
          <div key={c.name} className="zm-coach">
            <p className="zm-role">{c.role}</p>
            <p className="zm-name">{i === 1 ? mark(c.name, 'Shannon', 5) : c.name}</p>
            <p className="zm-bio">{c.bio}</p>
          </div>
        ))}
      </div>
      <p className="zm-count">{PEOPLE.count}</p>
      <a className="zm-link" data-k="people" href={PEOPLE.more.href} tabIndex={flat ? 0 : -1}>{PEOPLE.more.label}</a>
    </div>
  );
}

export function L8({ flat }: P) {
  const H = flat ? 'h2' : 'div';
  return (
    <div className="zm-in zm-in8" id={flat ? 'join' : undefined}>
      <Reg />
      <div className="zm-grid" aria-hidden="true" />
      <H className="zm-jt">Join<span className="zm-dot zm-dotred" data-t="dot" /><span className="sr-only-x">.</span></H>
      <p className="zm-jl">{JOIN.lead}</p>
    </div>
  );
}

export function L9({ flat, onPull }: P & { onPull?: () => void }) {
  return (
    <div className="zm-in zm-in9">
      <div className="zm-pan">
        <div className="zm-paths">
          {JOIN.paths.map((p, i) => (
            <div key={p.id} className="zm-path">
              <span className="zm-pn">{i + 1}</span>
              <a className="zm-pname" data-k={'path' + p.id} href={p.href} tabIndex={flat ? 0 : -1}>{p.name}<b aria-hidden="true">{'→'}</b></a>
              <p className="zm-pline">{p.line}</p>
              <ul className="zm-ptext">{p.text.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          ))}
        </div>
        <div className="zm-after">
          <p>{JOIN.already.before}<a data-k="already" href={JOIN.already.href} tabIndex={flat ? 0 : -1}>{JOIN.already.label}</a></p>
          <p>{JOIN.coach.before}<a data-k="coachin" href={JOIN.coach.href} tabIndex={flat ? 0 : -1}>{JOIN.coach.label}</a></p>
          <p>{JOIN.also} <a data-k="mail" href={FOOTER.links[4].href} tabIndex={flat ? 0 : -1}>{FOOTER.links[4].label}</a></p>
          <p>{JOIN.discord}</p>
        </div>
        <footer className="zm-foot">
          <p className="zm-fline">{FOOTER.line}</p>
          <ul className="zm-flinks">
            {FOOTER.links.slice(0, 4).map((l) => <li key={l.href}><a data-k={'f' + l.href} href={l.href} tabIndex={flat ? 0 : -1}>{l.label}</a></li>)}
          </ul>
          <ul className="zm-fpages">
            {FOOTER.pages.map((l) => <li key={l.href}><a data-k={'p' + l.href} href={l.href} tabIndex={flat ? 0 : -1}>{l.label}</a></li>)}
          </ul>
          {!flat && onPull && <button type="button" className="zm-out" tabIndex={-1} onClick={onPull}>Pull back to the word</button>}
          <p className="zm-draft">Draft 2, version 31. Not the live site.</p>
        </footer>
      </div>
    </div>
  );
}

export const LEVELS = [L0, L1, L2, L3, L4, L5, L6, L7, L8];
