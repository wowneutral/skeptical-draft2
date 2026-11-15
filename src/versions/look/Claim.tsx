// A claim, its "Prove it" control, and the proof that arrives under it.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { gsap, ScrollTrigger, SplitText } from '@/lib/scroll';
import { cn, still } from '@/lib/utils';
import { act, brain, now } from './rig';
import { CLAIMS } from './claims';

const LABELS = ['Prove it', 'Prove it again', 'Really prove it', 'Proven'];
/** Each press marks the backing harder: an underline, a thicker one, then a full highlight. */
const MARKS = ['0.16em', '0.34em', '0.95em'];

export function Claim({ id, children, className, onCheck, tone = 'ink', as = 'div' }: {
  id: string; children: ReactNode; className?: string; onCheck: (id: string) => void; tone?: 'ink' | 'paper' | 'red'; as?: 'div' | 'li';
}) {
  const proof = CLAIMS[id];
  const [n, setN] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLParagraphElement>(null);
  const mark = useRef<HTMLSpanElement>(null);
  const split = useRef<SplitText | null>(null);

  useEffect(() => {
    const el = box.current!;
    brain.claims.push(el);
    return () => { brain.claims = brain.claims.filter((c) => c !== el); split.current?.revert(); };
  }, []);

  const press = () => {
    const next = n + 1;
    setN(next);
    if (next === 1) onCheck(id);
    brain.focus = panel.current;
    brain.focusUntil = now() + 1.9;
    if (proof.none) act(next >= 3 ? 'roll' : 'narrow', next >= 3 ? 1.5 : 3);
    else if (next === 1) act('reading', 1.9);
    else if (next === 2) act('side', 1.7);
    else act('roll', 1.5);
  };

  // The proof lands after React has shown the panel.
  useLayoutEffect(() => {
    if (n === 0) return;
    const p = panel.current!, t = text.current!, mk = mark.current!;
    const size = MARKS[Math.min(n, 3) - 1];
    if (still) { mk.style.backgroundSize = `100% ${size}`; return; }
    if (n === 1) {
      gsap.fromTo(p, { height: 0 }, { height: 'auto', duration: 0.7, ease: 'expo.out', clearProps: 'height' });
      split.current = SplitText.create(t, { type: 'words', mask: 'words', aria: 'none' });
      gsap.from(split.current.words, { yPercent: 105, duration: 0.8, ease: 'expo.out', stagger: 0.035, delay: 0.08 });
      gsap.fromTo(mk, { backgroundSize: `0% ${size}` }, { backgroundSize: `100% ${size}`, duration: 0.9, ease: 'power3.inOut', delay: 0.35 });
    } else {
      gsap.fromTo(mk, { backgroundSize: `0% ${size}` }, { backgroundSize: `100% ${size}`, duration: 0.6, ease: 'power3.inOut' });
      gsap.fromTo(t, { x: 0 }, { keyframes: { x: [0, -14, 11, -7, 4, 0] }, duration: 0.45, ease: 'none' });
    }
    const id = setTimeout(() => ScrollTrigger.refresh(), 800);
    return () => clearTimeout(id);
  }, [n]);

  const Tag = as;
  const pid = `proof-${id}`;
  return (
    <Tag ref={box as never} className={cn('claim', `tone-${tone}`, n > 0 && 'is-checked', proof.none && 'is-bare', className)} data-claim={id}>
      <div className="claim-row">
        <div className="claim-t">{children}</div>
        <button type="button" className={cn('prove', n >= 3 && 'is-done')} aria-expanded={n > 0} aria-controls={pid} onClick={press}
          onPointerEnter={() => { brain.hover = true; }} onPointerLeave={() => { brain.hover = false; }} onFocus={() => { brain.hover = true; }} onBlur={() => { brain.hover = false; }}>
          <span className="prove-dot" aria-hidden="true" />
          {LABELS[Math.min(n, 3)]}
        </button>
      </div>
      <div ref={panel} id={pid} className={cn('proof', 'act', n > 0 && 'is-on')} hidden={n === 0} data-n={Math.min(n, 3)}>
        <p className="cite">{proof.cite}</p>
        <p ref={text} className="proof-t">
          {proof.before}<span ref={mark} className="mk">{proof.mark}</span>{proof.after}
        </p>
        {n >= 3 && <p className="note">{proof.none ? 'Still nothing. That is the rule.' : 'Proven. Three times now.'}</p>}
      </div>
    </Tag>
  );
}
