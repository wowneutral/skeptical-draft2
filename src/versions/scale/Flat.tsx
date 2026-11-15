// The balance drawn flat, for a browser without WebGL. Same sim, same beam.
import { useEffect, useRef } from 'react';
import MARKS from '@/lib/marks.json';
import { S, WEIGHTS } from './sim';

export function Flat() {
  const beam = useRef<SVGGElement>(null), l = useRef<SVGGElement>(null), r = useRef<SVGGElement>(null), q = useRef<SVGGElement>(null), n = useRef<SVGGElement>(null);
  useEffect(() => {
    let id = 0;
    const loop = () => {
      const th = S.th, L = 220, ly = Math.sin(th) * L;
      beam.current?.setAttribute('transform', `rotate(${(th * 180) / Math.PI} 400 160)`);
      l.current?.setAttribute('transform', `translate(${400 - Math.cos(th) * L} ${160 - ly})`);
      r.current?.setAttribute('transform', `translate(${400 + Math.cos(th) * L} ${160 + ly})`);
      q.current?.setAttribute('opacity', WEIGHTS[0].side === 'L' && WEIGHTS[0].landed ? '1' : '0.25');
      const k = WEIGHTS.filter((w) => w.id !== 'q' && w.side === 'R').length;
      n.current?.childNodes.forEach((c, i) => (c as SVGElement).setAttribute('opacity', i < k ? '1' : '0'));
      id = requestAnimationFrame(loop);
    };
    loop(); return () => cancelAnimationFrame(id);
  }, []);
  const s = 120 / MARKS.italic.h;
  return (
    <svg className="sc-flat" viewBox="0 0 800 520" role="img" aria-label="A brass balance with the question mark in the left pan">
      <g stroke="#d4a752" fill="none" strokeWidth="3">
        <rect x="250" y="470" width="300" height="24" fill="#1d2124" />
        <path d="M400 470 L400 175 M360 470 Q400 440 440 470" />
        <g ref={beam}><path d="M178 160 L622 160" strokeWidth="6" /><path d="M400 160 L400 330" strokeWidth="2" /></g>
        <path d="M330 340 A 180 180 0 0 0 470 340" strokeWidth="1.5" />
        {[l, r].map((ref, i) => (
          <g key={i} ref={ref}>
            <path d="M0 0 L-70 170 M0 0 L70 170 M0 0 L0 170" strokeWidth="1" />
            <path d="M-80 170 Q0 205 80 170 Z" fill="#8a6a34" />
            {i === 0 ? (
              <g ref={q} transform={`translate(-10 ${172}) scale(${s})`}><path d={MARKS.italic.d} fill="#d8dbe0" stroke="none" /></g>
            ) : (
              <g ref={n}>{WEIGHTS.slice(1).map((_, j) => <rect key={j} x={-60 + (j % 7) * 17} y={150 - Math.floor(j / 7) * 18} width="14" height="18" fill="#d4a752" stroke="none" opacity="0" />)}</g>
            )}
          </g>
        ))}
      </g>
    </svg>
  );
}
