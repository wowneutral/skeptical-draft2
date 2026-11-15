// Smooth scroll for every version: Lenis driven by GSAP's ticker, so scrubbed
// ScrollTriggers and the WebGL scenes read the same position on the same frame.
import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { CustomEase } from 'gsap/CustomEase';
import { useGSAP } from '@gsap/react';
import { clamp, still } from './utils';

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, CustomEase, useGSAP);
CustomEase.create('site', '0.76, 0, 0.24, 1');
CustomEase.create('out', '0.2, 0.8, 0.2, 1');
gsap.ticker.lagSmoothing(0);

/** Read from inside useFrame or a ticker. Never triggers a React render. */
export const scroll = { y: 0, p: 0, v: 0, max: 1 };

let lenis: Lenis | null = null;
export const getLenis = () => lenis;

export function scrollToY(y: number, immediate = false) {
  if (lenis) lenis.scrollTo(y, immediate ? { immediate: true } : { duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else window.scrollTo(0, y);
}

export function scrollToId(id: string, offset = 0) {
  const el = id ? document.getElementById(id) : null;
  const y = el ? el.getBoundingClientRect().top + window.scrollY + offset : 0;
  scrollToY(y);
  history.replaceState(null, '', id ? `#${id}` : location.pathname);
  if (el) { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
}

export function useSmoothScroll(anchorOffset = 0) {
  useEffect(() => {
    window.scrollTo(0, 0);
    let raf: ((t: number) => void) | null = null;
    if (!still) {
      lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
      lenis.on('scroll', ScrollTrigger.update);
      raf = (t: number) => lenis?.raf(t * 1000);
      gsap.ticker.add(raf);
    }
    let last = window.scrollY;
    const read = () => {
      scroll.max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scroll.y = window.scrollY;
      scroll.p = clamp(scroll.y / scroll.max);
    };
    const tick = (_t: number, dms: number) => {
      read();
      const v = (scroll.y - last) / Math.max(1, dms);
      last = scroll.y;
      scroll.v += (v - scroll.v) * 0.2;
    };
    gsap.ticker.add(tick);
    read();

    // In-page links glide and keep the hash; they never reach the router.
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!link) return;
      e.preventDefault();
      scrollToId(link.getAttribute('href')!.slice(1), anchorOffset);
    };
    document.addEventListener('click', onClick);
    const refresh = setTimeout(() => ScrollTrigger.refresh(), 400);

    return () => {
      clearTimeout(refresh);
      document.removeEventListener('click', onClick);
      gsap.ticker.remove(tick);
      if (raf) gsap.ticker.remove(raf);
      lenis?.destroy();
      lenis = null;
      scroll.y = scroll.p = scroll.v = 0;
    };
  }, [anchorOffset]);
}

export { gsap, ScrollTrigger, SplitText, useGSAP };
