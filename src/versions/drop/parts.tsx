// Small pieces shared by the live flow beside the game and the complete flow under it.
import { useState, type ReactNode } from 'react';
import { RECORD, DRIVE, PEOPLE, JOIN, SITE } from '@/content';
import type { Item, Mark } from './data';

export const A = ({ href, className, children }: { href: string; className?: string; children: ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

export const Arrow = ({ down }: { down?: boolean }) => (
  <svg className="ar" viewBox="0 0 22 12" width="22" height="12" aria-hidden="true" style={down ? { transform: 'rotate(90deg)' } : undefined}>
    <path d="M0 6h20M14.5 1 20 6l-5.5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const Lock = () => (
  <svg className="lk" viewBox="0 0 14 16" width="14" height="16" aria-hidden="true">
    <path d="M2 7h10v8H2zM4.2 7V4.6a2.8 2.8 0 0 1 5.6 0V7M7 10v2.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

/** A drive folder as line art: closed, locked, named. */
export const Folder = () => (
  <svg className="fd" viewBox="0 0 120 84" aria-hidden="true">
    <path d="M3 81V3h40l9 11h65v67z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3 24h114" fill="none" stroke="currentColor" strokeWidth="1" opacity=".5" />
    <path className="fd-lock" d="M51 44h18v15H51zM54.5 44v-4.5a5.5 5.5 0 0 1 11 0V44M60 49v5" fill="none" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

/** The words of one argument, as they sit on a flow. */
export function Body({ it }: { it: Item }) {
  switch (it.kind) {
    case 'door': return <p><A className="go" href={it.href!}>{it.body}<Arrow /></A></p>;
    case 'path': return <p><A className="go" href={it.href!}><b>{it.head}</b><Arrow /></A> {it.body}</p>;
    case 'folder': return <p><b><Lock />{it.head}</b> {it.body}</p>;
    case 'event': case 'result': case 'coach': return <p><b className="own">{it.head}</b> {it.body}</p>;
    default: return <p>{it.body}</p>;
  }
}

/** What follows a wave whether or not you caught anything: the link to the rest. */
export function Extras({ wave }: { wave: number }) {
  if (wave === 2) return <p className="ex"><A className="go" href={RECORD.more.href}>{RECORD.more.label}<Arrow /></A></p>;
  if (wave === 3) return <p className="ex"><A className="go" href={DRIVE.more.href}>{DRIVE.more.label}<Arrow /></A></p>;
  if (wave === 4) return <p className="ex"><A className="go" href={PEOPLE.more.href}>{PEOPLE.more.label}<Arrow /></A></p>;
  if (wave === 5) return (
    <>
      <p className="ex"><A href={`mailto:${SITE.email}`}>{SITE.email}</A></p>
      <p className="ex">{JOIN.already.before}<A href={JOIN.already.href}>{JOIN.already.label}</A>. {JOIN.coach.before}<A href={JOIN.coach.href}>{JOIN.coach.label}</A>.</p>
    </>
  );
  return null;
}

const AGAIN = ['Dropped', 'Still dropped', 'Too late', 'New in the 2AR', 'Conceded'];

/** The mark on a line of the complete flow. A dropped one can be pressed; it does not help. */
export function Mk({ m }: { m: Mark }) {
  const [n, setN] = useState(0);
  if (m === 'caught') return <span className="mk mk-ok"><Arrow />Extended</span>;
  if (m === 'unreached') return <span className="mk mk-un">Not reached</span>;
  return (
    <button type="button" className="mk mk-no" data-n={n % 2} onClick={() => setN((v) => v + 1)}>
      <span>{AGAIN[n % AGAIN.length]}</span>
    </button>
  );
}
