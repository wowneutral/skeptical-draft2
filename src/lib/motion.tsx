// Text and reveal primitives shared by every version.
import { createElement, useRef, type ReactNode, type JSX } from 'react';
import { gsap, ScrollTrigger, SplitText, useGSAP } from './scroll';
import { still } from './utils';

type SplitProps = {
  as?: keyof JSX.IntrinsicElements;
  by?: 'lines' | 'chars' | 'words';
  /** 'view' plays when scrolled into view; 'load' plays after `delay`; 'none' only splits. */
  on?: 'view' | 'load' | 'none';
  delay?: number;
  stagger?: number;
  duration?: number;
  /** 'rise' slides out of a mask; 'blur' is the per-letter blur-up from the prompt. */
  effect?: 'rise' | 'blur';
  className?: string;
  id?: string;
  children: ReactNode;
};

/** A heading or paragraph that arrives line by line (or letter by letter). Screen readers get the plain text. */
export function Split({ as = 'p', by = 'lines', on = 'view', delay = 0, stagger, duration, effect = 'rise', className, id, children }: SplitProps) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(() => {
    const el = ref.current;
    if (!el || still || on === 'none') return;
    gsap.set(el, { visibility: 'visible' });
    SplitText.create(el, {
      type: by === 'chars' ? 'words,chars' : by,
      mask: effect === 'rise' ? (by === 'chars' ? 'words' : by) : undefined,
      autoSplit: true,
      // A label is only allowed on a heading; elsewhere the split text is read as it stands.
      aria: /^h[1-6]$/.test(String(as)) ? 'auto' : 'none',
      onSplit: (self) => {
        const targets = by === 'chars' ? self.chars : by === 'words' ? self.words : self.lines;
        const from = effect === 'blur'
          ? { opacity: 0, filter: 'blur(14px)', yPercent: 45 }
          : { yPercent: 110 };
        return gsap.from(targets, {
          ...from,
          duration: duration ?? (effect === 'blur' ? 0.9 : 1.1),
          ease: effect === 'blur' ? 'power3.out' : 'expo.out',
          stagger: stagger ?? (by === 'chars' ? 0.022 : 0.09),
          delay,
          scrollTrigger: on === 'view' ? { trigger: el, start: 'top 90%', once: true } : undefined,
        });
      },
    });
  }, { scope: ref });
  return createElement(as, { ref, className, id }, children);
}

/** Everything inside with [data-rise] fades up as it enters the viewport, in order. */
export function useRise(scope: React.RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useGSAP(() => {
    if (still || !scope.current) return;
    const items = gsap.utils.toArray<HTMLElement>('[data-rise]', scope.current);
    if (!items.length) return;
    gsap.set(items, { opacity: 0, y: 28 });
    ScrollTrigger.batch(items, {
      start: 'top 92%', once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, ease: 'out', stagger: 0.07, overwrite: true }),
    });
  }, { scope, dependencies: deps });
}
