// Small pieces every part of the cross-ex uses: the two voices, the rule, the margin numbers.
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Line, Link } from './bank';

/** The pressure on one exchange, 0 to 1. Marks grow, leading tightens, the grotesque narrows, the cuts get faster. */
export const heat = (h: number, more: Record<string, string | number> = {}): CSSProperties =>
  ({ '--h': h, '--w': Math.round(92 - h * 28), ...more }) as CSSProperties;

export function Beat({ h, kind = 'side', className, style, children }: { h: number; kind?: 'side' | 'stack' | 'cut'; className?: string; style?: Record<string, string | number>; children: ReactNode }) {
  return <div className={cn('beat', `beat-${kind}`, className)} style={heat(h, style)} data-beat data-h={h}>{children}</div>;
}

/** The questioner: italic serif, in the one colour. */
export function Q({ children, className, cut }: { children: ReactNode; className?: string; cut?: boolean }) {
  return (
    <p className={cn('say q', className)} data-cut={cut ? '' : undefined}>
      <span className="mk">Q.</span> <span className="qt" data-q>{children}</span>
    </p>
  );
}

/** The witness: heavy grotesque. Children are the answer's lines. */
export function A({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('say a', className)}>
      <span className="mk" data-mk>A.</span>
      <div className="ab">{children}</div>
    </div>
  );
}

export const Rule = () => <span className="rule" data-rule aria-hidden="true" />;

export function Out({ href, children, className, land }: { href: string; children: ReactNode; className?: string; land?: boolean }) {
  return (
    <a className={cn('out', className)} href={href} rel={href.startsWith('http') ? 'noopener' : undefined} data-land={land ? '' : undefined}>
      <span>{children}</span><ArrowUpRight aria-hidden="true" strokeWidth={2.6} />
    </a>
  );
}

/** One line of an answer from the bank: an optional typed label, an optional heavy term, then the words. */
export function AnswerLine({ line, size }: { line: Line; size: string }) {
  return (
    <p className={cn('at', line.term ? 'has-term' : size)} data-a>
      {line.tag && <span className="rep tag">{line.tag}</span>}
      {line.term && <b className="term">{line.term}</b>}
      {line.term ? <span className="rest">{line.t}</span> : line.t}
    </p>
  );
}

export const Links = ({ links }: { links?: Link[] }) =>
  links?.length ? <p className="outs">{links.map((l) => <Out key={l.href + l.label} href={l.href} land>{l.label}</Out>)}</p> : null;

/** Transcript line numbers down the margin, 1 to 25 and round again. With `squeeze` the lines close up as the block goes on. */
export function Gutter({ squeeze = false }: { squeeze?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!, host = el.parentElement!;
    let last = -1;
    const fill = () => {
      const H = host.offsetHeight;
      if (Math.abs(H - last) < 6) return;
      last = H;
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      let y = rem * 1.2, n = 1, html = '';
      while (y < H - rem * 1.6) {
        html += `<i style="top:${Math.round(y)}px">${n}</i>`;
        y += rem * (squeeze ? 3.1 - 1.8 * Math.min(1, y / H) : 2.2);
        n = (n % 25) + 1;
      }
      el.innerHTML = html;
    };
    const ro = new ResizeObserver(fill);
    ro.observe(host);
    fill();
    return () => ro.disconnect();
  }, [squeeze]);
  return <div className="gut" ref={ref} aria-hidden="true" />;
}
