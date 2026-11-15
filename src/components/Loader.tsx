// A real loader: it counts what the scene is actually downloading (drei's
// progress store), holds for a beat so it never just flashes, then leaves.
import { useEffect, useRef, useState } from 'react';
import { useProgress } from '@react-three/drei';
import gsap from 'gsap';
import { still } from '@/lib/utils';

export function Loader({ onDone, bg, ink, font, extra = true }: { onDone: () => void; bg: string; ink: string; font: string; extra?: boolean }) {
  const { progress, active } = useProgress();
  const root = useRef<HTMLDivElement>(null), num = useRef<HTMLSpanElement>(null), bar = useRef<HTMLSpanElement>(null);
  const shown = useRef({ v: 0 });
  const born = useRef(performance.now());
  const [gone, setGone] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    const target = active ? Math.min(99, progress) : 100;
    gsap.to(shown.current, {
      v: extra ? target : 100, duration: still ? 0 : 0.6, ease: 'power2.out', overwrite: true,
      onUpdate: () => {
        const v = Math.round(shown.current.v);
        if (num.current) num.current.textContent = String(v).padStart(3, '0');
        if (bar.current) bar.current.style.transform = `scaleX(${v / 100})`;
      },
    });
    if (target < 100 && extra) return;
    const wait = Math.max(0, 900 - (performance.now() - born.current));
    const t = setTimeout(() => {
      if (finished.current) return;
      finished.current = true;
      if (still) { setGone(true); onDone(); return; }
      gsap.timeline({ onComplete: () => setGone(true) })
        .to(num.current, { yPercent: -110, duration: 0.7, ease: 'expo.in' }, 0.15)
        .to(bar.current, { scaleX: 1, duration: 0.3 }, 0)
        .add(onDone, 0.6)
        .to(root.current, { opacity: 0, duration: 0.7, ease: 'power2.out' }, 0.65);
    }, wait + (still ? 0 : 250));
    return () => clearTimeout(t);
  }, [progress, active, extra, onDone]);

  if (gone) return null;
  return (
    <div ref={root} role="status" aria-label="Loading" style={{ position: 'fixed', inset: 0, zIndex: 120, background: bg, color: ink, display: 'grid', alignContent: 'end', padding: 'clamp(20px, 4vw, 56px)' }}>
      <div style={{ overflow: 'hidden', lineHeight: 0.85 }}>
        <span ref={num} style={{ display: 'inline-block', font, fontVariantNumeric: 'tabular-nums' }}>000</span>
      </div>
      <span style={{ display: 'block', height: 1, marginTop: 18, background: `color-mix(in srgb, ${ink} 22%, transparent)` }}>
        <span ref={bar} style={{ display: 'block', height: 1, background: ink, transform: 'scaleX(0)', transformOrigin: 'left' }} />
      </span>
    </div>
  );
}
