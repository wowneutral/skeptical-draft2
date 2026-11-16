// Desk things: a rubber stamp, a pen, a paper clip, a coffee ring, tally marks.
import { useRef, type ReactElement } from 'react';
import { gsap } from '@/lib/scroll';
import { still } from '@/lib/utils';

export function Stamp({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={`bl-stamp ${className}`} aria-hidden="true">
      <span className="bl-stamp-in">{text}</span>
    </span>
  );
}

/** The SVG filters the desk shares: rough rubber-stamp ink, and paper tooth. */
export function Defs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <filter id="bl-ink" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.5" result="holes" />
        <feComposite in="SourceGraphic" in2="holes" operator="in" result="inked" />
        <feDisplacementMap in="inked" in2="n" scale="2.4" />
      </filter>
      <filter id="bl-coffee" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="9" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="9" />
      </filter>
    </svg>
  );
}

/** A fountain pen you can push around the paper. */
export function Pen() {
  const el = useRef<HTMLDivElement>(null);
  const st = useRef({ x: 0, y: 0, r: -28, px: 0, py: 0, vx: 0, vy: 0, t: 0, on: false });
  const down = (e: React.PointerEvent) => {
    const s = st.current;
    s.on = true; s.px = e.clientX; s.py = e.clientY; s.t = performance.now();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    gsap.killTweensOf(s);
    el.current!.classList.add('is-held');
  };
  const move = (e: React.PointerEvent) => {
    const s = st.current; if (!s.on) return;
    const now = performance.now(), dt = Math.max(8, now - s.t);
    const dx = e.clientX - s.px, dy = e.clientY - s.py;
    s.vx = dx / dt; s.vy = dy / dt; s.x += dx; s.y += dy; s.px = e.clientX; s.py = e.clientY; s.t = now;
    s.r += dx * 0.08;
    apply();
  };
  const up = () => {
    const s = st.current; if (!s.on) return; s.on = false;
    el.current!.classList.remove('is-held');
    if (still) return;
    gsap.to(s, { x: s.x + s.vx * 260, y: s.y + s.vy * 260, r: s.r + s.vx * 30, duration: 0.9, ease: 'power3.out', onUpdate: apply });
  };
  const apply = () => { const s = st.current; el.current!.style.transform = `translate(${s.x}px, ${s.y}px) rotate(${s.r}deg)`; };
  return (
    <div className="bl-pen" ref={el} style={{ transform: 'rotate(-28deg)' }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-hidden="true">
      <svg viewBox="0 0 520 44" width="520" height="44">
        <defs>
          <linearGradient id="bl-pen-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4a4844" /><stop offset="0.18" stopColor="#24231f" /><stop offset="0.5" stopColor="#121210" /><stop offset="0.86" stopColor="#0a0a09" /><stop offset="1" stopColor="#2a2925" />
          </linearGradient>
          <linearGradient id="bl-pen-steel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f5f4f0" /><stop offset="0.3" stopColor="#c9c8c2" /><stop offset="0.62" stopColor="#6f6e69" /><stop offset="1" stopColor="#a8a7a1" />
          </linearGradient>
        </defs>
        <path d="M4 22 L40 16.5 Q52 15 62 15 L62 29 Q52 29 40 27.5 Z" fill="url(#bl-pen-steel)" />
        <path d="M6 22 L40 21.6" stroke="#2c2b28" strokeWidth="0.9" />
        <circle cx="30" cy="21.8" r="1.6" fill="#2c2b28" />
        <rect x="60" y="12" width="176" height="20" rx="3" fill="url(#bl-pen-body)" />
        <rect x="234" y="9" width="10" height="26" rx="1" fill="url(#bl-pen-steel)" />
        <rect x="242" y="8" width="268" height="28" rx="11" fill="url(#bl-pen-body)" />
        <path d="M290 5 L452 5 Q462 5 462 12 L462 16 L452 16 L452 11 L290 11 Z" fill="url(#bl-pen-steel)" />
        <rect x="64" y="14.5" width="168" height="1.6" rx="0.8" fill="#fff" opacity="0.22" />
        <rect x="248" y="11" width="256" height="2" rx="1" fill="#fff" opacity="0.2" />
      </svg>
    </div>
  );
}

export function Clip() {
  return (
    <svg className="bl-clip" viewBox="0 0 60 170" width="60" height="170" aria-hidden="true">
      <defs>
        <linearGradient id="bl-clip-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f2f3f1" /><stop offset="0.4" stopColor="#9fa3a1" /><stop offset="0.6" stopColor="#e9ebe8" /><stop offset="1" stopColor="#6c706e" />
        </linearGradient>
      </defs>
      <path d="M20 150 L20 30 Q20 10 32 10 Q44 10 44 30 L44 140 Q44 160 30 160 Q14 160 14 140 L14 50 Q14 40 22 40 Q30 40 30 50 L30 132" fill="none" stroke="#000" strokeOpacity="0.25" strokeWidth="5" strokeLinecap="round" transform="translate(3 4)" />
      <path d="M20 150 L20 30 Q20 10 32 10 Q44 10 44 30 L44 140 Q44 160 30 160 Q14 160 14 140 L14 50 Q14 40 22 40 Q30 40 30 50 L30 132" fill="none" stroke="url(#bl-clip-g)" strokeWidth="4.2" strokeLinecap="round" />
    </svg>
  );
}

export function Coffee({ className = '', id }: { className?: string; id: string }) {
  return (
    <svg className={`bl-coffee ${className}`} viewBox="0 0 300 300" width="300" height="300" aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.78" stopColor="#8a5a2b" stopOpacity="0" />
          <stop offset="0.86" stopColor="#8a5a2b" stopOpacity="0.16" />
          <stop offset="0.93" stopColor="#6e4219" stopOpacity="0.5" />
          <stop offset="0.965" stopColor="#6e4219" stopOpacity="0.22" />
          <stop offset="1" stopColor="#6e4219" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g filter="url(#bl-coffee)">
        <circle cx="150" cy="150" r="128" fill={`url(#${id})`} />
        <path d="M40 120 A118 118 0 0 1 120 34" fill="none" stroke="#6e4219" strokeOpacity="0.28" strokeWidth="3" />
      </g>
    </svg>
  );
}

/** Tally marks for a count. Groups of five, the fifth one across. */
export function Tally({ n }: { n: number }) {
  const marks: ReactElement[] = [];
  for (let i = 0; i < n; i++) {
    const g = Math.floor(i / 5), k = i % 5, ox = g * 120;
    if (k < 4) marks.push(<path key={i} d={`M${ox + 14 + k * 20} ${10 + (k % 2) * 3} Q${ox + 12 + k * 20} 46 ${ox + 15 + k * 20} ${84 - (k % 2) * 2}`} />);
    else marks.push(<path key={i} d={`M${ox + 2} 70 Q${ox + 50} 46 ${ox + 92} 24`} />);
  }
  return <svg className="bl-tally" viewBox={`0 0 ${Math.ceil(n / 5) * 120} 92`} aria-hidden="true">{marks}</svg>;
}
