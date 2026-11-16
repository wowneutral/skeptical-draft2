// The bar over what is actually in the drive. It never lifts. Drag it and it
// smears, stretches, snaps back; keep at it and it answers with the drive's lead.
import { useRef, useState } from 'react';
import { gsap } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { Q } from './Q';

export function Fight({ answer, term }: { answer: string; term: string }) {
  const bar = useRef<HTMLButtonElement>(null);
  const smear = useRef<HTMLSpanElement>(null);
  const [tries, setTries] = useState(0);
  const s = useRef({ down: false, x0: 0, dx: 0 });

  const set = (dx: number) => {
    const w = bar.current!.offsetWidth;
    const k = dx / w;
    // the harder you pull, the less it gives
    const pull = Math.sign(k) * (1 - Math.exp(-Math.abs(k) * 2.4)) * 0.38;
    gsap.set(bar.current, { scaleX: 1 + Math.abs(pull) * 0.9, scaleY: 1 - Math.abs(pull) * 0.35, skewX: -pull * 16, x: pull * w * 0.22, transformOrigin: dx > 0 ? '0% 50%' : '100% 50%' });
    gsap.set(smear.current, { opacity: Math.min(1, Math.abs(pull) * 3), scaleX: 1 + Math.abs(pull) * 2.2, x: -pull * w * 0.4 });
  };
  const release = () => {
    gsap.to(bar.current, { scaleX: 1, scaleY: 1, skewX: 0, x: 0, duration: still ? 0 : 1, ease: 'elastic.out(1.2, 0.3)' });
    gsap.to(smear.current, { opacity: 0, scaleX: 1, x: 0, duration: still ? 0 : 0.7, ease: 'expo.out' });
  };
  const refuse = () => {
    setTries((t) => t + 1);
    if (still) return;
    gsap.fromTo(bar.current, { x: -14 }, { x: 0, duration: 0.7, ease: 'elastic.out(1.4, 0.2)' });
  };

  return (
    <div className="fight">
      <span ref={smear} className="fight-smear" aria-hidden="true" />
      <button
        ref={bar}
        type="button"
        className="fight-bar"
        aria-label={`What is inside ${term}: try to uncover it`}
        onPointerDown={(e) => { s.current = { down: true, x0: e.clientX, dx: 0 }; if (e.pointerType === 'mouse') bar.current?.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (!s.current.down) return; s.current.dx = e.clientX - s.current.x0; set(s.current.dx); }}
        onPointerUp={() => { if (!s.current.down) return; s.current.down = false; release(); if (Math.abs(s.current.dx) > 20) setTries((t) => t + 1); }}
        onPointerCancel={() => { s.current.down = false; release(); }}
        onClick={(e) => { if (e.detail === 0) refuse(); }}
      >
        <Q className="fight-q" /><Q className="fight-q" /><Q className="fight-q" />
      </button>
      <p className={'fight-say' + (tries > 0 ? ' on' : '')} aria-live="polite">
        {tries >= 2 ? answer : tries === 1 ? 'It will not lift.' : ''}
      </p>
    </div>
  );
}
