import { useEffect } from 'react';
import { ALL as VERSIONS } from '@/registry';
import { useTransition } from '@/components/Transition';
import { useSmoothScroll } from './scroll';

/** What every version does on mount: name the page, set the theme, start smooth scroll, lift the cover. */
export function useVersion(slug: string, opts: { anchorOffset?: number } = {}) {
  const { ready } = useTransition();
  useSmoothScroll(opts.anchorOffset ?? 0);
  useEffect(() => {
    const v = VERSIONS.find((x) => x.slug === slug);
    const color = v?.color ?? '#050505';
    document.documentElement.dataset.v = slug;
    document.documentElement.style.background = color;
    document.title = v ? `Skeptical, draft 2: ${v.name.toLowerCase()}` : 'Skeptical, draft 2';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
    const id = requestAnimationFrame(() => requestAnimationFrame(ready));
    return () => cancelAnimationFrame(id);
  }, [slug, ready]);
}
