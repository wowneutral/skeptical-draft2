import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { GLYPHS } from './glyphs';

/** The back cover: a still black plate cut with the same question mark as the front, the first page showing through. */
export function Plate({ children }: { children: ReactNode }) {
  const uid = useId().replace(/:/g, '');
  const box = useRef<HTMLDivElement>(null);
  const [{ W, H }, setSize] = useState({ W: 600, H: 800 });
  useLayoutEffect(() => {
    const el = box.current!;
    const read = () => setSize({ W: el.clientWidth, H: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const g = GLYPHS.q;
  const s = Math.min((H * 0.9) / g.h, (W * 0.9) / g.w);
  const T = (dy = 0) => `translate(${W / 2} ${H / 2 + dy}) scale(${s}) translate(${-(g.x + g.w / 2)} ${-(g.y + g.h / 2)})`;
  const t = Math.max(3, Math.round(H * 0.006));
  return (
    <div className="h-plate" ref={box}>
      <div className="h-plate-under" aria-hidden="true">{children}</div>
      <svg className="h-cut" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <mask id={`${uid}a`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <rect width={W} height={H} fill="#fff" />
            <path d={g.d} transform={T()} fill="#000" />
          </mask>
          <mask id={`${uid}b`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <rect width={W} height={H} fill="#000" />
            <path d={g.d} transform={T()} fill="#fff" />
            <path d={g.d} transform={T(t)} fill="#000" />
          </mask>
        </defs>
        <rect width={W} height={H} fill="#0e0e0e" mask={`url(#${uid}a)`} />
        <rect width={W} height={H} fill="#34322d" mask={`url(#${uid}b)`} />
        <path d={g.d} transform={T()} fill="none" stroke="rgba(238,234,224,0.42)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
